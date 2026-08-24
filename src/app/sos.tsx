import * as SMS from 'expo-sms';
import { useRouter } from 'expo-router';
import {
  Ambulance,
  Bike,
  Check,
  CircleAlert,
  Flame,
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
import { Alert, Platform, Pressable, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { CallConfirm } from '@/components/CallConfirm';
import { Screen } from '@/components/Screen';
import { Badge, Button, Card } from '@/components/ui';
import { colors, font, radius, spacing, type } from '@/constants/theme';
import { EMERGENCY_NUMBERS } from '@/data';
import { getContacts, getProfile, getSetting, setSetting } from '@/db/database';
import { contactRecipients, formatSosMessage, selectAlternateEmergencyNumbers, selectEmergencyNumber } from '@/lib/sos';
import { getEmergencyPosition } from '@/services/location';
import { startBleAdvertising } from '@/services/ble-mesh';
import { createMeshMessage } from '@/services/mesh-repository';
import { confirmCall, openPhoneDialer } from '@/services/phone';
import { useAppStore } from '@/store/app-store';
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
          variant="amber"
          icon={<PhoneCall size={21} color={colors.black} />}
          accessibilityHint="Ouvre la confirmation avant l’appel"
        />
      }
    >
      <AppHeader title="Déclencher un SOS" eyebrow="Choix rapide" back action={largeText ? undefined : <Badge label="urgent" tone="alert" dot />} />

      <Text maxFontSizeMultiplier={1.35} style={styles.lead}>Quel type d'urgence ?</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Type d’urgence" style={styles.typeGrid}>
        {emergencies.map(({ id, label, icon: Icon }) => {
          const selected = type === id;
          return (
            <Pressable
              key={id}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
              onPress={() => setType(id)}
              style={[styles.type, selected && styles.typeSelected]}
            >
              <Icon size={25} color={selected ? colors.alertLight : colors.sandMuted} />
              <Text maxFontSizeMultiplier={1.25} style={[styles.typeLabel, selected && styles.typeLabelSelected]}>{label}</Text>
              {selected ? <View style={styles.check}><Check size={12} color={colors.black} strokeWidth={3} /></View> : null}
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.callPrep}>
        <Text maxFontSizeMultiplier={1.4} style={styles.callPrepLabel}>À DIRE EN PREMIER</Text>
        <Text maxFontSizeMultiplier={1.7} style={styles.callPrepText}>Lieu exact ou repère · nature du danger · nombre de victimes · votre numéro de rappel.</Text>
      </Card>

      {locationConsent === 'loading' ? (
        <View style={styles.locationLine}>
          <LoaderCircle size={18} color={colors.amber} />
          <Text maxFontSizeMultiplier={1.5} style={styles.locationStatus}>Préparation de la position…</Text>
        </View>
      ) : locationConsent === 'prompt' ? (
        <View style={styles.locationLine}>
          <MapPin size={18} color={colors.blue} />
          <Text maxFontSizeMultiplier={1.5} style={styles.locationStatus}>Ajouter votre position au SOS</Text>
          <Pressable accessibilityLabel="Autoriser la position" onPress={() => void acceptLocationDisclosure()} accessibilityRole="button">
            <Text maxFontSizeMultiplier={1.5} style={styles.locationAction}>Autoriser</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continuer le SOS sans position"
            onPress={() => setLocationConsent('declined')}
          >
            <Text maxFontSizeMultiplier={1.5} style={styles.locationSkip}>Sans position</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.locationLine}>
          {locating ? <LoaderCircle size={18} color={colors.amber} /> : <MapPin size={18} color={position ? colors.green : colors.alert} />}
          <Text maxFontSizeMultiplier={1.5} style={[styles.locationStatus, position && styles.locationStatusOk]}>
            {locating
              ? 'Recherche de la position…'
              : position
                ? `Position OK${position.accuracy ? ` ± ${Math.round(position.accuracy)} m` : ''}`
                : locationConsent === 'declined'
                  ? 'Position non ajoutée'
                  : 'Position indisponible'}
          </Text>
          {!locating && !position ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Réessayer d'obtenir la position"
              onPress={() => (locationConsent === 'accepted' ? void locate() : setLocationConsent('prompt'))}
            >
              <Text maxFontSizeMultiplier={1.4} style={styles.locationAction}>Réessayer</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {profile?.includeInSos ? (
        <View style={styles.medicalRow}>
          <View style={styles.medicalCopy}>
            <Text maxFontSizeMultiplier={1.5} style={styles.medicalTitle}>Joindre mes infos vitales</Text>
            <Text maxFontSizeMultiplier={1.6} style={styles.medicalSub}>Groupe sanguin et allergies uniquement.</Text>
          </View>
          <Switch
            accessibilityLabel="Joindre mes informations médicales"
            value={includeMedical}
            onValueChange={setIncludeMedical}
            trackColor={{ false: colors.hairline, true: colors.green }}
            thumbColor={colors.white}
          />
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          label={
            smsRecipients.length
              ? `Envoyer un SMS à ${smsRecipients.length} contact${smsRecipients.length > 1 ? 's' : ''}`
              : 'Ouvrir le SMS de secours'
          }
          onPress={() => void sendSms()}
          variant="outline"
          icon={<MessageSquareText size={21} color={colors.sand} />}
        />
        {alternateNumbers.length ? (
          <View style={styles.alternates}>
            <Text maxFontSizeMultiplier={1.4} style={styles.alternateHeading}>Si le numéro principal ne répond pas</Text>
            <View style={styles.alternateGrid}>
              {alternateNumbers.map((item) => (
                <Pressable
                  key={item.number}
                  accessibilityRole="button"
                  accessibilityLabel={`Appeler ${item.name} au ${item.number}`}
                  onPress={() => confirmCall(item.dialNumber, item.name)}
                  style={({ pressed }) => [styles.alternate, pressed && styles.alternatePressed]}
                >
                  <Text maxFontSizeMultiplier={1.3} style={styles.alternateNumber}>{item.number}</Text>
                  <Text maxFontSizeMultiplier={1.45} style={styles.alternateName}>{item.name}</Text>
                  <Text maxFontSizeMultiplier={1.4} style={styles.alternateScope}>{item.category === 'orientation' ? 'ORIENTATION' : 'ALTERNATIVE'}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        {showBleDisclosure && canBroadcastBle ? (
          <Card style={styles.bleDisclosureCard}>
            <View style={styles.disclosureTop}>
              <RadioTower size={22} color={colors.greenLight} />
              <View style={styles.disclosureCopy}>
                <Text maxFontSizeMultiplier={1.5} style={styles.disclosureTitle}>Alerter les téléphones proches</Text>
                <Text maxFontSizeMultiplier={1.7} style={styles.disclosureText}>Si le réseau passe mal, les téléphones SOS autour de vous peuvent transmettre l'alerte. Android affiche une notification tant que le partage est actif. Votre dossier médical reste privé.</Text>
              </View>
            </View>
            <Button
              label="Autoriser et alerter"
              onPress={() => void acceptBleDisclosureAndSend()}
              variant="green"
              loading={meshSending}
              disabled={meshSending}
              icon={<RadioTower size={19} color={colors.black} />}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Refuser le relais Bluetooth pour le moment" onPress={() => setShowBleDisclosure(false)}>
              <Text maxFontSizeMultiplier={1.5} style={styles.withoutLocation}>Pas maintenant</Text>
            </Pressable>
          </Card>
        ) : null}
        {canBroadcastBle ? (
          <Button
            label={
              meshSending
                ? 'Partage en cours…'
                : meshSent
                  ? 'Partager à nouveau autour de moi'
                  : 'Alerter autour de moi'
            }
            onPress={() => void sendMesh()}
            variant={meshSent && !meshSending ? 'green' : 'soft'}
            icon={<RadioTower size={21} color={meshSent && !meshSending ? colors.black : colors.blue} />}
            loading={meshSending}
            disabled={meshSending}
          />
        ) : (
          <Button
            label="Recevoir les alertes proches"
            onPress={() => router.push('/mesh')}
            variant="soft"
            icon={<RadioTower size={21} color={colors.blue} />}
          />
        )}
      </View>

      <View style={styles.privacy}>
        <CircleAlert size={16} color={colors.sandFaint} />
        <Text maxFontSizeMultiplier={1.7} style={styles.privacyText}>Le message est préparé pour vous. Vous choisissez toujours le destinataire et confirmez l'envoi.</Text>
      </View>
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

const styles = StyleSheet.create({
  lead: { ...type.heading, marginTop: spacing.xs },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  type: {
    width: '31.7%',
    minHeight: 92,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.raised,
  },
  typeSelected: { borderColor: colors.alert, backgroundColor: colors.alertDark },
  typeLabel: { fontFamily: font.bodyMedium, fontSize: 12, color: colors.sandMuted },
  typeLabelSelected: { color: colors.sand },
  check: { position: 'absolute', top: 7, right: 7, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.alert },
  bleDisclosureCard: { gap: spacing.sm, backgroundColor: colors.greenDark, borderColor: '#BFE8D1' },
  disclosureTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  disclosureCopy: { flex: 1 },
  disclosureTitle: { fontFamily: font.bodyBold, fontSize: 13, color: colors.sand },
  disclosureText: { ...type.small, fontSize: 12, lineHeight: 17, marginTop: 3 },
  withoutLocation: { fontFamily: font.bodyBold, fontSize: 12, color: colors.sandMuted, textAlign: 'center', paddingVertical: spacing.xs },
  locationLine: {
    minHeight: 44,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  locationStatus: { ...type.small, flex: 1, color: colors.sand },
  locationStatusOk: { color: colors.greenLight },
  locationAction: { fontFamily: font.bodyBold, fontSize: 12, color: colors.amber, paddingVertical: spacing.xs },
  locationSkip: { fontFamily: font.bodyBold, fontSize: 12, color: colors.sandMuted, paddingVertical: spacing.xs },
  medicalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
  medicalCopy: { flex: 1 },
  medicalTitle: { fontFamily: font.bodyBold, fontSize: 13, color: colors.sand },
  medicalSub: { ...type.small, fontSize: 11 },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  callPrep: { gap: 4, backgroundColor: colors.amberDark, borderColor: '#F1D9A4' },
  callPrepLabel: { ...type.eyebrow, fontSize: 11, color: colors.amber },
  callPrepText: { ...type.small, color: colors.sand, fontSize: 12, lineHeight: 17 },
  alternates: { gap: spacing.xs },
  alternateHeading: { ...type.eyebrow, fontSize: 11 },
  alternateGrid: { flexDirection: 'row', gap: spacing.xs },
  alternate: { flex: 1, minHeight: 92, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline },
  alternatePressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  alternateNumber: { fontFamily: font.display, fontSize: 20, color: colors.green },
  alternateName: { fontFamily: font.bodyBold, fontSize: 11, lineHeight: 14, color: colors.sand, marginTop: 2 },
  alternateScope: { ...type.eyebrow, fontSize: 11, color: colors.sandFaint, marginTop: 'auto' },
  privacy: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.sm },
  privacyText: { ...type.small, flex: 1, fontSize: 12, lineHeight: 17 },
});
