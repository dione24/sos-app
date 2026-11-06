const mapTilerKey = process.env.EXPO_PUBLIC_MAPTILER_KEY?.trim();

/** Identifie les requêtes natives pour la restriction de la clé MapTiler. */
export const MAP_REQUEST_USER_AGENT = 'ml.sossecurite.app/1.0.0';

/**
 * MapLibre's demo tiles are explicitly development-only. A public MapTiler key
 * is injected at build time for production and is never persisted in user data.
 */
export const MAP_STYLE_URL = mapTilerKey
  ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(mapTilerKey)}`
  : null;

export const MAP_PROVIDER_READY = MAP_STYLE_URL !== null;
export const MAP_PROVIDER_LABEL = 'MapTiler · OpenStreetMap';
