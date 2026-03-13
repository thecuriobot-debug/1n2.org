#!/bin/bash
#
# SCRAPE ALL ACCOUNTS - USING YOUR CHROME PROFILE
# No login needed! Uses your existing Chrome session.
#

cd "$(dirname "$0")"

echo "=========================================="
echo "SCRAPING ALL 996 ACCOUNTS"
echo "Using Your Chrome Profile (No Login!)"
echo "=========================================="
echo ""
echo "This method:"
echo "  ✅ Uses your regular Chrome browser"
echo "  ✅ Already logged into Twitter"
echo "  ✅ No security warnings"
echo "  ✅ No login issues"
echo ""
echo "Requirements:"
echo "  1. You must be logged into Twitter in Chrome"
echo "  2. Close ALL Chrome windows before starting"
echo ""
echo "Time: ~30-40 minutes for all 996 accounts"
echo ""
echo "Press Ctrl+C to cancel, or ENTER to continue..."
read

python3 scrape_with_chrome.py

echo ""
echo "=========================================="
echo "✅ SCRAPING COMPLETE"
echo "=========================================="
echo ""
echo "Refresh your browser to see new tweets:"
echo "http://localhost:8000/tweetster/"
echo ""
