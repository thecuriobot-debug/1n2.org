#!/bin/bash
# Dashboarder Auto-Update Pipeline
# Fetches new articles, generates AI summaries, rebuilds dashboard, deploys
# Archives previous briefing before rebuilding
#
# Cron: 0 */4 * * * (every 4 hours)
# Morning: 0 6 * * * (6am daily for fresh briefing)

cd "$(dirname "$0")"

# Prevent concurrent runs — with stale lockfile detection
LOCKFILE="/tmp/dashboard_update.lock"
if [ -f "$LOCKFILE" ]; then
    LOCKPID=$(cat "$LOCKFILE")
    # Check if PID is alive AND is actually our script (not a recycled PID)
    if kill -0 "$LOCKPID" 2>/dev/null && ps -p "$LOCKPID" -o command= 2>/dev/null | grep -q "update_dashboard"; then
        echo "Another update is running (PID $LOCKPID). Skipping."
        exit 0
    else
        echo "Stale lockfile found (PID $LOCKPID dead or different process). Removing."
        rm -f "$LOCKFILE"
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

# Archive current briefing before rebuilding (with Dashboarder styling)
mkdir -p "$ARCHIVE"
if [ -f "$DASH/home-content.html" ]; then
    ARCHIVE_FILE="$ARCHIVE/briefing-$TODAY.html"
    if [ ! -f "$ARCHIVE_FILE" ]; then
        python3.12 -c "
from pathlib import Path
src = Path('$DASH/home-content.html')
content = src.read_text()
date = '$TODAY'
title = f'Briefing — {date}'
head = '''<!DOCTYPE html><html lang=\"en\"><head>
<meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1.0\">
<title>''' + title + ''' — Dashboarder</title>
<link href=\"https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap\" rel=\"stylesheet\">
<style>
:root{--bg:#0a0e17;--card:#111827;--border:#1e293b;--text:#e2e8f0;--muted:#64748b;--accent:#22d3ee;--green:#34d399;--amber:#fbbf24;--red:#f87171}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:\"DM Sans\",system-ui,sans-serif;background:var(--bg);color:var(--text);font-size:17px;line-height:1.7}
a{color:var(--accent);text-decoration:none}a:hover{color:#fff;text-decoration:underline}
.wrap{max-width:800px;margin:0 auto;padding:2rem 1.5rem}
.nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;font-size:.9rem}
h1{font-family:\"JetBrains Mono\",monospace;font-size:1.3rem;font-weight:700;color:var(--accent);margin-bottom:1.5rem}
.sec{background:var(--card);border:1px solid var(--border);border-radius:8px;margin-bottom:12px;overflow:hidden}
.sh{padding:14px 16px;font-weight:600;font-size:1.1rem;color:var(--accent);border-bottom:1px solid var(--border)}
.sb{padding:4px 16px 12px}
.ns{padding:14px 0;border-bottom:1px solid rgba(30,41,59,.3);font-size:1.05rem;line-height:1.7;color:#cbd5e1}
.ns:last-child{border-bottom:none}
.nl{color:var(--accent);font-weight:700;font-size:.9rem}.nm{color:var(--accent);font-size:.85rem;font-weight:600}
.it{padding:6px 0;font-size:1rem;border-bottom:1px solid rgba(30,41,59,.3)}.it:last-child{border:none}
.it a,.il{color:var(--text)}.it a:hover{color:var(--accent)}.it .sr{color:var(--muted);font-size:.75rem;float:right}
.tp{font-size:.78rem;color:var(--muted);padding:7px 0 2px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
.ft{text-align:center;color:var(--muted);font-size:.7rem;padding:14px;border-top:1px solid var(--border);margin-top:12px}
</style></head><body>
<div class=\"wrap\">
<div class=\"nav\"><a href=\"/dashboarder/\">\u2190 Back to Dashboarder</a><a href=\"/dashboarder/archive/\">All Briefings</a></div>
<h1>\U0001f4f0 ''' + title + '''</h1>
'''
import re
secs = re.findall(r'<div class=\"sec\">.*?</div>\s*</div>', content, re.DOTALL)
body = '\\n'.join(secs) if secs else content
foot = '</div></body></html>'
Path('$ARCHIVE_FILE').write_text(head + body + foot)
" 2>/dev/null
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
