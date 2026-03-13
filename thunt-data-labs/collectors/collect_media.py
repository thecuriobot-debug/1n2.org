#!/usr/bin/env python3.12
"""
Data Labs — collect_media.py
Imports movies from Letterboxd and books from Goodreads into the central DB.
Sources: MySQL (medialog app), CSV exports, and future RSS scraping.
"""
import sys, os, json, time, csv, re
from datetime import datetime
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'db'))
from database import get_conn, init_db, log_collection

HOME = Path.home()
MEDIALOG = HOME / "Sites" / "1n2.org" / "medialog"
TODAY = datetime.now().strftime("%Y-%m-%d")

def import_letterboxd_csv():
    """Import movies from Letterboxd CSV export."""
    print("\n🎬 LETTERBOXD CSV")
    conn = get_conn(); start = time.time(); added = 0
    csv_file = MEDIALOG / "letterboxd-data.csv"
    if not csv_file.exists():
        print("  ❌ letterboxd-data.csv not found"); return 0
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            title = row.get("Name", "").strip()
            if not title: continue
            year = int(row["Year"]) if row.get("Year","").isdigit() else None
            rating = float(row["Rating"]) if row.get("Rating","") else None
            watched = row.get("Watched Date","") or row.get("Date","")
            uri = row.get("Letterboxd URI","")
            rewatch = 1 if row.get("Rewatch","").lower() in ("yes","true","1") else 0
            conn.execute("""INSERT OR IGNORE INTO movies
                (title, year, rating, watched_date, letterboxd_url, rewatch, source, imported_at)
                VALUES (?,?,?,?,?,?,?,datetime('now'))""",
                (title, year, rating, watched, uri, rewatch, "letterboxd"))
            added += 1
    conn.commit(); dur = time.time()-start
    log_collection("movies_letterboxd", "import_csv", added, 0, dur)
    conn.close()
    print(f"  ✅ {added} movies ({dur:.1f}s)")
    return added

def import_mysql_movies():
    """Import movies from Medialog MySQL (site_id=6 = Letterboxd)."""
    print("\n🎬 MYSQL MOVIES")
    try:
        import pymysql
    except ImportError:
        print("  ⚠️ pymysql not installed, trying subprocess")
        return import_mysql_via_cli("movies")
    conn = get_conn(); start = time.time(); added = 0
    try:
        my = pymysql.connect(host='localhost', user='root', password='', database='myapp_db')
        cur = my.cursor(pymysql.cursors.DictCursor)
        cur.execute("SELECT title, director, publish_date, image_url, genres, runtime_minutes, url FROM posts WHERE site_id=6")
        for row in cur.fetchall():
            title_raw = row["title"] or ""
            # Parse "Title, Year - Rating" format
            m = re.match(r'^(.+?),\s*(\d{4})\s*-\s*(.*)$', title_raw)
            if m:
                title, year, rating_str = m.group(1).strip(), int(m.group(2)), m.group(3).strip()
                # Convert star ratings
                rating = None
                if rating_str:
                    stars = rating_str.count('★')
                    halves = rating_str.count('½')
                    if stars or halves: rating = stars + (0.5 if halves else 0)
            else:
                title, year, rating = title_raw, None, None
            conn.execute("""INSERT OR IGNORE INTO movies
                (title, year, director, rating, watched_date, letterboxd_url, genres, runtime, image_url, source, imported_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'))""",
                (title, year, row.get("director"), rating,
                 str(row["publish_date"])[:10] if row.get("publish_date") else None,
                 row.get("url",""), row.get("genres",""), row.get("runtime_minutes"),
                 row.get("image_url",""), "mysql_letterboxd"))
            added += 1
        my.close()
    except Exception as e:
        print(f"  ❌ MySQL: {e}")
    conn.commit(); dur = time.time()-start
    log_collection("movies_mysql", "import", added, 0, dur); conn.close()
    print(f"  ✅ {added} movies ({dur:.1f}s)")
    return added

def import_mysql_via_cli(media_type):
    """Fallback: import via mysql CLI."""
    import subprocess
    conn = get_conn(); start = time.time(); added = 0
    site_id = "6" if media_type == "movies" else "7"
    try:
        result = subprocess.run(
            ["mysql", "-u", "root", "myapp_db", "-N", "-e",
             f"SELECT title, director, publish_date, image_url, genres, runtime_minutes, url FROM posts WHERE site_id={site_id}"],
            capture_output=True, text=True, timeout=30)
        for line in result.stdout.strip().split('\n'):
            if not line: continue
            parts = line.split('\t')
            title_raw = parts[0] if len(parts)>0 else ""
            if media_type == "movies":
                m = re.match(r'^(.+?),\s*(\d{4})\s*-\s*(.*)$', title_raw)
                title = m.group(1).strip() if m else title_raw
                year = int(m.group(2)) if m else None
                rating_str = m.group(3).strip() if m else ""
                rating = None
                if rating_str:
                    stars = rating_str.count('★'); halves = rating_str.count('½')
                    if stars or halves: rating = stars + (0.5 if halves else 0)
                conn.execute("""INSERT OR IGNORE INTO movies
                    (title, year, director, rating, watched_date, letterboxd_url, genres, runtime, image_url, source, imported_at)
                    VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'))""",
                    (title, year, parts[1] if len(parts)>1 and parts[1]!='NULL' else None, rating,
                     parts[2][:10] if len(parts)>2 and parts[2]!='NULL' else None,
                     parts[6] if len(parts)>6 else "", parts[4] if len(parts)>4 and parts[4]!='NULL' else "",
                     int(parts[5]) if len(parts)>5 and parts[5]!='NULL' and parts[5].isdigit() else None,
                     parts[3] if len(parts)>3 and parts[3]!='NULL' else "", "mysql_letterboxd"))
            else:
                # Books: parse "Title by Author - Rating"
                m2 = re.match(r'^(.+?)\s+by\s+(.+?)(?:\s*-\s*(.*))?$', title_raw)
                title = m2.group(1).strip() if m2 else title_raw
                author = m2.group(2).strip() if m2 else None
                rating_str = m2.group(3).strip() if m2 and m2.group(3) else ""
                rating = None
                if rating_str:
                    stars = rating_str.count('★'); halves = rating_str.count('½')
                    if stars or halves: rating = stars + (0.5 if halves else 0)
                conn.execute("""INSERT OR IGNORE INTO books
                    (title, author, rating, read_date, goodreads_url, image_url, source, imported_at)
                    VALUES (?,?,?,?,?,?,?,datetime('now'))""",
                    (title, author, rating,
                     parts[2][:10] if len(parts)>2 and parts[2]!='NULL' else None,
                     parts[6] if len(parts)>6 else "",
                     parts[3] if len(parts)>3 and parts[3]!='NULL' else "", "mysql_goodreads"))
            added += 1
    except Exception as e:
        print(f"  ❌ CLI: {e}")
    conn.commit(); dur = time.time()-start
    log_collection(f"{media_type}_mysql", "import_cli", added, 0, dur); conn.close()
    print(f"  ✅ {added} {media_type} ({dur:.1f}s)")
    return added

def import_mysql_books():
    """Import books from Medialog MySQL (site_id=7 = Goodreads)."""
    print("\n📚 MYSQL BOOKS")
    return import_mysql_via_cli("books")

def run_all():
    print(f"\n🎬📚 MEDIA IMPORT — {TODAY}")
    print("=" * 40)
    results = {}
    results["letterboxd_csv"] = import_letterboxd_csv()
    results["mysql_movies"] = import_mysql_movies()
    results["mysql_books"] = import_mysql_books()
    
    conn = get_conn()
    movies = conn.execute("SELECT COUNT(*) FROM movies").fetchone()[0]
    books = conn.execute("SELECT COUNT(*) FROM books").fetchone()[0]
    rated_movies = conn.execute("SELECT COUNT(*) FROM movies WHERE rating IS NOT NULL").fetchone()[0]
    avg_rating = conn.execute("SELECT AVG(rating) FROM movies WHERE rating IS NOT NULL").fetchone()[0]
    top_dirs = conn.execute("SELECT director, COUNT(*) as c FROM movies WHERE director IS NOT NULL AND director!='' GROUP BY director ORDER BY c DESC LIMIT 5").fetchall()
    conn.close()
    
    print("=" * 40)
    print(f"  Movies: {movies}")
    print(f"  Books: {books}")
    print(f"  Rated: {rated_movies} ({avg_rating:.1f} avg)" if avg_rating else "")
    if top_dirs:
        print(f"  Top directors: {', '.join(f'{r[0]} ({r[1]})' for r in top_dirs)}")
    print(f"  TOTAL MEDIA: {movies + books}")
    return movies + books

if __name__ == "__main__":
    init_db()
    run_all()
