#!/bin/bash
# =============================================================================
# Bitcoin Group VIDEO Downloader
# Downloads all 482 Bitcoin Group episodes as video (720p)
# Run AFTER audio download completes, or in parallel
# =============================================================================
set -euo pipefail

DIR="/Users/curiobot/Sites/1n2.org/bitcoingroup-audio"
VIDEO_DIR="$DIR/video"
LOG="$DIR/video-download.log"
URLS="$DIR/urls.txt"
EPISODES="$DIR/episode-list.json"

mkdir -p "$VIDEO_DIR"

TOTAL=$(wc -l < "$URLS" | tr -d ' ')
echo "=== Bitcoin Group Video Downloader ===" | tee "$LOG"
echo "Total episodes: $TOTAL" | tee -a "$LOG"
echo "Output: $VIDEO_DIR" | tee -a "$LOG"
echo "Started: $(date)" | tee -a "$LOG"
echo "" | tee -a "$LOG"

COUNT=0
SKIPPED=0
FAILED=0

while IFS= read -r url; do
    COUNT=$((COUNT + 1))
    VID=$(echo "$url" | grep -o 'v=[^&]*' | cut -d= -f2)
    
    EP_NUM=$(python3.12 -c "
import json
eps = json.load(open('$EPISODES'))
for e in eps:
    if e['vid'] == '$VID':
        print(f\"{e['ep']:03d}\")
        break
" 2>/dev/null || echo "000")
    
    OUTFILE="$VIDEO_DIR/TBG-${EP_NUM}.mp4"
    
    if [ -f "$OUTFILE" ]; then
        echo "[$COUNT/$TOTAL] #$EP_NUM — already exists, skipping" | tee -a "$LOG"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi
    
    echo "[$COUNT/$TOTAL] Downloading video #$EP_NUM ($VID)..." | tee -a "$LOG"
    
    if yt-dlp \
        --format "bestvideo[height<=720]+bestaudio/best[height<=720]" \
        --merge-output-format mp4 \
        --output "$OUTFILE" \
        --no-playlist \
        --quiet \
        --no-warnings \
        "$url" 2>>"$LOG"; then
        
        SIZE=$(du -h "$OUTFILE" 2>/dev/null | cut -f1)
        echo "  ✅ Done ($SIZE)" | tee -a "$LOG"
    else
        echo "  ❌ FAILED" | tee -a "$LOG"
        FAILED=$((FAILED + 1))
    fi
    
    sleep 3
    
done < "$URLS"

echo "" | tee -a "$LOG"
echo "=== Video Download Complete ===" | tee -a "$LOG"
echo "Downloaded: $((COUNT - SKIPPED - FAILED)) | Skipped: $SKIPPED | Failed: $FAILED" | tee -a "$LOG"
echo "Finished: $(date)" | tee -a "$LOG"
du -sh "$VIDEO_DIR" | tee -a "$LOG"
