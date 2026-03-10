#!/bin/bash
# Dashboarder Auto-Update Pipeline
# Fetches new articles, generates summaries, rebuilds dashboard, deploys
#
# Usage:
#   ./update_dashboard.sh          # Full pipeline
#   ./update_dashboard.sh --quick   # Skip RSS fetch, just rebuild + deploy
#
# Add to crontab for automatic updates:
#   0 */4 * * * /Users/curiobot/Sites/1n2.org/thunt-data-labs/collectors/update_dashboard.sh >> /tmp/dashboard_update.log 2>&1

cd "$(dirname "$0")"

echo "=========================================="
echo "  Dashboarder Update — $(date '+%Y-%m-%d %H:%M')"
echo "=========================================="

if [ "$1" != "--quick" ]; then
    echo ""
    echo "── Step 1: Fetch new RSS articles ──"
    python3.12 fetch_rss_robust.py --limit 15 --workers 3

    echo ""
    echo "── Step 2: Backfill missing text ──"
    python3.12 fetch_rss_robust.py --backfill --batch 50 --limit 1 --workers 3
fi

echo ""
echo "── Step 3: Generate summaries + rebuild dashboard ──"
python3.12 generate_dashboard.py

echo ""
echo "=========================================="
echo "  Done — $(date '+%H:%M')"
echo "=========================================="
