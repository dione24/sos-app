#!/usr/bin/env bash
set -euo pipefail

aab_path="${1:-android/app/build/outputs/bundle/release/app-release.aab}"

if [[ ! -f "$aab_path" ]]; then
  echo "AAB introuvable : $aab_path" >&2
  exit 1
fi

if ! jarsigner -verify "$aab_path" >/dev/null 2>&1; then
  echo "ÉCHEC : la signature JAR de l'AAB est invalide." >&2
  exit 1
fi

certificate="$(keytool -printcert -jarfile "$aab_path" 2>/dev/null)"
owner="$(printf '%s\n' "$certificate" | sed -n 's/^Owner: //p' | head -1)"

if [[ -z "$owner" ]]; then
  echo "ÉCHEC : certificat de signature AAB introuvable." >&2
  exit 1
fi

if [[ "$owner" == *"CN=Android Debug"* ]]; then
  echo "ÉCHEC : AAB signé avec Android Debug — téléversement Play interdit." >&2
  exit 2
fi

echo "Signature AAB de production acceptée : $owner"
shasum -a 256 "$aab_path"
