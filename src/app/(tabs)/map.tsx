import { Camera, Map, Marker, type MapProps } from '@maplibre/maplibre-react-native';
import { useFocusEffect, useIsFocused, useRouter } from 'expo-router';
import { Building2, Download, Hospital, List, MapIcon, Navigation, Pill, Shield } from 'lucide-react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Linking, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Screen } from '@/components/Screen';
import { Button, IconTile, ListRow, Notice, Tag } from '@/components/ui';
import { MAP_PROVIDER_READY, MAP_STYLE_URL } from '@/constants/map';
import { FACILITIES } from '@/data';
import { getSetting, setSetting } from '@/db/database';
import { distanceKm, formatDistance } from '@/lib/distance';
import { rememberMapViewport, type SavedMapViewport } from '@/lib/map-viewport';
import { getEmergencyPosition } from '@/services/location';
import { useAppStore } from '@/store/app-store';
import { makeStyles, useTheme, type Palette } from '@/theme';
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

function categoryTone(category: FacilityCategory) {
  if (category === 'hopital') return 'danger' as const;
  if (category === 'pharmacie') return 'primary' as const;
  return 'info' as const;
}

function categoryColor(category: FacilityCategory, colors: Palette) {
  if (category === 'hopital') return colors.dangerText;
  if (category === 'pharmacie') return colors.primaryText;
  return colors.infoText;
}

function CategoryIcon({ category, color, size = 22 }: { category: FacilityCategory; color: string; size?: number }) {
  const Icon = category === 'hopital' ? Hospital : category === 'pharmacie' ? Pill : category === 'gendarmerie' ? Building2 : Shield;
  return <Icon size={size} color={color} strokeWidth={2} />;
}

function displayHours(hours: string | null | undefined) {
  return hours?.replace(/\s*\(OSM\)$/u, '') ?? 'Horaires inconnus';
}

export default function MapScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale >= 1.3;
  const db = useSQLiteContext();
  const router = useRouter();
  const isFocused = useIsFocused();
  const focused = useRef(false);
  const locationRequest = useRef<Promise<Coordinates | null> | null>(null);
  const savedViewport = useRef<SavedMapViewport | null>(null);
  const position = useAppStore((state) => state.lastPosition);
  const setStoredPosition = useAppStore((state) => state.setLastPosition);
  const [locationConsent, setLocationConsent] = useState<'loading' | 'prompt' | 'accepted' | 'declined'>('loading');
  const [filter, setFilter] = useState<Filter>('tout');
  const [mapDownloaded, setMapDownloaded] = useState(false);
  const [modeChoice, setModeChoice] = useState<'map' | 'list' | null>(null);
  const mode = mapDownloaded ? modeChoice ?? 'map' : 'list';

  const saveViewport = useCallback<NonNullable<MapProps['onRegionDidChange']>>(({ nativeEvent }) => {
    // Pas de setState : déplacer la carte ne déclenche aucun rendu React.
    savedViewport.current = rememberMapViewport(savedViewport.current, nativeEvent);
  }, []);

  const locate = useCallback(async () => {
    // Un retour rapide sur cet onglet réutilise la demande GPS déjà en cours.
    locationRequest.current ??= getEmergencyPosition().catch(() => null).finally(() => {
      locationRequest.current = null;
    });
    const next = await locationRequest.current;
    if (focused.current) setStoredPosition(next);
  }, [setStoredPosition]);

  useFocusEffect(useCallback(() => {
    let active = true;
    focused.current = true;
    void Promise.all([
      getSetting(db, 'map_offline_ready'),
      getSetting(db, 'map_location_disclosure_accepted'),
    ]).then(([mapValue, consentValue]) => {
      if (!active) return;
      const ready = mapValue === '1' && MAP_PROVIDER_READY;
      setMapDownloaded(ready);
      const allowed = consentValue === '1';
      setLocationConsent((current) => allowed ? 'accepted' : current === 'declined' ? current : 'prompt');
      if (allowed && !useAppStore.getState().lastPosition) void locate();
    }).catch(() => {
      if (active) setLocationConsent((current) => current === 'loading' ? 'prompt' : current);
    });
    return () => {
      active = false;
      focused.current = false;
    };
  }, [db, locate]));

  async function acceptLocationDisclosure() {
    await setSetting(db, 'map_location_disclosure_accepted', '1');
    if (!focused.current) return;
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
    <Screen clearFab contentStyle={mode === 'map' ? s.mapContent : undefined}>
      <AppHeader
        title="Autour de moi"
        subtitle="Hôpitaux, pharmacies et commissariats de Bamako"
        action={
          <View style={s.modeSwitch}>
            <Pressable accessibilityRole="button" accessibilityLabel="Afficher la carte" accessibilityState={{ disabled: !mapDownloaded, selected: mode === 'map' }} disabled={!mapDownloaded} onPress={() => setModeChoice('map')} style={[s.mode, mode === 'map' && s.modeOn, !mapDownloaded && s.modeDisabled]}>
              <MapIcon size={20} color={mode === 'map' ? colors.onPrimary : colors.inkMuted} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Afficher la liste" accessibilityState={{ selected: mode === 'list' }} onPress={() => setModeChoice('list')} style={[s.mode, mode === 'list' && s.modeOn]}>
              <List size={20} color={mode === 'list' ? colors.onPrimary : colors.inkMuted} />
            </Pressable>
          </View>
        }
      />

      <View style={[s.filters, largeText && s.filtersLarge]}>
        {filterLabels.map((item) => {
          const on = filter === item.id;
          return (
            <Pressable accessibilityRole="button" accessibilityLabel={`Filtrer : ${item.label}`} accessibilityState={{ selected: on }} key={item.id} onPress={() => setFilter(item.id)} style={[s.filter, largeText && s.filterLarge, on && s.filterOn]}>
              <Text maxFontSizeMultiplier={1.3} style={[s.filterText, on && s.filterTextOn]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {locationConsent === 'prompt' ? (
        <Notice
          icon={<Navigation size={20} color={colors.infoText} />}
          tone="info"
          title="Voir les lieux les plus proches"
          text="Autorisez votre position pour classer les hôpitaux, pharmacies et commissariats par distance."
        >
          <Button label="Utiliser ma position" onPress={() => void acceptLocationDisclosure()} icon={<Navigation size={20} color={colors.onPrimary} />} />
          <Button label="Continuer avec Bamako" size="md" variant="ghost" accessibilityLabel="Continuer avec le centre de Bamako" onPress={() => setLocationConsent('declined')} />
        </Notice>
      ) : null}

      {!position && locationConsent !== 'loading' && locationConsent !== 'prompt' ? (
        <Tag label="Distances depuis le centre de Bamako" tone="warning" dot />
      ) : position ? (
        <Tag label="Distances depuis ma position" tone="primary" dot />
      ) : null}

      {!mapDownloaded ? (
        <ListRow
          title={MAP_PROVIDER_READY ? 'Ajouter la carte de Bamako' : 'La liste est prête'}
          subtitle={MAP_PROVIDER_READY ? 'Téléchargez-la une fois pour voir les lieux sur une carte.' : 'Consultez directement les lieux utiles, même sans connexion.'}
          leading={<IconTile tone="neutral"><Download size={22} color={colors.inkMuted} /></IconTile>}
          chevron={MAP_PROVIDER_READY}
          onPress={MAP_PROVIDER_READY ? () => router.push('/settings') : undefined}
          accessibilityLabel="Préparer la carte de Bamako"
        />
      ) : null}

      {mode === 'map' && mapDownloaded ? (
        <View style={s.mapWrap}>
          {isFocused ? (
            <Map mapStyle={MAP_STYLE_URL!} style={s.map} onRegionIsChanging={saveViewport} onRegionDidChange={saveViewport}>
              <Camera initialViewState={savedViewport.current ?? { center: [origin.longitude, origin.latitude], zoom: 12 }} />
              {visible.map(({ facility }) => (
                <Marker key={facility.id} id={facility.id} lngLat={[facility.longitude, facility.latitude]} onPress={() => void openFacilityDirections(facility)}>
                  <View style={[s.pin, { backgroundColor: categoryColor(facility.category, colors) }]}>
                    <CategoryIcon category={facility.category} color={colors.onColor} size={18} />
                  </View>
                </Marker>
              ))}
            </Map>
          ) : null}
        </View>
      ) : (
        <View style={s.listWrap}>
          {visible.map(({ facility, distance }) => (
            <ListRow
              key={facility.id}
              title={facility.name}
              subtitle={`${facility.city} · ${displayHours(facility.hours)}`}
              leading={<IconTile tone={categoryTone(facility.category)}><CategoryIcon category={facility.category} color={categoryColor(facility.category, colors)} /></IconTile>}
              trailing={
                <View style={s.itemEnd}>
                  <Text maxFontSizeMultiplier={1.3} style={s.distanceText}>{formatDistance(distance)}</Text>
                  <View style={s.routeCue}>
                    <Navigation size={14} color={colors.primaryText} />
                    <Text maxFontSizeMultiplier={1.3} style={s.routeText}>Itinéraire</Text>
                  </View>
                </View>
              }
              accessibilityLabel={`Ouvrir l'itinéraire vers ${facility.name}, à ${formatDistance(distance)}`}
              accessibilityHint="Ouvre l'application de navigation"
              onPress={() => void openFacilityDirections(facility)}
            />
          ))}
        </View>
      )}

      <Button label="Sources de la carte · vérifiez les horaires avant de vous déplacer" size="md" variant="ghost" accessibilityLabel="Voir les sources de la carte" onPress={() => router.push('/sources')} />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  mapContent: { flexGrow: 1 },
  modeSwitch: { flexDirection: 'row', padding: 3, borderRadius: t.radius.sm, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border },
  mode: { width: 44, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  modeOn: { backgroundColor: t.colors.primary },
  modeDisabled: { opacity: 0.35 },
  filters: { flexDirection: 'row', gap: t.spacing.xs },
  filtersLarge: { flexWrap: 'wrap' },
  filter: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: t.spacing.xs, borderRadius: t.radius.full, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface },
  filterOn: { borderColor: t.colors.primary, backgroundColor: t.colors.primaryBg },
  filterLarge: { flexBasis: '47%' },
  filterText: { ...t.text.captionStrong, color: t.colors.inkMuted },
  filterTextOn: { color: t.colors.primaryText },
  mapWrap: { flex: 1, minHeight: 390, borderRadius: t.radius.md, overflow: 'hidden', borderWidth: 1, borderColor: t.colors.border },
  map: { flex: 1 },
  pin: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: t.colors.surface },
  listWrap: { gap: t.spacing.xs },
  itemEnd: { minWidth: 72, alignItems: 'flex-end', gap: 4 },
  distanceText: { ...t.text.captionStrong },
  routeCue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  routeText: { ...t.text.caption, fontSize: 13, lineHeight: 18, color: t.colors.primaryText },
}));
