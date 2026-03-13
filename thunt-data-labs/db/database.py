#!/usr/bin/env python3.12
"""
THunt Data Labs — database.py
Central SQLite database module.
All collectors import from this module.
DB file: thunt-data-labs/db/thunt-data-labs.db (gitignored)
"""
import sqlite3, os
from pathlib import Path
from datetime import datetime

DB_DIR  = Path(__file__).parent
DB_PATH = DB_DIR / "thunt-data-labs.db"

def get_conn():
    """Get a SQLite connection with row_factory set."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def init_db():
    """Create all tables if they don't exist."""
    conn = get_conn()
    c = conn.cursor()

    # ── Curio Cards ──────────────────────────────────────────────
    c.execute("""CREATE TABLE IF NOT EXISTS curio_prices (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        date        TEXT NOT NULL UNIQUE,
        floor_price_eth REAL,
        created_at  TEXT DEFAULT (datetime('now'))
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS curio_cards (
        card_id     INTEGER PRIMARY KEY,
        name        TEXT,
        image_url   TEXT,
        updated_at  TEXT DEFAULT (datetime('now'))
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS curio_owners (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        card_id     INTEGER,
        owner_address TEXT,
        quantity    INTEGER DEFAULT 1,
        fetched_at  TEXT DEFAULT (datetime('now')),
        UNIQUE(card_id, owner_address)
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS curio_sales (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        tx_hash     TEXT UNIQUE,
        card_id     INTEGER,
        price_eth   REAL,
        buyer       TEXT,
        seller      TEXT,
        sale_date   TEXT,
        marketplace TEXT,
        created_at  TEXT DEFAULT (datetime('now'))
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS curio_transfers (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        tx_hash     TEXT UNIQUE,
        block_num   INTEGER,
        from_addr   TEXT,
        to_addr     TEXT,
        card_id     INTEGER,
        quantity    INTEGER DEFAULT 1,
        transfer_date TEXT,
        fetched_at  TEXT DEFAULT (datetime('now'))
    )""")

    # ── YouTube ───────────────────────────────────────────────────
    c.execute("""CREATE TABLE IF NOT EXISTS yt_channels (
        channel_id  TEXT PRIMARY KEY,
        name        TEXT,
        url         TEXT,
        subscribers INTEGER DEFAULT 0,
        video_count INTEGER DEFAULT 0,
        thumbnail   TEXT,
        last_scraped TEXT
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS yt_videos (
        video_id    TEXT PRIMARY KEY,
        channel_id  TEXT,
        title       TEXT,
        description TEXT,
        published_at TEXT,
        view_count  INTEGER DEFAULT 0,
        like_count  INTEGER DEFAULT 0,
        comment_count INTEGER DEFAULT 0,
        thumbnail   TEXT,
        last_scraped TEXT
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS yt_comments (
        comment_id  TEXT PRIMARY KEY,
        video_id    TEXT,
        channel_id  TEXT,
        author_name TEXT,
        author_id   TEXT,
        author_avatar TEXT,
        text_content TEXT,
        like_count  INTEGER DEFAULT 0,
        published_at TEXT,
        is_reply    INTEGER DEFAULT 0
    )""")

    # ── Articles ─────────────────────────────────────────────────
    c.execute("""CREATE TABLE IF NOT EXISTS articles (
        id          TEXT PRIMARY KEY,
        title       TEXT,
        clean_title TEXT,
        url         TEXT,
        source      TEXT,
        topic       TEXT,
        date        TEXT,
        text_content TEXT,
        summary     TEXT,
        author      TEXT,
        image_url   TEXT,
        word_count  INTEGER DEFAULT 0,
        source_url  TEXT,
        fetched_at  TEXT,
        scraped_at  TEXT DEFAULT (datetime('now')),
        ai_summary  TEXT
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS article_images (
        id          TEXT PRIMARY KEY,
        article_id  TEXT,
        src         TEXT,
        alt         TEXT,
        source      TEXT,
        date        TEXT
    )""")

    # ── Tweets ───────────────────────────────────────────────────
    c.execute("""CREATE TABLE IF NOT EXISTS tweet_accounts (
        username    TEXT PRIMARY KEY,
        last_scraped TEXT
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS tweets (
        tweet_id    TEXT PRIMARY KEY,
        username    TEXT,
        text_content TEXT,
        date        TEXT,
        likes       INTEGER DEFAULT 0,
        retweets    INTEGER DEFAULT 0,
        replies     INTEGER DEFAULT 0,
        scraped_at  TEXT DEFAULT (datetime('now'))
    )""")

    # ── Media (Letterboxd / Goodreads cache) ─────────────────────
    c.execute("""CREATE TABLE IF NOT EXISTS movies (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        title       TEXT NOT NULL,
        year        INTEGER,
        rating      REAL,
        watched_date TEXT,
        letterboxd_url TEXT,
        rewatch     INTEGER DEFAULT 0,
        director    TEXT,
        poster_url  TEXT,
        source      TEXT DEFAULT 'letterboxd',
        imported_at TEXT DEFAULT (datetime('now')),
        created_at  TEXT DEFAULT (datetime('now')),
        UNIQUE(title, year)
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS books (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        title       TEXT UNIQUE NOT NULL,
        author      TEXT,
        year        TEXT,
        rating      REAL,
        read_date   TEXT,
        date_read   TEXT,
        goodreads_url TEXT,
        cover_url   TEXT,
        image_url   TEXT,
        source      TEXT DEFAULT 'goodreads',
        imported_at TEXT DEFAULT (datetime('now')),
        created_at  TEXT DEFAULT (datetime('now'))
    )""")

    # ── Collection log ───────────────────────────────────────────
    c.execute("""CREATE TABLE IF NOT EXISTS collection_log (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        dataset     TEXT,
        action      TEXT,
        records_added INTEGER DEFAULT 0,
        errors      INTEGER DEFAULT 0,
        duration_s  REAL,
        run_at      TEXT DEFAULT (datetime('now'))
    )""")

    conn.commit()
    conn.close()
    # Ensure DB file is NOT gitignored by having it in the right place
    DB_PATH.touch()

def log_collection(dataset, action, records_added=0, errors=0, duration_s=0.0):
    """Log a collection run to the collection_log table."""
    try:
        conn = get_conn()
        conn.execute(
            "INSERT INTO collection_log (dataset,action,records_added,errors,duration_s) VALUES (?,?,?,?,?)",
            (dataset, action, records_added, errors, round(duration_s, 2))
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"  ⚠️  log_collection: {e}")

def get_stats():
    """Return dict of stats for the stats.json display."""
    conn = get_conn()
    def q(sql, *args):
        try:    return conn.execute(sql, args).fetchone()[0]
        except: return 0

    stats = {
        "generated_at": datetime.now().isoformat(),
        "total_records": q("""SELECT COUNT(*) FROM (
            SELECT 1 FROM curio_prices UNION ALL
            SELECT 1 FROM curio_cards UNION ALL
            SELECT 1 FROM curio_owners UNION ALL
            SELECT 1 FROM curio_sales UNION ALL
            SELECT 1 FROM curio_transfers UNION ALL
            SELECT 1 FROM yt_channels UNION ALL
            SELECT 1 FROM yt_videos UNION ALL
            SELECT 1 FROM yt_comments UNION ALL
            SELECT 1 FROM articles UNION ALL
            SELECT 1 FROM article_images UNION ALL
            SELECT 1 FROM tweet_accounts UNION ALL
            SELECT 1 FROM tweets
        )"""),
        "datasets": {
            "curio": {
                "tables": {
                    "prices":    q("SELECT COUNT(*) FROM curio_prices"),
                    "cards":     q("SELECT COUNT(*) FROM curio_cards"),
                    "owners":    q("SELECT COUNT(*) FROM curio_owners"),
                    "sales":     q("SELECT COUNT(*) FROM curio_sales"),
                    "transfers": q("SELECT COUNT(*) FROM curio_transfers"),
                }
            },
            "youtube": {
                "tables": {
                    "channels": q("SELECT COUNT(*) FROM yt_channels"),
                    "videos":   q("SELECT COUNT(*) FROM yt_videos"),
                    "comments": q("SELECT COUNT(*) FROM yt_comments"),
                }
            },
            "articles": {
                "tables": {
                    "articles": q("SELECT COUNT(*) FROM articles"),
                    "images":   q("SELECT COUNT(*) FROM article_images"),
                },
                "with_text": q("SELECT COUNT(*) FROM articles WHERE word_count>0"),
            },
            "tweets": {
                "tables": {
                    "accounts": q("SELECT COUNT(*) FROM tweet_accounts"),
                    "tweets":   q("SELECT COUNT(*) FROM tweets"),
                }
            }
        }
    }
    # Latest curio floor
    row = conn.execute("SELECT floor_price_eth FROM curio_prices ORDER BY date DESC LIMIT 1").fetchone()
    if row: stats["curio_floor_eth"] = row[0]

    conn.close()
    return stats
