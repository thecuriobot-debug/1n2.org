#!/usr/bin/env python3
"""
Commentzor - YouTube Comment Gatherer CLI
==========================================

Downloads ALL comments from your YouTube channels into a local SQLite database.
Uses the YouTube Data API v3 (primary) with Playwright browser scraping as fallback.

SETUP:
  1. Get a YouTube Data API key from https://console.cloud.google.com
  2. Set it:  export YOUTUBE_API_KEY="your_key_here"
     OR create a .env file in this directory with: YOUTUBE_API_KEY=your_key_here
  3. Run:    python3 gather.py --add-channel CHANNEL_URL_OR_ID
             python3 gather.py --gather-all
             python3 gather.py --gather-channel CHANNEL_ID

USAGE:
  python3 gather.py --add-channel https://youtube.com/@YourChannel
  python3 gather.py --add-channel UCxxxxxxxxxxxxxxxx
  python3 gather.py --gather-all
  python3 gather.py --gather-channel UCxxxxxxx
  python3 gather.py --status
  python3 gather.py --update          # Daily update mode (for cron)
"""

import argparse
import json
import os
import re
import sqlite3
import sys
import time
import traceback
from datetime import datetime, timedelta
from urllib.parse import urlparse, parse_qs

# Add parent dir to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db import get_connection, init_db, get_stats, DB_PATH

# Try loading .env
try:
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_path):
        load_dotenv(env_path)
    else:
        # Also check parent dir
        env_path2 = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
        if os.path.exists(env_path2):
            load_dotenv(env_path2)
except ImportError:
    pass

# ─── Configuration ────────────────────────────────────────────────────
API_KEY = os.environ.get("YOUTUBE_API_KEY", "")
API_BASE = "https://www.googleapis.com/youtube/v3"
RATE_LIMIT_DELAY = 0.1  # seconds between API calls
PAGE_SIZE = 50  # max for most YT API endpoints
COMMENT_PAGE_SIZE = 100  # max for comment threads

# Colors for terminal output
class C:
    BOLD = "\033[1m"
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    MAGENTA = "\033[95m"
    CYAN = "\033[96m"
    END = "\033[0m"

def log(msg, color=C.END):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"{C.BOLD}[{ts}]{C.END} {color}{msg}{C.END}")

def log_ok(msg):    log(msg, C.GREEN)
def log_warn(msg):  log(msg, C.YELLOW)
def log_err(msg):   log(msg, C.RED)
def log_info(msg):  log(msg, C.CYAN)

# ─── API Helpers ──────────────────────────────────────────────────────

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    HAS_BS4 = False

try:
    from playwright.sync_api import sync_playwright
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False


def api_get(endpoint, params):
    """Make a YouTube Data API v3 request."""
    if not API_KEY:
        log_err("No YOUTUBE_API_KEY set! Run: export YOUTUBE_API_KEY='your_key'")
        sys.exit(1)
    if not HAS_REQUESTS:
        log_err("requests library not installed! pip install requests")
        sys.exit(1)

    params["key"] = API_KEY
    url = f"{API_BASE}/{endpoint}"
    time.sleep(RATE_LIMIT_DELAY)

    try:
        resp = requests.get(url, params=params, timeout=30)
        if resp.status_code == 403:
            data = resp.json()
            err = data.get("error", {}).get("errors", [{}])[0]
            reason = err.get("reason", "unknown")
            if reason == "quotaExceeded":
                log_err("API quota exceeded! Wait until midnight Pacific or use a different key.")
                return None
            log_err(f"API 403 Forbidden: {reason} - {err.get('message', '')}")
            return None
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.RequestException as e:
        log_err(f"API request failed: {e}")
        return None


# ─── Channel Resolution ──────────────────────────────────────────────

def resolve_channel(identifier):
    """Resolve a channel URL, handle, or ID to channel info dict."""
    channel_id = None

    # Direct channel ID
    if identifier.startswith("UC") and len(identifier) == 24:
        channel_id = identifier

    # URL parsing
    elif "youtube.com" in identifier or "youtu.be" in identifier:
        parsed = urlparse(identifier if "://" in identifier else f"https://{identifier}")
        path = parsed.path.strip("/")

        if path.startswith("channel/"):
            channel_id = path.split("/")[1]
        elif path.startswith("@"):
            handle = path.split("/")[0]  # @handle
            data = api_get("channels", {"forHandle": handle, "part": "snippet,statistics"})
            if data and data.get("items"):
                return _parse_channel_item(data["items"][0])
            # Try search as fallback
            data = api_get("search", {"q": handle, "type": "channel", "part": "snippet", "maxResults": 1})
            if data and data.get("items"):
                channel_id = data["items"][0]["snippet"]["channelId"]
        elif path.startswith("c/") or path.startswith("user/"):
            username = path.split("/")[1]
            data = api_get("channels", {"forUsername": username, "part": "snippet,statistics"})
            if data and data.get("items"):
                return _parse_channel_item(data["items"][0])

    # Handle (@name) without URL
    elif identifier.startswith("@"):
        data = api_get("channels", {"forHandle": identifier, "part": "snippet,statistics"})
        if data and data.get("items"):
            return _parse_channel_item(data["items"][0])

    # Try as username
    else:
        data = api_get("channels", {"forUsername": identifier, "part": "snippet,statistics"})
        if data and data.get("items"):
            return _parse_channel_item(data["items"][0])
        # Try search
        data = api_get("search", {"q": identifier, "type": "channel", "part": "snippet", "maxResults": 1})
        if data and data.get("items"):
            channel_id = data["items"][0]["snippet"]["channelId"]

    if channel_id:
        data = api_get("channels", {"id": channel_id, "part": "snippet,statistics,contentDetails"})
        if data and data.get("items"):
            return _parse_channel_item(data["items"][0])

    return None


def _parse_channel_item(item):
    """Parse a channel API response item."""
    snippet = item.get("snippet", {})
    stats = item.get("statistics", {})
    return {
        "channel_id": item["id"],
        "channel_name": snippet.get("title", "Unknown"),
        "channel_url": f"https://youtube.com/channel/{item['id']}",
        "subscriber_count": int(stats.get("subscriberCount", 0)),
        "video_count": int(stats.get("videoCount", 0)),
        "thumbnail_url": snippet.get("thumbnails", {}).get("default", {}).get("url", ""),
    }


# ─── Video Fetching ──────────────────────────────────────────────────

def fetch_all_videos(channel_id, conn):
    """Fetch all videos for a channel using the uploads playlist."""
    # Get uploads playlist ID
    data = api_get("channels", {
        "id": channel_id,
        "part": "contentDetails"
    })
    if not data or not data.get("items"):
        log_err(f"Could not find channel {channel_id}")
        return 0

    uploads_id = data["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
    log_info(f"Uploads playlist: {uploads_id}")

    video_ids = []
    next_page = None
    page_num = 0

    while True:
        page_num += 1
        params = {
            "playlistId": uploads_id,
            "part": "snippet",
            "maxResults": PAGE_SIZE,
        }
        if next_page:
            params["pageToken"] = next_page

        data = api_get("playlistItems", params)
        if not data:
            break

        items = data.get("items", [])
        for item in items:
            vid_id = item["snippet"]["resourceId"].get("videoId")
            if vid_id:
                video_ids.append(vid_id)

        log(f"  Page {page_num}: found {len(items)} videos (total: {len(video_ids)})")

        next_page = data.get("nextPageToken")
        if not next_page:
            break

    # Now fetch full details in batches of 50
    log_info(f"Fetching details for {len(video_ids)} videos...")
    videos_added = 0
    cursor = conn.cursor()

    for i in range(0, len(video_ids), PAGE_SIZE):
        batch = video_ids[i:i + PAGE_SIZE]
        data = api_get("videos", {
            "id": ",".join(batch),
            "part": "snippet,statistics,contentDetails"
        })
        if not data:
            continue

        for item in data.get("items", []):
            vid = item["id"]
            snippet = item.get("snippet", {})
            stats = item.get("statistics", {})

            cursor.execute("""
                INSERT OR REPLACE INTO videos
                (video_id, channel_id, title, description, published_at,
                 view_count, like_count, comment_count, duration, thumbnail_url, last_scraped)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """, (
                vid,
                channel_id,
                snippet.get("title", ""),
                snippet.get("description", ""),
                snippet.get("publishedAt", ""),
                int(stats.get("viewCount", 0)),
                int(stats.get("likeCount", 0)),
                int(stats.get("commentCount", 0)),
                item.get("contentDetails", {}).get("duration", ""),
                snippet.get("thumbnails", {}).get("medium", {}).get("url", ""),
            ))
            videos_added += 1

        conn.commit()
        log(f"  Videos batch {i // PAGE_SIZE + 1}: saved {len(data.get('items', []))} videos")

    return videos_added


# ─── Comment Fetching ────────────────────────────────────────────────

def fetch_comments_for_video(video_id, channel_id, conn):
    """Fetch ALL comment threads and replies for a single video."""
    cursor = conn.cursor()
    comments_added = 0
    next_page = None
    page_num = 0

    while True:
        page_num += 1
        params = {
            "videoId": video_id,
            "part": "snippet,replies",
            "maxResults": COMMENT_PAGE_SIZE,
            "textFormat": "plainText",
            "order": "time",
        }
        if next_page:
            params["pageToken"] = next_page

        data = api_get("commentThreads", params)
        if not data:
            # Comments might be disabled
            if page_num == 1:
                log_warn(f"  Could not fetch comments (disabled?)")
            break

        items = data.get("items", [])

        for thread in items:
            # Top-level comment
            top = thread["snippet"]["topLevelComment"]
            tc_snippet = top["snippet"]
            author_id = tc_snippet.get("authorChannelId", {}).get("value", "unknown")

            # Upsert author
            cursor.execute("""
                INSERT INTO authors (author_id, author_name, author_url, author_avatar)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(author_id) DO UPDATE SET
                    author_name=excluded.author_name,
                    author_url=excluded.author_url,
                    author_avatar=excluded.author_avatar
            """, (
                author_id,
                tc_snippet.get("authorDisplayName", "Anonymous"),
                tc_snippet.get("authorChannelUrl", ""),
                tc_snippet.get("authorProfileImageUrl", ""),
            ))

            # Insert comment
            cursor.execute("""
                INSERT OR IGNORE INTO comments
                (comment_id, video_id, channel_id, author_id, parent_id,
                 text_original, text_display, like_count, published_at, updated_at, is_reply)
                VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 0)
            """, (
                top["id"],
                video_id,
                channel_id,
                author_id,
                tc_snippet.get("textOriginal", ""),
                tc_snippet.get("textDisplay", ""),
                int(tc_snippet.get("likeCount", 0)),
                tc_snippet.get("publishedAt", ""),
                tc_snippet.get("updatedAt", ""),
            ))
            comments_added += 1

            # Replies
            replies = thread.get("replies", {}).get("comments", [])
            for reply in replies:
                r_snippet = reply["snippet"]
                r_author_id = r_snippet.get("authorChannelId", {}).get("value", "unknown")

                cursor.execute("""
                    INSERT INTO authors (author_id, author_name, author_url, author_avatar)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(author_id) DO UPDATE SET
                        author_name=excluded.author_name,
                        author_url=excluded.author_url,
                        author_avatar=excluded.author_avatar
                """, (
                    r_author_id,
                    r_snippet.get("authorDisplayName", "Anonymous"),
                    r_snippet.get("authorChannelUrl", ""),
                    r_snippet.get("authorProfileImageUrl", ""),
                ))

                cursor.execute("""
                    INSERT OR IGNORE INTO comments
                    (comment_id, video_id, channel_id, author_id, parent_id,
                     text_original, text_display, like_count, published_at, updated_at, is_reply)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                """, (
                    reply["id"],
                    video_id,
                    channel_id,
                    r_author_id,
                    top["id"],
                    r_snippet.get("textOriginal", ""),
                    r_snippet.get("textDisplay", ""),
                    int(r_snippet.get("likeCount", 0)),
                    r_snippet.get("publishedAt", ""),
                    r_snippet.get("updatedAt", ""),
                ))
                comments_added += 1

            # If thread has more replies than returned, fetch them
            total_replies = thread["snippet"].get("totalReplyCount", 0)
            if total_replies > len(replies):
                extra = _fetch_all_replies(top["id"], video_id, channel_id, cursor)
                comments_added += extra

        conn.commit()

        next_page = data.get("nextPageToken")
        if not next_page:
            break

        if page_num % 5 == 0:
            log(f"    Comment page {page_num}: {comments_added} comments so far...")

    return comments_added


def _fetch_all_replies(parent_id, video_id, channel_id, cursor):
    """Fetch all replies to a specific comment."""
    added = 0
    next_page = None

    while True:
        params = {
            "parentId": parent_id,
            "part": "snippet",
            "maxResults": COMMENT_PAGE_SIZE,
            "textFormat": "plainText",
        }
        if next_page:
            params["pageToken"] = next_page

        data = api_get("comments", params)
        if not data:
            break

        for reply in data.get("items", []):
            r_snippet = reply["snippet"]
            r_author_id = r_snippet.get("authorChannelId", {}).get("value", "unknown")

            cursor.execute("""
                INSERT INTO authors (author_id, author_name, author_url, author_avatar)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(author_id) DO UPDATE SET
                    author_name=excluded.author_name,
                    author_url=excluded.author_url,
                    author_avatar=excluded.author_avatar
            """, (
                r_author_id,
                r_snippet.get("authorDisplayName", "Anonymous"),
                r_snippet.get("authorChannelUrl", ""),
                r_snippet.get("authorProfileImageUrl", ""),
            ))

            cursor.execute("""
                INSERT OR IGNORE INTO comments
                (comment_id, video_id, channel_id, author_id, parent_id,
                 text_original, text_display, like_count, published_at, updated_at, is_reply)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            """, (
                reply["id"],
                video_id,
                channel_id,
                r_author_id,
                parent_id,
                r_snippet.get("textOriginal", ""),
                r_snippet.get("textDisplay", ""),
                int(r_snippet.get("likeCount", 0)),
                r_snippet.get("publishedAt", ""),
                r_snippet.get("updatedAt", ""),
            ))
            added += 1

        next_page = data.get("nextPageToken")
        if not next_page:
            break

    return added


# ─── Playwright Scraper (Fallback) ───────────────────────────────────

def scrape_comments_playwright(video_url, max_scroll=50):
    """
    Fallback: Scrape comments using Playwright browser automation.
    Use when API key is unavailable or quota is exhausted.
    """
    if not HAS_PLAYWRIGHT:
        log_err("Playwright not available. Install with: pip install playwright && playwright install")
        return []

    log_info(f"[Playwright] Scraping: {video_url}")
    comments = []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={"width": 1920, "height": 1080},
            )
            page = context.new_page()
            page.goto(video_url, wait_until="networkidle", timeout=60000)

            # Scroll down to load comments
            time.sleep(3)
            page.evaluate("window.scrollTo(0, 600)")
            time.sleep(2)

            for scroll_num in range(max_scroll):
                page.evaluate("window.scrollBy(0, 1000)")
                time.sleep(1.5)

                # Check for comment elements
                comment_elements = page.query_selector_all("ytd-comment-thread-renderer")
                if scroll_num % 10 == 0:
                    log(f"  Scroll {scroll_num}: {len(comment_elements)} comments loaded")

                # Check if we've reached the end
                if page.query_selector("ytd-message-renderer#message"):
                    break

            # Extract comments
            comment_elements = page.query_selector_all("ytd-comment-thread-renderer")
            for elem in comment_elements:
                try:
                    author_el = elem.query_selector("#author-text span")
                    text_el = elem.query_selector("#content-text")
                    time_el = elem.query_selector(".published-time-text a")
                    likes_el = elem.query_selector("#vote-count-middle")

                    if author_el and text_el:
                        comments.append({
                            "author": author_el.inner_text().strip(),
                            "text": text_el.inner_text().strip(),
                            "time": time_el.inner_text().strip() if time_el else "",
                            "likes": likes_el.inner_text().strip() if likes_el else "0",
                        })
                except Exception:
                    continue

            browser.close()

    except Exception as e:
        log_err(f"[Playwright] Error: {e}")

    log_ok(f"[Playwright] Scraped {len(comments)} comments")
    return comments


# ─── High-Level Gather Functions ─────────────────────────────────────

def add_channel(identifier):
    """Add a YouTube channel to track."""
    init_db()
    log_info(f"Resolving channel: {identifier}")

    info = resolve_channel(identifier)
    if not info:
        log_err(f"Could not resolve channel: {identifier}")
        log_warn("Make sure YOUTUBE_API_KEY is set and the channel URL/ID is correct.")
        return False

    conn = get_connection()
    conn.execute("""
        INSERT OR REPLACE INTO channels
        (channel_id, channel_name, channel_url, subscriber_count, video_count, thumbnail_url)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        info["channel_id"],
        info["channel_name"],
        info["channel_url"],
        info["subscriber_count"],
        info["video_count"],
        info["thumbnail_url"],
    ))
    conn.commit()
    conn.close()

    log_ok(f"Added channel: {info['channel_name']} ({info['channel_id']})")
    log(f"  Subscribers: {info['subscriber_count']:,}")
    log(f"  Videos: {info['video_count']:,}")
    return True


def gather_channel(channel_id, full=True):
    """Gather all comments for a channel."""
    init_db()
    conn = get_connection()

    # Verify channel exists
    ch = conn.execute("SELECT * FROM channels WHERE channel_id=?", (channel_id,)).fetchone()
    if not ch:
        log_err(f"Channel {channel_id} not found in database. Add it first with --add-channel")
        conn.close()
        return

    log_ok(f"{'=' * 60}")
    log_ok(f"Gathering comments for: {ch['channel_name']}")
    log_ok(f"{'=' * 60}")

    # Record scrape job
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO scrape_jobs (job_type, channel_id, status, started_at)
        VALUES ('full_gather', ?, 'running', datetime('now'))
    """, (channel_id,))
    job_id = cursor.lastrowid
    conn.commit()

    total_comments = 0
    total_videos = 0

    try:
        # Step 1: Fetch all videos
        log_info("Step 1: Fetching all videos...")
        total_videos = fetch_all_videos(channel_id, conn)
        log_ok(f"Found {total_videos} videos")

        # Step 2: Fetch comments for each video
        videos = conn.execute(
            "SELECT video_id, title, comment_count FROM videos WHERE channel_id=? ORDER BY published_at DESC",
            (channel_id,)
        ).fetchall()

        log_info(f"Step 2: Fetching comments for {len(videos)} videos...")
        for i, video in enumerate(videos):
            vid_id = video["video_id"]
            title = video["title"][:50]
            expected = video["comment_count"]

            log(f"\n[{i + 1}/{len(videos)}] {C.BOLD}{title}...{C.END} (expected ~{expected:,} comments)")

            if expected == 0:
                log_warn("  Skipping (0 comments)")
                continue

            count = fetch_comments_for_video(vid_id, channel_id, conn)
            total_comments += count
            log_ok(f"  Saved {count} comments (total: {total_comments:,})")

        # Update author counts
        conn.execute("""
            UPDATE authors SET total_comments = (
                SELECT COUNT(*) FROM comments WHERE comments.author_id = authors.author_id
            )
        """)

        # Update channel last_scraped
        conn.execute("UPDATE channels SET last_scraped=datetime('now') WHERE channel_id=?", (channel_id,))

        # Update job
        conn.execute("""
            UPDATE scrape_jobs SET status='completed', finished_at=datetime('now'),
            comments_added=?, videos_added=? WHERE job_id=?
        """, (total_comments, total_videos, job_id))
        conn.commit()

        log_ok(f"\n{'=' * 60}")
        log_ok(f"COMPLETE: {total_videos} videos, {total_comments:,} comments gathered")
        log_ok(f"{'=' * 60}")

    except KeyboardInterrupt:
        log_warn("\nInterrupted by user. Progress saved.")
        conn.execute("""
            UPDATE scrape_jobs SET status='interrupted', finished_at=datetime('now'),
            comments_added=?, videos_added=? WHERE job_id=?
        """, (total_comments, total_videos, job_id))
        conn.commit()
    except Exception as e:
        log_err(f"\nError: {e}")
        traceback.print_exc()
        conn.execute("""
            UPDATE scrape_jobs SET status='error', finished_at=datetime('now'),
            error_message=?, comments_added=?, videos_added=? WHERE job_id=?
        """, (str(e), total_comments, total_videos, job_id))
        conn.commit()
    finally:
        conn.close()


def gather_all():
    """Gather comments for all tracked channels."""
    init_db()
    conn = get_connection()
    channels = conn.execute("SELECT channel_id, channel_name FROM channels").fetchall()
    conn.close()

    if not channels:
        log_warn("No channels tracked. Add one with: python3 gather.py --add-channel CHANNEL_URL")
        return

    log_ok(f"Gathering comments for {len(channels)} channel(s)...")
    for ch in channels:
        gather_channel(ch["channel_id"])


def update_recent():
    """Update mode: only fetch comments from videos published in the last 7 days, 
    plus re-check recent comment threads. For daily cron use."""
    init_db()
    conn = get_connection()
    channels = conn.execute("SELECT channel_id, channel_name FROM channels").fetchall()

    if not channels:
        log_warn("No channels to update.")
        conn.close()
        return

    for ch in channels:
        channel_id = ch["channel_id"]
        log_info(f"Updating: {ch['channel_name']}")

        # Fetch latest videos
        fetch_all_videos(channel_id, conn)

        # Get videos from the last 7 days
        week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat() + "Z"
        recent_videos = conn.execute(
            "SELECT video_id, title FROM videos WHERE channel_id=? AND published_at>=?",
            (channel_id, week_ago)
        ).fetchall()

        log(f"  {len(recent_videos)} recent videos to update")
        total = 0
        for v in recent_videos:
            count = fetch_comments_for_video(v["video_id"], channel_id, conn)
            total += count

        # Update author counts
        conn.execute("""
            UPDATE authors SET total_comments = (
                SELECT COUNT(*) FROM comments WHERE comments.author_id = authors.author_id
            )
        """)
        conn.execute("UPDATE channels SET last_scraped=datetime('now') WHERE channel_id=?", (channel_id,))
        conn.commit()
        log_ok(f"  Updated {total} comments from recent videos")

    conn.close()


def show_status():
    """Show database status and stats."""
    init_db()
    stats = get_stats()

    print(f"\n{C.BOLD}{'=' * 50}{C.END}")
    print(f"{C.BOLD}  COMMENTZOR DATABASE STATUS{C.END}")
    print(f"{C.BOLD}{'=' * 50}{C.END}")
    print(f"  Database: {DB_PATH}")
    if os.path.exists(DB_PATH):
        size_mb = os.path.getsize(DB_PATH) / (1024 * 1024)
        print(f"  Size: {size_mb:.1f} MB")
    print()
    print(f"  {C.CYAN}Channels:{C.END}    {stats['total_channels']:>10,}")
    print(f"  {C.CYAN}Videos:{C.END}      {stats['total_videos']:>10,}")
    print(f"  {C.CYAN}Comments:{C.END}    {stats['total_comments']:>10,}")
    print(f"  {C.CYAN}  Top-level:{C.END} {stats['total_top_level']:>10,}")
    print(f"  {C.CYAN}  Replies:{C.END}   {stats['total_replies']:>10,}")
    print(f"  {C.CYAN}Authors:{C.END}     {stats['total_authors']:>10,}")

    conn = get_connection()

    # Channel breakdown
    channels = conn.execute("""
        SELECT c.channel_name, c.channel_id, c.last_scraped,
            (SELECT COUNT(*) FROM videos WHERE videos.channel_id=c.channel_id) as vid_count,
            (SELECT COUNT(*) FROM comments WHERE comments.channel_id=c.channel_id) as cmt_count
        FROM channels c ORDER BY cmt_count DESC
    """).fetchall()

    if channels:
        print(f"\n  {C.BOLD}Channels:{C.END}")
        for ch in channels:
            scraped = ch["last_scraped"] or "never"
            print(f"    {C.GREEN}{ch['channel_name']}{C.END}")
            print(f"      ID: {ch['channel_id']}")
            print(f"      Videos: {ch['vid_count']:,} | Comments: {ch['cmt_count']:,} | Last scraped: {scraped}")

    # Top commenters
    top_authors = conn.execute("""
        SELECT author_name, total_comments FROM authors
        ORDER BY total_comments DESC LIMIT 10
    """).fetchall()

    if top_authors:
        print(f"\n  {C.BOLD}Top Commenters:{C.END}")
        for a in top_authors:
            print(f"    {a['total_comments']:>6,}  {a['author_name']}")

    # Recent jobs
    jobs = conn.execute("""
        SELECT * FROM scrape_jobs ORDER BY job_id DESC LIMIT 5
    """).fetchall()

    if jobs:
        print(f"\n  {C.BOLD}Recent Jobs:{C.END}")
        for j in jobs:
            print(f"    [{j['status']}] {j['job_type']} - {j['comments_added']:,} comments, {j['videos_added']} videos ({j['started_at']})")

    print(f"\n{C.BOLD}{'=' * 50}{C.END}\n")
    conn.close()


# ─── Main CLI ─────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Commentzor - YouTube Comment Database Gatherer",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --add-channel https://youtube.com/@MrBeast
  %(prog)s --add-channel UCX6OQ3DkcsbYNE6H8uQQuVA
  %(prog)s --gather-all
  %(prog)s --gather-channel UCX6OQ3DkcsbYNE6H8uQQuVA
  %(prog)s --update
  %(prog)s --status

Environment:
  YOUTUBE_API_KEY    Your YouTube Data API v3 key (required)
                     Get one at: https://console.cloud.google.com
        """
    )

    parser.add_argument("--add-channel", metavar="URL_OR_ID",
                        help="Add a YouTube channel to track")
    parser.add_argument("--remove-channel", metavar="CHANNEL_ID",
                        help="Remove a channel from tracking")
    parser.add_argument("--gather-all", action="store_true",
                        help="Gather ALL comments for ALL tracked channels")
    parser.add_argument("--gather-channel", metavar="CHANNEL_ID",
                        help="Gather all comments for a specific channel")
    parser.add_argument("--update", action="store_true",
                        help="Update: fetch only recent videos/comments (for cron)")
    parser.add_argument("--status", action="store_true",
                        help="Show database status and statistics")
    parser.add_argument("--init-db", action="store_true",
                        help="Initialize/reset the database schema")
    parser.add_argument("--scrape-video", metavar="VIDEO_URL",
                        help="[Fallback] Scrape comments from a video URL using Playwright")

    args = parser.parse_args()

    if args.init_db:
        init_db()
        return

    if args.add_channel:
        add_channel(args.add_channel)
        return

    if args.remove_channel:
        init_db()
        conn = get_connection()
        conn.execute("DELETE FROM comments WHERE channel_id=?", (args.remove_channel,))
        conn.execute("DELETE FROM videos WHERE channel_id=?", (args.remove_channel,))
        conn.execute("DELETE FROM channels WHERE channel_id=?", (args.remove_channel,))
        conn.commit()
        conn.close()
        log_ok(f"Removed channel {args.remove_channel} and all associated data.")
        return

    if args.gather_all:
        gather_all()
        return

    if args.gather_channel:
        gather_channel(args.gather_channel)
        return

    if args.update:
        update_recent()
        return

    if args.status:
        show_status()
        return

    if args.scrape_video:
        comments = scrape_comments_playwright(args.scrape_video)
        for c in comments[:20]:
            print(f"  [{c['likes']} likes] {c['author']}: {c['text'][:100]}")
        return

    parser.print_help()


if __name__ == "__main__":
    main()
