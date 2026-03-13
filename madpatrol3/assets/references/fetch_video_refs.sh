#!/usr/bin/env bash
set -euo pipefail

mkdir -p assets/references/video_thumbs
out_md="assets/references/videos.md"

echo "# Gameplay Video References" > "$out_md"
echo >> "$out_md"

cat <<'LIST' | while IFS='|' read -r game query slug; do
Contra|Contra NES longplay no commentary|contra
Moon Patrol|Moon Patrol arcade gameplay|moon_patrol
Blaster Master|Blaster Master NES longplay|blaster_master
Mega Man|Mega Man NES longplay|mega_man
Bionic Commando|Bionic Commando NES longplay|bionic_commando
LIST
  line=$(yt-dlp "ytsearch1:${query}" --print "%(id)s|%(title)s|%(webpage_url)s" --skip-download 2>/dev/null | head -n 1 || true)
  if [[ -z "$line" ]]; then
    echo "- ${game}: not found" >> "$out_md"
    continue
  fi
  IFS='|' read -r vid title url <<< "$line"
  thumb_url="https://i.ytimg.com/vi/${vid}/hqdefault.jpg"
  curl -L -s "$thumb_url" -o "assets/references/video_thumbs/${slug}_thumb.jpg"
  echo "- ${game}: [${title}](${url})" >> "$out_md"
  echo "  - Thumbnail: ./video_thumbs/${slug}_thumb.jpg" >> "$out_md"
  echo >> "$out_md"
  echo "fetched video ref: ${game}"
 done
