import * as Network from 'expo-network';
import * as SMS from 'expo-sms';
import { useRouter } from 'expo-router';
import {
  BatteryMedium,
  Bluetooth,
  CircleAlert,
  MapPin,
  MessageSquareText,
  RadioTower,
  ShieldCheck,
} from 'lucide-react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Screen } from '@/components/Screen';
import { Badge, Button, Card, SectionTitle } from '@/components/ui';
import { colors, font, radius, spacing, type } from '@/constants/theme';
import { getContacts, getProfile, getSetting, setSetting } from '@/db/database';
import { contactRecipients, EMERGENCY_LABELS, formatCoordinates } from '@/lib/sos';
import { readPacketFromDevice, startBleAdvertising, startBleMeshScan, stopBleAdvertising, type BleScanUpdate } from '@/services/ble-mesh';
import { getRecentMeshMessages, markMessageRelayed, processIncomingMessage, purgeSeenMessages } from '@/services/mesh-repository';
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
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getRecentMeshMessages>>>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [smsBusy, setSmsBusy] = useState(false);
  const readingDevices = useRef(new Set<string>());

  useEffect(() => {
    let stop: (() => void) | undefined;
    let mounted = true;
    async function start() {
      await purgeSeenMessages(db);
      const [network, saved, rescuerRow, consent] = await Promise.all([
        Network.getNetworkStateAsync(),
        getRecentMeshMessages(db),
        db.getFirstAsync<{ enabled: number }>('SELECT enabled FROM rescuer_opt_in WHERE id = 1'),
        getSetting(db, 'ble_disclosure_accepted'),
      ]);
      if (!mounted) return;
      setBridgeOnline(Boolean(network.isConnected && network.isInternetReachable !== false));
      setHistory(saved);
      setRescuer(rescuerRow?.enabled === 1);
      const allowed = consent === '1' || bleConsent === true;
      setBleConsent(allowed);
      if (!allowed) return;
      const packetToBroadcast = saved.find(({ message }) => message.hopsRemaining > 0)?.message;
      if (packetToBroadcast && canBroadcastBle) {
        const result = await startBleAdvertising(packetToBroadcast);
        if (mounted) setBroadcast(result.state === 'active' ? 'active' : 'error');
      }
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

  return (
    <Screen clearFab>
      <AppHeader title="Alertes proches" eyebrow="Entraide autour de vous" />

      {bleConsent === null ? (
        <Card style={styles.locationCard}>
          <Text maxFontSizeMultiplier={1.5} style={styles.rescuerTitle}>Préparation des alertes proches…</Text>
          <Text maxFontSizeMultiplier={1.7} style={styles.rescuerSub}>Vos alertes récentes restent disponibles ci-dessous.</Text>
        </Card>
      ) : null}

      {bleConsent === false && showBleDisclosure ? (
        <Card style={styles.disclosureCard}>
          <View style={styles.disclosureTop}>
            <RadioTower size={24} color={colors.greenLight} />
            <View style={styles.disclosureCopy}>
              <Text maxFontSizeMultiplier={1.5} style={styles.disclosureTitle}>Recevoir les alertes autour de moi</Text>
              <Text maxFontSizeMultiplier={1.7} style={styles.disclosureText}>
                {canBroadcastBle
                  ? "Les téléphones proches peuvent s'entraider lorsque le réseau passe mal. Seuls le type d'urgence, la position si vous l'autorisez et l'heure sont partagés. Android affiche une notification pendant qu'une alerte est transmise."
                  : "Votre iPhone peut recevoir les alertes SOS proches tant que cet écran reste ouvert. Votre dossier médical reste privé."}
              </Text>
            </View>
          </View>
          <Button label="Activer les alertes proches" onPress={() => void acceptBleDisclosure()} variant="green" icon={<Bluetooth size={19} color={colors.black} />} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refuser le relais Bluetooth pour le moment"
            onPress={() => {
              setBleConsent(false);
              setShowBleDisclosure(false);
              setRunning(false);
            }}
            style={({ pressed }) => [styles.declineDisclosure, pressed && styles.declineDisclosurePressed]}
          >
            <Text maxFontSizeMultiplier={1.5} style={styles.declineDisclosureText}>Pas maintenant</Text>
          </Pressable>
        </Card>
      ) : null}

      {scan.state === 'denied' ? (
        <Card style={styles.permissionCard}>
          <View style={styles.permissionTop}>
            <CircleAlert size={21} color={colors.alert} />
            <View style={styles.permissionCopy}>
              <Text maxFontSizeMultiplier={1.5} style={styles.permissionTitle}>Autorisation nécessaire</Text>
              <Text maxFontSizeMultiplier={1.7} style={styles.permissionText}>Autorisez « Appareils à proximité » pour recevoir les alertes autour de vous. Le SOS, les appels et les SMS restent disponibles sans cette autorisation.</Text>
            </View>
          </View>
          <Button label="Ouvrir les réglages du téléphone" onPress={() => void Linking.openSettings()} variant="outline" />
        </Card>
      ) : scan.state === 'bluetooth-off' ? (
        <Card style={styles.permissionCard}>
          <Text maxFontSizeMultiplier={1.5} style={styles.permissionTitle}>Bluetooth désactivé</Text>
          <Text maxFontSizeMultiplier={1.7} style={styles.permissionText}>Activez le Bluetooth du téléphone, puis touchez « Rechercher à nouveau ».</Text>
        </Card>
      ) : null}

      <Card style={styles.statusLine}>
        <Bluetooth size={21} color={active ? colors.green : colors.amber} />
        <View style={styles.statusCopy}>
          <Text maxFontSizeMultiplier={1.5} style={styles.statusValue}>{scanStatus}</Text>
          <Text maxFontSizeMultiplier={1.5} style={styles.statusCount}>
            {history.length} alerte{history.length > 1 ? 's' : ''} récente{history.length > 1 ? 's' : ''}
          </Text>
        </View>
      </Card>

      <Card style={styles.rescuerCard}>
        <View style={styles.rescuerIcon}><ShieldCheck size={22} color={colors.green} /></View>
        <View style={styles.rescuerCopy}>
          <Text maxFontSizeMultiplier={1.5} style={styles.rescuerTitle}>Je peux aider</Text>
          <Text maxFontSizeMultiplier={1.7} style={styles.rescuerSub}>
            Les alertes les plus urgentes apparaîtront en premier. Votre nom ne sera pas partagé.
          </Text>
        </View>
        <Switch
          accessibilityLabel="Indiquer que je peux aider"
          value={rescuer}
          onValueChange={(value) => void toggleRescuer(value)}
          trackColor={{ false: colors.hairline, true: colors.green }}
          thumbColor={colors.white}
        />
      </Card>

      {bleConsent !== true && !showBleDisclosure ? (
        <Button
          label="Activer les alertes proches"
          onPress={() => setShowBleDisclosure(true)}
          variant="green"
          icon={<Bluetooth size={19} color={colors.black} />}
        />
      ) : bleConsent === true && !scanning ? (
        <Button label="Rechercher à nouveau" onPress={retryScan} variant="outline" icon={<Bluetooth size={20} color={colors.sand} />} />
      ) : bleConsent === true ? (
        <Button label="Mettre en pause" onPress={() => setRunning(false)} variant="soft" icon={<BatteryMedium size={20} color={colors.amber} />} />
      ) : null}

      {broadcast === 'active' ? (
        <Button label="Arrêter de partager mon alerte" onPress={() => void stopBroadcast()} variant="outline" icon={<CircleAlert size={20} color={colors.alert} />} />
      ) : null}

      <Card style={styles.bridgeCard}>
        <MessageSquareText size={20} color={bridgeOnline ? colors.greenLight : colors.sandFaint} />
        <View style={styles.bridgeCopy}>
          <Text maxFontSizeMultiplier={1.5} style={styles.bridgeTitle}>Envoyer la dernière alerte par SMS</Text>
          <Text maxFontSizeMultiplier={1.7} style={styles.bridgeText}>
            Le message est préparé pour vous. Vous choisissez le destinataire et confirmez toujours l'envoi.
          </Text>
        </View>
      </Card>
      <Button
        label={smsBusy ? 'Ouverture du SMS…' : 'Préparer le SMS'}
        onPress={() => void openSmsBridge()}
        variant="outline"
        loading={smsBusy}
        disabled={smsBusy}
        icon={<MessageSquareText size={20} color={colors.sand} />}
      />

      <SectionTitle
        title="Alertes récentes"
        aside={`${history.length} alerte${history.length > 1 ? 's' : ''}`}
      />
      {displayHistory.length ? (
        <View style={styles.history}>
          {displayHistory.map(({ message, direction, createdAt }, index) => {
            const expanded = expandedId === `${message.id}-${index}`;
            const priority = rescuer && (direction === 'received' || message.severity === 'critique');
            return (
              <Card key={`${message.id}-${index}`} style={[styles.alertCard, priority && styles.alertPriority]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${EMERGENCY_LABELS[message.emergencyType]}, ${direction}, détails`}
                  accessibilityState={{ expanded }}
                  onPress={() => setExpandedId(expanded ? null : `${message.id}-${index}`)}
                >
                  <View style={styles.alertTop}>
                    <View style={styles.alertTitleRow}>
                      <CircleAlert size={17} color={message.severity === 'critique' ? colors.alert : colors.amber} />
                      <Text maxFontSizeMultiplier={1.5} style={styles.alertName}>{EMERGENCY_LABELS[message.emergencyType]}</Text>
                    </View>
                    <Badge label={message.severity} tone={message.severity === 'critique' ? 'alert' : 'amber'} />
                  </View>
                  <Text maxFontSizeMultiplier={1.5} style={styles.alertMeta}>
                    {directionLabel(direction)} · {new Date(createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    {priority ? ' · URGENTE' : ''}
                  </Text>
                </Pressable>
                {expanded ? (
                  <View style={styles.alertDetail}>
                    <Text maxFontSizeMultiplier={1.6} style={styles.alertDetailText}>
                      Position : {formatCoordinates(message.position)}
                    </Text>
                    <View style={styles.alertActions}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Ouvrir la position sur la carte"
                        disabled={!message.position}
                        onPress={() => void openAlertMap(message)}
                        style={[styles.alertAction, !message.position && styles.alertActionDisabled]}
                      >
                        <MapPin size={16} color={colors.amber} />
                        <Text maxFontSizeMultiplier={1.4} style={styles.alertActionText}>Carte</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Préparer un SMS pour cette alerte"
                        onPress={() => void openSmsBridge(message)}
                        style={styles.alertAction}
                      >
                        <MessageSquareText size={16} color={colors.blue} />
                        <Text maxFontSizeMultiplier={1.4} style={styles.alertActionText}>SMS</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      ) : (
        <Card style={styles.empty}>
          <Text maxFontSizeMultiplier={1.5} style={styles.emptyTitle}>Aucune alerte autour de vous</Text>
          <Text maxFontSizeMultiplier={1.7} style={styles.emptyText}>Ça marche seulement si un autre téléphone SOS Sécurité Mali est à quelques mètres, avec cet écran ouvert. L’appel 122 et le SMS restent disponibles sans ça.</Text>
          <Button label="Appeler le 122" onPress={() => router.push('/sos')} variant="outline" />
        </Card>
      )}

      <View style={styles.limitNotice}>
        <CircleAlert size={16} color={colors.amber} />
        <Text maxFontSizeMultiplier={1.7} style={styles.limitText}>Gardez cet écran ouvert pour recevoir les alertes des téléphones proches.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  disclosureCard: { gap: spacing.sm, backgroundColor: colors.greenDark, borderColor: '#BFE8D1' },
  locationCard: { gap: 4 },
  disclosureTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  disclosureCopy: { flex: 1 },
  disclosureTitle: { fontFamily: font.bodyBold, fontSize: 14, color: colors.sand },
  disclosureText: { ...type.small, fontSize: 12, lineHeight: 17, marginTop: 3 },
  declineDisclosure: { minHeight: 44, alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: radius.sm },
  declineDisclosurePressed: { opacity: 0.65 },
  declineDisclosureText: { fontFamily: font.bodyBold, fontSize: 12, color: colors.sandMuted },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusCopy: { flex: 1 },
  statusValue: { fontFamily: font.bodyBold, fontSize: 12, color: colors.sand },
  statusCount: { ...type.small, fontSize: 11, marginTop: 2 },
  permissionCard: { gap: spacing.sm, backgroundColor: colors.alertDark, borderColor: '#FFD2C9' },
  permissionTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  permissionCopy: { flex: 1 },
  permissionTitle: { fontFamily: font.bodyBold, fontSize: 13, color: colors.sand },
  permissionText: { ...type.small, fontSize: 12, lineHeight: 17, marginTop: 3 },
  rescuerCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rescuerIcon: { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenDark },
  rescuerCopy: { flex: 1 },
  rescuerTitle: { fontFamily: font.bodyBold, fontSize: 13, color: colors.sand },
  rescuerSub: { ...type.small, fontSize: 12, marginTop: 2 },
  bridgeCard: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.greenDark, borderColor: '#BFE8D1' },
  bridgeCopy: { flex: 1 },
  bridgeTitle: { fontFamily: font.bodyBold, fontSize: 12, color: colors.greenLight },
  bridgeText: { ...type.small, fontSize: 12, lineHeight: 17, marginTop: 2 },
  history: { gap: spacing.xs },
  alertCard: { gap: spacing.xs, padding: spacing.sm },
  alertPriority: { borderColor: colors.green, backgroundColor: colors.greenDark },
  alertTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  alertTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  alertName: { fontFamily: font.bodyBold, fontSize: 13, color: colors.sand },
  alertMeta: { ...type.eyebrow, fontSize: 11 },
  alertDetail: { gap: spacing.xs, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.hairline },
  alertDetailText: { ...type.small, fontSize: 11, color: colors.sand },
  alertActions: { flexDirection: 'row', gap: spacing.sm },
  alertAction: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.hairline },
  alertActionDisabled: { opacity: 0.4 },
  alertActionText: { fontFamily: font.bodyBold, fontSize: 12, color: colors.sand },
  empty: { alignItems: 'stretch', gap: spacing.sm },
  emptyTitle: { fontFamily: font.bodyBold, fontSize: 13, color: colors.sand },
  emptyText: { ...type.small, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  limitNotice: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.sm },
  limitText: { ...type.small, flex: 1, fontSize: 12, lineHeight: 17 },
});
