import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import Camera from 'lucide-react-native/icons/camera';
import FileInput from 'lucide-react-native/icons/file-input';
import Pencil from 'lucide-react-native/icons/pencil';
import QrCode from 'lucide-react-native/icons/qr-code';
import Save from 'lucide-react-native/icons/save';
import Share2 from 'lucide-react-native/icons/share-2';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import X from 'lucide-react-native/icons/x';
import QRCode from 'react-native-qrcode-svg';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Screen } from '@/components/Screen';
import { Button, Card, Divider, Field, IconButton, IconTile, ListGroup, ListRow, Notice, SectionHeader, Tag, ToggleRow } from '@/components/ui';
import { getContacts, getProfile, replaceProfileFromImport, saveProfileWithContacts } from '@/db/database';
import { validateMedicalDraft } from '@/lib/medical-draft';
import { createMedicalExport, readMedicalImport } from '@/lib/medical-export';
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
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [loadedPhone, setLoadedPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const editSnapshot = useRef<{ profile: MedicalProfile; contacts: EmergencyContact[] } | null>(null);
  const transferBusy = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setLoadError(false);
    void getProfile(db).then(async (stored) => {
      const storedContacts = stored ? await getContacts(db, stored.phone) : [];
      if (!mounted) return;
      // Expose the dossier and its contacts together. Saving placeholders while
      // the contacts query was still pending could erase existing contacts.
      setProfile(stored ?? emptyProfile());
      setLoadedPhone(stored?.phone ?? null);
      setContacts([...storedContacts, ...emptyContacts()].slice(0, 2));
      setEditing(!stored);
    }).catch(() => {
      if (mounted) setLoadError(true);
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [db, loadAttempt]);

  function update<K extends keyof MedicalProfile>(key: K, value: MedicalProfile[K]) {
    if (transferBusy.current || saving) return;
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function updateContact(index: number, key: 'name' | 'phone', value: string) {
    if (transferBusy.current || saving) return;
    setContacts((current) => current.map((contact, itemIndex) => itemIndex === index ? { ...contact, [key]: value } : contact));
  }

  function beginEditing() {
    if (transferBusy.current || saving) return;
    setQrPayload(null);
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
    if (transferBusy.current || saving) return;
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
    if (saving || transferBusy.current || loading || loadError) return;
    const validation = validateMedicalDraft(profile, contacts);
    if (!validation.ok) {
      Alert.alert('Vérifiez le dossier', validation.message);
      return;
    }
    setSaving(true);
    try {
      const next = { ...profile, name: profile.name.trim(), phone: profile.phone.trim(), updatedAt: Date.now() };
      await saveProfileWithContacts(db, next, validation.contacts);
      if (!alive.current) return;
      setProfile(next);
      setContacts([...validation.contacts, ...emptyContacts()].slice(0, 2));
      setLoadedPhone(next.phone);
      editSnapshot.current = null;
      setEditing(false);
      Alert.alert('Dossier enregistré', 'Les données restent uniquement sur cet appareil.');
    } catch {
      if (alive.current) Alert.alert('Enregistrement impossible', "Vos modifications restent à l'écran. Réessayez pour les enregistrer.");
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
    if (transferBusy.current || editing || !loadedPhone) return;
    transferBusy.current = true;
    const file = new File(Paths.cache, 'dossier-sos-mali.json');
    try {
      const payload = JSON.stringify(createMedicalExport(profile, contacts));
      const available = await Sharing.isAvailableAsync();
      if (!alive.current) return;
      if (!available) {
        Alert.alert('Partage indisponible', "Le menu de partage n'est pas accessible sur cet appareil.");
        return;
      }
      file.create({ overwrite: true });
      file.write(payload);
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Exporter mon dossier Nafalan' });
    } catch {
      Alert.alert('Export impossible', 'Vérifiez les informations et les numéros du dossier, puis réessayez.');
    } finally {
      try { if (file.exists) file.delete(); } catch {
        Alert.alert('Nettoyage à réessayer', 'La copie temporaire reste dans le stockage privé de l’application. Vous pouvez la retirer avec « Effacer toutes mes données ».');
      } finally { transferBusy.current = false; }
    }
  }

  async function importFile() {
    if (transferBusy.current || saving) return;
    if (editing && loadedPhone) {
      Alert.alert('Modification en cours', 'Enregistrez ou annulez vos modifications avant d’importer un dossier.');
      return;
    }
    transferBusy.current = true;
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true, multiple: false });
      if (result.canceled || !result.assets[0]) return;
      const copy = new File(result.assets[0].uri);
      if (!alive.current) { if (copy.exists) copy.delete(); return; }
      const imported = await readMedicalImport(copy);
      if (!alive.current) return;
      // Keep the operation lock until the confirmation AND its transaction end.
      await new Promise<void>((resolve) => {
        Alert.alert(
          'Importer ce dossier ?',
          `Le dossier de ${imported.profile.name || imported.profile.phone} remplacera les informations affichées. La photo n'est jamais importée.`,
          [
            { text: 'Annuler', style: 'cancel', onPress: () => resolve() },
            {
              text: 'Importer',
              onPress: () => {
                if (!alive.current) { resolve(); return; }
                const next: MedicalProfile = { ...imported.profile, photoUri: null, updatedAt: Date.now() };
                void replaceProfileFromImport(db, next, imported.contacts)
                  .then(() => {
                    if (!alive.current) return;
                    setProfile(next);
                    setContacts([...imported.contacts, ...emptyContacts()].slice(0, 2));
                    setLoadedPhone(next.phone);
                    setQrPayload(null);
                    setEditing(false);
                    Alert.alert('Dossier importé', 'Le fichier a été vérifié puis enregistré en sécurité.');
                  })
                  .catch(() => { if (alive.current) Alert.alert('Import impossible', "Le dossier n'a pas pu être enregistré."); })
                  .finally(resolve);
              },
            },
          ],
          { cancelable: true, onDismiss: resolve },
        );
      });
    } catch {
      if (alive.current) Alert.alert('Fichier refusé', "Choisissez un export Nafalan V2 valide de 32 Ko maximum.");
    } finally {
      transferBusy.current = false;
    }
  }

  function toggleQr() {
    if (qrPayload) return setQrPayload(null);
    if (editing || !loadedPhone) return;
    try {
      const payload = JSON.stringify(createMedicalExport(profile, contacts));
      if (new TextEncoder().encode(payload).byteLength > 1_800) {
        Alert.alert('Dossier trop détaillé pour un QR fiable', "Utilisez l'export fichier, qui conserve toutes les informations.");
        return;
      }
      setQrPayload(payload);
    } catch {
      Alert.alert('QR indisponible', 'Vérifiez les informations et les numéros du dossier avant de le partager.');
    }
  }

  const initials = profile.name ? profile.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase() : '—';
  const savedContacts = contacts.filter((item) => item.name.trim() || isValidEmergencyPhone(item.phone));

  if (loading || loadError) {
    return (
      <Screen clearFab ready={false}>
        <AppHeader title="Dossier médical" subtitle="Protégé sur ce téléphone" />
        <Notice text={loadError ? 'Le dossier n’a pas pu être lu. Vos données enregistrées sont conservées.' : 'Chargement du dossier et des contacts…'} />
        {loadError ? <Button label="Réessayer" onPress={() => setLoadAttempt((value) => value + 1)} /> : null}
      </Screen>
    );
  }

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
          accessibilityLabel="Importer un dossier Nafalan depuis un fichier JSON"
          onPress={() => void importFile()}
        />
      ) : null}

      {loadedPhone ? (
        <>
          <SectionHeader title="Partager mon dossier" />
          <View style={s.exportRow}>
            <Button
              label={qrPayload ? 'Masquer le QR' : 'QR médical'}
              variant="secondary"
              accessibilityLabel={qrPayload ? 'Masquer le QR médical' : 'Afficher le QR médical'}
              icon={<QrCode size={20} color={colors.ink} />}
              onPress={toggleQr}
              disabled={editing || saving}
              style={s.exportButton}
            />
            <Button label="Fichier" variant="secondary" accessibilityLabel="Partager le dossier médical comme fichier JSON" icon={<Share2 size={20} color={colors.ink} />} onPress={() => void shareFile()} disabled={editing || saving} style={s.exportButton} />
          </View>
          <ListRow
            title="Importer un dossier"
            subtitle="Le fichier est vérifié avant d'être ajouté"
            leading={<IconTile tone="neutral"><FileInput size={22} color={colors.inkMuted} /></IconTile>}
            chevron
            accessibilityLabel="Importer un dossier Nafalan depuis un fichier JSON"
            onPress={() => void importFile()}
          />
          {qrPayload && !editing ? (
            <Card style={s.qrCard}>
              <View style={s.qrSurface}><QRCode value={qrPayload} size={210} backgroundColor="#FFFFFF" color="#0F172A" /></View>
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
