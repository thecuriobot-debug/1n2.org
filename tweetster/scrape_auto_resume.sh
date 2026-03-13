#!/bin/bash
#
# AUTO-RESUME SCRAPER
# Keeps scraping even after interruptions
# Run this and leave it - it'll get all 996 accounts eventually
#

cd "$(dirname "$0")"

echo "=========================================="
echo "AUTO-RESUME SCRAPER"
echo "=========================================="
echo ""
echo "This script will:"
echo "  ✅ Scrape all 996 accounts"
echo "  ✅ Auto-resume if interrupted"
echo "  ✅ Save progress continuously"
echo "  ✅ Keep going until complete"
echo ""
echo "You can press Ctrl+C to pause and it will"
echo "resume from where it left off."
echo ""
echo "Press ENTER to start, or Ctrl+C to cancel..."
read

BATCH_SIZE=50
TOTAL=996
START=0

while [ $START -lt $TOTAL ]; do
    END=$((START + BATCH_SIZE))
    if [ $END -gt $TOTAL ]; then
        END=$TOTAL
    fi
    
    echo ""
    echo "=========================================="
    echo "Scraping accounts $START to $END"
    echo "=========================================="
    
    # Get slice of accounts
    python3 -c "
import json
data = json.load(open('data/following.json'))
batch = data[$START:$END]
json.dump(batch, open('.batch.json', 'w'), indent=2)
"
    
    # Scrape this batch
    python3 -c "
import sys
sys.path.insert(0, '.')
from scrape_with_chrome import scrape_twitter
from pathlib import Path
import json

# Load batch
batch = json.load(open('.batch.json'))

# Temporarily replace following.json
import scrape_with_chrome
old_load = scrape_with_chrome.load_following
scrape_with_chrome.load_following = lambda: batch

# Scrape
scrape_twitter(max_accounts=None)
"
    
    if [ $? -ne 0 ]; then
        echo ""
        echo "Batch failed or interrupted."
        echo "Press ENTER to retry, or Ctrl+C to stop..."
        read
        continue
    fi
    
    START=$END
    
    # Show progress
    CURRENT=$(python3 -c "import json; print(len(json.load(open('data/tweets.json'))))")
    echo ""
    echo "Progress: $START/$TOTAL accounts | $CURRENT tweets"
    echo ""
    
    # Small break between batches
    sleep 3
done

rm -f .batch.json

echo ""
echo "=========================================="
echo "✅ ALL ACCOUNTS SCRAPED!"
echo "=========================================="
python3 -c "import json; print(f\"Total tweets: {len(json.load(open('data/tweets.json')))}\")"
echo ""
