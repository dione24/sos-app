// Metro config: identique au défaut Expo pour Android/iOS.
// Sur la plateforme web uniquement, les modules natifs (SQLCipher, BLE, MapLibre,
// SecureStore) sont remplacés par des shims de `src/web-shims/` afin de pouvoir
// lancer l'interface dans un navigateur pour les revues visuelles et captures.
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const shims = path.resolve(__dirname, 'src/web-shims');
const webAliases = {
  'expo-sqlite': path.join(shims, 'expo-sqlite.tsx'),
  'expo-secure-store': path.join(shims, 'expo-secure-store.ts'),
  '@maplibre/maplibre-react-native': path.join(shims, 'maplibre.tsx'),
  'react-native-ble-plx': path.join(shims, 'react-native-ble-plx.ts'),
};

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (webAliases[moduleName]) return { type: 'sourceFile', filePath: webAliases[moduleName] };
    if (moduleName.endsWith('expo-ble-advertiser/src/ExpoBleAdvertiserModule')) {
      return { type: 'sourceFile', filePath: path.join(shims, 'expo-ble-advertiser.ts') };
    }
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
