#!/usr/bin/env bash
set -uo pipefail

failures=0
check_group() {
  local directory="$1"
  shift
  local files=()
  while IFS= read -r file; do files+=("$file"); done < <(find "$directory" -maxdepth 1 -type f -name '*.png' 2>/dev/null | sort)
  if (( ${#files[@]} < 1 || ${#files[@]} > 10 )); then
    echo "ÉCHEC : $directory doit contenir 1 à 10 captures PNG ; ${#files[@]} trouvée(s)." >&2
    failures=$((failures + 1))
    return
  fi
  for file in "${files[@]}"; do
    local metadata accepted=false
    metadata="$(file "$file")"
    if [[ "$metadata" == *"RGBA"* ]]; then
      echo "ÉCHEC : canal alpha interdit : $file" >&2
      failures=$((failures + 1))
    fi
    for dimensions in "$@"; do
      [[ "$metadata" == *"PNG image data, $dimensions"* ]] && accepted=true
    done
    if [[ "$accepted" != true ]]; then
      echo "ÉCHEC : dimensions App Store incorrectes : $file" >&2
      failures=$((failures + 1))
    fi
  done
}

check_group store-assets/ios/iphone-6.9 "1260 x 2736" "1290 x 2796" "1320 x 2868"
check_group store-assets/ios/ipad-13 "2064 x 2752" "2048 x 2732"

if (( failures > 0 )); then
  exit 2
fi
echo "Captures App Store validées : iPhone 6,9 pouces et iPad 13 pouces."
