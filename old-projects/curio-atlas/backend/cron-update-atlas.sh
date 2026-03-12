#!/bin/bash
# cron-update-atlas.sh - Automated Curio Atlas updates via cron

ATLAS_DIR="$HOME/Sites/1n2.org/curio-atlas"
LOG_FILE="$HOME/curio-atlas-cron.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] 🗺️  Curio Atlas Update Starting..." >> "$LOG_FILE"

# Step 1: Fetch blockchain data
echo "[$TIMESTAMP] Fetching blockchain data..." >> "$LOG_FILE"
cd "$ATLAS_DIR/backend"
python3 blockchain-fetcher.py >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "[$TIMESTAMP] ✅ Blockchain fetch successful" >> "$LOG_FILE"
else
    echo "[$TIMESTAMP] ❌ Blockchain fetch failed" >> "$LOG_FILE"
    exit 1
fi

# Step 2: Deploy to server
echo "[$TIMESTAMP] Deploying to server..." >> "$LOG_FILE"
scp "$ATLAS_DIR/data/network.json" root@1n2.org:/var/www/html/curio-atlas/data/ >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "[$TIMESTAMP] ✅ Deploy successful" >> "$LOG_FILE"
else
    echo "[$TIMESTAMP] ⚠️  Deploy failed (continuing anyway)" >> "$LOG_FILE"
fi

# Step 3: Update timestamp
echo "[$TIMESTAMP] ✅ Curio Atlas Update Complete" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
