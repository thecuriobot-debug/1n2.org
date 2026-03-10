#!/bin/bash
# Dashboarder Auto-Update Pipeline
# Fetches new articles, generates AI summaries, rebuilds dashboard, deploys
# Archives previous briefing before rebuilding
#
# Cron: 0 */4 * * * (every 4 hours)
# Morning: 0 6 * * * (6am daily for fresh briefing)

cd "$(dirname "$0")"

# Prevent concurrent runs
LOCKFILE="/tmp/dashboard_update.lock"
if [ -f "$LOCKFILE" ]; then
    LOCKPID=$(cat "$LOCKFILE")
    if kill -0 "$LOCKPID" 2>/dev/null; then
        echo "Another update is running (PID $LOCKPID). Skipping."
        exit 0
    fi
fi
echo $$ > "$LOCKFILE"
trap "rm -f $LOCKFILE" EXIT

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
mkdir -p "$ARCHIVE"
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

    # Small pause to let DB settle
    sleep 2

    echo ""
    echo "── Step 2: Backfill missing text ──"
    python3.12 fetch_rss_robust.py --backfill --batch 50 --limit 1 --workers 3

    sleep 2
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

# Build archive index - styled like Dashboarder
python3.12 << 'PYEOF'
from pathlib import Path
archive = Path('/Users/curiobot/Sites/1n2.org/dashboarder/archive')
files = sorted(archive.glob('briefing-*.html'), reverse=True)
h = '''<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Previous Briefings — Dashboarder</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#0a0e17;--card:#111827;--border:#1e293b;--text:#e2e8f0;--muted:#64748b;--accent:#22d3ee}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',system-ui,sans-serif;background:var(--bg);color:var(--text);font-size:17px}
a{color:var(--accent);text-decoration:none}a:hover{color:#fff;text-decoration:underline}
.wrap{max-width:700px;margin:0 auto;padding:2rem 1.5rem}
header{display:flex;align-items:center;gap:14px;padding-bottom:1rem;border-bottom:1px solid var(--border);margin-bottom:1.5rem}
header h1{font-family:'JetBrains Mono',monospace;font-size:1.3rem;font-weight:700;color:var(--accent)}
.back{font-size:.9rem}
.item{padding:14px 18px;margin-bottom:8px;background:var(--card);border:1px solid var(--border);border-radius:8px;display:flex;justify-content:space-between;align-items:center;font-size:1.05rem;transition:border-color .2s}
.item:hover{border-color:var(--accent);background:#1a2332}
.item .date{font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--accent);font-size:1rem}
.item .link{font-size:.9rem;color:var(--accent)}
.note{color:var(--muted);font-size:.85rem;margin-top:1.5rem;font-style:italic}
</style></head><body>
<div class="wrap">
<a href="/dashboarder/" class="back">\u2190 Back to Dashboarder</a>
<header><h1>\U0001f4f0 Previous Briefings</h1></header>
'''
for f in files[:60]:
    date = f.stem.replace('briefing-','')
    from datetime import datetime
    try:
        d = datetime.strptime(date, '%Y-%m-%d')
        label = d.strftime('%A, %B %d, %Y')
    except:
        label = date
    h += f'<a href="{f.name}" style="text-decoration:none"><div class="item"><span class="date">{date}</span><span>{label}</span><span class="link">View \u2192</span></div></a>\n'
h += '<p class="note">Briefings are archived daily. New briefings generate at 6am with fresh AI summaries.</p>'
h += '</div></body></html>'
(archive / 'index.html').write_text(h)
print(f'  Archive index: {len(files)} briefings')
PYEOF

# Deploy archive index
scp -o ConnectTimeout=10 $ARCHIVE/index.html $REMOTE:$REMOTE_PATH/archive/ 2>/dev/null

echo ""
echo "=========================================="
echo "  Done — $(date '+%H:%M')"
echo "=========================================="
