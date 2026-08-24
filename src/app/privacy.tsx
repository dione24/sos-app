import { BellRing, Database, FileLock2, ImageIcon, MapPinned, Mail, RadioTower, ShieldCheck, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Screen } from '@/components/Screen';
import { Badge, Button, Card, SectionTitle } from '@/components/ui';
import { PRIVACY_MAILTO, PUBLISHER, SUPPORT_MAILTO } from '@/constants/publisher';
import { colors, font, radius, spacing, type } from '@/constants/theme';
import { clearAllUserData } from '@/db/database';
import { stopBleAdvertising } from '@/services/ble-mesh';

const flows = [
  { icon: MapPinned, title: 'Position et météo', text: "Votre position est utilisée uniquement si vous choisissez la météo près de vous ou l'ajoutez à une alerte.", tone: colors.amber },
  { icon: RadioTower, title: 'Alertes proches', text: "Le type d'urgence, l'heure et la position autorisée peuvent être transmis aux téléphones proches. Votre dossier médical reste privé.", tone: colors.greenLight },
  { icon: Database, title: 'Carte', text: "Le service de carte reçoit uniquement la zone affichée. Il ne reçoit jamais votre dossier médical.", tone: colors.green },
] as const;

const permissions = [
  { icon: MapPinned, title: 'Position', text: "Demandée seulement lorsque vous touchez « Utiliser ma position ». L'appel et le SMS restent disponibles sans.", tone: colors.amber },
  { icon: RadioTower, title: 'Appareils à proximité', text: "Demandée lorsque vous activez les alertes proches. Elle sert uniquement à détecter et transmettre les alertes SOS autour de vous.", tone: colors.green },
  { icon: BellRing, title: 'Notifications', text: "Demandée sur Android pour montrer qu'une alerte proche est en cours et vous permettre de l'arrêter.", tone: colors.alert },
  { icon: ImageIcon, title: 'Photo facultative', text: "Vous choisissez vous-même une image pour votre dossier. L'application n'utilise ni la caméra ni le microphone.", tone: colors.blue },
] as const;

export default function PrivacyScreen() {
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
      Alert.alert(
        'Suppression interrompue',
        "Les données n'ont pas pu être effacées complètement. Réessayez. Si le problème continue, redémarrez l'application.",
      );
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
                {
                  text: 'Tout effacer',
                  style: 'destructive',
                  onPress: () => void eraseEverything(),
                },
              ],
            ),
        },
      ],
    );
  }

  return (
    <Screen>
      <AppHeader title="Confidentialité" eyebrow="Vos choix" back action={<Badge label="protégé" tone="green" dot />} />

      <Card style={styles.hero}>
        <View style={styles.heroIcon}><FileLock2 size={28} color={colors.green} /></View>
        <View style={styles.heroCopy}>
          <Text maxFontSizeMultiplier={1.4} style={styles.heroTitle}>Vos données médicales restent sur ce téléphone</Text>
          <Text maxFontSizeMultiplier={1.5} style={styles.heroText}>
            Elles sont protégées sur votre appareil. Aucun compte n'est requis et elles ne sont pas envoyées à SahelPay.
          </Text>
        </View>
      </Card>

      <Card style={styles.publisherCard}>
        <Text maxFontSizeMultiplier={1.4} style={styles.publisherTitle}>{PUBLISHER.legalName}</Text>
        <Text maxFontSizeMultiplier={1.5} style={styles.publisherText}>
          Application gratuite · {PUBLISHER.developerName} · {PUBLISHER.address}
        </Text>
        <Text maxFontSizeMultiplier={1.5} style={styles.publisherText}>{PUBLISHER.website}</Text>
      </Card>

      <SectionTitle title="Quand des informations sont partagées" aside="avec votre accord" />
      <View style={styles.flowList}>
        {flows.map(({ icon: Icon, title, text, tone }) => (
          <Card key={title} style={styles.flow}>
            <View style={styles.flowIcon}><Icon size={21} color={tone} /></View>
            <View style={styles.flowCopy}>
              <Text maxFontSizeMultiplier={1.4} style={styles.flowTitle}>{title}</Text>
              <Text maxFontSizeMultiplier={1.6} style={styles.flowText}>{text}</Text>
            </View>
          </Card>
        ))}
      </View>

      <Card style={styles.notice}>
        <ShieldCheck size={20} color={colors.green} />
        <Text maxFontSizeMultiplier={1.6} style={styles.noticeText}>Appels, SMS, QR et fichiers ne sont ouverts ou partagés qu'après votre action. Aucun SMS silencieux et aucune publicité.</Text>
      </Card>

      <SectionTitle title="Autorisations du téléphone" aside="seulement au besoin" />
      <View style={styles.flowList}>
        {permissions.map(({ icon: Icon, title, text, tone }) => (
          <Card key={title} style={styles.flow}>
            <View style={styles.flowIcon}><Icon size={21} color={tone} /></View>
            <View style={styles.flowCopy}>
              <Text maxFontSizeMultiplier={1.4} style={styles.flowTitle}>{title}</Text>
              <Text maxFontSizeMultiplier={1.6} style={styles.flowText}>{text}</Text>
            </View>
          </Card>
        ))}
      </View>
      <Button label="Gérer les autorisations du téléphone" onPress={() => void Linking.openSettings()} variant="outline" />

      <SectionTitle title="Vos droits" />
      <Card style={styles.rights}>
        <Text maxFontSizeMultiplier={1.4} style={styles.rightTitle}>Accès, correction et suppression</Text>
        <Text maxFontSizeMultiplier={1.6} style={styles.rightText}>Vous pouvez consulter et modifier le dossier depuis l'onglet Dossier, exporter volontairement son contenu, ou supprimer ici toutes les données de ce téléphone.</Text>
        <View style={styles.legalRow}>
          <ShieldCheck size={15} color={colors.green} />
          <Text maxFontSizeMultiplier={1.6} style={styles.legalText}>Aucune donnée n'est vendue ni utilisée pour la publicité, le profilage ou le suivi inter-applications.</Text>
        </View>
      </Card>

      <SectionTitle title="Contact éditeur" />
      <Button
        label="Écrire au support"
        onPress={() => void Linking.openURL(SUPPORT_MAILTO)}
        variant="soft"
        icon={<Mail size={20} color={colors.sand} />}
      />
      <Button
        label="Question confidentialité"
        onPress={() => void Linking.openURL(PRIVACY_MAILTO)}
        variant="outline"
        icon={<Mail size={20} color={colors.sand} />}
      />
      <Button
        label="Ouvrir la politique en ligne"
        onPress={() => void Linking.openURL(PUBLISHER.privacyPolicyUrl)}
        variant="outline"
      />

      <Button
        label={deleting ? 'Effacement en cours…' : 'Effacer toutes mes données'}
        onPress={requestDeletion}
        variant="outline"
        loading={deleting}
        disabled={deleting}
        icon={<Trash2 size={20} color={colors.alert} />}
      />
      <Text maxFontSizeMultiplier={1.3} style={styles.version}>
        {PUBLISHER.appName.toUpperCase()} · V{PUBLISHER.version} · {PUBLISHER.legalName.toUpperCase()} · GRATUITE
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 128, flexDirection: 'row', gap: spacing.md, alignItems: 'center', backgroundColor: colors.greenDark, borderColor: '#BFE8D1' },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  heroCopy: { flex: 1 },
  heroTitle: { fontFamily: font.displayMedium, fontSize: 17, lineHeight: 21, color: colors.sand },
  heroText: { ...type.small, fontSize: 11, lineHeight: 16, marginTop: 5 },
  flowList: { gap: spacing.xs },
  flow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  flowIcon: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  flowCopy: { flex: 1 },
  flowTitle: { fontFamily: font.bodyBold, fontSize: 13, color: colors.sand },
  flowText: { ...type.small, fontSize: 11, lineHeight: 16, marginTop: 2 },
  notice: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.surface },
  noticeText: { ...type.small, flex: 1, fontSize: 11, lineHeight: 16, color: colors.sand },
  rights: { gap: spacing.xs },
  rightTitle: { fontFamily: font.bodyBold, fontSize: 14, color: colors.sand },
  rightText: { ...type.small, fontSize: 11, lineHeight: 16 },
  legalRow: { flexDirection: 'row', gap: spacing.xs, paddingTop: spacing.xs },
  legalText: { ...type.small, flex: 1, fontSize: 11, lineHeight: 16, color: colors.amberLight },
  publisherCard: { gap: 4, backgroundColor: colors.surface },
  publisherTitle: { fontFamily: font.bodyBold, fontSize: 14, color: colors.sand },
  publisherText: { ...type.small, fontSize: 11, lineHeight: 16 },
  version: { ...type.eyebrow, textAlign: 'center', color: colors.sandFaint, fontSize: 11 },
});
