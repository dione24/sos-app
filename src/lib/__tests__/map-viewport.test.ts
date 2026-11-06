import type { ViewStateChangeEvent } from '@maplibre/maplibre-react-native';
import { describe, expect, it } from 'vitest';

import { rememberMapViewport } from '@/lib/map-viewport';

function event(update: Partial<ViewStateChangeEvent> = {}): ViewStateChangeEvent {
  return {
    center: [-8.02, 12.65], zoom: 15, bearing: 35, pitch: 42,
    bounds: [-8.05, 12.6, -7.95, 12.7], animated: false, userInteraction: true,
    ...update,
  };
}

describe('cadrage de la carte après remontage', () => {
  it('retient centre, zoom, rotation et inclinaison choisis par un geste', () => {
    expect(rememberMapViewport(null, event())).toEqual({
      center: [-8.02, 12.65], zoom: 15, bearing: 35, pitch: 42,
    });
  });

  it('ne remplace pas ce cadrage par les événements initiaux du nouveau moteur', () => {
    const saved = rememberMapViewport(null, event());
    const initial = event({ center: [0, 0], zoom: 0, bearing: 0, pitch: 0, userInteraction: false });
    expect(rememberMapViewport(saved, initial)).toBe(saved);
    expect(rememberMapViewport(null, initial)).toBeNull();
    expect(rememberMapViewport(saved, event({ zoom: 17, bearing: 80 }))).toMatchObject({ zoom: 17, bearing: 80 });
  });

  it('conserve sa propre copie des coordonnées de l’événement natif', () => {
    const nativeEvent = event();
    const saved = rememberMapViewport(null, nativeEvent);
    nativeEvent.center[0] = 0;
    expect(saved?.center).toEqual([-8.02, 12.65]);
  });
});
