import { CloudLightning, CloudRain, CloudSun, MapPin, RefreshCw, Waves } from 'lucide-react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Screen } from '@/components/Screen';
import { Badge, Button, Card } from '@/components/ui';
import { colors, font, radius, spacing, type } from '@/constants/theme';
import { getSetting, setSetting } from '@/db/database';
import { getEmergencyPosition } from '@/services/location';
import { loadWeather } from '@/services/weather';
import { useAppStore } from '@/store/app-store';
import type { WeatherSnapshot } from '@/types/models';

function ageLabel(timestamp: number) {
  if (!timestamp) return 'aucune donnée enregistrée';
  const hours = Math.floor((Date.now() - timestamp) / 3_600_000);
  if (hours < 1) return 'il y a moins d’une heure';
  return `il y a ${hours} h`;
}

export default function WeatherScreen() {
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
  const sourceBadge =
    weather?.source === 'network'
      ? { label: 'à jour', tone: 'green' as const }
      : weather?.source === 'cache'
        ? { label: 'dernière prévision', tone: 'amber' as const }
        : weather?.source === 'fallback'
          ? { label: 'indisponible', tone: 'alert' as const }
          : { label: 'chargement', tone: 'amber' as const };
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
      <AppHeader title="Météo" eyebrow="Prévisions pour Bamako" back action={<Badge label={sourceBadge.label} tone={sourceBadge.tone} dot />} />
      <Card style={[styles.hero, largeText && styles.heroLarge, severe && styles.heroSevere, weather?.source === 'fallback' && styles.heroFallback]}>
        {severe ? <CloudLightning size={58} color={colors.amber} /> : <CloudSun size={58} color={colors.amber} />}
        <View style={styles.heroCopy}>
          <Text maxFontSizeMultiplier={1.3} style={styles.city}>{weather?.city ?? 'Bamako'}</Text>
          <Text maxFontSizeMultiplier={1.15} style={styles.temperature}>
            {weather && weather.source !== 'fallback' ? `${weather.temperature}°` : '—'}
          </Text>
          <Text maxFontSizeMultiplier={1.4} style={styles.description}>{weather?.description ?? 'Chargement…'}</Text>
        </View>
      </Card>

      {weather?.source === 'cache' || weather?.source === 'fallback' ? (
        <Card style={styles.statusCard}>
          <Text maxFontSizeMultiplier={1.5} style={styles.statusTitle}>
            {weather.source === 'cache' ? 'Dernière prévision disponible' : 'Prévision indisponible'}
          </Text>
          <Text maxFontSizeMultiplier={1.6} style={styles.statusText}>{statusNote}</Text>
        </Card>
      ) : null}

      {weatherLocationConsent === false ? (
        <Card style={styles.locationDisclosure}>
          <View style={styles.locationTop}>
            <MapPin size={23} color={colors.blue} />
            <View style={styles.locationCopy}>
              <Text style={styles.locationTitle}>Météo à ma position</Text>
              <Text style={styles.locationText}>Votre position sert uniquement à afficher la météo près de vous. Vous pouvez aussi continuer avec Bamako.</Text>
            </View>
          </View>
          <Button label="Utiliser ma position pour la météo" onPress={() => void acceptWeatherLocation()} variant="green" icon={<MapPin size={19} color={colors.black} />} />
        </Card>
      ) : weatherLocationConsent === true ? (
        <Card style={[styles.locationState, largeText && styles.locationStateLarge]}>
          <MapPin size={20} color={locationUnavailable ? colors.amber : colors.green} />
          <View style={styles.locationCopy}>
            <Text style={styles.locationTitle}>{locating ? 'Recherche de la position…' : locationUnavailable ? 'Position indisponible · Bamako affichée' : 'Prévision à ma position'}</Text>
            <Text style={styles.locationText}>{locating ? 'La prévision de Bamako reste visible pendant la recherche.' : locationUnavailable ? 'Vous pouvez réessayer avec le bouton Actualiser.' : 'Votre position est utilisée uniquement pour cette prévision.'}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Revenir à la météo de Bamako" onPress={() => void useBamakoWeather()}><Text style={styles.bamakoLink}>Bamako</Text></Pressable>
        </Card>
      ) : null}

      <View style={[styles.metrics, largeText && styles.metricsLarge]}>
        <Card style={[styles.metric, largeText && styles.metricLarge]}>
          <CloudRain size={25} color={colors.blue} />
          <Text maxFontSizeMultiplier={1.3} style={styles.metricValue}>
            {weather?.source === 'fallback' || weather?.precipitationProbability == null
              ? '—'
              : `${weather.precipitationProbability}%`}
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.metricLabel}>RISQUE DE PLUIE</Text>
        </Card>
        <Card style={[styles.metric, largeText && styles.metricLarge]}>
          <RefreshCw size={25} color={colors.green} />
          <Text maxFontSizeMultiplier={1.3} style={styles.metricValueSmall}>
            {weather && weather.source !== 'fallback' ? ageLabel(weather.updatedAt) : '—'}
          </Text>
          <Text style={styles.metricLabel}>DERNIÈRE MAJ</Text>
        </Card>
      </View>

      {severe ? (
        <Card style={styles.alert}>
          <Waves size={25} color={colors.alertLight} />
          <View style={styles.alertCopy}>
            <Text style={styles.alertTitle}>Fortes pluies possibles</Text>
            <Text style={styles.alertText}>Évitez les passages inondés et les cours d'eau. Ne traversez jamais une route submergée.</Text>
          </View>
        </Card>
      ) : null}

      <Button label="Actualiser si le réseau est disponible" onPress={() => void refresh()} variant="outline" loading={loading} icon={<RefreshCw size={19} color={colors.sand} />} />
      <Text maxFontSizeMultiplier={1.6} style={styles.note}>{statusNote}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 190, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl, backgroundColor: colors.amberDark },
  heroLarge: { flexDirection: 'column', alignItems: 'flex-start', paddingVertical: spacing.lg },
  heroSevere: { borderColor: colors.alert, backgroundColor: colors.alertDark },
  heroFallback: { borderColor: colors.hairline, backgroundColor: colors.surface },
  heroCopy: { alignItems: 'flex-start' },
  city: { ...type.eyebrow, color: colors.amberLight },
  temperature: { fontFamily: font.display, fontSize: 66, lineHeight: 72, color: colors.sand },
  description: { fontFamily: font.bodyMedium, fontSize: 14, color: colors.sand },
  statusCard: { gap: 4, borderColor: '#F1D9A4', backgroundColor: colors.amberDark },
  statusTitle: { fontFamily: font.bodyBold, fontSize: 13, color: colors.amberLight },
  statusText: { ...type.small, fontSize: 11, lineHeight: 16 },
  metrics: { flexDirection: 'row', gap: spacing.sm },
  metricsLarge: { flexDirection: 'column' },
  metric: { flex: 1, minHeight: 130, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  metricLarge: { flex: 0, width: '100%' },
  metricValue: { fontFamily: font.displayMedium, fontSize: 26, color: colors.sand },
  metricValueSmall: { fontFamily: font.displayMedium, fontSize: 14, color: colors.sand, textAlign: 'center' },
  metricLabel: { ...type.eyebrow, fontSize: 11, textAlign: 'center' },
  alert: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.alertDark, borderColor: colors.alert },
  alertCopy: { flex: 1 },
  alertTitle: { fontFamily: font.bodyBold, fontSize: 14, color: colors.alertLight },
  alertText: { ...type.small, color: colors.sand, marginTop: 3 },
  locationDisclosure: { gap: spacing.sm, backgroundColor: colors.greenDark, borderColor: '#BFE8D1' },
  locationTop: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  locationState: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  locationStateLarge: { flexDirection: 'column', alignItems: 'flex-start' },
  locationCopy: { flex: 1 },
  locationTitle: { fontFamily: font.bodyBold, fontSize: 13, color: colors.sand },
  locationText: { ...type.small, fontSize: 11, lineHeight: 16, marginTop: 2 },
  bamakoLink: { fontFamily: font.bodyBold, fontSize: 11, color: colors.blue, paddingVertical: 10 },
  note: { ...type.small, fontSize: 11, textAlign: 'center', paddingHorizontal: spacing.md },
});
