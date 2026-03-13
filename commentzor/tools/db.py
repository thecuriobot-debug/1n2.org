"""
Commentzor Database Module
SQLite database for YouTube comment storage and analytics.
"""

import sqlite3
import os
import json
from datetime import datetime

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")  # commentzor/data/
DB_PATH = os.path.join(DB_DIR, "commentzor.db")


def get_connection(db_path=None):
    """Get a database connection with WAL mode for concurrent access."""
    path = db_path or DB_PATH
    os.makedirs(os.path.dirname(path), exist_ok=True)
    conn = sqlite3.connect(path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path=None):
    """Initialize the database schema."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    cursor.executescript("""
    -- YouTube Channels we track
    CREATE TABLE IF NOT EXISTS channels (
        channel_id       TEXT PRIMARY KEY,
        channel_name     TEXT NOT NULL,
        channel_url      TEXT,
        subscriber_count INTEGER DEFAULT 0,
        video_count      INTEGER DEFAULT 0,
        thumbnail_url    TEXT,
        added_at         TEXT DEFAULT (datetime('now')),
        last_scraped     TEXT
    );

    -- Videos belonging to channels
    CREATE TABLE IF NOT EXISTS videos (
        video_id         TEXT PRIMARY KEY,
        channel_id       TEXT NOT NULL,
        title            TEXT NOT NULL,
        description      TEXT,
        published_at     TEXT,
        view_count       INTEGER DEFAULT 0,
        like_count       INTEGER DEFAULT 0,
        comment_count    INTEGER DEFAULT 0,
        duration         TEXT,
        thumbnail_url    TEXT,
        series_tag       TEXT,
        last_scraped     TEXT,
        FOREIGN KEY (channel_id) REFERENCES channels(channel_id)
    );

    -- Comment authors (unique users)
    CREATE TABLE IF NOT EXISTS authors (
        author_id        TEXT PRIMARY KEY,
        author_name      TEXT NOT NULL,
        author_url       TEXT,
        author_avatar    TEXT,
        first_seen       TEXT DEFAULT (datetime('now')),
        total_comments   INTEGER DEFAULT 0
    );

    -- All comments
    CREATE TABLE IF NOT EXISTS comments (
        comment_id       TEXT PRIMARY KEY,
        video_id         TEXT NOT NULL,
        channel_id       TEXT NOT NULL,
        author_id        TEXT NOT NULL,
        parent_id        TEXT,
        text_original    TEXT NOT NULL,
        text_display     TEXT,
        like_count       INTEGER DEFAULT 0,
        published_at     TEXT,
        updated_at       TEXT,
        is_reply         INTEGER DEFAULT 0,
        scraped_at       TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (video_id)   REFERENCES videos(video_id),
        FOREIGN KEY (channel_id) REFERENCES channels(channel_id),
        FOREIGN KEY (author_id)  REFERENCES authors(author_id)
    );

    -- Scrape job tracking
    CREATE TABLE IF NOT EXISTS scrape_jobs (
        job_id           INTEGER PRIMARY KEY AUTOINCREMENT,
        job_type         TEXT NOT NULL,
        channel_id       TEXT,
        status           TEXT DEFAULT 'pending',
        started_at       TEXT,
        finished_at      TEXT,
        comments_added   INTEGER DEFAULT 0,
        videos_added     INTEGER DEFAULT 0,
        error_message    TEXT
    );

    -- Indexes for fast queries
    CREATE INDEX IF NOT EXISTS idx_comments_video     ON comments(video_id);
    CREATE INDEX IF NOT EXISTS idx_comments_channel   ON comments(channel_id);
    CREATE INDEX IF NOT EXISTS idx_comments_author    ON comments(author_id);
    CREATE INDEX IF NOT EXISTS idx_comments_published ON comments(published_at);
    CREATE INDEX IF NOT EXISTS idx_comments_likes     ON comments(like_count DESC);
    CREATE INDEX IF NOT EXISTS idx_videos_channel     ON videos(channel_id);
    CREATE INDEX IF NOT EXISTS idx_videos_published   ON videos(published_at);
    CREATE INDEX IF NOT EXISTS idx_authors_total      ON authors(total_comments DESC);
    """)

    conn.commit()
    path_used = db_path or DB_PATH
    conn.close()
    print(f"[DB] Database initialized at {path_used}")


def get_stats(db_path=None):
    """Get overview stats from the database."""
    conn = get_connection(db_path)
    c = conn.cursor()
    stats = {}
    stats["total_channels"] = c.execute("SELECT COUNT(*) FROM channels").fetchone()[0]
    stats["total_videos"] = c.execute("SELECT COUNT(*) FROM videos").fetchone()[0]
    stats["total_comments"] = c.execute("SELECT COUNT(*) FROM comments").fetchone()[0]
    stats["total_authors"] = c.execute("SELECT COUNT(*) FROM authors").fetchone()[0]
    stats["total_replies"] = c.execute("SELECT COUNT(*) FROM comments WHERE is_reply=1").fetchone()[0]
    stats["total_top_level"] = stats["total_comments"] - stats["total_replies"]
    conn.close()
    return stats


if __name__ == "__main__":
    init_db()
    print("[DB] Schema ready.")
    stats = get_stats()
    for k, v in stats.items():
        print(f"  {k}: {v}")
