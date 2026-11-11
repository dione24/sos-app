import { useFocusEffect, useRouter } from 'expo-router';
import BookOpen from 'lucide-react-native/icons/book-open';
import Check from 'lucide-react-native/icons/check';
import CloudSun from 'lucide-react-native/icons/cloud-sun';
import Download from 'lucide-react-native/icons/download';
import FileLock2 from 'lucide-react-native/icons/file-lock';
import Languages from 'lucide-react-native/icons/languages';
import MapPinned from 'lucide-react-native/icons/map-pinned';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Screen } from '@/components/Screen';
import { Button, Card, IconTile, ListRow, Notice, SectionHeader, Tag } from '@/components/ui';
import { MAP_PROVIDER_READY } from '@/constants/map';
import { PUBLISHER } from '@/constants/publisher';
import { setSetting } from '@/db/database';
import { useI18n } from '@/i18n/use-i18n';
import { getOfflineMapController } from '@/services/offline-map';
import { makeStyles, useTheme } from '@/theme';
import type { Language } from '@/types/models';

export default function SettingsScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const router = useRouter();
  const { language, setLanguage, t } = useI18n();
  const mapController = getOfflineMapController(db);
  const [mapState, setMapState] = useState(mapController.getSnapshot);
  const mapReady = mapState.status === 'ready';
  const mapAvailable = MAP_PROVIDER_READY && mapState.status !== 'unavailable';
  const downloading = mapState.status === 'downloading';
  const progress = mapState.progress;

  useFocusEffect(useCallback(() => {
    const unsubscribe = mapController.subscribe(setMapState);
    void mapController.reconcile();
    return unsubscribe;
  }, [mapController]));

  async function chooseLanguage(next: Language) {
    setLanguage(next);
    await setSetting(db, 'language', next);
    Alert.alert(t('settings_language'), t('language_saved'));
  }

  async function downloadMap() {
    await mapController.start();
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
          <IconTile tone={mapReady ? 'success' : 'info'}>{mapReady ? <Check size={22} color={colors.successText} /> : <MapPinned size={22} color={colors.infoText} />}</IconTile>
          <View style={s.cardCopy}>
            <Text maxFontSizeMultiplier={1.4} style={s.cardTitle}>{mapReady ? 'Carte de Bamako prête' : mapAvailable ? 'Ajouter la carte de Bamako' : 'Liste des lieux prête'}</Text>
            <Text maxFontSizeMultiplier={1.5} style={s.cardText}>{mapReady ? 'Vous pouvez maintenant afficher les lieux sur la carte.' : mapAvailable ? 'Téléchargez-la une fois avec une connexion Wi-Fi.' : 'Hôpitaux, pharmacies et commissariats restent consultables.'}</Text>
          </View>
          <Tag label={mapReady ? 'Prête' : mapAvailable ? 'À télécharger' : 'Indisponible'} tone={mapReady ? 'success' : mapAvailable ? 'info' : 'neutral'} />
        </View>
        {downloading ? (
          <View style={s.progressWrap}>
            <View style={s.progressTrack}><View style={[s.progressBar, { width: `${progress}%` }]} /></View>
            <Text maxFontSizeMultiplier={1.3} style={s.progressText}>{progress}%</Text>
          </View>
        ) : null}
        {mapState.status === 'error' ? <Notice tone="warning" text="Téléchargement interrompu. Vérifiez la connexion et l’espace disponible, puis reprenez la carte." /> : null}
        {!mapReady && mapAvailable ? (
          <>
            <Button label={downloading ? `Téléchargement ${progress}%` : mapState.packId ? 'Reprendre le téléchargement' : 'Télécharger maintenant'} onPress={() => void downloadMap()} variant="secondary" disabled={downloading || mapState.status === 'checking'} icon={<Download size={20} color={colors.ink} />} />
            {downloading ? <Button label="Mettre en pause" size="md" variant="ghost" onPress={() => void mapController.pause().catch(() => undefined)} /> : null}
          </>
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
