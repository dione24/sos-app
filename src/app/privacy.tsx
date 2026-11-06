import { BellRing, Database, FileLock2, ImageIcon, MapPinned, Mail, RadioTower, ShieldCheck, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Screen } from '@/components/Screen';
import { Button, Card, Divider, IconTile, ListGroup, ListRow, Notice, SectionHeader, useToneColor, type Tone } from '@/components/ui';
import { PRIVACY_MAILTO, PUBLISHER, SUPPORT_MAILTO } from '@/constants/publisher';
import { clearAllUserData } from '@/db/database';
import { stopBleAdvertising } from '@/services/ble-mesh';
import { makeStyles, useTheme } from '@/theme';

type Entry = { icon: typeof MapPinned; title: string; text: string; tone: Tone };

const flows: Entry[] = [
  { icon: MapPinned, title: 'Position et météo', text: "Votre position est utilisée uniquement si vous choisissez la météo près de vous ou l'ajoutez à une alerte.", tone: 'info' },
  { icon: RadioTower, title: 'Alertes proches', text: "Le type d'urgence, l'heure et la position autorisée peuvent être transmis aux téléphones proches. Votre dossier médical reste privé.", tone: 'primary' },
  { icon: Database, title: 'Carte', text: 'Le service de carte reçoit uniquement la zone affichée. Il ne reçoit jamais votre dossier médical.', tone: 'neutral' },
];

const permissions: Entry[] = [
  { icon: MapPinned, title: 'Position', text: "Demandée seulement lorsque vous touchez « Utiliser ma position ». L'appel et le SMS restent disponibles sans.", tone: 'info' },
  { icon: RadioTower, title: 'Appareils à proximité', text: 'Demandée lorsque vous activez les alertes proches. Elle sert uniquement à détecter et transmettre les alertes SOS autour de vous.', tone: 'primary' },
  { icon: BellRing, title: 'Notifications', text: "Demandée sur Android pour montrer qu'une alerte proche est en cours et vous permettre de l'arrêter.", tone: 'warning' },
  { icon: ImageIcon, title: 'Photo facultative', text: "Vous choisissez vous-même une image pour votre dossier. L'application n'utilise ni la caméra ni le microphone.", tone: 'neutral' },
];

function EntryRow({ entry, first }: { entry: Entry; first: boolean }) {
  const color = useToneColor(entry.tone);
  const Icon = entry.icon;
  return (
    <>
      {!first ? <Divider inset /> : null}
      <ListRow inset title={entry.title} subtitle={entry.text} leading={<IconTile tone={entry.tone}><Icon size={22} color={color} /></IconTile>} />
    </>
  );
}

export default function PrivacyScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function eraseEverything() {
    if (deleting) return;
    setDeleting(true);
    try {
      await stopBleAdvertising();
      await clearAllUserData(db);
      router.replace('/onboarding');
    } catch {
      Alert.alert('Suppression interrompue', "Les données n'ont pas pu être effacées complètement. Réessayez. Si le problème continue, redémarrez l'application.");
    } finally {
      setDeleting(false);
    }
  }

  function requestDeletion() {
    if (deleting) return;
    Alert.alert(
      'Effacer toutes les données de ce téléphone ?',
      "Le dossier médical, les contacts, les préférences, les consentements et l'historique SOS seront supprimés de ce téléphone.",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Continuer',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Confirmation définitive',
              "Cette action est irréversible. L'application reviendra au premier démarrage.",
              [
                { text: 'Garder mes données', style: 'cancel' },
                { text: 'Tout effacer', style: 'destructive', onPress: () => void eraseEverything() },
              ],
            ),
        },
      ],
    );
  }

  return (
    <Screen>
      <AppHeader title="Confidentialité" subtitle="Vos données, vos choix" back />

      <Card tone="primary" style={s.hero}>
        <IconTile tone="primary" size={56}><FileLock2 size={28} color={colors.primaryText} /></IconTile>
        <View style={s.heroCopy}>
          <Text maxFontSizeMultiplier={1.3} style={s.heroTitle}>Vos données médicales restent sur ce téléphone</Text>
          <Text maxFontSizeMultiplier={1.5} style={s.heroText}>Elles sont protégées sur votre appareil. Aucun compte n'est requis et elles ne sont pas envoyées à SahelPay.</Text>
        </View>
      </Card>

      <SectionHeader title="Quand des informations sont partagées" aside="avec votre accord" />
      <ListGroup>
        {flows.map((entry, index) => <EntryRow key={entry.title} entry={entry} first={index === 0} />)}
      </ListGroup>

      <Notice icon={<ShieldCheck size={20} color={colors.primaryText} />} text="Appels, SMS, QR et fichiers ne sont ouverts ou partagés qu'après votre action. Aucun SMS silencieux et aucune publicité." />

      <SectionHeader title="Autorisations du téléphone" aside="seulement au besoin" />
      <ListGroup>
        {permissions.map((entry, index) => <EntryRow key={entry.title} entry={entry} first={index === 0} />)}
      </ListGroup>
      <Button label="Gérer les autorisations du téléphone" onPress={() => void Linking.openSettings()} variant="secondary" />

      <SectionHeader title="Vos droits" />
      <Card style={s.rights}>
        <Text maxFontSizeMultiplier={1.4} style={s.rightTitle}>Accès, correction et suppression</Text>
        <Text maxFontSizeMultiplier={1.5} style={s.rightText}>Vous pouvez consulter et modifier le dossier depuis l'onglet Dossier, exporter volontairement son contenu, ou supprimer ici toutes les données de ce téléphone.</Text>
        <Text maxFontSizeMultiplier={1.5} style={s.rightText}>Aucune donnée n'est vendue ni utilisée pour la publicité, le profilage ou le suivi inter-applications.</Text>
      </Card>

      <SectionHeader title="Éditeur et contact" />
      <Card style={s.publisher}>
        <Text maxFontSizeMultiplier={1.4} style={s.publisherTitle}>{PUBLISHER.legalName}</Text>
        <Text maxFontSizeMultiplier={1.5} style={s.publisherText}>Application gratuite · {PUBLISHER.developerName} · {PUBLISHER.address}</Text>
        <Text maxFontSizeMultiplier={1.5} style={s.publisherText}>{PUBLISHER.website}</Text>
      </Card>
      <Button label="Écrire au support" onPress={() => void Linking.openURL(SUPPORT_MAILTO)} variant="secondary" icon={<Mail size={20} color={colors.ink} />} />
      <Button label="Question confidentialité" onPress={() => void Linking.openURL(PRIVACY_MAILTO)} variant="secondary" icon={<Mail size={20} color={colors.ink} />} />
      <Button label="Ouvrir la politique en ligne" onPress={() => void Linking.openURL(PUBLISHER.privacyPolicyUrl)} variant="ghost" size="md" />

      <SectionHeader title="Supprimer" />
      <Button
        label={deleting ? 'Effacement en cours…' : 'Effacer toutes mes données'}
        onPress={requestDeletion}
        variant="secondary"
        loading={deleting}
        disabled={deleting}
        icon={<Trash2 size={20} color={colors.dangerText} />}
        style={s.delete}
      />
      <Text maxFontSizeMultiplier={1.4} style={s.version}>
        {PUBLISHER.appName} · v{PUBLISHER.version} · {PUBLISHER.legalName} · gratuite
      </Text>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  hero: { flexDirection: 'row', gap: t.spacing.md, alignItems: 'center' },
  heroCopy: { flex: 1, gap: 4 },
  heroTitle: { ...t.text.h3 },
  heroText: { ...t.text.caption },
  rights: { gap: t.spacing.xs },
  rightTitle: { ...t.text.bodyStrong },
  rightText: { ...t.text.caption },
  publisher: { gap: 4 },
  publisherTitle: { ...t.text.bodyStrong },
  publisherText: { ...t.text.caption },
  delete: { borderColor: t.colors.dangerBorder },
  version: { ...t.text.caption, color: t.colors.inkFaint, textAlign: 'center' },
}));
