import { OfflineManager } from '@maplibre/maplibre-react-native';
import { useRouter } from 'expo-router';
import { Check, ChevronRight, CloudSun, Download, FileLock2, Languages, MapPinned, ShieldCheck } from 'lucide-react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Screen } from '@/components/Screen';
import { Badge, Button, Card, SectionTitle } from '@/components/ui';
import { MAP_PROVIDER_READY, MAP_STYLE_URL } from '@/constants/map';
import { PUBLISHER } from '@/constants/publisher';
import { colors, font, radius, spacing, type } from '@/constants/theme';
import { getSetting, setSetting } from '@/db/database';
import { useI18n } from '@/i18n/use-i18n';
import type { Language } from '@/types/models';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { language, setLanguage, t } = useI18n();
  const [mapReady, setMapReady] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => { void getSetting(db, 'map_offline_ready').then((value) => setMapReady(value === '1' && MAP_PROVIDER_READY)); }, [db]);

  async function chooseLanguage(next: Language) {
    setLanguage(next);
    await setSetting(db, 'language', next);
    Alert.alert(t('settings_language'), t('language_saved'));
  }

  async function downloadMap() {
    if (downloading) return;
    if (!MAP_STYLE_URL) {
      Alert.alert('Carte indisponible', 'Utilisez la liste des lieux utiles pour le moment.');
      return;
    }
    setDownloading(true);
    setProgress(0);
    try {
      const pack = await OfflineManager.createPack(
        {
          mapStyle: MAP_STYLE_URL,
          bounds: [-8.15, 12.50, -7.85, 12.75],
          minZoom: 9,
          maxZoom: 15,
          metadata: { name: 'Bamako hors ligne', createdAt: Date.now() },
        },
        (_offlinePack, status) => {
          setProgress(Math.round(status.percentage));
          if (status.state === 'complete' || status.percentage >= 99) {
            setDownloading(false);
            setMapReady(true);
            void setSetting(db, 'map_offline_ready', '1');
          }
        },
        () => {
          setDownloading(false);
          Alert.alert('Téléchargement interrompu', "Vérifiez la connexion et l'espace disponible, puis réessayez.");
        },
      );
      await pack.resume();
    } catch {
      setDownloading(false);
      Alert.alert('Carte indisponible', 'Vérifiez votre connexion puis réessayez.');
    }
  }

  return (
    <Screen>
      <AppHeader title={t('settings_title')} eyebrow={t('settings_eyebrow')} back />

      <SectionTitle title={t('settings_language')} />
      <Card style={styles.languageCard}>
        <View style={styles.languageTop}>
          <View style={styles.settingIcon}><Languages size={22} color={colors.amber} /></View>
          <View style={styles.settingCopy}>
            <Text maxFontSizeMultiplier={1.4} style={styles.settingTitle}>{t('settings_language')}</Text>
            <Text maxFontSizeMultiplier={1.6} style={styles.settingSub}>{t('settings_language_sub')}</Text>
          </View>
        </View>
        <View style={styles.langRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: language === 'fr' }}
            onPress={() => void chooseLanguage('fr')}
            style={[styles.langBtn, language === 'fr' && styles.langBtnOn]}
          >
            <Text maxFontSizeMultiplier={1.3} style={[styles.langBtnText, language === 'fr' && styles.langBtnTextOn]}>{t('settings_fr')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: true, selected: false }}
            disabled
            style={[styles.langBtn, styles.langBtnDisabled]}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.langBtnText}>{t('settings_bm')}</Text>
          </Pressable>
        </View>
      </Card>

      <SectionTitle title={t('settings_map')} aside="≈ 85 Mo" />
      <Card style={styles.mapCard}>
        <View style={styles.mapTop}>
          <View style={[styles.settingIcon, mapReady && styles.readyIcon]}>{mapReady ? <Check size={22} color={colors.green} /> : <MapPinned size={22} color={colors.blue} />}</View>
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>{mapReady ? 'Carte de Bamako prête' : MAP_PROVIDER_READY ? 'Ajouter la carte de Bamako' : 'Liste des lieux prête'}</Text>
            <Text style={styles.settingSub}>{mapReady ? 'Vous pouvez maintenant afficher les lieux sur la carte.' : MAP_PROVIDER_READY ? 'Téléchargez-la une fois avec une connexion Wi-Fi.' : 'Hôpitaux, pharmacies et commissariats restent consultables.'}</Text>
          </View>
          <Badge label={mapReady ? 'prête' : MAP_PROVIDER_READY ? 'à télécharger' : 'indisponible'} tone={mapReady ? 'green' : 'amber'} />
        </View>
        {downloading ? (
          <View style={styles.progressWrap}><View style={styles.progressTrack}><View style={[styles.progressBar, { width: `${progress}%` }]} /></View><Text style={styles.progressText}>{progress}%</Text></View>
        ) : null}
        {!mapReady && MAP_PROVIDER_READY ? <Button label={downloading ? `Téléchargement ${progress}%` : 'Télécharger maintenant'} onPress={() => void downloadMap()} variant="outline" disabled={downloading} icon={<Download size={19} color={colors.sand} />} /> : mapReady ? <Button label="Ouvrir la carte" onPress={() => router.replace('/map')} variant="soft" /> : null}
      </Card>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('settings_weather')}
        onPress={() => router.push('/weather')}
        style={styles.privacyLink}
      >
        <View style={styles.settingIcon}><CloudSun size={22} color={colors.amber} /></View>
        <View style={styles.settingCopy}>
          <Text maxFontSizeMultiplier={1.4} style={styles.settingTitle}>{t('settings_weather')}</Text>
          <Text maxFontSizeMultiplier={1.6} style={styles.settingSub}>{t('settings_weather_sub')}</Text>
        </View>
        <ChevronRight size={20} color={colors.sandFaint} />
      </Pressable>

      <SectionTitle title={t('settings_privacy')} />
      <Card style={styles.privacyCard}>
        <ShieldCheck size={24} color={colors.green} />
        <View style={styles.settingCopy}><Text style={styles.settingTitle}>Vos informations restent privées</Text><Text style={styles.settingSub}>Elles sont protégées sur votre téléphone. Aucun compte n'est nécessaire.</Text></View>
      </Card>
      <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir confidentialité et contrôle des données" onPress={() => router.push('/privacy')} style={styles.privacyLink}>
        <View style={styles.settingIcon}><FileLock2 size={22} color={colors.blue} /></View>
        <View style={styles.settingCopy}><Text style={styles.settingTitle}>Confidentialité et données</Text><Text style={styles.settingSub}>Autorisations, partage de données et suppression.</Text></View>
        <ChevronRight size={20} color={colors.sandFaint} />
      </Pressable>

      <Text style={styles.version}>
        {PUBLISHER.appName.toUpperCase()} · V{PUBLISHER.version} · {PUBLISHER.legalName.toUpperCase()} · GRATUITE
      </Text>
      <Text style={styles.support}>{PUBLISHER.supportEmail} · {PUBLISHER.website}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  settingIcon: { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.amberDark },
  readyIcon: { backgroundColor: colors.greenDark },
  settingCopy: { flex: 1 },
  settingTitle: { fontFamily: font.bodyBold, fontSize: 13, color: colors.sand },
  settingSub: { ...type.small, fontSize: 11, lineHeight: 15, marginTop: 2 },
  languageCard: { gap: spacing.md },
  languageTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  langRow: { flexDirection: 'row', gap: spacing.sm },
  langBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  langBtnOn: { borderColor: colors.alert, backgroundColor: colors.alertDark },
  langBtnDisabled: { opacity: 0.42 },
  langBtnText: { fontFamily: font.bodyBold, fontSize: 14, color: colors.sandMuted },
  langBtnTextOn: { color: colors.alertLight },
  mapCard: { gap: spacing.md },
  mapTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.hairline },
  progressBar: { height: 8, borderRadius: 4, backgroundColor: colors.green },
  progressText: { fontFamily: font.mono, fontSize: 11, color: colors.greenLight },
  privacyCard: { flexDirection: 'row', gap: spacing.sm },
  privacyLink: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.raised, borderWidth: 1, borderColor: colors.hairline },
  version: { ...type.eyebrow, textAlign: 'center', color: colors.sandFaint, marginTop: spacing.lg },
  support: { ...type.small, textAlign: 'center', color: colors.sandFaint, fontSize: 11 },
});
