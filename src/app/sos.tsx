import * as SMS from 'expo-sms';
import { useRouter } from 'expo-router';
import {
  Ambulance,
  Bike,
  Check,
  CircleAlert,
  Flame,
  Info,
  LoaderCircle,
  MapPin,
  MessageSquareText,
  PhoneCall,
  RadioTower,
  ShieldAlert,
  Stethoscope,
  Waves,
} from 'lucide-react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { CallConfirm } from '@/components/CallConfirm';
import { Screen } from '@/components/Screen';
import { Button, Card, Notice, ToggleRow } from '@/components/ui';
import { EMERGENCY_NUMBERS } from '@/data';
import { getContacts, getProfile, getSetting, setSetting } from '@/db/database';
import { contactRecipients, formatSosMessage, selectAlternateEmergencyNumbers, selectEmergencyNumber } from '@/lib/sos';
import { getEmergencyPosition } from '@/services/location';
import { startBleAdvertising } from '@/services/ble-mesh';
import { createMeshMessage } from '@/services/mesh-repository';
import { confirmCall, openPhoneDialer } from '@/services/phone';
import { useAppStore } from '@/store/app-store';
import { makeStyles, useTheme } from '@/theme';
import type { EmergencyContact, EmergencyType, MedicalProfile } from '@/types/models';

const emergencies: { id: EmergencyType; label: string; icon: typeof Ambulance }[] = [
  { id: 'medical', label: 'Médical', icon: Stethoscope },
  { id: 'accident', label: 'Accident', icon: Bike },
  { id: 'agression', label: 'Agression', icon: ShieldAlert },
  { id: 'incendie', label: 'Incendie', icon: Flame },
  { id: 'noyade', label: 'Noyade', icon: Waves },
  { id: 'autre', label: 'Autre', icon: CircleAlert },
];

export default function SosScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale >= 1.3;
  const db = useSQLiteContext();
  const router = useRouter();
  const canBroadcastBle = Platform.OS === 'android';
  const setLastPosition = useAppStore((state) => state.setLastPosition);
  const [type, setType] = useState<EmergencyType>('medical');
  const [locating, setLocating] = useState(false);
  const [locationConsent, setLocationConsent] = useState<'loading' | 'prompt' | 'accepted' | 'declined'>('loading');
  const [position, setPosition] = useState<Awaited<ReturnType<typeof getEmergencyPosition>>>(null);
  const [profile, setProfile] = useState<MedicalProfile | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [includeMedical, setIncludeMedical] = useState(false);
  const [meshSent, setMeshSent] = useState(false);
  const [meshSending, setMeshSending] = useState(false);
  const [bleConsent, setBleConsent] = useState<boolean | null>(null);
  const [showBleDisclosure, setShowBleDisclosure] = useState(false);
  const [pendingCall, setPendingCall] = useState<{ number: string; service: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    void getSetting(db, 'location_disclosure_accepted').then((accepted) => {
      if (!mounted) return;
      const allowed = accepted === '1';
      setLocationConsent(allowed ? 'accepted' : 'prompt');
      if (allowed) void locate();
    });
    void getSetting(db, 'ble_disclosure_accepted').then((accepted) => {
      if (mounted) setBleConsent(accepted === '1');
    });
    void getProfile(db).then(async (nextProfile) => {
      if (!mounted) return;
      setProfile(nextProfile);
      setIncludeMedical(Boolean(nextProfile?.includeInSos));
      if (nextProfile) setContacts(await getContacts(db, nextProfile.phone));
    });
    return () => {
      mounted = false;
    };
  }, [db, setLastPosition]);

  async function locate() {
    setLocating(true);
    try {
      const next = await getEmergencyPosition();
      setPosition(next);
      setLastPosition(next);
    } finally {
      setLocating(false);
    }
  }

  async function acceptLocationDisclosure() {
    await setSetting(db, 'location_disclosure_accepted', '1');
    setLocationConsent('accepted');
    await locate();
  }

  const emergencyNumber = useMemo(() => selectEmergencyNumber(type, EMERGENCY_NUMBERS), [type]);
  const alternateNumbers = useMemo(() => selectAlternateEmergencyNumbers(type, EMERGENCY_NUMBERS).slice(0, 2), [type]);
  const message = formatSosMessage({ type, position, profile, includeMedical });
  const smsRecipients = useMemo(() => contactRecipients(contacts), [contacts]);

  async function sendSms() {
    const available = await SMS.isAvailableAsync();
    if (!available) {
      Alert.alert('SMS indisponible', "L'application SMS native n'est pas accessible sur cet appareil.");
      return;
    }
    if (smsRecipients.length === 0) {
      Alert.alert(
        "Aucun contact d'urgence valide",
        "Ajoutez un numéro complet au dossier médical. Vous pouvez tout de même ouvrir l'app SMS et choisir un destinataire.",
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Ouvrir SMS', onPress: () => void SMS.sendSMSAsync([], message) },
        ],
      );
      return;
    }
    await SMS.sendSMSAsync(smsRecipients, message);
  }

  async function sendMesh(disclosureAccepted = false) {
    if (meshSending) return;
    if (!disclosureAccepted && bleConsent !== true) {
      setShowBleDisclosure(true);
      return;
    }
    setMeshSending(true);
    try {
      const packet = await createMeshMessage({
        db,
        emergencyType: type,
        position,
        severity: type === 'autre' ? 'eleve' : 'critique',
      });
      const broadcast = await startBleAdvertising(packet);
      setMeshSent(broadcast.state === 'active');
      Alert.alert(
        broadcast.state === 'active' ? 'Alerte partagée autour de vous' : 'Alerte prête',
        broadcast.state === 'active'
          ? "Les téléphones SOS proches peuvent maintenant la transmettre. Gardez l'application ouverte pendant l'urgence."
          : "Le téléphone n'a pas pu la partager pour le moment. Vous pouvez réessayer depuis Alertes proches, appeler ou envoyer un SMS.",
        [
          { text: 'Rester ici', style: 'cancel' },
          { text: 'Alertes proches', onPress: () => router.push('/mesh') },
        ],
      );
    } finally {
      setMeshSending(false);
    }
  }

  async function acceptBleDisclosureAndSend() {
    if (meshSending) return;
    await setSetting(db, 'ble_disclosure_accepted', '1');
    setBleConsent(true);
    setShowBleDisclosure(false);
    await sendMesh(true);
  }

  const positionLabel = locating
    ? 'Recherche de la position…'
    : position
      ? `Position ajoutée${position.accuracy ? ` · ± ${Math.round(position.accuracy)} m` : ''}`
      : locationConsent === 'declined'
        ? 'Position non ajoutée'
        : 'Position indisponible';

  return (
    <>
      <Screen
        footer={
          <Button
            label={`Appeler le ${emergencyNumber?.number ?? '122'}`}
            onPress={() => setPendingCall({
              number: emergencyNumber?.dialNumber ?? emergencyNumber?.number ?? '122',
              service: emergencyNumber?.name ?? 'Protection Civile',
            })}
            variant="sos"
            icon={<PhoneCall size={22} color={colors.onColor} />}
            accessibilityHint="Ouvre la confirmation avant l’appel"
          />
        }
      >
        <AppHeader title="Déclencher un SOS" subtitle={emergencyNumber ? `${emergencyNumber.name} · ${emergencyNumber.number}` : undefined} back />

        <Text accessibilityRole="header" maxFontSizeMultiplier={1.35} style={s.lead}>Quel type d'urgence ?</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Type d’urgence" style={s.typeGrid}>
          {emergencies.map(({ id, label, icon: Icon }) => {
            const selected = type === id;
            return (
              <Pressable
                key={id}
                accessibilityRole="radio"
                accessibilityLabel={label}
                accessibilityState={{ selected }}
                onPress={() => setType(id)}
                style={({ pressed }) => [s.type, largeText && s.typeLarge, selected && s.typeSelected, pressed && s.typePressed]}
              >
                <Icon size={28} color={selected ? colors.primaryText : colors.inkMuted} strokeWidth={2} />
                <Text maxFontSizeMultiplier={1.25} style={[s.typeLabel, selected && s.typeLabelSelected]}>{label}</Text>
                {selected ? (
                  <View style={s.check}>
                    <Check size={14} color={colors.onPrimary} strokeWidth={3} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Card style={s.positionCard}>
          <View style={s.positionRow}>
            {locating ? <LoaderCircle size={22} color={colors.inkMuted} /> : <MapPin size={22} color={position ? colors.primaryText : colors.infoText} />}
            <Text maxFontSizeMultiplier={1.4} style={[s.positionText, position && s.positionOk]}>
              {locationConsent === 'loading' ? 'Préparation de la position…' : locationConsent === 'prompt' ? 'Ajouter votre position au SOS' : positionLabel}
            </Text>
          </View>
          {locationConsent === 'prompt' ? (
            <View style={s.positionActions}>
              <Button label="Autoriser" size="md" onPress={() => void acceptLocationDisclosure()} style={s.positionButton} />
              <Button label="Sans position" size="md" variant="secondary" onPress={() => setLocationConsent('declined')} accessibilityLabel="Continuer le SOS sans position" style={s.positionButton} />
            </View>
          ) : !locating && !position && locationConsent !== 'loading' ? (
            <View style={s.positionActions}>
              <Button
                label="Réessayer"
                size="md"
                variant="secondary"
                accessibilityLabel="Réessayer d'obtenir la position"
                onPress={() => (locationConsent === 'accepted' ? void locate() : setLocationConsent('prompt'))}
                style={s.positionButton}
              />
            </View>
          ) : null}
        </Card>

        {profile?.includeInSos ? (
          <ToggleRow
            title="Joindre mes infos vitales"
            subtitle="Groupe sanguin et allergies uniquement."
            accessibilityLabel="Joindre mes informations médicales"
            value={includeMedical}
            onValueChange={setIncludeMedical}
          />
        ) : null}

        <Notice
          icon={<Info size={20} color={colors.infoText} />}
          tone="info"
          title="À dire en premier"
          text="Lieu exact ou repère · nature du danger · nombre de victimes · votre numéro de rappel."
        />

        <View style={s.actions}>
          <Button
            label={
              smsRecipients.length
                ? `Envoyer un SMS à ${smsRecipients.length} contact${smsRecipients.length > 1 ? 's' : ''}`
                : 'Ouvrir le SMS de secours'
            }
            onPress={() => void sendSms()}
            variant="secondary"
            icon={<MessageSquareText size={22} color={colors.ink} />}
          />

          {showBleDisclosure && canBroadcastBle ? (
            <Notice
              icon={<RadioTower size={20} color={colors.primaryText} />}
              tone="primary"
              title="Alerter les téléphones proches"
              text="Si le réseau passe mal, les téléphones SOS autour de vous peuvent transmettre l'alerte. Android affiche une notification tant que le partage est actif. Votre dossier médical reste privé."
            >
              <Button label="Autoriser et alerter" onPress={() => void acceptBleDisclosureAndSend()} loading={meshSending} disabled={meshSending} icon={<RadioTower size={20} color={colors.onPrimary} />} />
              <Button label="Pas maintenant" size="md" variant="ghost" accessibilityLabel="Refuser le relais Bluetooth pour le moment" onPress={() => setShowBleDisclosure(false)} />
            </Notice>
          ) : null}

          {canBroadcastBle ? (
            <Button
              label={meshSending ? 'Partage en cours…' : meshSent ? 'Partager à nouveau autour de moi' : 'Alerter autour de moi'}
              onPress={() => void sendMesh()}
              variant="secondary"
              icon={<RadioTower size={22} color={meshSent && !meshSending ? colors.primaryText : colors.ink} />}
              loading={meshSending}
              disabled={meshSending}
            />
          ) : (
            <Button label="Recevoir les alertes proches" onPress={() => router.push('/mesh')} variant="secondary" icon={<RadioTower size={22} color={colors.ink} />} />
          )}
        </View>

        {alternateNumbers.length ? (
          <View style={s.alternates}>
            <Text maxFontSizeMultiplier={1.4} style={s.alternateHeading}>Si le numéro principal ne répond pas</Text>
            <View style={[s.alternateGrid, largeText && s.alternateColumn]}>
              {alternateNumbers.map((item) => (
                <Pressable
                  key={item.number}
                  accessibilityRole="button"
                  accessibilityLabel={`Appeler ${item.name} au ${item.number}`}
                  onPress={() => confirmCall(item.dialNumber, item.name)}
                  style={({ pressed }) => [s.alternate, pressed && s.alternatePressed]}
                >
                  <Text maxFontSizeMultiplier={1.3} style={s.alternateNumber}>{item.number}</Text>
                  <Text maxFontSizeMultiplier={1.4} style={s.alternateName}>{item.name}</Text>
                  <View style={s.alternateCall}>
                    <PhoneCall size={16} color={colors.primaryText} />
                    <Text maxFontSizeMultiplier={1.4} style={s.alternateCallText}>Appeler</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <Text maxFontSizeMultiplier={1.6} style={s.privacy}>
          Le message est préparé pour vous. Vous choisissez toujours le destinataire et confirmez l'envoi.
        </Text>
      </Screen>
      {pendingCall ? (
        <CallConfirm
          number={pendingCall.number}
          service={pendingCall.service}
          onClose={() => setPendingCall(null)}
          onCall={() => {
            const number = pendingCall.number;
            setPendingCall(null);
            void openPhoneDialer(number);
          }}
        />
      ) : null}
    </>
  );
}

const useStyles = makeStyles((t) => ({
  lead: { ...t.text.h3 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xs },
  type: {
    width: '31.5%',
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.xs,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  typeLarge: { width: '48%' },
  typeSelected: { borderColor: t.colors.primary, borderWidth: 2, backgroundColor: t.colors.primaryBg },
  typePressed: { backgroundColor: t.colors.surfaceAlt },
  typeLabel: { ...t.text.captionStrong, color: t.colors.inkMuted },
  typeLabelSelected: { color: t.colors.primaryText },
  check: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.primary },
  positionCard: { gap: t.spacing.sm },
  positionRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  positionText: { ...t.text.bodyStrong, flex: 1 },
  positionOk: { color: t.colors.primaryText },
  positionActions: { flexDirection: 'row', gap: t.spacing.xs },
  positionButton: { flex: 1 },
  actions: { gap: t.spacing.sm },
  alternates: { gap: t.spacing.xs },
  alternateHeading: { ...t.text.captionStrong, color: t.colors.inkMuted },
  alternateGrid: { flexDirection: 'row', gap: t.spacing.xs },
  alternateColumn: { flexDirection: 'column' },
  alternate: { flex: 1, minHeight: 104, padding: t.spacing.md, gap: 2, borderRadius: t.radius.md, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border },
  alternatePressed: { backgroundColor: t.colors.surfaceAlt },
  alternateNumber: { fontFamily: 'DMSans_700Bold', fontSize: 22, lineHeight: 28, color: t.colors.ink },
  alternateName: { ...t.text.caption, color: t.colors.inkMuted },
  alternateCall: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 'auto', paddingTop: t.spacing.xs },
  alternateCallText: { ...t.text.captionStrong, color: t.colors.primaryText },
  privacy: { ...t.text.caption, color: t.colors.inkFaint, textAlign: 'center', paddingHorizontal: t.spacing.sm },
}));
