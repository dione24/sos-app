import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { Camera, Edit3, FileInput, QrCode, Save, Share2, ShieldCheck } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Screen } from '@/components/Screen';
import { Badge, Button, Card, Field, SectionTitle } from '@/components/ui';
import { colors, font, radius, spacing, type } from '@/constants/theme';
import { getContacts, getProfile, replaceContacts, replaceProfileFromImport, saveProfile } from '@/db/database';
import { createMedicalExport, parseMedicalExport } from '@/lib/medical-export';
import { isValidEmergencyPhone } from '@/lib/sos';
import type { EmergencyContact, MedicalProfile } from '@/types/models';

const emptyProfile = (): MedicalProfile => ({
  phone: '+223 ',
  name: '',
  bloodType: '',
  allergies: '',
  treatments: '',
  history: '',
  photoUri: null,
  includeInSos: false,
  updatedAt: Date.now(),
});

const emptyContacts = (): EmergencyContact[] => [
  { name: '', phone: '+223 ' },
  { name: '', phone: '+223 ' },
];

function cloneProfile(value: MedicalProfile): MedicalProfile {
  return { ...value };
}

function cloneContacts(value: EmergencyContact[]): EmergencyContact[] {
  return value.map((contact) => ({ ...contact }));
}

export default function ProfileScreen() {
  const db = useSQLiteContext();
  const [profile, setProfile] = useState<MedicalProfile>(emptyProfile);
  const [contacts, setContacts] = useState<EmergencyContact[]>(emptyContacts);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [loadedPhone, setLoadedPhone] = useState<string | null>(null);
  const editSnapshot = useRef<{ profile: MedicalProfile; contacts: EmergencyContact[] } | null>(null);

  useEffect(() => {
    let mounted = true;
    void getProfile(db).then(async (stored) => {
      if (!mounted) return;
      if (stored) {
        setProfile(stored);
        setLoadedPhone(stored.phone);
        const storedContacts = await getContacts(db, stored.phone);
        setContacts([...storedContacts, ...emptyContacts()].slice(0, 2));
      } else {
        setEditing(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, [db]);

  const exportPayload = useMemo(
    () => loadedPhone ? JSON.stringify(createMedicalExport(profile, contacts)) : '',
    [contacts, loadedPhone, profile],
  );
  const exportBytes = useMemo(() => new TextEncoder().encode(exportPayload).byteLength, [exportPayload]);

  function update<K extends keyof MedicalProfile>(key: K, value: MedicalProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function updateContact(index: number, key: 'name' | 'phone', value: string) {
    setContacts((current) => current.map((contact, itemIndex) => itemIndex === index ? { ...contact, [key]: value } : contact));
  }

  function beginEditing() {
    editSnapshot.current = {
      profile: cloneProfile(profile),
      contacts: cloneContacts(contacts),
    };
    setEditing(true);
  }

  function discardEdits() {
    const snapshot = editSnapshot.current;
    if (snapshot) {
      setProfile(cloneProfile(snapshot.profile));
      setContacts(cloneContacts(snapshot.contacts));
    }
    editSnapshot.current = null;
    setEditing(false);
  }

  function requestDiscardEdits() {
    if (!loadedPhone) {
      // First-time setup has nothing saved to restore against.
      setEditing(false);
      return;
    }
    Alert.alert(
      'Abandonner les modifications ?',
      'Les changements non enregistrés seront perdus.',
      [
        { text: 'Continuer l\'édition', style: 'cancel' },
        { text: 'Abandonner', style: 'destructive', onPress: discardEdits },
      ],
    );
  }

  async function save() {
    if (!isValidEmergencyPhone(profile.phone)) {
      Alert.alert('Numéro requis', 'Saisissez un numéro complet (au moins 8 chiffres). Le préfixe +223 seul ne suffit pas.');
      return;
    }
    setSaving(true);
    try {
      const next = { ...profile, name: profile.name.trim(), phone: profile.phone.trim(), updatedAt: Date.now() };
      await saveProfile(db, next);
      await replaceContacts(db, next.phone, contacts);
      setProfile(next);
      setLoadedPhone(next.phone);
      editSnapshot.current = null;
      setEditing(false);
      Alert.alert('Dossier enregistré', 'Les données restent uniquement sur cet appareil.');
    } finally {
      setSaving(false);
    }
  }

  async function choosePhoto() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled) update('photoUri', result.assets[0]?.uri ?? null);
    } catch {
      Alert.alert('Photo indisponible', "Le sélecteur d'images n'est pas accessible sur cet appareil.");
    }
  }

  async function shareFile() {
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert('Partage indisponible', "Le menu de partage n'est pas accessible sur cet appareil.");
      return;
    }
    const file = new File(Paths.cache, 'dossier-sos-mali.json');
    try {
      file.create({ overwrite: true });
      file.write(exportPayload);
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Exporter mon dossier SOS Mali' });
    } finally {
      if (file.exists) file.delete();
    }
  }

  async function importFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets[0]) return;
    try {
      const imported = parseMedicalExport(await new File(result.assets[0].uri).text());
      Alert.alert(
        'Importer ce dossier ?',
        `Le dossier de ${imported.profile.name || imported.profile.phone} remplacera les informations affichées. La photo n'est jamais importée.`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Importer',
            onPress: () => {
              const next: MedicalProfile = {
                ...imported.profile,
                photoUri: null,
                updatedAt: Date.now(),
              };
              void replaceProfileFromImport(db, next, imported.contacts)
                .then(() => {
                  setProfile(next);
                  setContacts([...imported.contacts, ...emptyContacts()].slice(0, 2));
                  setLoadedPhone(next.phone);
                  setEditing(false);
                  Alert.alert('Dossier importé', 'Le fichier a été vérifié puis enregistré en sécurité.');
                })
                .catch(() => Alert.alert('Import impossible', "Le dossier n'a pas pu être enregistré."));
            },
          },
        ],
      );
    } catch {
      Alert.alert('Fichier refusé', "Ce fichier n'est pas un export SOS Mali V2 valide ou dépasse les limites autorisées.");
    }
  }

  const initials = profile.name ? profile.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase() : '—';

  return (
    <Screen clearFab>
      <AppHeader
        title="Dossier médical"
        eyebrow="Mes informations"
        action={
          <Pressable
            accessibilityRole="button"
            onPress={() => (editing ? requestDiscardEdits() : beginEditing())}
            accessibilityLabel={editing ? 'Abandonner les modifications' : 'Modifier le dossier'}
            style={styles.editButton}
          >
            <Edit3 size={20} color={editing ? colors.alert : colors.sandMuted} />
          </Pressable>
        }
      />

      <View style={styles.identity}>
        <Pressable accessibilityRole="button" accessibilityLabel="Choisir une photo de profil" accessibilityState={{ disabled: !editing }} disabled={!editing} onPress={() => void choosePhoto()} style={styles.avatar}>
          {profile.photoUri ? <Image source={{ uri: profile.photoUri }} style={styles.avatarImage} /> : <Text maxFontSizeMultiplier={1.2} style={styles.initials}>{initials}</Text>}
          {editing ? <View style={styles.camera}><Camera size={12} color={colors.black} /></View> : null}
        </Pressable>
        <View style={styles.identityCopy}>
          <Text maxFontSizeMultiplier={1.3} style={styles.name}>{profile.name || 'Dossier à compléter'}</Text>
          <Text maxFontSizeMultiplier={1.5} style={styles.phone}>{profile.phone || 'Aucun numéro'}</Text>
          <Badge label="protégé sur ce téléphone" tone="green" dot />
        </View>
      </View>

      {editing ? (
        <>
          <SectionTitle title="Identité" />
          <Card style={styles.form}>
            <Field label="Nom complet" value={profile.name} onChangeText={(value) => update('name', value)} placeholder="Nom et prénom" maxLength={120} />
            <Field
              label="Numéro de téléphone"
              value={profile.phone}
              onChangeText={(value) => update('phone', value)}
              editable={!loadedPhone}
              maxLength={32}
              keyboardType="phone-pad"
              hint={
                loadedPhone
                  ? "Pour changer ce numéro : Confidentialité → Effacer toutes mes données, puis recréez le dossier."
                  : "Ce numéro sera ajouté à vos messages de secours. Aucun SMS de vérification."
              }
            />
          </Card>

          <SectionTitle title="Informations vitales" />
          <Card style={styles.form}>
            <Field label="Groupe sanguin" value={profile.bloodType} onChangeText={(value) => update('bloodType', value)} placeholder="Ex. O+" autoCapitalize="characters" maxLength={8} />
            <Field label="Allergies" value={profile.allergies} onChangeText={(value) => update('allergies', value)} placeholder="Ex. pénicilline" multiline maxLength={500} />
            <Field label="Traitements en cours" value={profile.treatments} onChangeText={(value) => update('treatments', value)} placeholder="Médicaments et doses" multiline maxLength={500} />
            <Field label="Antécédents notables" value={profile.history} onChangeText={(value) => update('history', value)} placeholder="Ex. diabète, asthme…" multiline maxLength={500} />
          </Card>

          <SectionTitle title="Contacts d'urgence" aside="2 maximum" />
          {contacts.map((contact, index) => (
            <Card key={index} style={styles.contactCard}>
              <Text maxFontSizeMultiplier={1.4} style={styles.contactIndex}>CONTACT {index + 1}</Text>
              <Field label="Nom" value={contact.name} onChangeText={(value) => updateContact(index, 'name', value)} placeholder="Nom du proche" maxLength={80} />
              <Field label="Téléphone" value={contact.phone} onChangeText={(value) => updateContact(index, 'phone', value)} keyboardType="phone-pad" maxLength={32} />
            </Card>
          ))}

          <Card style={styles.optIn}>
            <View style={styles.optInIcon}><ShieldCheck size={21} color={colors.green} /></View>
            <View style={styles.optInCopy}>
              <Text maxFontSizeMultiplier={1.5} style={styles.optInTitle}>Inclure dans mes SOS</Text>
              <Text maxFontSizeMultiplier={1.7} style={styles.optInSub}>Seulement groupe sanguin et allergies, après confirmation.</Text>
            </View>
            <Switch
              accessibilityLabel="Inclure le groupe sanguin et les allergies dans le SMS SOS après confirmation"
              value={profile.includeInSos}
              onValueChange={(value) => update('includeInSos', value)}
              trackColor={{ false: colors.hairline, true: colors.green }}
              thumbColor={colors.white}
            />
          </Card>

          <Button label="Enregistrer" onPress={() => void save()} loading={saving} icon={<Save size={20} color={colors.black} />} />
        </>
      ) : (
        <>
          <SectionTitle title="Informations vitales" />
          <Card style={styles.summary}>
            <SummaryRow label="Groupe sanguin" value={profile.bloodType || 'Non renseigné'} emphasis />
            <SummaryRow label="Allergies" value={profile.allergies || 'Aucune renseignée'} />
            <SummaryRow label="Traitements" value={profile.treatments || 'Aucun renseigné'} />
            <SummaryRow label="Antécédents" value={profile.history || 'Aucun renseigné'} />
          </Card>
          <SectionTitle title="Contacts d'urgence" />
          <Card style={styles.summary}>
            {contacts.filter((item) => item.name.trim() || isValidEmergencyPhone(item.phone)).length
              ? contacts
                .filter((item) => item.name.trim() || isValidEmergencyPhone(item.phone))
                .map((contact, index) => <SummaryRow key={index} label={contact.name.trim() || 'Contact'} value={contact.phone} />)
              : <Text maxFontSizeMultiplier={1.7} style={styles.empty}>Aucun contact enregistré.</Text>}
          </Card>
          <Card style={styles.optIn}>
            <ShieldCheck size={22} color={profile.includeInSos ? colors.green : colors.sandFaint} />
            <View style={styles.optInCopy}>
              <Text maxFontSizeMultiplier={1.5} style={styles.optInTitle}>Partage SOS {profile.includeInSos ? 'autorisé' : 'désactivé'}</Text>
              <Text maxFontSizeMultiplier={1.7} style={styles.optInSub}>Une confirmation reste demandée au déclenchement.</Text>
            </View>
          </Card>
        </>
      )}

      {!loadedPhone ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Importer un dossier SOS Mali depuis un fichier JSON" onPress={() => void importFile()} style={styles.importButton}>
          <FileInput size={21} color={colors.green} />
          <View style={styles.importCopy}><Text maxFontSizeMultiplier={1.4} style={styles.exportText}>Importer un dossier V2</Text><Text maxFontSizeMultiplier={1.7} style={styles.importSub}>Transférer un export depuis un ancien téléphone</Text></View>
        </Pressable>
      ) : null}

      {loadedPhone ? (
        <>
          <SectionTitle title="Partager mon dossier" />
          <View style={styles.exportRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showQr ? 'Masquer le QR médical' : 'Afficher le QR médical'}
              onPress={() => {
                if (showQr) return setShowQr(false);
                if (exportBytes > 1_800) {
                  return Alert.alert('Dossier trop détaillé pour un QR fiable', "Utilisez l'export fichier, qui conserve toutes les informations.");
                }
                setShowQr(true);
              }}
              style={styles.exportButton}
            >
              <QrCode size={21} color={colors.amber} />
              <Text maxFontSizeMultiplier={1.4} style={styles.exportText}>QR médical</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Partager le dossier médical comme fichier JSON" onPress={() => void shareFile()} style={styles.exportButton}>
              <Share2 size={21} color={colors.blue} />
              <Text maxFontSizeMultiplier={1.4} style={styles.exportText}>Fichier</Text>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Importer un dossier SOS Mali depuis un fichier JSON" onPress={() => void importFile()} style={styles.importButton}>
            <FileInput size={21} color={colors.green} />
            <View style={styles.importCopy}><Text maxFontSizeMultiplier={1.4} style={styles.exportText}>Importer un dossier</Text><Text maxFontSizeMultiplier={1.7} style={styles.importSub}>Le fichier est vérifié avant d'être ajouté</Text></View>
          </Pressable>
          {showQr ? (
            <Card style={styles.qrCard}>
              <View style={styles.qrSurface}><QRCode value={exportPayload} size={210} backgroundColor={colors.white} color={colors.black} /></View>
              <Text maxFontSizeMultiplier={1.7} style={styles.qrWarning}>Ce QR contient des données médicales. Montrez-le uniquement à une personne de confiance.</Text>
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function SummaryRow({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text maxFontSizeMultiplier={1.7} style={styles.summaryLabel}>{label}</Text>
      <Text maxFontSizeMultiplier={1.5} style={[styles.summaryValue, emphasis && styles.summaryEmphasis]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  editButton: { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.raised, borderWidth: 1, borderColor: colors.hairline },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  avatar: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.amberDark, borderWidth: 2, borderColor: colors.amber },
  avatarImage: { width: 72, height: 72, borderRadius: 36 },
  initials: { fontFamily: font.display, fontSize: 24, color: colors.amber },
  camera: { position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.amber },
  identityCopy: { flex: 1, gap: 4 },
  name: { ...type.title, fontSize: 21 },
  phone: { ...type.small, marginBottom: 3 },
  form: { gap: spacing.lg },
  contactCard: { gap: spacing.md },
  contactIndex: { ...type.eyebrow, color: colors.amber },
  optIn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  optInIcon: { width: 42, height: 42, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenDark },
  optInCopy: { flex: 1 },
  optInTitle: { fontFamily: font.bodyBold, fontSize: 13, color: colors.sand },
  optInSub: { ...type.small, fontSize: 11, lineHeight: 16, marginTop: 2 },
  summary: { paddingVertical: 2 },
  summaryRow: { minHeight: 54, paddingVertical: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  summaryLabel: { ...type.small, flex: 1 },
  summaryValue: { fontFamily: font.bodyMedium, fontSize: 14, color: colors.sand, flex: 1.4, textAlign: 'right' },
  summaryEmphasis: { fontFamily: font.display, fontSize: 19, color: colors.alertLight },
  empty: { ...type.small, paddingVertical: spacing.md },
  exportRow: { flexDirection: 'row', gap: spacing.sm },
  exportButton: { flex: 1, minHeight: 54, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.raised },
  exportText: { fontFamily: font.bodyBold, fontSize: 13, color: colors.sand },
  importButton: { minHeight: 62, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.raised },
  importCopy: { flex: 1 },
  importSub: { ...type.small, fontSize: 11, marginTop: 2 },
  qrCard: { alignItems: 'center', gap: spacing.md },
  qrSurface: { padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.white },
  qrWarning: { ...type.small, textAlign: 'center', fontSize: 11, color: colors.amber },
});
