#!/bin/bash
# =============================================================================
# Bitcoin Group Audio Downloader
# Downloads all 482 Bitcoin Group episodes as audio files
# Uses yt-dlp to extract audio from YouTube videos
# =============================================================================
set -euo pipefail

DIR="/Users/curiobot/Sites/1n2.org/bitcoingroup-audio"
AUDIO_DIR="$DIR/audio"
LOG="$DIR/download.log"
URLS="$DIR/urls.txt"
EPISODES="$DIR/episode-list.json"

mkdir -p "$AUDIO_DIR"

TOTAL=$(wc -l < "$URLS" | tr -d ' ')
echo "=== Bitcoin Group Audio Downloader ===" | tee "$LOG"
echo "Total episodes: $TOTAL" | tee -a "$LOG"
echo "Output: $AUDIO_DIR" | tee -a "$LOG"
echo "Started: $(date)" | tee -a "$LOG"
echo "" | tee -a "$LOG"

COUNT=0
SKIPPED=0
FAILED=0

while IFS= read -r url; do
    COUNT=$((COUNT + 1))
    VID=$(echo "$url" | grep -o 'v=[^&]*' | cut -d= -f2)
    
    # Get episode number from JSON
    EP_NUM=$(python3.12 -c "
import json
eps = json.load(open('$EPISODES'))
for e in eps:
    if e['vid'] == '$VID':
        print(f\"{e['ep']:03d}\")
        break
" 2>/dev/null || echo "000")
    
    OUTFILE="$AUDIO_DIR/TBG-${EP_NUM}.m4a"
    
    # Skip if already downloaded
    if [ -f "$OUTFILE" ]; then
        echo "[$COUNT/$TOTAL] #$EP_NUM — already exists, skipping" | tee -a "$LOG"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi
    
    echo "[$COUNT/$TOTAL] Downloading #$EP_NUM ($VID)..." | tee -a "$LOG"
    
    if yt-dlp \
        --extract-audio \
        --audio-format m4a \
        --audio-quality 128K \
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
    
    # Rate limit — be nice to YouTube
    sleep 2
    
done < "$URLS"

echo "" | tee -a "$LOG"
echo "=== Download Complete ===" | tee -a "$LOG"
echo "Total: $TOTAL" | tee -a "$LOG"
echo "Downloaded: $((COUNT - SKIPPED - FAILED))" | tee -a "$LOG"
echo "Skipped: $SKIPPED" | tee -a "$LOG"
echo "Failed: $FAILED" | tee -a "$LOG"
echo "Finished: $(date)" | tee -a "$LOG"

# Calculate total size
TOTAL_SIZE=$(du -sh "$AUDIO_DIR" 2>/dev/null | cut -f1)
echo "Total size: $TOTAL_SIZE" | tee -a "$LOG"
