import type { ViewState, ViewStateChangeEvent } from '@maplibre/maplibre-react-native';

export type SavedMapViewport = Pick<ViewState, 'center' | 'zoom' | 'bearing' | 'pitch'>;

export function rememberMapViewport(current: SavedMapViewport | null, event: ViewStateChangeEvent): SavedMapViewport | null {
  // Les événements d'initialisation du nouveau moteur ne doivent pas remplacer
  // la zone choisie avant de quitter la carte.
  if (!event.userInteraction) return current;
  const { center, zoom, bearing, pitch } = event;
  return { center: [center[0], center[1]], zoom, bearing, pitch };
}
