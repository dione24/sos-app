import * as Network from 'expo-network';
import * as SMS from 'expo-sms';
import { useRouter } from 'expo-router';
import { BatteryMedium, Bluetooth, BluetoothSearching, CircleAlert, MapPin, MessageSquareText, RadioTower, ShieldCheck } from 'lucide-react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Platform, Pressable, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Screen } from '@/components/Screen';
import { Button, Card, EmptyState, IconTile, Notice, SectionHeader, Tag, ToggleRow } from '@/components/ui';
import { getContacts, getProfile, getSetting, setSetting } from '@/db/database';
import { contactRecipients, EMERGENCY_LABELS, formatCoordinates } from '@/lib/sos';
import { getBleAdvertisingStatus, observeBleAdvertising, readPacketFromDevice, startBleAdvertising, startBleMeshScan, stopBleAdvertising, type BleScanUpdate } from '@/services/ble-mesh';
import { getRecentMeshMessages, markMessageRelayed, processIncomingMessage, purgeSeenMessages } from '@/services/mesh-repository';
import { makeStyles, useTheme } from '@/theme';
import type { MeshMessage } from '@/types/models';

const canBroadcastBle = Platform.OS === 'android';

function rescuerPriorityScore(direction: string, message: MeshMessage) {
  let score = 0;
  if (direction === 'received') score += 4;
  if (direction === 'relayed') score += 2;
  if (message.severity === 'critique') score += 3;
  if (message.severity === 'eleve') score += 1;
  return score;
}

function formatRelaySms(message: MeshMessage) {
  const lines = [
    `Relais SOS — ${EMERGENCY_LABELS[message.emergencyType]}`,
    `Gravité : ${message.severity}`,
    `Position : ${formatCoordinates(message.position)}`,
  ];
  if (message.position) {
    lines.push(`Carte : https://maps.google.com/?q=${message.position.latitude},${message.position.longitude}`);
  }
  lines.push('Message préparé depuis SOS Sécurité Mali. Confirmez l\'envoi dans l\'app SMS.');
  return lines.join('\n');
}

function directionLabel(direction: 'sent' | 'received' | 'relayed') {
  if (direction === 'sent') return 'Envoyée';
  if (direction === 'received') return 'Reçue';
  return 'Transmise';
}

export default function MeshScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const [scan, setScan] = useState<BleScanUpdate>({ state: 'starting', devices: [] });
  const [running, setRunning] = useState(true);
  const [scanAttempt, setScanAttempt] = useState(0);
  const [bridgeOnline, setBridgeOnline] = useState(false);
  const [rescuer, setRescuer] = useState(false);
  const [bleConsent, setBleConsent] = useState<boolean | null>(null);
  const [showBleDisclosure, setShowBleDisclosure] = useState(true);
  const [broadcast, setBroadcast] = useState<'idle' | 'active' | 'error'>('idle');
  const [broadcastBusy, setBroadcastBusy] = useState(false);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getRecentMeshMessages>>>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [smsBusy, setSmsBusy] = useState(false);
  const readingDevices = useRef(new Set<string>());

  useEffect(() => {
    let mounted = true;
    void getSetting(db, 'ble_disclosure_accepted').then((consent) => {
      if (mounted) setBleConsent(consent === '1');
    });
    return () => { mounted = false; };
  }, [db]);

  useEffect(() => {
    let mounted = true;
    const subscription = observeBleAdvertising((active) => {
      if (mounted) setBroadcast(active ? 'active' : 'idle');
    });
    void getBleAdvertisingStatus().then((active) => {
      if (mounted) setBroadcast(active ? 'active' : 'idle');
    }).catch(() => {
      if (mounted) setBroadcast('error');
    });
    return () => { mounted = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    if (bleConsent === null) return;
    let stop: (() => void) | undefined;
    let mounted = true;
    async function start() {
      await purgeSeenMessages(db);
      const [network, saved, rescuerRow] = await Promise.all([
        Network.getNetworkStateAsync(),
        getRecentMeshMessages(db),
        db.getFirstAsync<{ enabled: number }>('SELECT enabled FROM rescuer_opt_in WHERE id = 1'),
      ]);
      if (!mounted) return;
      setBridgeOnline(Boolean(network.isConnected && network.isInternetReachable !== false));
      setHistory(saved);
      setRescuer(rescuerRow?.enabled === 1);
      if (!bleConsent) return;
      if (running) {
        stop = await startBleMeshScan((update) => {
          if (!mounted) return;
          setScan(update);
          for (const device of update.devices) {
            if (readingDevices.current.has(device.id)) continue;
            readingDevices.current.add(device.id);
            void readPacketFromDevice(device)
              .then(async (packet) => {
                if (!packet) return;
                const decision = await processIncomingMessage(db, packet);
                if (decision.relay && canBroadcastBle) {
                  const result = await startBleAdvertising(decision.packet);
                  if (mounted) setBroadcast(result.state === 'active' ? 'active' : 'error');
                  if (result.state === 'active') await markMessageRelayed(db, decision.packet);
                }
                if (mounted) setHistory(await getRecentMeshMessages(db));
              })
              .finally(() => readingDevices.current.delete(device.id));
          }
        });
      }
    }
    void start();
    return () => {
      mounted = false;
      stop?.();
    };
  }, [bleConsent, db, running, scanAttempt]);

  async function acceptBleDisclosure() {
    await setSetting(db, 'ble_disclosure_accepted', '1');
    setBleConsent(true);
  }

  async function stopBroadcast() {
    await stopBleAdvertising();
    setBroadcast('idle');
  }

  async function shareLatestAlert() {
    if (broadcastBusy) return;
    const packet = history.find(({ message }) => message.hopsRemaining > 0)?.message;
    if (!packet) return;
    setBroadcastBusy(true);
    try {
      const result = await startBleAdvertising(packet);
      setBroadcast(result.state === 'active' ? 'active' : 'error');
      if (result.state !== 'active') Alert.alert('Alerte non partagée', result.message);
    } finally {
      setBroadcastBusy(false);
    }
  }

  function retryScan() {
    setScan({ state: 'starting', devices: [], message: 'Recherche Bluetooth en cours' });
    if (running) setScanAttempt((value) => value + 1);
    else setRunning(true);
  }

  async function toggleRescuer(value: boolean) {
    setRescuer(value);
    await db.runAsync(
      'INSERT INTO rescuer_opt_in (id, enabled, alias) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET enabled = excluded.enabled',
      value ? 1 : 0,
      '',
    );
  }

  const displayHistory = useMemo(() => {
    const items = [...history];
    if (rescuer) {
      items.sort((a, b) => {
        const scoreDiff = rescuerPriorityScore(b.direction, b.message) - rescuerPriorityScore(a.direction, a.message);
        return scoreDiff !== 0 ? scoreDiff : b.createdAt - a.createdAt;
      });
    }
    return items.slice(0, 8);
  }, [history, rescuer]);

  async function openSmsBridge(message?: MeshMessage) {
    if (smsBusy) return;
    setSmsBusy(true);
    try {
      const available = await SMS.isAvailableAsync();
      if (!available) {
        Alert.alert('SMS indisponible', "L'application SMS native n'est pas accessible sur cet appareil.");
        return;
      }
      const target =
        message ??
        history.find((item) => item.direction === 'received' || item.direction === 'relayed')?.message ??
        history[0]?.message;
      const body = target
        ? formatRelaySms(target)
        : 'SOS Mali — aucune alerte reçue à transmettre. Ajoutez le détail manuellement avant envoi.';
      const profile = await getProfile(db);
      const contacts = profile ? await getContacts(db, profile.phone) : [];
      const recipients = contactRecipients(contacts);
      if (recipients.length === 0) {
        Alert.alert(
          'Aucun contact valide',
          'Ouvrez le SMS pour choisir un destinataire. Le téléphone vous demandera de confirmer l\'envoi.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Ouvrir SMS', onPress: () => void SMS.sendSMSAsync([], body) },
          ],
        );
        return;
      }
      await SMS.sendSMSAsync(recipients, body);
    } finally {
      setSmsBusy(false);
    }
  }

  async function openAlertMap(message: MeshMessage) {
    if (!message.position) {
      Alert.alert('Position absente', 'Cette alerte ne contient pas de position.');
      return;
    }
    const { latitude, longitude } = message.position;
    const url = `https://maps.google.com/?q=${latitude},${longitude}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Carte indisponible', 'Impossible d\'ouvrir l\'application de cartes.');
    }
  }

  const active = bleConsent === true && running && scan.state === 'active';
  const scanning = bleConsent === true && running && (scan.state === 'starting' || scan.state === 'active');
  const scanStatus = bleConsent !== true || !running
    ? 'En pause'
    : scan.state === 'denied'
      ? 'Autorisation manquante'
      : scan.state === 'bluetooth-off'
        ? 'Bluetooth désactivé'
        : scan.state === 'starting' || scan.state === 'active'
          ? 'Écoute des téléphones proches'
          : 'En pause';
  const alertCount = `${history.length} alerte${history.length > 1 ? 's' : ''} récente${history.length > 1 ? 's' : ''}`;

  return (
    <Screen clearFab>
      <AppHeader title="Alertes proches" subtitle="Entraide entre téléphones, même sans réseau" />

      {bleConsent === null ? (
        <Notice icon={<BluetoothSearching size={20} color={colors.inkMuted} />} title="Préparation des alertes proches…" text="Vos alertes récentes restent disponibles ci-dessous." />
      ) : null}

      {bleConsent === false && showBleDisclosure ? (
        <Notice
          icon={<RadioTower size={20} color={colors.primaryText} />}
          tone="primary"
          title="Recevoir les alertes autour de moi"
          text={
            canBroadcastBle
              ? "Les téléphones proches peuvent s'entraider lorsque le réseau passe mal. Seuls le type d'urgence, la position si vous l'autorisez et l'heure sont partagés. Android affiche une notification pendant qu'une alerte est transmise."
              : "Votre iPhone peut recevoir les alertes SOS proches tant que cet écran reste ouvert. Votre dossier médical reste privé."
          }
        >
          <Button label="Activer les alertes proches" onPress={() => void acceptBleDisclosure()} icon={<Bluetooth size={20} color={colors.onPrimary} />} />
          <Button
            label="Pas maintenant"
            size="md"
            variant="ghost"
            accessibilityLabel="Refuser le relais Bluetooth pour le moment"
            onPress={() => {
              setBleConsent(false);
              setShowBleDisclosure(false);
              setRunning(false);
            }}
          />
        </Notice>
      ) : null}

      {scan.state === 'denied' ? (
        <Notice
          icon={<CircleAlert size={20} color={colors.dangerText} />}
          tone="danger"
          title="Autorisation nécessaire"
          text="Autorisez « Appareils à proximité » pour recevoir les alertes autour de vous. Le SOS, les appels et les SMS restent disponibles sans cette autorisation."
        >
          <Button label="Ouvrir les réglages du téléphone" variant="secondary" onPress={() => void Linking.openSettings()} />
        </Notice>
      ) : scan.state === 'bluetooth-off' ? (
        <Notice icon={<Bluetooth size={20} color={colors.warningText} />} tone="warning" title="Bluetooth désactivé" text="Activez le Bluetooth du téléphone, puis touchez « Rechercher à nouveau »." />
      ) : null}

      <Card style={s.status}>
        <IconTile tone={active ? 'primary' : 'neutral'}>
          <Bluetooth size={22} color={active ? colors.primaryText : colors.inkMuted} />
        </IconTile>
        <View style={s.statusCopy}>
          <Text maxFontSizeMultiplier={1.4} style={s.statusValue}>{scanStatus}</Text>
          <Text maxFontSizeMultiplier={1.5} style={s.statusCount}>{alertCount}</Text>
        </View>
        {bleConsent !== true && !showBleDisclosure ? (
          <Button label="Activer" size="md" onPress={() => setShowBleDisclosure(true)} accessibilityLabel="Activer les alertes proches" />
        ) : bleConsent === true && !scanning ? (
          <Button label="Rechercher" size="md" variant="secondary" onPress={retryScan} accessibilityLabel="Rechercher à nouveau" />
        ) : bleConsent === true ? (
          <Button label="Pause" size="md" variant="secondary" onPress={() => setRunning(false)} accessibilityLabel="Mettre en pause" icon={<BatteryMedium size={18} color={colors.ink} />} />
        ) : null}
      </Card>

      <ToggleRow
        title="Je peux aider"
        subtitle="Les alertes les plus urgentes apparaîtront en premier. Votre nom ne sera pas partagé."
        accessibilityLabel="Indiquer que je peux aider"
        value={rescuer}
        onValueChange={(value) => void toggleRescuer(value)}
        leading={<IconTile tone="primary"><ShieldCheck size={22} color={colors.primaryText} /></IconTile>}
      />

      {broadcast === 'active' ? (
        <Button label="Arrêter de partager mon alerte" onPress={() => void stopBroadcast()} variant="secondary" icon={<CircleAlert size={20} color={colors.dangerText} />} />
      ) : canBroadcastBle && bleConsent === true && history.length > 0 ? (
        <Button label="Partager la dernière alerte" onPress={() => void shareLatestAlert()} disabled={broadcastBusy} loading={broadcastBusy} variant="secondary" icon={<RadioTower size={20} color={colors.ink} />} />
      ) : null}

      <Notice
        icon={<MessageSquareText size={20} color={bridgeOnline ? colors.primaryText : colors.inkFaint} />}
        title="Envoyer la dernière alerte par SMS"
        text="Le message est préparé pour vous. Vous choisissez le destinataire et confirmez toujours l'envoi."
      >
        <Button label={smsBusy ? 'Ouverture du SMS…' : 'Préparer le SMS'} variant="secondary" loading={smsBusy} disabled={smsBusy} onPress={() => void openSmsBridge()} icon={<MessageSquareText size={20} color={colors.ink} />} />
      </Notice>

      <SectionHeader title="Alertes récentes" aside={alertCount} />
      {displayHistory.length ? (
        <View style={s.history}>
          {displayHistory.map(({ message, direction, createdAt }, index) => {
            const key = `${message.id}-${index}`;
            const expanded = expandedId === key;
            const priority = rescuer && (direction === 'received' || message.severity === 'critique');
            const critical = message.severity === 'critique';
            return (
              <Card key={key} tone={priority ? 'primary' : 'neutral'} style={s.alertCard}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${EMERGENCY_LABELS[message.emergencyType]}, ${direction}, détails`}
                  accessibilityState={{ expanded }}
                  onPress={() => setExpandedId(expanded ? null : key)}
                  style={s.alertHead}
                >
                  <IconTile tone={critical ? 'danger' : 'warning'}>
                    <CircleAlert size={22} color={critical ? colors.dangerText : colors.warningText} />
                  </IconTile>
                  <View style={s.alertCopy}>
                    <Text maxFontSizeMultiplier={1.4} style={s.alertName}>{EMERGENCY_LABELS[message.emergencyType]}</Text>
                    <Text maxFontSizeMultiplier={1.5} style={s.alertMeta}>
                      {directionLabel(direction)} · {new Date(createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      {priority ? ' · urgente' : ''}
                    </Text>
                  </View>
                  <Tag label={message.severity} tone={critical ? 'danger' : 'warning'} />
                </Pressable>
                {expanded ? (
                  <View style={s.alertDetail}>
                    <Text maxFontSizeMultiplier={1.5} style={s.alertDetailText}>Position : {formatCoordinates(message.position)}</Text>
                    <View style={s.alertActions}>
                      <Button label="Carte" size="md" variant="secondary" accessibilityLabel="Ouvrir la position sur la carte" disabled={!message.position} onPress={() => void openAlertMap(message)} icon={<MapPin size={18} color={colors.ink} />} style={s.alertAction} />
                      <Button label="SMS" size="md" variant="secondary" accessibilityLabel="Préparer un SMS pour cette alerte" onPress={() => void openSmsBridge(message)} icon={<MessageSquareText size={18} color={colors.ink} />} style={s.alertAction} />
                    </View>
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      ) : (
        <EmptyState
          icon={<BluetoothSearching size={28} color={colors.inkMuted} />}
          title="Aucune alerte autour de vous"
          text="Ça marche seulement si un autre téléphone SOS Sécurité Mali est à quelques mètres, avec cet écran ouvert. L’appel 122 et le SMS restent disponibles sans ça."
          action={<Button label="Appeler le 122" variant="secondary" onPress={() => router.push('/sos')} />}
        />
      )}

      <Text maxFontSizeMultiplier={1.6} style={s.limitText}>Gardez cet écran ouvert pour recevoir les alertes des téléphones proches.</Text>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  status: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  statusCopy: { flex: 1, gap: 2 },
  statusValue: { ...t.text.bodyStrong },
  statusCount: { ...t.text.caption },
  history: { gap: t.spacing.xs },
  alertCard: { gap: t.spacing.sm, padding: t.spacing.sm },
  alertHead: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  alertCopy: { flex: 1, gap: 2 },
  alertName: { ...t.text.bodyStrong },
  alertMeta: { ...t.text.caption },
  alertDetail: { gap: t.spacing.sm, paddingTop: t.spacing.sm, borderTopWidth: 1, borderTopColor: t.colors.border },
  alertDetailText: { ...t.text.caption, color: t.colors.ink },
  alertActions: { flexDirection: 'row', gap: t.spacing.sm },
  alertAction: { flex: 1 },
  limitText: { ...t.text.caption, color: t.colors.inkFaint, textAlign: 'center', paddingHorizontal: t.spacing.sm },
}));
