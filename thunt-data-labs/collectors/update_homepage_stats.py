#!/usr/bin/env python3.12
"""
1n2.org Homepage Stats Updater
Reads live data from thunt-data-labs DB + JSON files, updates stats.json
"""
import sys, json, sqlite3
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "db"))
from database import get_stats as db_get_stats, init_db

DB_PATH   = Path("/Users/curiobot/Sites/1n2.org/thunt-data-labs/db/thunt-data-labs.db")
STATS_OUT = Path("/Users/curiobot/Sites/1n2.org/thunt-data-labs/web/stats.json")
TODAY     = date.today().isoformat()

def count_project_dirs():
    site = Path("/Users/curiobot/Sites/1n2.org")
    exclude = {".git","old-projects","node_modules","__pycache__",".DS_Store","medialog"}
    dirs = [d for d in site.iterdir() if d.is_dir() and d.name not in exclude and not d.name.startswith(".")]
    return len(dirs)

def get_db_stats():
    try:
        init_db()
        return db_get_stats()
    except Exception as e:
        print(f"  ⚠️  DB: {e}")
        return {}

def count_daily_logs():
    logs_dir = Path("/Users/curiobot/Sites/1n2.org/daily-logs/logs")
    return len(list(logs_dir.glob("*.html"))) if logs_dir.exists() else 0

def count_letterboxd_books():
    """Count media in MediaLog if accessible"""
    try:
        import subprocess
        php = """<?php
require_once '/Users/curiobot/Sites/1n2.org/medialog/config.php';
$pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4",$db_user,$db_pass);
$m = $pdo->query("SELECT COUNT(*) FROM movies")->fetchColumn();
$b = $pdo->query("SELECT COUNT(*) FROM books")->fetchColumn();
echo json_encode(["movies"=>$m,"books"=>$b]);
"""
        r = subprocess.run(["php","-r",php], capture_output=True, text=True, timeout=5)
        if r.returncode == 0 and r.stdout.strip().startswith("{"):
            d = json.loads(r.stdout.strip())
            return d.get("movies",0), d.get("books",0)
    except: pass
    return 0, 0

def run():
    print(f"\n📊 Homepage Stats Update — {TODAY}")
    db_stats = get_db_stats()
    db = {
        "total_records": db_stats.get("total_records", 0),
        "videos":        db_stats.get("datasets",{}).get("youtube",{}).get("tables",{}).get("videos", 0),
        "comments":      db_stats.get("datasets",{}).get("youtube",{}).get("tables",{}).get("comments", 0),
        "articles":      db_stats.get("datasets",{}).get("articles",{}).get("tables",{}).get("articles", 0),
        "tweets":        db_stats.get("datasets",{}).get("tweets",{}).get("tables",{}).get("tweets", 0),
        "curio_sales":   db_stats.get("datasets",{}).get("curio",{}).get("tables",{}).get("sales", 0),
        "curio_floor_eth": db_stats.get("curio_floor_eth"),
    }
    projects = count_project_dirs()
    logs = count_daily_logs()
    movies, books = count_letterboxd_books()

    stats = {
        "date":          TODAY,
        "projects":      projects,
        "daily_jobs":    14,
        "daily_logs":    logs,
        "total_records": db.get("total_records", 0),
        "videos":        db.get("videos", 0),
        "comments":      db.get("comments", 0),
        "articles":      db.get("articles", 0),
        "tweets":        db.get("tweets", 0),
        "curio_sales":   db.get("curio_sales", 0),
        "curio_floor":   db.get("curio_floor_eth"),        "movies":        movies,
        "books":         books,
        "datasets": {
            "youtube": {
                "tables": {
                    "videos":   db.get("videos", 0),
                    "comments": db.get("comments", 0),
                }
            }
        }
    }

    STATS_OUT.parent.mkdir(parents=True, exist_ok=True)
    STATS_OUT.write_text(json.dumps(stats, indent=2))

    print(f"  Projects: {projects} | Records: {db.get('total_records',0):,}")
    print(f"  Videos: {db.get('videos',0):,} | Comments: {db.get('comments',0):,}")
    print(f"  Articles: {db.get('articles',0):,} | Logs: {logs}")
    print(f"  ✅ stats.json updated → {STATS_OUT}")

if __name__ == "__main__":
    run()
