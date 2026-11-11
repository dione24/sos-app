import { TransformRequestManager } from '@maplibre/maplibre-react-native';

import { MAP_REQUEST_USER_AGENT } from '@/constants/map';

let installed = false;

/** Called only when opening/downloading a map, before any style request. */
export function ensureMapHeaders() {
  if (installed) return;
  TransformRequestManager.addHeader({
    id: 'sos-maptiler-user-agent',
    match: '^https://api\\.maptiler\\.com/',
    name: 'User-Agent',
    value: MAP_REQUEST_USER_AGENT,
  });
  installed = true;
}
