import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { Camera, FileInput, Pencil, QrCode, Save, Share2, ShieldCheck, X } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Screen } from '@/components/Screen';
import { Button, Card, Divider, Field, IconButton, IconTile, ListGroup, ListRow, Notice, SectionHeader, Tag, ToggleRow } from '@/components/ui';
import { getContacts, getProfile, replaceContacts, replaceProfileFromImport, saveProfile } from '@/db/database';
import { createMedicalExport, parseMedicalExport } from '@/lib/medical-export';
import { isValidEmergencyPhone } from '@/lib/sos';
import { makeStyles, useTheme } from '@/theme';
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
  const s = useStyles();
  const { colors } = useTheme();
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
    editSnapshot.current = { profile: cloneProfile(profile), contacts: cloneContacts(contacts) };
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
      // Premier remplissage : rien d'enregistré à restaurer.
      setEditing(false);
      return;
    }
    Alert.alert('Abandonner les modifications ?', 'Les changements non enregistrés seront perdus.', [
      { text: "Continuer l'édition", style: 'cancel' },
      { text: 'Abandonner', style: 'destructive', onPress: discardEdits },
    ]);
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
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
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
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true, multiple: false });
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
              const next: MedicalProfile = { ...imported.profile, photoUri: null, updatedAt: Date.now() };
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
  const savedContacts = contacts.filter((item) => item.name.trim() || isValidEmergencyPhone(item.phone));

  return (
    <Screen clearFab>
      <AppHeader
        title="Dossier médical"
        subtitle="Protégé sur ce téléphone, jamais envoyé"
        action={
          <IconButton
            accessibilityLabel={editing ? 'Abandonner les modifications' : 'Modifier le dossier'}
            icon={editing ? <X size={22} color={colors.dangerText} /> : <Pencil size={22} color={colors.inkMuted} />}
            onPress={() => (editing ? requestDiscardEdits() : beginEditing())}
          />
        }
      />

      <Card style={s.identity}>
        <Pressable accessibilityRole="button" accessibilityLabel="Choisir une photo de profil" accessibilityState={{ disabled: !editing }} disabled={!editing} onPress={() => void choosePhoto()} style={s.avatar}>
          {profile.photoUri ? <Image source={{ uri: profile.photoUri }} style={s.avatarImage} /> : <Text maxFontSizeMultiplier={1.2} style={s.initials}>{initials}</Text>}
          {editing ? <View style={s.camera}><Camera size={14} color={colors.onPrimary} /></View> : null}
        </Pressable>
        <View style={s.identityCopy}>
          <Text maxFontSizeMultiplier={1.3} style={s.name}>{profile.name || 'Dossier à compléter'}</Text>
          <Text maxFontSizeMultiplier={1.4} style={s.phone}>{loadedPhone ? profile.phone : 'Aucun numéro enregistré'}</Text>
          {profile.bloodType ? <Tag label={`Groupe sanguin ${profile.bloodType}`} tone="neutral" /> : null}
        </View>
      </Card>

      {editing ? (
        <>
          <SectionHeader title="Identité" />
          <Card style={s.form}>
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
                  ? 'Pour changer ce numéro : Confidentialité → Effacer toutes mes données, puis recréez le dossier.'
                  : 'Ce numéro sera ajouté à vos messages de secours. Aucun SMS de vérification.'
              }
            />
          </Card>

          <SectionHeader title="Informations vitales" />
          <Card style={s.form}>
            <Field label="Groupe sanguin" value={profile.bloodType} onChangeText={(value) => update('bloodType', value)} placeholder="Ex. O+" autoCapitalize="characters" maxLength={8} />
            <Field label="Allergies" value={profile.allergies} onChangeText={(value) => update('allergies', value)} placeholder="Ex. pénicilline" multiline maxLength={500} />
            <Field label="Traitements en cours" value={profile.treatments} onChangeText={(value) => update('treatments', value)} placeholder="Médicaments et doses" multiline maxLength={500} />
            <Field label="Antécédents notables" value={profile.history} onChangeText={(value) => update('history', value)} placeholder="Ex. diabète, asthme…" multiline maxLength={500} />
          </Card>

          <SectionHeader title="Contacts d'urgence" aside="2 maximum" />
          {contacts.map((contact, index) => (
            <Card key={index} style={s.form}>
              <Text maxFontSizeMultiplier={1.4} style={s.contactIndex}>Contact {index + 1}</Text>
              <Field label="Nom" value={contact.name} onChangeText={(value) => updateContact(index, 'name', value)} placeholder="Nom du proche" maxLength={80} />
              <Field label="Téléphone" value={contact.phone} onChangeText={(value) => updateContact(index, 'phone', value)} keyboardType="phone-pad" maxLength={32} />
            </Card>
          ))}

          <ToggleRow
            title="Inclure dans mes SOS"
            subtitle="Seulement groupe sanguin et allergies, après confirmation."
            accessibilityLabel="Inclure le groupe sanguin et les allergies dans le SMS SOS après confirmation"
            value={profile.includeInSos}
            onValueChange={(value) => update('includeInSos', value)}
            leading={<IconTile tone="primary"><ShieldCheck size={22} color={colors.primaryText} /></IconTile>}
          />

          <Button label="Enregistrer" onPress={() => void save()} loading={saving} icon={<Save size={20} color={colors.onPrimary} />} />
        </>
      ) : (
        <>
          <SectionHeader title="Informations vitales" />
          <ListGroup>
            <SummaryRow label="Groupe sanguin" value={profile.bloodType || 'Non renseigné'} emphasis={Boolean(profile.bloodType)} />
            <Divider inset />
            <SummaryRow label="Allergies" value={profile.allergies || 'Aucune renseignée'} />
            <Divider inset />
            <SummaryRow label="Traitements" value={profile.treatments || 'Aucun renseigné'} />
            <Divider inset />
            <SummaryRow label="Antécédents" value={profile.history || 'Aucun renseigné'} />
          </ListGroup>

          <SectionHeader title="Contacts d'urgence" />
          {savedContacts.length ? (
            <ListGroup>
              {savedContacts.map((contact, index) => (
                <View key={index}>
                  {index > 0 ? <Divider inset /> : null}
                  <SummaryRow label={contact.name.trim() || 'Contact'} value={contact.phone} />
                </View>
              ))}
            </ListGroup>
          ) : (
            <Notice text="Aucun contact enregistré. Ajoutez jusqu'à deux proches à prévenir par SMS." />
          )}

          <Notice
            icon={<ShieldCheck size={20} color={profile.includeInSos ? colors.primaryText : colors.inkFaint} />}
            tone={profile.includeInSos ? 'primary' : 'neutral'}
            title={`Partage SOS ${profile.includeInSos ? 'autorisé' : 'désactivé'}`}
            text="Une confirmation reste demandée au déclenchement."
          />
        </>
      )}

      {!loadedPhone ? (
        <ListRow
          title="Importer un dossier V2"
          subtitle="Transférer un export depuis un ancien téléphone"
          leading={<IconTile tone="neutral"><FileInput size={22} color={colors.inkMuted} /></IconTile>}
          chevron
          accessibilityLabel="Importer un dossier SOS Mali depuis un fichier JSON"
          onPress={() => void importFile()}
        />
      ) : null}

      {loadedPhone ? (
        <>
          <SectionHeader title="Partager mon dossier" />
          <View style={s.exportRow}>
            <Button
              label={showQr ? 'Masquer le QR' : 'QR médical'}
              variant="secondary"
              accessibilityLabel={showQr ? 'Masquer le QR médical' : 'Afficher le QR médical'}
              icon={<QrCode size={20} color={colors.ink} />}
              onPress={() => {
                if (showQr) return setShowQr(false);
                if (exportBytes > 1_800) {
                  return Alert.alert('Dossier trop détaillé pour un QR fiable', "Utilisez l'export fichier, qui conserve toutes les informations.");
                }
                setShowQr(true);
              }}
              style={s.exportButton}
            />
            <Button label="Fichier" variant="secondary" accessibilityLabel="Partager le dossier médical comme fichier JSON" icon={<Share2 size={20} color={colors.ink} />} onPress={() => void shareFile()} style={s.exportButton} />
          </View>
          <ListRow
            title="Importer un dossier"
            subtitle="Le fichier est vérifié avant d'être ajouté"
            leading={<IconTile tone="neutral"><FileInput size={22} color={colors.inkMuted} /></IconTile>}
            chevron
            accessibilityLabel="Importer un dossier SOS Mali depuis un fichier JSON"
            onPress={() => void importFile()}
          />
          {showQr ? (
            <Card style={s.qrCard}>
              <View style={s.qrSurface}><QRCode value={exportPayload} size={210} backgroundColor="#FFFFFF" color="#0F172A" /></View>
              <Text maxFontSizeMultiplier={1.5} style={s.qrWarning}>Ce QR contient des données médicales. Montrez-le uniquement à une personne de confiance.</Text>
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function SummaryRow({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  const s = useStyles();
  return (
    <View style={s.summaryRow}>
      <Text maxFontSizeMultiplier={1.5} style={s.summaryLabel}>{label}</Text>
      <Text maxFontSizeMultiplier={1.4} style={[s.summaryValue, emphasis && s.summaryEmphasis]}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  identity: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.primaryBg, borderWidth: 2, borderColor: t.colors.primaryBorder },
  avatarImage: { width: 68, height: 68, borderRadius: 34 },
  initials: { fontFamily: 'DMSans_700Bold', fontSize: 24, color: t.colors.primaryText },
  camera: { position: 'absolute', right: -2, bottom: -2, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.primary, borderWidth: 2, borderColor: t.colors.surface },
  identityCopy: { flex: 1, gap: 4 },
  name: { ...t.text.h3 },
  phone: { ...t.text.caption },
  form: { gap: t.spacing.md },
  contactIndex: { ...t.text.overline },
  summaryRow: { minHeight: 56, paddingHorizontal: t.spacing.md, paddingVertical: t.spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing.md },
  summaryLabel: { ...t.text.caption, flex: 1 },
  summaryValue: { ...t.text.bodyStrong, flex: 1.4, textAlign: 'right' },
  summaryEmphasis: { fontFamily: 'DMSans_700Bold', fontSize: 22, lineHeight: 28 },
  exportRow: { flexDirection: 'row', gap: t.spacing.sm },
  exportButton: { flex: 1 },
  qrCard: { alignItems: 'center', gap: t.spacing.md },
  qrSurface: { padding: t.spacing.md, borderRadius: t.radius.sm, backgroundColor: '#FFFFFF' },
  qrWarning: { ...t.text.caption, textAlign: 'center', color: t.colors.warningText },
}));
