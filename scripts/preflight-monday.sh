#!/usr/bin/env bash
set -uo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root_dir"

technical_failures=0
publication_blockers=0

run_technical() {
  local label="$1"
  shift
  printf '\n[%s]\n' "$label"
  if "$@"; then
    echo "OK : $label"
  else
    echo "ÉCHEC TECHNIQUE : $label" >&2
    technical_failures=$((technical_failures + 1))
  fi
}

run_publication_guard() {
  local label="$1"
  shift
  printf '\n[%s]\n' "$label"
  "$@"
  local status=$?
  if (( status == 0 )); then
    echo "OK : $label"
  elif (( status == 2 )); then
    publication_blockers=$((publication_blockers + 1))
  else
    echo "ÉCHEC TECHNIQUE : $label" >&2
    technical_failures=$((technical_failures + 1))
  fi
}

run_technical "TypeScript" npm run typecheck
run_technical "Tests unitaires" npm test
run_technical "Compatibilité Expo" npx expo install --check
run_technical "Expo Doctor" npx expo-doctor
run_technical "Manifeste Android" npm run verify:android-manifest
run_technical "Configuration iOS minimale" npm run verify:ios-config
run_technical "Intégrité des assets Play" bash -c 'cd store-assets && shasum -a 256 -c CHECKSUMS.sha256'
run_publication_guard "Dossier Play" npm run verify:play-submission
run_publication_guard "Signature AAB" npm run verify:android-release -- "${1:-android/app/build/outputs/bundle/release/app-release.aab}"

printf '\nRésumé préflight\n'
printf -- '- échecs techniques : %d\n' "$technical_failures"
printf -- '- gardes publication encore bloquantes : %d\n' "$publication_blockers"

if (( technical_failures > 0 )); then
  exit 1
fi
if (( publication_blockers > 0 )); then
  echo "Le code est contrôlé, mais la soumission reste volontairement interdite jusqu'à résolution des éléments éditeur/Play." >&2
  exit 2
fi

echo "Préflight complet : dossier prêt pour la piste interne Google Play."
