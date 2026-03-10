#!/bin/bash
# Dashboarder Auto-Update Pipeline
# Fetches new articles, generates AI summaries, rebuilds dashboard, deploys
# Archives previous briefing before rebuilding
#
# Cron: 0 */4 * * * (every 4 hours)
# Morning: 0 6 * * * (6am daily for fresh briefing)

cd "$(dirname "$0")"
DASH="/Users/curiobot/Sites/1n2.org/dashboarder"
ARCHIVE="$DASH/archive"
REMOTE="root@157.245.186.58"
REMOTE_PATH="/var/www/html/dashboarder"
TODAY=$(date '+%Y-%m-%d')
NOW=$(date '+%Y-%m-%d %H:%M')

echo "=========================================="
echo "  Dashboarder Update — $NOW"
echo "=========================================="

# Archive current briefing before rebuilding
if [ -f "$DASH/home-content.html" ]; then
    ARCHIVE_FILE="$ARCHIVE/briefing-$TODAY.html"
    if [ ! -f "$ARCHIVE_FILE" ]; then
        cp "$DASH/home-content.html" "$ARCHIVE_FILE"
        echo "  Archived briefing: $ARCHIVE_FILE"
    fi
fi

if [ "$1" != "--quick" ]; then
    echo ""
    echo "── Step 1: Fetch new RSS articles ──"
    python3.12 fetch_rss_robust.py --limit 15 --workers 3

    echo ""
    echo "── Step 2: Backfill missing text ──"
    python3.12 fetch_rss_robust.py --backfill --batch 50 --limit 1 --workers 3
fi

echo ""
echo "── Step 3: Generate AI summaries + rebuild dashboard ──"
python3.12 generate_dashboard.py

# Deploy archive
if [ -d "$ARCHIVE" ]; then
    ssh -o ConnectTimeout=10 $REMOTE "mkdir -p $REMOTE_PATH/archive" 2>/dev/null
    scp -o ConnectTimeout=10 $ARCHIVE/*.html $REMOTE:$REMOTE_PATH/archive/ 2>/dev/null
    echo "  Deployed archive"
fi

# Build archive index
python3.12 -c "
from pathlib import Path
archive = Path('$ARCHIVE')
files = sorted(archive.glob('briefing-*.html'), reverse=True)
h = '''<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1.0\">
<title>Previous Briefings</title>
<style>body{font-family:'DM Sans',sans-serif;background:#0a0e17;color:#e2e8f0;max-width:600px;margin:0 auto;padding:2rem}
a{color:#22d3ee;text-decoration:none}a:hover{text-decoration:underline}
.item{padding:8px 0;border-bottom:1px solid #1e293b;font-size:1rem}</style></head><body>
<a href=\"/dashboarder/\" style=\"font-size:.85rem\">\u2190 Back to Dashboarder</a>
<h1 style=\"color:#22d3ee;margin:1rem 0\">\U0001f4f0 Previous Briefings</h1>'''
for f in files[:30]:
    date = f.stem.replace('briefing-','')
    h += f'<div class=\"item\"><a href=\"{f.name}\">{date}</a></div>'
h += '</body></html>'
(archive / 'index.html').write_text(h)
print(f'  Archive index: {len(files)} briefings')
" 2>/dev/null

# Deploy archive index
scp -o ConnectTimeout=10 $ARCHIVE/index.html $REMOTE:$REMOTE_PATH/archive/ 2>/dev/null

echo ""
echo "=========================================="
echo "  Done — $(date '+%H:%M')"
echo "=========================================="
