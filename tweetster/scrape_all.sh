#!/bin/bash
#
# SCRAPE ALL 996 ACCOUNTS
# This will take 30-40 minutes
#

cd "$(dirname "$0")"

echo "=========================================="
echo "SCRAPING ALL 996 ACCOUNTS"
echo "=========================================="
echo ""
echo "This will:"
echo "  - Open browser window"
echo "  - Scrape ALL 996 Twitter accounts"
echo "  - Take approximately 30-40 minutes"
echo "  - Save to data/tweets.json"
echo ""
echo "⚠️  WARNING: This is a LONG process!"
echo "    The browser will visit 996 pages."
echo "    Don't close the browser or terminal."
echo ""
echo "Press Ctrl+C to cancel, or ENTER to start..."
read

echo ""
echo "Starting full scrape..."
echo ""

python3 scrape_twitter_easy.py --all

echo ""
echo "=========================================="
echo "✅ FULL SCRAPE COMPLETE"
echo "=========================================="
echo ""
echo "All 996 accounts scraped!"
echo "Refresh your browser to see tweets:"
echo "http://localhost:8000/tweetster/"
echo ""
