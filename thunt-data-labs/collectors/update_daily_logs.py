#!/usr/bin/env python3.12
"""
Daily Logs Auto-Generator
1. Reconstructs missing logs (Feb 19 – Mar 4) from git history + data
2. Generates today's log from live data
3. Updates daily-logs/index.html
"""
import sys, os, json, subprocess, re
from datetime import datetime, timedelta, date
from pathlib import Path

LOGS_DIR  = Path("/Users/curiobot/Sites/1n2.org/daily-logs/logs")
INDEX     = Path("/Users/curiobot/Sites/1n2.org/daily-logs/index.html")
DATA_LABS = Path("/Users/curiobot/Sites/1n2.org/thunt-data-labs")
LOGS_DIR.mkdir(parents=True, exist_ok=True)

def existing_log_dates():
    return {f.stem[:10] for f in LOGS_DIR.glob("*.html")}

def get_stats_for_date(d):
    """Try to get approximate stats for a past date from git/db"""
    db = DATA_LABS / "db/thunt-data-labs.db"
    if not db.exists():
        return {}
    try:
        import sqlite3
        conn = sqlite3.connect(str(db))
        ds = d.isoformat()
        # Curio floor price near that date
        row = conn.execute(
            "SELECT floor_price_eth FROM curio_prices WHERE date<=? ORDER BY date DESC LIMIT 1", (ds,)
        ).fetchone()
        floor = round(row[0],4) if row else None
        # Article count up to that date
        art = conn.execute("SELECT COUNT(*) FROM articles WHERE date(scraped_at)<=?", (ds,)).fetchone()[0]
        # Total records
        total = conn.execute("SELECT COUNT(*) FROM (SELECT 1 FROM curio_prices UNION ALL SELECT 1 FROM articles UNION ALL SELECT 1 FROM yt_videos UNION ALL SELECT 1 FROM tweets)").fetchone()[0]
        conn.close()
        return {"floor_eth": floor, "articles": art, "total_records": total}
    except:
        return {}

def make_log_html(d, stats=None, is_reconstruction=False):
    ds = d.strftime("%Y-%m-%d")
    label = d.strftime("%A, %B %-d, %Y")
    note  = '<span style="opacity:.5;font-size:.8em"> (reconstructed)</span>' if is_reconstruction else ""
    s = stats or {}

    floor_line = f'<li>Curio Cards floor: <b>{s["floor_eth"]} ETH</b></li>' if s.get("floor_eth") else ""
    art_line   = f'<li>Article archive: <b>{s["articles"]:,}</b> articles</li>' if s.get("articles") else ""
    rec_line   = f'<li>Data Labs records: <b>{s["total_records"]:,}</b> total</li>' if s.get("total_records") else ""

    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Daily Log — {ds}</title>
<style>
  body{{font-family:'JetBrains Mono',monospace;background:#0d0d0d;color:#e0e0e0;max-width:800px;margin:0 auto;padding:2rem}}
  h1{{color:#7eb8f7;font-size:1.4rem}}h2{{color:#a0cfaa;font-size:1rem;margin-top:2rem}}
  a{{color:#7eb8f7}}li{{margin:.3rem 0}}
  .meta{{color:#666;font-size:.8rem}}
</style>
</head>
<body>
<p><a href="../index.html">← Daily Logs</a></p>
<h1>📅 {label}{note}</h1>
<p class="meta">1n2.org Ecosystem Log</p>

<h2>📊 Data Snapshot</h2>
<ul>
{floor_line}
{art_line}
{rec_line}
<li>Log generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}</li>
</ul>

<h2>🔗 Live Sites</h2>
<ul>
<li><a href="https://1n2.org">1n2.org</a> — Main hub</li>
<li><a href="https://1n2.org/dashboarder/">Dashboarder</a></li>
<li><a href="https://1n2.org/curiocharts/">CurioCharts</a></li>
<li><a href="https://1n2.org/thunt-data-labs/web/">Data Labs</a></li>
</ul>
</body></html>"""

def rebuild_index(all_dates):
    sorted_dates = sorted(all_dates, reverse=True)
    items = "\n".join(
        f'<li><a href="logs/{d}-daily-log.html">{d}</a></li>'
        for d in sorted_dates
    )
    INDEX.write_text(f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Daily Logs — 1n2.org</title>
<style>body{{font-family:'JetBrains Mono',monospace;background:#0d0d0d;color:#e0e0e0;max-width:800px;margin:0 auto;padding:2rem}}
h1{{color:#7eb8f7}}a{{color:#7eb8f7}}li{{margin:.4rem 0}}</style>
</head><body>
<p><a href="../index.html">← 1n2.org</a></p>
<h1>📅 Daily Logs</h1>
<p style="color:#666">{len(sorted_dates)} logs · auto-updated daily</p>
<ul>{items}</ul>
</body></html>""")

def run():
    print(f"\n📅 Daily Logs — {datetime.now().strftime('%Y-%m-%d')}")
    existing = existing_log_dates()

    # Reconstruct missing logs from Feb 19 → yesterday
    start = date(2026, 2, 19)
    yesterday = date.today() - timedelta(days=1)
    d = start
    reconstructed = 0
    while d <= yesterday:
        ds = d.isoformat()
        if ds not in existing:
            stats = get_stats_for_date(d)
            html = make_log_html(d, stats, is_reconstruction=True)
            (LOGS_DIR / f"{ds}-daily-log.html").write_text(html)
            existing.add(ds)
            reconstructed += 1
        d += timedelta(days=1)

    # Today's log
    today = date.today()
    ds_today = today.isoformat()
    stats = get_stats_for_date(today)
    html = make_log_html(today, stats, is_reconstruction=False)
    (LOGS_DIR / f"{ds_today}-daily-log.html").write_text(html)
    existing.add(ds_today)

    # Rebuild index
    rebuild_index(existing)
    print(f"  ✅ {reconstructed} reconstructed, today's log written, index rebuilt")
    print(f"  Total: {len(existing)} logs")

if __name__ == "__main__":
    run()
