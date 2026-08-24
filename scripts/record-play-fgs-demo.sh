#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: $0 <serial-adb> [fichier-sortie.mp4]" >&2
  exit 64
fi

serial="$1"
output="${2:-store-assets/video/foreground-service-connected-device.mp4}"
adb_bin="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb"
remote="/sdcard/sos-fgs-demo.mp4"

if [[ ! -x "$adb_bin" ]]; then
  echo "ADB introuvable : $adb_bin" >&2
  exit 69
fi
if ! "$adb_bin" -s "$serial" get-state 2>/dev/null | grep -q '^device$'; then
  echo "Appareil ADB indisponible : $serial" >&2
  exit 69
fi

mkdir -p "$(dirname "$output")"
"$adb_bin" -s "$serial" shell rm -f "$remote"

cat <<'INSTRUCTIONS'
Enregistrement de 3 minutes maximum.
Effectuez maintenant le parcours Foreground Service décrit dans
docs/FOREGROUND_SERVICE_DECLARATION.md. Le service doit réellement démarrer et la
notification avec l'action d'arrêt doit être visible. Ctrl-C arrête l'enregistrement.
INSTRUCTIONS

trap ':' INT
set +e
"$adb_bin" -s "$serial" shell screenrecord --bit-rate 8000000 --time-limit 180 "$remote"
record_status=$?
set -e
trap - INT

"$adb_bin" -s "$serial" pull "$remote" "$output"
"$adb_bin" -s "$serial" shell rm -f "$remote"
test -s "$output"
if [[ "$record_status" -ne 0 && "$record_status" -ne 130 ]]; then
  exit "$record_status"
fi
node scripts/verify-fgs-video.mjs "$output"
echo "Vidéo récupérée et validée : $output"
