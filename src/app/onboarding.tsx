import { useRouter } from 'expo-router';
import { ShieldCheck, Smartphone, WifiOff } from 'lucide-react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Screen } from '@/components/Screen';
import { Button, Card, Field } from '@/components/ui';
import { colors, font, radius, spacing, type } from '@/constants/theme';
import { saveProfile, setSetting } from '@/db/database';
import { isValidEmergencyPhone } from '@/lib/sos';

export default function OnboardingScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+223 ');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!isValidEmergencyPhone(phone)) {
      Alert.alert(
        'Numéro incomplet',
        'Saisissez un numéro complet (au moins 8 chiffres). Le préfixe +223 seul ne suffit pas.',
      );
      return;
    }
    setSaving(true);
    try {
      await saveProfile(db, {
        phone: phone.trim(),
        name: name.trim(),
        bloodType: '',
        allergies: '',
        treatments: '',
        history: '',
        photoUri: null,
        includeInSos: false,
        updatedAt: Date.now(),
      });
      router.replace('/');
    } catch {
      Alert.alert('Enregistrement impossible', "Le dossier n'a pas pu être créé sur cet appareil. Réessayez.");
    } finally {
      setSaving(false);
    }
  }

  async function skip() {
    await setSetting(db, 'onboarding_skipped', '1');
    router.replace('/');
  }

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <Button label="Créer mon dossier" onPress={() => void submit()} loading={saving} disabled={saving} />
          <Button label="Accéder au SOS sans dossier" onPress={() => void skip()} variant="outline" disabled={saving} />
        </View>
      }
    >
      <AppHeader title="Votre dossier d'urgence" eyebrow="Prêt en une minute" />
      <Text maxFontSizeMultiplier={1.5} style={styles.emergencyHint}>
        En danger immédiat : passez, puis touchez SOS et appelez le 122.
      </Text>
      <Text maxFontSizeMultiplier={1.5} style={styles.lead}>
        Ces informations peuvent aider vos proches et les secours. Aucun compte ni mot de passe n'est nécessaire.
      </Text>

      <View style={styles.promises}>
        <Card style={styles.promise}>
          <WifiOff size={21} color={colors.amber} />
          <Text maxFontSizeMultiplier={1.4} style={styles.promiseText}>Prêt même sans connexion</Text>
        </Card>
        <Card style={styles.promise}>
          <ShieldCheck size={21} color={colors.green} />
          <Text maxFontSizeMultiplier={1.4} style={styles.promiseText}>Vos informations restent privées</Text>
        </Card>
      </View>

      <Card style={styles.form}>
        <Field
          label="Nom ou prénom"
          value={name}
          onChangeText={setName}
          placeholder="Ex. Awa Traoré"
          autoCapitalize="words"
          maxLength={120}
        />
        <Field
          label="Numéro de téléphone"
          value={phone}
          onChangeText={setPhone}
          placeholder="+223 00 00 00 00"
          keyboardType="phone-pad"
          maxLength={32}
          hint="Ce numéro sera ajouté à vos messages de secours. Aucun SMS de vérification."
        />
      </Card>

      <View style={styles.notice}>
        <Smartphone size={18} color={colors.sandMuted} />
        <Text maxFontSizeMultiplier={1.6} style={styles.noticeText}>
          Vous pourrez ajouter groupe sanguin, allergies et contacts d'urgence plus tard.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  emergencyHint: { ...type.small, color: colors.alertLight, fontFamily: font.bodyBold },
  lead: { ...type.body, color: colors.sandMuted, fontSize: 17, lineHeight: 25 },
  promises: { flexDirection: 'row', gap: spacing.sm },
  promise: { flex: 1, minHeight: 100, justifyContent: 'space-between', gap: spacing.sm },
  promiseText: { ...type.small, color: colors.sand },
  form: { gap: spacing.lg, marginTop: spacing.sm },
  footer: { gap: spacing.sm },
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  noticeText: { ...type.small, flex: 1 },
});
