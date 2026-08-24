const mapTilerKey = process.env.EXPO_PUBLIC_MAPTILER_KEY?.trim();

/**
 * MapLibre's demo tiles are explicitly development-only. A public MapTiler key
 * is injected at build time for production and is never persisted in user data.
 */
export const MAP_STYLE_URL = mapTilerKey
  ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(mapTilerKey)}`
  : null;

export const MAP_PROVIDER_READY = MAP_STYLE_URL !== null;
export const MAP_PROVIDER_LABEL = 'MapTiler · OpenStreetMap';
