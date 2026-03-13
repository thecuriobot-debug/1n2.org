#!/usr/bin/env bash
set -euo pipefail

out_dir="assets/references/screenshots"
mkdir -p "$out_dir"

# title|filename|wiki file title
cat <<'LIST' | while IFS='|' read -r game outfile file_title; do
Contra|contra_nes_screenshot.png|Contra (NES version screenshot).png
Moon Patrol|moon_patrol_arcade.png|Moon patrol.png
Mega Man|mega_man_nes.png|NES Mega Man.png
Bionic Commando|bionic_commando_cover.png|Bionic Commando.png
Blaster Master|blaster_master_logo.png|Blaster Master Logo.png
LIST
  api_url="https://en.wikipedia.org/w/api.php?action=query&titles=File:${file_title// /%20}&prop=imageinfo&iiprop=url&format=json"
  image_url=$(curl -s "$api_url" | jq -r '.query.pages[]?.imageinfo[0]?.url // empty')
  if [[ -n "$image_url" ]]; then
    curl -L -s "$image_url" -o "$out_dir/$outfile"
    echo "downloaded: $game -> $outfile"
  else
    echo "missing: $game"
  fi
 done
