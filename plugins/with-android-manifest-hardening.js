const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

const TOOLS_NAMESPACE = 'http://schemas.android.com/tools';
const UNUSED_LOCATION_SERVICE = 'expo.modules.location.services.LocationTaskService';
const OPTIONAL_HARDWARE_FEATURES = [
  'android.hardware.bluetooth',
  'android.hardware.bluetooth_le',
  'android.hardware.location',
];
const LEGACY_BLUETOOTH_PERMISSIONS = new Set([
  'android.permission.BLUETOOTH',
  'android.permission.BLUETOOTH_ADMIN',
]);

/**
 * Keeps the production manifest aligned with V1's foreground-only location use.
 * This must be a config plugin because EAS regenerates the ignored android/
 * directory before a cloud build.
 */
function withAndroidManifestHardening(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults;
    manifest.manifest.$['xmlns:tools'] = TOOLS_NAMESPACE;

    // BLE's plugin adds legacy SDK-23 location declarations capped at API 30.
    // The app also uses foreground GPS on current Android versions, so retain
    // only its normal, uncapped declarations. Play rejects conflicting copies.
    manifest.manifest['uses-permission-sdk-23'] = (
      manifest.manifest['uses-permission-sdk-23'] || []
    ).filter((permission) => ![
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
    ].includes(permission.$['android:name']));

    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    application.$['android:allowBackup'] = 'false';
    application.service = (application.service || []).filter(
      (service) => service.$['android:name'] !== UNUSED_LOCATION_SERVICE,
    );
    application.service.push({
      $: {
        'android:name': UNUSED_LOCATION_SERVICE,
        'tools:node': 'remove',
      },
    });

    const existingFeatures = manifest.manifest['uses-feature'] || [];
    const optionalFeatures = new Set(OPTIONAL_HARDWARE_FEATURES);
    manifest.manifest['uses-feature'] = existingFeatures
      .filter((feature) => !optionalFeatures.has(feature.$['android:name']))
      .concat(OPTIONAL_HARDWARE_FEATURES.map((name) => ({
        $: {
          'android:name': name,
          'android:required': 'false',
        },
      })));

    for (const permission of manifest.manifest['uses-permission'] || []) {
      const name = permission.$['android:name'];
      if (LEGACY_BLUETOOTH_PERMISSIONS.has(name)) {
        permission.$['android:maxSdkVersion'] = '30';
      }
      if (name === 'android.permission.BLUETOOTH_SCAN') {
        permission.$['android:usesPermissionFlags'] = 'neverForLocation';
      }
    }

    return modConfig;
  });
}

module.exports = withAndroidManifestHardening;
