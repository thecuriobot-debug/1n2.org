#!/bin/bash
#
# RUN SCRAPER IN BACKGROUND
# This lets you do other things while it scrapes
#

cd "$(dirname "$0")"

echo "=========================================="
echo "BACKGROUND SCRAPER"
echo "=========================================="
echo ""
echo "This will:"
echo "  - Run scraper in background"
echo "  - You can close terminal"
echo "  - Check progress anytime"
echo "  - Auto-saves every account"
echo ""
echo "How many accounts to scrape?"
echo "  1. Top 100 (~5 minutes)"
echo "  2. Top 500 (~20 minutes)"
echo "  3. All 996 (~40 minutes)"
echo ""
read -p "Choice (1/2/3): " choice

case $choice in
    1)
        MAX=100
        TIME="5 minutes"
        ;;
    2)
        MAX=500
        TIME="20 minutes"
        ;;
    3)
        MAX=""
        TIME="40 minutes"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "Starting background scrape..."
echo "Expected time: $TIME"
echo ""

# Run in background with nohup
if [ -z "$MAX" ]; then
    nohup python3 scrape_with_chrome.py > scraper.log 2>&1 &
else
    nohup python3 scrape_with_chrome.py --max $MAX > scraper.log 2>&1 &
fi

PID=$!

echo "✅ Scraper started in background!"
echo "   Process ID: $PID"
echo ""
echo "To check progress:"
echo "   python3 monitor_progress.py"
echo ""
echo "To view log:"
echo "   tail -f scraper.log"
echo ""
echo "To stop scraping:"
echo "   kill $PID"
echo ""
echo "You can now close this terminal safely."
echo ""
