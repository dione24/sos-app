import { OfflineManager } from '@maplibre/maplibre-react-native';
import { useRouter } from 'expo-router';
import { BookOpen, Check, CloudSun, Download, FileLock2, Languages, MapPinned, ShieldCheck } from 'lucide-react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Screen } from '@/components/Screen';
import { Button, Card, IconTile, ListRow, Notice, SectionHeader, Tag } from '@/components/ui';
import { MAP_PROVIDER_READY, MAP_STYLE_URL } from '@/constants/map';
import { PUBLISHER } from '@/constants/publisher';
import { getSetting, setSetting } from '@/db/database';
import { useI18n } from '@/i18n/use-i18n';
import { makeStyles, useTheme } from '@/theme';
import type { Language } from '@/types/models';

export default function SettingsScreen() {
  const s = useStyles();
  const { colors } = useTheme();
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
      <AppHeader title={t('settings_title')} subtitle={t('settings_eyebrow')} back />

      <SectionHeader title={t('settings_language')} />
      <Card style={s.languageCard}>
        <View style={s.cardTop}>
          <IconTile tone="primary"><Languages size={22} color={colors.primaryText} /></IconTile>
          <Text maxFontSizeMultiplier={1.5} style={s.cardText}>{t('settings_language_sub')}</Text>
        </View>
        <View style={s.langRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: language === 'fr' }}
            onPress={() => void chooseLanguage('fr')}
            style={[s.langBtn, language === 'fr' && s.langBtnOn]}
          >
            {language === 'fr' ? <Check size={18} color={colors.primaryText} strokeWidth={2.6} /> : null}
            <Text maxFontSizeMultiplier={1.3} style={[s.langBtnText, language === 'fr' && s.langBtnTextOn]}>{t('settings_fr')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: true, selected: false }} disabled style={[s.langBtn, s.langBtnDisabled]}>
            <Text maxFontSizeMultiplier={1.3} style={s.langBtnText}>{t('settings_bm')}</Text>
            <Text maxFontSizeMultiplier={1.3} style={s.langBtnSoon}>bientôt</Text>
          </Pressable>
        </View>
      </Card>

      <SectionHeader title={t('settings_map')} aside="≈ 85 Mo" />
      <Card style={s.mapCard}>
        <View style={s.cardTop}>
          <IconTile tone={mapReady ? 'primary' : 'info'}>{mapReady ? <Check size={22} color={colors.primaryText} /> : <MapPinned size={22} color={colors.infoText} />}</IconTile>
          <View style={s.cardCopy}>
            <Text maxFontSizeMultiplier={1.4} style={s.cardTitle}>{mapReady ? 'Carte de Bamako prête' : MAP_PROVIDER_READY ? 'Ajouter la carte de Bamako' : 'Liste des lieux prête'}</Text>
            <Text maxFontSizeMultiplier={1.5} style={s.cardText}>{mapReady ? 'Vous pouvez maintenant afficher les lieux sur la carte.' : MAP_PROVIDER_READY ? 'Téléchargez-la une fois avec une connexion Wi-Fi.' : 'Hôpitaux, pharmacies et commissariats restent consultables.'}</Text>
          </View>
          <Tag label={mapReady ? 'Prête' : MAP_PROVIDER_READY ? 'À télécharger' : 'Indisponible'} tone={mapReady ? 'primary' : MAP_PROVIDER_READY ? 'info' : 'neutral'} />
        </View>
        {downloading ? (
          <View style={s.progressWrap}>
            <View style={s.progressTrack}><View style={[s.progressBar, { width: `${progress}%` }]} /></View>
            <Text maxFontSizeMultiplier={1.3} style={s.progressText}>{progress}%</Text>
          </View>
        ) : null}
        {!mapReady && MAP_PROVIDER_READY ? (
          <Button label={downloading ? `Téléchargement ${progress}%` : 'Télécharger maintenant'} onPress={() => void downloadMap()} variant="secondary" disabled={downloading} icon={<Download size={20} color={colors.ink} />} />
        ) : mapReady ? (
          <Button label="Ouvrir la carte" onPress={() => router.replace('/map')} variant="secondary" />
        ) : null}
      </Card>

      <ListRow
        title={t('settings_weather')}
        subtitle={t('settings_weather_sub')}
        leading={<IconTile tone="info"><CloudSun size={22} color={colors.infoText} /></IconTile>}
        chevron
        onPress={() => router.push('/weather')}
      />

      <ListRow
        title="Sources officielles et indépendance"
        subtitle="Références des numéros, données de la carte et limites."
        leading={<IconTile tone="info"><BookOpen size={22} color={colors.infoText} /></IconTile>}
        chevron
        onPress={() => router.push('/sources')}
      />

      <SectionHeader title={t('settings_privacy')} />
      <Notice icon={<ShieldCheck size={20} color={colors.primaryText} />} tone="primary" title="Vos informations restent privées" text="Elles sont protégées sur votre téléphone. Aucun compte n'est nécessaire." />
      <ListRow
        title="Confidentialité et données"
        subtitle="Autorisations, partage de données et suppression."
        leading={<IconTile tone="neutral"><FileLock2 size={22} color={colors.inkMuted} /></IconTile>}
        chevron
        accessibilityLabel="Ouvrir confidentialité et contrôle des données"
        onPress={() => router.push('/privacy')}
      />

      <Text maxFontSizeMultiplier={1.4} style={s.version}>
        {PUBLISHER.appName} · v{PUBLISHER.version} · {PUBLISHER.legalName} · gratuite
      </Text>
      <Text maxFontSizeMultiplier={1.4} style={s.support}>{PUBLISHER.supportEmail} · {PUBLISHER.website}</Text>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  languageCard: { gap: t.spacing.md },
  mapCard: { gap: t.spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  cardCopy: { flex: 1, gap: 2 },
  cardTitle: { ...t.text.bodyStrong },
  cardText: { ...t.text.caption, flex: 1 },
  langRow: { flexDirection: 'row', gap: t.spacing.sm },
  langBtn: {
    flex: 1,
    minHeight: t.hit.action,
    flexDirection: 'row',
    gap: t.spacing.xs,
    borderRadius: t.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: t.colors.borderStrong,
    backgroundColor: t.colors.surface,
  },
  langBtnOn: { borderColor: t.colors.primary, borderWidth: 2, backgroundColor: t.colors.primaryBg },
  langBtnDisabled: { opacity: 0.55 },
  langBtnText: { ...t.text.bodyStrong, color: t.colors.inkMuted },
  langBtnTextOn: { color: t.colors.primaryText },
  langBtnSoon: { ...t.text.caption, fontSize: 13, lineHeight: 18, color: t.colors.inkFaint },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  progressTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: t.colors.border },
  progressBar: { height: 8, borderRadius: 4, backgroundColor: t.colors.primary },
  progressText: { ...t.text.captionStrong, color: t.colors.primaryText },
  version: { ...t.text.caption, color: t.colors.inkFaint, textAlign: 'center', marginTop: t.spacing.md },
  support: { ...t.text.caption, color: t.colors.inkFaint, textAlign: 'center' },
}));
