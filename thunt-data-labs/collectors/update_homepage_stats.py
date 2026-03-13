#!/usr/bin/env python3.12
"""
1n2.org Homepage Stats Updater
Reads live data from collect_all's stats.json (the authoritative source).
Only updates the 'date' and project count — never overwrites dataset details.
"""
import sys, json, subprocess
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "db"))
from database import get_stats as db_get_stats, init_db

STATS_FILE = Path("/Users/curiobot/Sites/1n2.org/thunt-data-labs/web/stats.json")
TODAY      = date.today().isoformat()

def count_project_dirs():
    site    = Path("/Users/curiobot/Sites/1n2.org")
    exclude = {".git","old-projects","node_modules","__pycache__",".DS_Store","medialog"}
    return len([d for d in site.iterdir() if d.is_dir() and d.name not in exclude and not d.name.startswith(".")])

def count_daily_logs():
    logs_dir = Path("/Users/curiobot/Sites/1n2.org/daily-logs/logs")
    return len(list(logs_dir.glob("*.html"))) if logs_dir.exists() else 0

def run():
    print(f"\n📊 Homepage Stats Update — {TODAY}")

    # Load existing full stats.json (written by collect_all export_stats)
    existing = {}
    if STATS_FILE.exists():
        try: existing = json.loads(STATS_FILE.read_text())
        except: pass

    # Only augment with lightweight counters — never overwrite datasets
    existing["date"]        = TODAY
    existing["projects"]    = count_project_dirs()
    existing["daily_logs"]  = count_daily_logs()
    existing["daily_jobs"]  = 22  # unified cron job count

    # Ensure total_records is present (in case stats.json is empty/new)
    if not existing.get("total_records"):
        try:
            init_db()
            db = db_get_stats()
            existing["total_records"] = db.get("total_records", 0)
            if not existing.get("datasets"):
                existing["datasets"] = db.get("datasets", {})
        except Exception as e:
            print(f"  ⚠️  DB fallback: {e}")

    STATS_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATS_FILE.write_text(json.dumps(existing, indent=2, default=str))

    records = existing.get("total_records", 0)
    yt      = existing.get("datasets", {}).get("youtube", {}).get("tables", {})
    art     = existing.get("datasets", {}).get("articles", {}).get("tables", {})
    print(f"  Projects: {existing['projects']} | Records: {records:,}")
    print(f"  Videos: {yt.get('videos',0):,} | Comments: {yt.get('comments',0):,}")
    print(f"  Articles: {art.get('articles',0):,} | Logs: {existing['daily_logs']}")
    print(f"  ✅ stats.json updated ({STATS_FILE})")

if __name__ == "__main__":
    run()
