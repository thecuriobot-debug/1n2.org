#!/usr/bin/env python3.12
"""
Tweetster Scrapling Fetcher — Replaces the broken PHP/Twitter API fetcher
Scrapes tweets via Nitter using Scrapling, outputs to the same JSON format
the existing Tweetster frontend expects.

Usage:
    python3.12 scrapling_fetch.py              # Refresh all feeds
    python3.12 scrapling_fetch.py --user handle # Single user
    python3.12 scrapling_fetch.py --status      # Show status

Outputs to: ../data/tweets.json (same format as PHP fetcher)
"""
import sys, json, hashlib, re, time
from datetime import datetime
from pathlib import Path

# Add scrapling-apps lib
sys.path.insert(0, str(Path.home() / ".openclaw" / "scrapling-apps"))
from scrapling.fetchers import Fetcher

DATA_DIR = Path(__file__).parent.parent / "data"
TWEETS_FILE = DATA_DIR / "tweets.json"
FOLLOWING_FILE = DATA_DIR / "following.json"
ARCHIVE_DIR = Path.home() / ".openclaw" / "scrapling-apps" / "tweetster" / "archive"

NITTER_INSTANCES = [
    "https://nitter.net",
    "https://nitter.privacydev.net",
]

def find_nitter():
    for inst in NITTER_INSTANCES:
        try:
            page = Fetcher.get(f"{inst}/Bitcoin", timeout=10)
            if page and len(page.css('.timeline-item')) > 0:
                return inst
        except:
            continue
    return NITTER_INSTANCES[0]

def parse_nitter_tweets(page, default_user=""):
    """Parse tweets from Nitter page into Tweetster's expected format."""
    tweets = []
    for item in page.css('.timeline-item'):
        content = item.css('.tweet-content')
        username = item.css('.username')
        fullname = item.css('.fullname')
        date_el = item.css('.tweet-date a')
        retweet_hdr = item.css('.retweet-header')
        avatar = item.css('.avatar img, img.avatar')

        text = content[0].text.strip() if content else ""
        if not text or len(text) < 3:
            continue

        user = username[0].text.strip().lstrip('@') if username else default_user
        name = fullname[0].text.strip() if fullname else user
        date_str = date_el[0].attrib.get('title', '') if date_el else ""
        link = date_el[0].attrib.get('href', '') if date_el else ""
        avatar_url = avatar[0].attrib.get('src', '') if avatar else ""

        # Convert Nitter date to Twitter-style format
        # Nitter: "Mar 5, 2026 · 6:30 PM UTC"
        # Twitter: "Tue Mar 05 18:30:00 +0000 2026"
        created_at = date_str  # Keep as-is, frontend can handle both formats

        # Generate stable ID from content hash
        tweet_id = str(int(hashlib.md5(f"{user}:{text[:80]}".encode()).hexdigest()[:15], 16))

        # Check for media (images/videos in tweet)
        media = []
        for img in item.css('.attachment img, .still-image img'):
            src = img.attrib.get('src', '')
            if src and not 'avatar' in src:
                if src.startswith('/'):
                    src = f"https://nitter.net{src}"
                media.append({"url": src, "type": "photo"})

        tweets.append({
            "id": tweet_id,
            "text": text,
            "created_at": created_at,
            "user": {
                "handle": f"@{user}",
                "name": name,
                "profile_image": avatar_url,
            },
            "profile_image": avatar_url,
            "retweet_count": 0,
            "favorite_count": 0,
            "reply_count": 0,
            "views": "",
            "is_retweet": bool(retweet_hdr),
            "media": media,
            "source": "scrapling/nitter",
            "nitter_link": f"https://nitter.net{link}" if link else "",
        })
    return tweets

def scrape_timeline(nitter, username, max_pages=2):
    """Scrape a user's timeline with pagination."""
    all_tweets = []
    url = f"{nitter}/{username}"
    for page_num in range(max_pages):
        try:
            page = Fetcher.get(url, timeout=15)
            if not page:
                break
            tweets = parse_nitter_tweets(page, username)
            if not tweets:
                break
            all_tweets.extend(tweets)
            # Get next page cursor
            show_more = page.css('.show-more a')
            if show_more and max_pages > 1:
                href = show_more[-1].attrib.get('href', '')
                if 'cursor=' in href:
                    url = f"{nitter}/{username}{href}"
                    time.sleep(1.5)
                else:
                    break
            else:
                break
        except Exception as e:
            print(f"  Error on page {page_num+1}: {e}", file=sys.stderr)
            break
    return all_tweets

def load_following():
    """Load the following list."""
    if FOLLOWING_FILE.exists():
        return json.loads(FOLLOWING_FILE.read_text())
    return []

def _save_tweets(tweets):
    """Deduplicate and save tweets."""
    seen = set()
    unique = []
    for t in tweets:
        if t["id"] not in seen:
            seen.add(t["id"])
            unique.append(t)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    TWEETS_FILE.write_text(json.dumps(unique, indent=2, ensure_ascii=False), encoding='utf-8')
    return unique

def refresh_all():
    """Refresh tweets for all followed accounts."""
    following = load_following()
    if not following:
        print("[scrapling-fetch] No following.json found, using defaults")
        following = [
            {"handle": "@MadBitcoins", "name": "Mad Bitcoins"},
            {"handle": "@Bitcoin", "name": "Bitcoin"},
            {"handle": "@VitalikButerin", "name": "Vitalik Buterin"},
            {"handle": "@CurioNFT", "name": "Curio NFT"},
        ]

    # Limit to top 30 by followers to avoid rate limiting
    following.sort(key=lambda x: x.get('followers', 0), reverse=True)
    following = following[:30]

    nitter = find_nitter()
    print(f"[scrapling-fetch] Using {nitter}, {len(following)} accounts")

    all_tweets = []
    rate_limited = 0
    for i, account in enumerate(following):
        handle = account.get("handle", "").lstrip("@")
        if not handle:
            continue

        # Stop if we've hit too many rate limits
        if rate_limited >= 3:
            print(f"  [rate limited, stopping at {i} accounts]")
            break

        print(f"  [{i+1}/{len(following)}] @{handle}...")
        tweets = scrape_timeline(nitter, handle, max_pages=1)
        if not tweets:
            rate_limited += 1
        else:
            rate_limited = 0  # Reset on success
        print(f"    {len(tweets)} tweets")
        all_tweets.extend(tweets)
        time.sleep(2)  # Polite delay

        # Save checkpoint every 10 accounts
        if (i + 1) % 10 == 0 and all_tweets:
            _save_tweets(all_tweets)
            print(f"    [saved {len(all_tweets)} tweets]")

    # Merge with existing tweets (never lose data)
    existing = []
    if TWEETS_FILE.exists():
        try:
            existing = json.loads(TWEETS_FILE.read_text())
        except:
            pass

    merged = existing + all_tweets
    seen = set()
    unique = []
    for t in merged:
        if t["id"] not in seen:
            seen.add(t["id"])
            unique.append(t)

    # Only save if we have data (never overwrite with empty)
    if not unique:
        print("[scrapling-fetch] No tweets to save, keeping existing data")
        return []

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    TWEETS_FILE.write_text(json.dumps(unique, indent=2, ensure_ascii=False), encoding='utf-8')
    new_count = len(unique) - len(existing)
    print(f"[scrapling-fetch] {new_count} new, {len(unique)} total in {TWEETS_FILE}")

    # Also archive to scrapling-apps archive
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    today = datetime.now().strftime("%Y-%m-%d")
    archive_file = ARCHIVE_DIR / f"tweetster-feed-{today}.json"
    archive_file.write_text(json.dumps(unique, indent=2, ensure_ascii=False), encoding='utf-8')

    return unique

def refresh_single(handle):
    """Refresh tweets for a single user."""
    nitter = find_nitter()
    print(f"[scrapling-fetch] @{handle} via {nitter}")
    tweets = scrape_timeline(nitter, handle, max_pages=2)
    print(f"  {len(tweets)} tweets")

    # Merge with existing
    existing = []
    if TWEETS_FILE.exists():
        existing = json.loads(TWEETS_FILE.read_text())

    existing_ids = {t["id"] for t in existing}
    new_count = 0
    for t in tweets:
        if t["id"] not in existing_ids:
            existing.insert(0, t)
            new_count += 1

    TWEETS_FILE.write_text(json.dumps(existing, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f"[scrapling-fetch] {new_count} new, {len(existing)} total")

def show_status():
    if TWEETS_FILE.exists():
        tweets = json.loads(TWEETS_FILE.read_text())
        following = load_following()
        users = set()
        for t in tweets:
            u = t.get("user", {})
            if isinstance(u, dict):
                users.add(u.get("handle", "?"))
            else:
                users.add("?")
        print(f"Tweets: {len(tweets)}")
        print(f"Following: {len(following)}")
        print(f"Users in feed: {len(users)}")
        print(f"File: {TWEETS_FILE}")
        print(f"Modified: {datetime.fromtimestamp(TWEETS_FILE.stat().st_mtime)}")
    else:
        print("No tweets.json found")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--user", help="Single user to fetch")
    parser.add_argument("--status", action="store_true")
    args = parser.parse_args()

    if args.status:
        show_status()
    elif args.user:
        refresh_single(args.user.lstrip("@"))
    else:
        refresh_all()
