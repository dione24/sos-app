import { CloudLightning, CloudRain, CloudSun, MapPin, RefreshCw, Waves } from 'lucide-react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Screen } from '@/components/Screen';
import { Button, Card, Notice, Tag } from '@/components/ui';
import { getSetting, setSetting } from '@/db/database';
import { getEmergencyPosition } from '@/services/location';
import { loadWeather } from '@/services/weather';
import { useAppStore } from '@/store/app-store';
import { makeStyles, useTheme } from '@/theme';
import type { WeatherSnapshot } from '@/types/models';

function ageLabel(timestamp: number) {
  if (!timestamp) return 'aucune donnée enregistrée';
  const hours = Math.floor((Date.now() - timestamp) / 3_600_000);
  if (hours < 1) return 'il y a moins d’une heure';
  return `il y a ${hours} h`;
}

export default function WeatherScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale >= 1.3;
  const db = useSQLiteContext();
  const position = useAppStore((state) => state.lastPosition);
  const setLastPosition = useAppStore((state) => state.setLastPosition);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [weatherLocationConsent, setWeatherLocationConsent] = useState<boolean | null>(null);
  const [locationUnavailable, setLocationUnavailable] = useState(false);
  const [locating, setLocating] = useState(false);

  async function refresh(usePreciseLocation = weatherLocationConsent === true) {
    setLoading(true);
    let nextPosition = usePreciseLocation ? position : null;
    if (usePreciseLocation && !nextPosition) {
      setLocating(true);
      try {
        nextPosition = await getEmergencyPosition();
      } catch {
        nextPosition = null;
      } finally {
        setLocating(false);
      }
      if (nextPosition) setLastPosition(nextPosition);
    }
    setLocationUnavailable(usePreciseLocation && !nextPosition);
    setWeather(await loadWeather(db, nextPosition));
    setLoading(false);
  }

  useEffect(() => {
    let mounted = true;
    void getSetting(db, 'weather_location_disclosure_accepted').then(async (value) => {
      if (!mounted) return;
      const allowed = value === '1';
      setWeatherLocationConsent(allowed);
      await refresh(allowed);
    });
    return () => { mounted = false; };
  }, []);

  async function acceptWeatherLocation() {
    await setSetting(db, 'weather_location_disclosure_accepted', '1');
    setWeatherLocationConsent(true);
    await refresh(true);
  }

  async function useBamakoWeather() {
    await setSetting(db, 'weather_location_disclosure_accepted', '0');
    setWeatherLocationConsent(false);
    await refresh(false);
  }

  const rainRisk = weather?.precipitationProbability ?? 0;
  const severe = rainRisk >= 70 || (weather?.weatherCode ?? 0) >= 95;
  const fallback = weather?.source === 'fallback';
  const sourceTag =
    weather?.source === 'network'
      ? { label: 'À jour', tone: 'primary' as const }
      : weather?.source === 'cache'
        ? { label: 'Dernière prévision', tone: 'warning' as const }
        : weather?.source === 'fallback'
          ? { label: 'Indisponible', tone: 'danger' as const }
          : { label: 'Chargement', tone: 'neutral' as const };
  const statusNote =
    weather?.source === 'network'
      ? 'Prévision actualisée.'
      : weather?.source === 'cache'
        ? 'La dernière prévision disponible est affichée avec son heure de mise à jour.'
        : weather?.source === 'fallback'
          ? "Aucune prévision fiable n'est disponible pour le moment."
          : 'Chargement de la météo…';

  return (
    <Screen>
      <AppHeader title="Météo" subtitle="Prévisions pour Bamako ou votre position" back action={<Tag label={sourceTag.label} tone={sourceTag.tone} dot />} />

      <Card style={[s.hero, largeText && s.heroLarge]} tone={severe ? 'warning' : 'neutral'}>
        <View style={[s.heroIcon, severe && s.heroIconSevere]}>
          {severe ? <CloudLightning size={44} color={colors.warningText} strokeWidth={1.8} /> : <CloudSun size={44} color={fallback ? colors.inkFaint : colors.infoText} strokeWidth={1.8} />}
        </View>
        <View style={s.heroCopy}>
          <Text maxFontSizeMultiplier={1.3} style={s.city}>{weather?.city ?? 'Bamako'}</Text>
          <Text maxFontSizeMultiplier={1.1} style={s.temperature}>{weather && !fallback ? `${weather.temperature}°` : '—'}</Text>
          <Text maxFontSizeMultiplier={1.4} style={s.description}>{weather?.description ?? 'Chargement…'}</Text>
        </View>
      </Card>

      {weather?.source === 'cache' || fallback ? (
        <Notice tone={fallback ? 'danger' : 'warning'} title={fallback ? 'Prévision indisponible' : 'Dernière prévision disponible'} text={statusNote} />
      ) : null}

      <View style={[s.metrics, largeText && s.metricsLarge]}>
        <Card style={s.metric}>
          <CloudRain size={26} color={colors.infoText} />
          <Text maxFontSizeMultiplier={1.3} style={s.metricValue}>
            {fallback || weather?.precipitationProbability == null ? '—' : `${weather.precipitationProbability}%`}
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={s.metricLabel}>Risque de pluie</Text>
        </Card>
        <Card style={s.metric}>
          <RefreshCw size={26} color={colors.inkMuted} />
          <Text maxFontSizeMultiplier={1.3} style={s.metricValueSmall}>{weather && !fallback ? ageLabel(weather.updatedAt) : '—'}</Text>
          <Text maxFontSizeMultiplier={1.3} style={s.metricLabel}>Dernière mise à jour</Text>
        </Card>
      </View>

      {severe ? (
        <Notice
          icon={<Waves size={20} color={colors.dangerText} />}
          tone="danger"
          title="Fortes pluies possibles"
          text="Évitez les passages inondés et les cours d'eau. Ne traversez jamais une route submergée."
        />
      ) : null}

      {weatherLocationConsent === false ? (
        <Notice
          icon={<MapPin size={20} color={colors.infoText} />}
          tone="info"
          title="Météo à ma position"
          text="Votre position sert uniquement à afficher la météo près de vous. Vous pouvez aussi continuer avec Bamako."
        >
          <Button label="Utiliser ma position" onPress={() => void acceptWeatherLocation()} icon={<MapPin size={20} color={colors.onPrimary} />} />
        </Notice>
      ) : weatherLocationConsent === true ? (
        <Notice
          icon={<MapPin size={20} color={locationUnavailable ? colors.warningText : colors.primaryText} />}
          tone={locationUnavailable ? 'warning' : 'neutral'}
          title={locating ? 'Recherche de la position…' : locationUnavailable ? 'Position indisponible · Bamako affichée' : 'Prévision à ma position'}
          text={locating ? 'La prévision de Bamako reste visible pendant la recherche.' : locationUnavailable ? 'Vous pouvez réessayer avec le bouton Actualiser.' : 'Votre position est utilisée uniquement pour cette prévision.'}
        >
          <Button label="Revenir à Bamako" size="md" variant="ghost" accessibilityLabel="Revenir à la météo de Bamako" onPress={() => void useBamakoWeather()} />
        </Notice>
      ) : null}

      <Button label="Actualiser si le réseau est disponible" onPress={() => void refresh()} variant="secondary" loading={loading} icon={<RefreshCw size={20} color={colors.ink} />} />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  hero: { minHeight: 160, flexDirection: 'row', alignItems: 'center', gap: t.spacing.lg, padding: t.spacing.lg },
  heroLarge: { flexDirection: 'column', alignItems: 'flex-start' },
  heroIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.infoBg },
  heroIconSevere: { backgroundColor: t.colors.surface },
  heroCopy: { flex: 1, gap: 2 },
  city: { ...t.text.overline },
  temperature: { fontFamily: 'DMSans_700Bold', fontSize: 60, lineHeight: 66, letterSpacing: -1.5, color: t.colors.ink },
  description: { ...t.text.body, color: t.colors.inkMuted },
  metrics: { flexDirection: 'row', gap: t.spacing.sm },
  metricsLarge: { flexDirection: 'column' },
  metric: { flex: 1, minHeight: 128, alignItems: 'center', justifyContent: 'center', gap: t.spacing.xs },
  metricValue: { fontFamily: 'DMSans_700Bold', fontSize: 28, lineHeight: 34, color: t.colors.ink },
  metricValueSmall: { ...t.text.bodyStrong, textAlign: 'center' },
  metricLabel: { ...t.text.caption, textAlign: 'center' },
}));
