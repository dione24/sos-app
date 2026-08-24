#!/usr/bin/env bash
set -euo pipefail

expected="$(node -e "const guides=require('./assets/data/first-aid-guides.json'); process.stdout.write(String(guides.reduce((total, guide) => total + guide.steps.length, 0)))")"
actual="$(find assets/audio/fr -type f -name '*.mp3' | wc -l | tr -d ' ')"
registered="$(rg -c "^  'fr/.+\.mp3'\),$" src/lib/guide-audio.ts)"

[[ "$actual" == "$expected" ]] || { echo "ÉCHEC : $actual fichiers audio français pour $expected étapes." >&2; exit 1; }
[[ "$registered" == "$expected" ]] || { echo "ÉCHEC : $registered fichiers enregistrés dans le registre pour $expected étapes." >&2; exit 1; }

while IFS= read -r audio; do
  [[ -s "$audio" ]] || { echo "ÉCHEC : fichier vide : $audio" >&2; exit 1; }
  [[ "$(file -b "$audio")" == MPEG*layer\ III* ]] || { echo "ÉCHEC : MP3 illisible : $audio" >&2; exit 1; }
done < <(find assets/audio/fr -type f -name '*.mp3' | sort)

echo "Narration française validée : $actual étapes, MP3 mono embarqués et registre complet."
