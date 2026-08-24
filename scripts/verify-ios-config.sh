#!/usr/bin/env bash
set -euo pipefail

plist="${1:-ios/SOSScuritMali/Info.plist}"
privacy="${2:-ios/SOSScuritMali/PrivacyInfo.xcprivacy}"
plist_buddy=/usr/libexec/PlistBuddy

if [[ ! -f "$plist" || ! -f "$privacy" ]]; then
  echo "ÉCHEC : lancez d'abord 'npx expo prebuild --platform ios --clean --no-install'." >&2
  exit 1
fi

read_key() {
  plutil -extract "$2" raw -o - "$1" 2>/dev/null
}

[[ "$(read_key "$plist" CFBundleShortVersionString)" == "1.0.0" ]]
[[ "$(read_key "$plist" ITSAppUsesNonExemptEncryption)" == "false" ]]
[[ -n "$(read_key "$plist" NSLocationWhenInUseUsageDescription)" ]]
[[ -n "$(read_key "$plist" NSBluetoothAlwaysUsageDescription)" ]]
[[ "$(read_key "$privacy" NSPrivacyTracking)" == "false" ]]

forbidden=(
  NSFaceIDUsageDescription
  NSLocationAlwaysAndWhenInUseUsageDescription
  NSLocationAlwaysUsageDescription
  NSMotionUsageDescription
  NSBluetoothPeripheralUsageDescription
  UIBackgroundModes
)
for key in "${forbidden[@]}"; do
  if "$plist_buddy" -c "Print :$key" "$plist" >/dev/null 2>&1; then
    echo "ÉCHEC : déclaration iOS inutile présente : $key" >&2
    exit 1
  fi
done

echo "Configuration iOS validée : permissions au premier plan, sans Face ID ni modes arrière-plan."
