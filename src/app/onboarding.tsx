import { useRouter } from 'expo-router';
import ShieldAlert from 'lucide-react-native/icons/shield-alert';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Button, Card, Field, IconTile, Notice } from '@/components/ui';
import { saveProfile, setSetting } from '@/db/database';
import { isValidEmergencyPhone } from '@/lib/sos';
import { makeStyles, useTheme } from '@/theme';

export default function OnboardingScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+223 ');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!isValidEmergencyPhone(phone)) {
      Alert.alert('Numéro incomplet', 'Saisissez un numéro complet (au moins 8 chiffres). Le préfixe +223 seul ne suffit pas.');
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
        <View style={s.footer}>
          <Button label="Créer mon dossier" onPress={() => void submit()} loading={saving} disabled={saving} />
          <Button label="Accéder au SOS sans dossier" onPress={() => void skip()} variant="secondary" disabled={saving} />
        </View>
      }
    >
      <View style={s.brand}>
        <View style={s.mark}>
          <ShieldAlert size={30} color={colors.onColor} strokeWidth={2.2} />
        </View>
        <Text maxFontSizeMultiplier={1.3} style={s.brandName}>Nafalan</Text>
      </View>

      <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.title}>Votre dossier d'urgence</Text>
      <Text maxFontSizeMultiplier={1.5} style={s.lead}>
        Prêt en une minute. Ces informations peuvent aider vos proches et les secours. Aucun compte ni mot de passe.
      </Text>

      <Notice
        icon={<ShieldAlert size={20} color={colors.dangerText} />}
        tone="danger"
        text="En danger immédiat : passez cette étape, puis touchez SOS et appelez le 122."
      />

      <Card style={s.form}>
        <Field label="Nom ou prénom" value={name} onChangeText={setName} placeholder="Ex. Awa Traoré" autoCapitalize="words" maxLength={120} />
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

      <View style={s.promises}>
        <View style={s.promise}>
          <IconTile tone="neutral"><WifiOff size={22} color={colors.inkMuted} /></IconTile>
          <Text maxFontSizeMultiplier={1.4} style={s.promiseText}>Prêt même sans connexion</Text>
        </View>
        <View style={s.promise}>
          <IconTile tone="primary"><ShieldCheck size={22} color={colors.primaryText} /></IconTile>
          <Text maxFontSizeMultiplier={1.4} style={s.promiseText}>Vos informations restent sur ce téléphone</Text>
        </View>
      </View>

      <Text maxFontSizeMultiplier={1.6} style={s.notice}>Vous pourrez ajouter groupe sanguin, allergies et contacts d'urgence plus tard.</Text>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  brand: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, paddingTop: t.spacing.md },
  mark: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.sos },
  brandName: { ...t.text.captionStrong, color: t.colors.inkMuted },
  title: { ...t.text.h1, marginTop: t.spacing.xs },
  lead: { ...t.text.body, color: t.colors.inkMuted },
  form: { gap: t.spacing.md },
  promises: { flexDirection: 'row', gap: t.spacing.sm },
  promise: { flex: 1, gap: t.spacing.sm, padding: t.spacing.md, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface },
  promiseText: { ...t.text.captionStrong },
  notice: { ...t.text.caption, color: t.colors.inkFaint, textAlign: 'center', paddingHorizontal: t.spacing.sm },
  footer: { gap: t.spacing.sm },
}));
