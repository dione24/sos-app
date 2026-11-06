#!/usr/bin/env bash
set -uo pipefail

apk_path="${1:-android/app/build/outputs/apk/release/app-release.apk}"
failures=0

fail() {
  echo "ÉCHEC : $*" >&2
  failures=$((failures + 1))
}

if [[ ! -s "$apk_path" ]]; then
  echo "ÉCHEC : APK introuvable ou vide : $apk_path" >&2
  exit 1
fi

android_sdk="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [[ -z "$android_sdk" && -f android/local.properties ]]; then
  android_sdk="$(sed -n 's/^sdk\.dir=//p' android/local.properties | head -1)"
fi
if [[ -z "$android_sdk" || ! -d "$android_sdk/build-tools" ]]; then
  echo "ÉCHEC : SDK Android introuvable (ANDROID_HOME ou android/local.properties requis)." >&2
  exit 1
fi

aapt2="$(find "$android_sdk/build-tools" -type f -name aapt2 | sort -V | tail -1)"
if [[ -z "$aapt2" ]]; then
  echo "ÉCHEC : aapt2 introuvable dans $android_sdk/build-tools." >&2
  exit 1
fi

expected_version="$(node -p 'require("./app.json").expo.version')"
badging="$("$aapt2" dump badging "$apk_path")"
permissions="$("$aapt2" dump permissions "$apk_path")"
xmltree="$("$aapt2" dump xmltree "$apk_path" --file AndroidManifest.xml)"

[[ "$badging" == *"package: name='ml.sossecurite.app'"* ]] || fail "package Android inattendu"
[[ "$badging" == *"versionName='$expected_version'"* ]] || fail "versionName inattendue (attendu : $expected_version)"
[[ "$badging" == *"targetSdkVersion:'36'"* ]] || fail "targetSdk 36 requis"

for feature in \
  android.hardware.bluetooth \
  android.hardware.bluetooth_le \
  android.hardware.location; do
  [[ "$badging" == *"uses-feature-not-required: name='$feature'"* ]] || \
    fail "$feature doit être facultatif"
done

for permission in \
  android.permission.CAMERA \
  android.permission.MANAGE_EXTERNAL_STORAGE \
  android.permission.READ_EXTERNAL_STORAGE \
  android.permission.READ_MEDIA_IMAGES \
  android.permission.READ_MEDIA_VIDEO \
  android.permission.RECEIVE_BOOT_COMPLETED \
  android.permission.RECORD_AUDIO \
  android.permission.SYSTEM_ALERT_WINDOW \
  android.permission.USE_BIOMETRIC \
  android.permission.USE_FINGERPRINT \
  android.permission.WRITE_EXTERNAL_STORAGE; do
  [[ "$permissions" != *"name='$permission'"* ]] || fail "permission interdite présente : $permission"
done

for permission in \
  android.permission.FOREGROUND_SERVICE \
  android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE; do
  [[ "$permissions" == *"name='$permission'"* ]] || fail "permission BLE requise absente : $permission"
done

[[ "$xmltree" == *'allowBackup(0x01010280)=false'* ]] || fail "allowBackup doit rester à false"
for permission in android.permission.ACCESS_COARSE_LOCATION android.permission.ACCESS_FINE_LOCATION; do
  count="$(awk -v name="\"$permission\"" 'index($0, name) { n++ } END { print n+0 }' <<< "$xmltree")"
  [[ "$count" == 1 ]] || fail "$permission doit avoir une seule déclaration (trouvé : $count)"
done
for permission in android.permission.BLUETOOTH android.permission.BLUETOOTH_ADMIN; do
  block="$(awk -v name="$permission" 'index($0, name) { print; getline; print; exit }' <<< "$xmltree")"
  [[ "$block" == *'maxSdkVersion(0x01010271)=30'* ]] || fail "$permission doit être limité à Android 11 et inférieur"
done
scan_block="$(awk '/android.permission.BLUETOOTH_SCAN/ { print; getline; print; exit }' <<< "$xmltree")"
[[ "$scan_block" == *'usesPermissionFlags(0x01010644)=0x00010000'* ]] || \
  fail "BLUETOOTH_SCAN doit déclarer neverForLocation"
[[ "$xmltree" == *'expo.modules.bleadvertiser.BleRelayForegroundService'* ]] || fail "service BLE natif absent"
[[ "$xmltree" == *'foregroundServiceType(0x01010599)=0x00000010'* ]] || fail "type connectedDevice absent"
[[ "$xmltree" != *'expo.modules.location.services.LocationTaskService'* ]] || fail "service de localisation arrière-plan présent"

if (( failures > 0 )); then
  echo "$failures anomalie(s) dans le manifeste Android." >&2
  exit 2
fi

echo "Manifeste Android validé : API 36, permissions minimales, Bluetooth sans usage de localisation et FGS BLE isolé."
