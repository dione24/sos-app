import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import { useRouter } from 'expo-router';
import { Building2, ChevronRight, Download, Hospital, List, MapIcon, Navigation, Pill, Shield } from 'lucide-react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Screen } from '@/components/Screen';
import { Badge, Button, Card } from '@/components/ui';
import { MAP_PROVIDER_READY, MAP_STYLE_URL } from '@/constants/map';
import { colors, font, radius, spacing, type } from '@/constants/theme';
import { FACILITIES } from '@/data';
import { getSetting, setSetting } from '@/db/database';
import { distanceKm, formatDistance } from '@/lib/distance';
import { getEmergencyPosition } from '@/services/location';
import { useAppStore } from '@/store/app-store';
import type { Coordinates, Facility, FacilityCategory } from '@/types/models';

async function openFacilityDirections(facility: Facility) {
  const { latitude, longitude, name } = facility;
  const encoded = encodeURIComponent(name);
  const primary =
    Platform.OS === 'ios'
      ? `maps:0,0?q=${encoded}@${latitude},${longitude}`
      : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encoded})`;
  const fallback = `https://maps.google.com/?q=${latitude},${longitude}`;
  try {
    await Linking.openURL(primary);
  } catch {
    await Linking.openURL(fallback);
  }
}

const BAMAKO: Coordinates = { latitude: 12.6392, longitude: -8.0029 };
type Filter = 'tout' | 'hopital' | 'pharmacie' | 'police';

const filterLabels: { id: Filter; label: string }[] = [
  { id: 'tout', label: 'Tout' },
  { id: 'hopital', label: 'Hôpitaux' },
  { id: 'pharmacie', label: 'Pharmacies' },
  { id: 'police', label: 'Police' },
];

function categoryColor(category: FacilityCategory) {
  if (category === 'hopital') return colors.alert;
  if (category === 'pharmacie') return colors.green;
  return colors.blue;
}

function CategoryIcon({ category, color }: { category: FacilityCategory; color: string }) {
  const Icon = category === 'hopital' ? Hospital : category === 'pharmacie' ? Pill : category === 'gendarmerie' ? Building2 : Shield;
  return <Icon size={20} color={color} />;
}

function displayHours(hours: string | null | undefined) {
  return hours?.replace(/\s*\(OSM\)$/u, '') ?? 'Horaires inconnus';
}

export default function MapScreen() {
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale >= 1.3;
  const db = useSQLiteContext();
  const router = useRouter();
  const storedPosition = useAppStore((state) => state.lastPosition);
  const setStoredPosition = useAppStore((state) => state.setLastPosition);
  const [position, setPosition] = useState<Coordinates | null>(storedPosition);
  const [locationConsent, setLocationConsent] = useState<'loading' | 'prompt' | 'accepted' | 'declined'>('loading');
  const [filter, setFilter] = useState<Filter>('tout');
  const [mapDownloaded, setMapDownloaded] = useState(false);
  const [mode, setMode] = useState<'map' | 'list'>('list');

  useEffect(() => {
    void Promise.all([
      getSetting(db, 'map_offline_ready'),
      getSetting(db, 'map_location_disclosure_accepted'),
    ]).then(([mapValue, consentValue]) => {
      const ready = mapValue === '1' && MAP_PROVIDER_READY;
      setMapDownloaded(ready);
      if (ready) setMode('map');
      const allowed = consentValue === '1';
      setLocationConsent(allowed ? 'accepted' : 'prompt');
      if (allowed && !position) void locate();
    });
  }, [db, position, setStoredPosition]);

  async function locate() {
    const next = await getEmergencyPosition();
    setPosition(next);
    setStoredPosition(next);
  }

  async function acceptLocationDisclosure() {
    await setSetting(db, 'map_location_disclosure_accepted', '1');
    setLocationConsent('accepted');
    await locate();
  }

  const origin = position ?? BAMAKO;
  const visible = useMemo(
    () => FACILITIES
      .filter((facility) => filter === 'tout' || facility.category === filter || (filter === 'police' && facility.category === 'gendarmerie'))
      .map((facility) => ({ facility, distance: distanceKm(origin, facility) }))
      .sort((a, b) => a.distance - b.distance),
    [filter, origin],
  );

  return (
    <Screen clearFab contentStyle={mode === 'map' ? styles.mapContent : undefined}>
      <AppHeader
        title="Autour de moi"
        eyebrow="Lieux utiles à Bamako"
        action={
          <View style={styles.modeSwitch}>
            <Pressable accessibilityRole="button" accessibilityLabel="Afficher la carte" accessibilityState={{ disabled: !mapDownloaded, selected: mode === 'map' }} disabled={!mapDownloaded} onPress={() => setMode('map')} style={[styles.mode, mode === 'map' && styles.modeOn, !mapDownloaded && styles.modeDisabled]}><MapIcon size={18} color={mode === 'map' ? colors.black : colors.sandMuted} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Afficher la liste" accessibilityState={{ selected: mode === 'list' }} onPress={() => setMode('list')} style={[styles.mode, mode === 'list' && styles.modeOn]}><List size={18} color={mode === 'list' ? colors.black : colors.sandMuted} /></Pressable>
          </View>
        }
      />

      <View style={[styles.filters, largeText && styles.filtersLarge]}>
        {filterLabels.map((item) => (
          <Pressable accessibilityRole="button" accessibilityLabel={`Filtrer : ${item.label}`} accessibilityState={{ selected: filter === item.id }} key={item.id} onPress={() => setFilter(item.id)} style={[styles.filter, largeText && styles.filterLarge, filter === item.id && styles.filterOn]}>
            <Text maxFontSizeMultiplier={1.4} style={[styles.filterText, filter === item.id && styles.filterTextOn]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {locationConsent === 'prompt' ? (
        <Card style={styles.locationDisclosure}>
          <View style={styles.downloadCopy}>
            <Text maxFontSizeMultiplier={1.5} style={styles.downloadTitle}>Voir les lieux les plus proches</Text>
            <Text maxFontSizeMultiplier={1.7} style={styles.downloadText}>Autorisez votre position pour classer les hôpitaux, pharmacies et commissariats par distance.</Text>
          </View>
          <Button label="Utiliser ma position" onPress={() => void acceptLocationDisclosure()} variant="green" icon={<Navigation size={18} color={colors.black} />} />
          <Pressable accessibilityRole="button" accessibilityLabel="Continuer avec le centre de Bamako" onPress={() => setLocationConsent('declined')}><Text maxFontSizeMultiplier={1.4} style={styles.downloadLink}>Continuer avec Bamako</Text></Pressable>
        </Card>
      ) : null}

      {!position && locationConsent !== 'loading' && locationConsent !== 'prompt' ? (
        <Badge label="distances depuis le centre de Bamako" tone="amber" dot />
      ) : position ? (
        <Badge label="distances depuis ma position" tone="green" dot />
      ) : null}

      {!mapDownloaded ? (
        <Card style={[styles.downloadBanner, largeText && styles.downloadBannerLarge]}>
          <View style={styles.downloadIcon}><Download size={21} color={colors.amber} /></View>
          <View style={styles.downloadCopy}>
            <Text maxFontSizeMultiplier={1.5} style={styles.downloadTitle}>{MAP_PROVIDER_READY ? 'Ajouter la carte de Bamako' : 'La liste est prête'}</Text>
            <Text maxFontSizeMultiplier={1.7} style={styles.downloadText}>{MAP_PROVIDER_READY ? 'Téléchargez-la une fois pour voir les lieux sur une carte.' : 'Consultez directement les hôpitaux, pharmacies et commissariats utiles.'}</Text>
          </View>
          {MAP_PROVIDER_READY ? <Pressable accessibilityRole="button" accessibilityLabel="Préparer la carte de Bamako" onPress={() => router.push('/settings')}><Text maxFontSizeMultiplier={1.4} style={styles.downloadLink}>Préparer</Text></Pressable> : null}
        </Card>
      ) : null}

      {mode === 'map' && mapDownloaded ? (
        <View style={styles.mapWrap}>
          <Map mapStyle={MAP_STYLE_URL!} style={styles.map}>
            <Camera initialViewState={{ center: [origin.longitude, origin.latitude], zoom: 12 }} />
            {visible.map(({ facility }) => (
              <Marker
                key={facility.id}
                id={facility.id}
                lngLat={[facility.longitude, facility.latitude]}
                onPress={() => void openFacilityDirections(facility)}
              >
                <View style={[styles.pin, { backgroundColor: categoryColor(facility.category) }]}>
                  <CategoryIcon category={facility.category} color={colors.black} />
                </View>
              </Marker>
            ))}
          </Map>
          <Badge label="carte disponible" tone="green" dot />
        </View>
      ) : (
        <View style={styles.listWrap}>
          {visible.map(({ facility, distance }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ouvrir l'itinéraire vers ${facility.name}, à ${formatDistance(distance)}`}
              accessibilityHint="Ouvre l'application de navigation"
              key={facility.id}
              onPress={() => void openFacilityDirections(facility)}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <View style={[styles.itemIcon, { backgroundColor: `${categoryColor(facility.category)}20` }]}>
                <CategoryIcon category={facility.category} color={categoryColor(facility.category)} />
              </View>
              <View style={styles.itemCopy}>
                <Text maxFontSizeMultiplier={1.5} style={styles.itemName}>{facility.name}</Text>
                <Text maxFontSizeMultiplier={1.7} style={styles.itemMeta}>{facility.city} · {displayHours(facility.hours)}</Text>
              </View>
              <View style={styles.itemEnd}>
                <Text maxFontSizeMultiplier={1.4} style={styles.distanceText}>{formatDistance(distance)}</Text>
                <View style={styles.routeCue}>
                  <Navigation size={13} color={colors.amber} />
                  <Text maxFontSizeMultiplier={1.4} style={styles.routeText}>Itinéraire</Text>
                  <ChevronRight size={14} color={colors.amber} />
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable accessibilityRole="button" accessibilityLabel="Voir les sources de la carte" onPress={() => router.push('/privacy')}>
        <Text maxFontSizeMultiplier={1.7} style={styles.attribution}>Sources de la carte · Vérifiez les horaires avant de vous déplacer.</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapContent: { flexGrow: 1 },
  modeSwitch: { flexDirection: 'row', padding: 3, borderRadius: radius.sm, backgroundColor: colors.raised },
  mode: { width: 36, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modeOn: { backgroundColor: colors.amber },
  modeDisabled: { opacity: 0.3 },
  filters: { flexDirection: 'row', gap: 6 },
  filtersLarge: { flexWrap: 'wrap' },
  filter: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.raised },
  filterOn: { borderColor: colors.alert, backgroundColor: colors.alertDark },
  filterLarge: { flexBasis: '47%' },
  filterText: { fontFamily: font.bodyMedium, fontSize: 12, color: colors.sandMuted },
  filterTextOn: { color: colors.alertLight },
  downloadBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm },
  downloadBannerLarge: { flexDirection: 'column', alignItems: 'stretch' },
  downloadIcon: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.amberDark },
  downloadCopy: { flex: 1 },
  downloadTitle: { fontFamily: font.bodyBold, fontSize: 12, color: colors.sand },
  downloadText: { ...type.small, fontSize: 12, lineHeight: 17, marginTop: 2 },
  downloadLink: { fontFamily: font.bodyBold, fontSize: 11, color: colors.amber },
  locationDisclosure: { gap: spacing.sm, borderColor: '#BFE8D1', backgroundColor: colors.greenDark },
  mapWrap: { flex: 1, minHeight: 390, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.hairline },
  map: { flex: 1 },
  pin: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.sand },
  listWrap: { gap: spacing.xs },
  item: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.raised },
  pressed: { opacity: 0.7 },
  itemIcon: { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  itemCopy: { flex: 1 },
  itemName: { fontFamily: font.bodyBold, fontSize: 13, color: colors.sand },
  itemMeta: { ...type.small, fontSize: 12, marginTop: 3 },
  itemEnd: { minWidth: 76, alignItems: 'flex-end', gap: 5 },
  distanceText: { fontFamily: font.mono, fontSize: 12, color: colors.amber },
  routeCue: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  routeText: { fontFamily: font.bodyBold, fontSize: 12, color: colors.amber },
  attribution: { ...type.small, fontSize: 11, lineHeight: 15, textAlign: 'center', color: colors.sandFaint },
});
