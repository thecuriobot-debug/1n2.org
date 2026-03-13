#!/bin/bash
#
# TWEETSTER UPDATE SCRIPT
# Simple one-command update for tweets
#

cd "$(dirname "$0")"

echo "========================================"
echo "UPDATING TWEETSTER TWEETS"
echo "========================================"
echo ""
echo "This will:"
echo "1. Launch a browser window (LOOK FOR IT!)"
echo "2. Open Twitter"
echo "3. Ask you to login (first time only)"
echo "4. Scrape tweets from top 20 accounts"
echo "5. Save to data/tweets.json"
echo ""
echo "IMPORTANT: A browser window will open."
echo "Make sure to look for it in all your windows/spaces!"
echo ""
echo "Press Ctrl+C to cancel, or ENTER to continue..."
read

python3 scrape_twitter_easy.py

echo ""
echo "========================================"
echo "✅ UPDATE COMPLETE"
echo "========================================"
echo ""
echo "Refresh your browser to see new tweets:"
echo "http://localhost:8000/tweetster/"
echo ""
