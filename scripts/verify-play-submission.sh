#!/usr/bin/env bash
set -uo pipefail

failures=0

fail() {
  echo "ÉCHEC : $*" >&2
  failures=$((failures + 1))
}

check_png() {
  local path="$1"
  local dimensions="$2"
  local alpha_policy="$3"
  local metadata

  if [[ ! -s "$path" ]]; then
    fail "fichier absent ou vide : $path"
    return
  fi
  metadata="$(file "$path")"
  [[ "$metadata" == *"PNG image data, $dimensions"* ]] || fail "dimensions incorrectes pour $path (attendu $dimensions)"
  if [[ "$alpha_policy" == "forbidden" && "$metadata" == *"RGBA"* ]]; then
    fail "canal alpha interdit : $path"
  fi
}

check_png "store-assets/icon-512.png" "512 x 512" "allowed"
check_png "store-assets/feature-graphic-1024x500.png" "1024 x 500" "forbidden"

mapfile_cmd="$(command -v mapfile || true)"
if [[ -n "$mapfile_cmd" ]]; then
  mapfile -t screenshots < <(find store-assets/screenshots -maxdepth 1 -type f -name '*.png' | sort)
else
  screenshots=()
  while IFS= read -r screenshot; do screenshots+=("$screenshot"); done < <(find store-assets/screenshots -maxdepth 1 -type f -name '*.png' | sort)
fi

if (( ${#screenshots[@]} < 2 || ${#screenshots[@]} > 8 )); then
  fail "Google Play attend 2 à 8 captures téléphone ; ${#screenshots[@]} trouvée(s)"
fi
for screenshot in "${screenshots[@]}"; do
  check_png "$screenshot" "1080 x 1920" "forbidden"
done

if rg -q '\[(NOM JURIDIQUE|ADRESSE|EMAIL)\]' store-assets/privacy-policy.html; then
  fail "coordonnées éditeur non remplacées dans la politique de confidentialité"
fi

video="store-assets/video/foreground-service-connected-device.mp4"
if [[ ! -s "$video" ]]; then
  fail "vidéo Foreground Service manquante : $video"
elif ! node scripts/verify-fgs-video.mjs "$video"; then
  fail "vidéo Foreground Service invalide : $video"
fi

if (( failures > 0 )); then
  echo "$failures blocage(s) Play restant(s)." >&2
  exit 2
fi

echo "Assets Play prêts : ${#screenshots[@]} captures, icône, visuel, politique finale et vidéo FGS."
