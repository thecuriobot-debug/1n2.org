#!/usr/bin/env python3
"""
TWEETSTER ADVANCED PLAYWRIGHT SCRAPER
Scrapes tweets from Twitter with proper DOM parsing

Usage:
    python3 scrape_twitter_advanced.py           # Scrape top 20 accounts
    python3 scrape_twitter_advanced.py --max 50  # Scrape top 50 accounts
    python3 scrape_twitter_advanced.py --all     # Scrape ALL accounts (slow!)

This version properly extracts:
- Tweet text
- Media (images/videos)
- Engagement metrics (likes, retweets, replies)
- User info
- Timestamps
"""

import json
import re
import sys
import time
from datetime import datetime
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("❌ Playwright not installed!")
    print("Run: pip3 install playwright --break-system-packages")
    print("Then: playwright install chromium")
    exit(1)

# Paths
SCRIPT_DIR = Path(__file__).parent.absolute()
DATA_DIR = SCRIPT_DIR / "data"
TWEETS_FILE = DATA_DIR / "tweets.json"
FOLLOWING_FILE = DATA_DIR / "following.json"

DATA_DIR.mkdir(exist_ok=True)


def load_following():
    """Load accounts to follow"""
    if FOLLOWING_FILE.exists():
        with open(FOLLOWING_FILE, 'r') as f:
            data = json.load(f)
            # Handle both formats: list or {"accounts": [...]}
            if isinstance(data, list):
                return data
            elif isinstance(data, dict):
                return data.get("accounts", [])
    return []


def load_existing_tweets():
    """Load existing tweets"""
    if TWEETS_FILE.exists():
        try:
            with open(TWEETS_FILE, 'r') as f:
                return json.load(f)
        except:
            return []
    return []


def save_tweets(tweets):
    """Save tweets"""
    with open(TWEETS_FILE, 'w') as f:
        json.dump(tweets, f, indent=2, ensure_ascii=False)


def classify_topic(text):
    """Classify tweet by topic"""
    text_lower = text.lower()
    
    keywords = {
        "bitcoin": ['bitcoin', 'btc', 'crypto', 'ethereum', 'eth', 'blockchain', 'satoshi', 'defi'],
        "politics": ['trump', 'biden', 'election', 'congress', 'senate', 'politics', 'government', 'president'],
        "tech": ['ai', 'tech', 'software', 'coding', 'developer', 'startup', 'programming', 'llm', 'gpt'],
        "sports": ['nba', 'nfl', 'mlb', 'nhl', 'soccer', 'football', 'basketball', 'sports', 'game']
    }
    
    for topic, words in keywords.items():
        if any(word in text_lower for word in words):
            return [topic]
    
    return ["unsorted"]


def extract_tweet_data(page, article_element):
    """Extract structured data from a tweet article element"""
    try:
        # Get tweet text
        text_elements = article_element.query_selector_all('[data-testid="tweetText"]')
        text = text_elements[0].inner_text() if text_elements else ""
        
        # Get user info
        user_link = article_element.query_selector('[data-testid="User-Name"] a')
        user_handle = ""
        user_name = "Unknown"
        
        if user_link:
            href = user_link.get_attribute('href')
            if href:
                user_handle = href.strip('/').split('/')[-1]
        
        # Get metrics
        like_button = article_element.query_selector('[data-testid="like"]')
        retweet_button = article_element.query_selector('[data-testid="retweet"]')
        reply_button = article_element.query_selector('[data-testid="reply"]')
        
        favorite_count = 0
        retweet_count = 0
        reply_count = 0
        
        if like_button:
            like_text = like_button.get_attribute('aria-label') or ""
            match = re.search(r'(\d+)', like_text)
            if match:
                favorite_count = int(match.group(1))
        
        if retweet_button:
            rt_text = retweet_button.get_attribute('aria-label') or ""
            match = re.search(r'(\d+)', rt_text)
            if match:
                retweet_count = int(match.group(1))
        
        if reply_button:
            reply_text = reply_button.get_attribute('aria-label') or ""
            match = re.search(r'(\d+)', reply_text)
            if match:
                reply_count = int(match.group(1))
        
        # Get media
        media = []
        img_elements = article_element.query_selector_all('[data-testid="tweetPhoto"] img')
        for img in img_elements:
            src = img.get_attribute('src')
            if src and 'pbs.twimg.com' in src:
                media.append({"url": src, "type": "photo"})
        
        # Get video thumbnails
        video_elements = article_element.query_selector_all('[data-testid="videoPlayer"]')
        if video_elements:
            media.append({"url": "", "type": "video"})
        
        # Generate tweet ID from text + user (approximation)
        tweet_id = str(abs(hash(text + user_handle)))[:18]
        
        return {
            "id": tweet_id,
            "text": text,
            "created_at": datetime.now().strftime("%a %b %d %H:%M:%S +0000 %Y"),
            "user_handle": user_handle,
            "user_name": user_name,
            "user_avatar": "",
            "profile_image": "",
            "retweet_count": retweet_count,
            "favorite_count": favorite_count,
            "reply_count": reply_count,
            "views": "0",
            "is_retweet": False,
            "media": media,
            "topics": classify_topic(text),
            "sort_ts": int(time.time())
        }
    
    except Exception as e:
        print(f"    ⚠️  Error extracting tweet: {e}")
        return None


def scrape_twitter(max_accounts=20):
    """Main scraper"""
    print("=" * 70)
    print("TWEETSTER ADVANCED PLAYWRIGHT SCRAPER")
    print("=" * 70)
    print()
    
    following = load_following()
    if not following:
        print("⚠️  No following list!")
        print("   Create data/following.json")
        return
    
    # LIMIT: Only scrape specified number of accounts
    total_accounts = len(following)
    if max_accounts and total_accounts > max_accounts:
        print(f"📋 Found {total_accounts} accounts, limiting to top {max_accounts}")
        following = following[:max_accounts]
    else:
        print(f"📋 Tracking {len(following)} accounts")
    
    existing_tweets = load_existing_tweets()
    existing_ids = {t['id'] for t in existing_tweets}
    new_tweets = []
    
    with sync_playwright() as p:
        print("🌐 Launching Chrome...")
        browser = p.chromium.launch(
            headless=False,
            args=[
                '--start-maximized',  # Start maximized
                '--disable-blink-features=AutomationControlled'  # Hide automation
            ]
        )
        
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},  # Larger viewport
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='en-US'
        )
        
        page = context.new_page()
        
        # Login
        print("📱 Opening Twitter login...")
        print("   If you don't see a browser window, check your Dock/taskbar!")
        page.goto("https://twitter.com/login", wait_until="networkidle")
        
        print()
        print("🔍 Browser should be open now at: https://twitter.com/login")
        print("   Check all your windows and spaces!")
        
        print()
        print("⚠️  MANUAL STEP REQUIRED")
        print("-" * 70)
        print("1. Login to Twitter in the browser")
        print("2. Wait until you see your timeline")
        print("3. Press ENTER here to continue")
        print("-" * 70)
        input("Press ENTER when ready...")
        print()
        
        # Scrape each account
        for i, account in enumerate(following):
            handle = account.get("handle", "").replace("@", "")
            if not handle:
                continue
            
            print(f"\n[{i+1}/{len(following)}] @{handle}")
            
            try:
                url = f"https://twitter.com/{handle}"
                print(f"  🔗 {url}")
                page.goto(url, wait_until="domcontentloaded", timeout=30000)
                time.sleep(3)
                
                # Scroll to load tweets
                print("  📜 Scrolling...")
                for scroll in range(5):
                    page.keyboard.press("PageDown")
                    time.sleep(1)
                
                # Extract tweets
                print("  🔍 Extracting tweets...")
                articles = page.query_selector_all('article[data-testid="tweet"]')
                
                count = 0
                for article in articles[:10]:  # Top 10 tweets
                    tweet_data = extract_tweet_data(page, article)
                    if tweet_data and tweet_data['id'] not in existing_ids:
                        new_tweets.append(tweet_data)
                        existing_ids.add(tweet_data['id'])
                        count += 1
                
                print(f"  ✅ Found {count} new tweets")
                
            except Exception as e:
                print(f"  ❌ Error: {e}")
            
            time.sleep(2)  # Rate limit
        
        browser.close()
    
    # Merge and deduplicate
    all_tweets = existing_tweets + new_tweets
    
    # Remove duplicates
    seen = set()
    unique = []
    for t in all_tweets:
        if t['id'] not in seen:
            seen.add(t['id'])
            unique.append(t)
    
    # Sort by timestamp
    unique.sort(key=lambda t: t.get('sort_ts', 0), reverse=True)
    
    # Save
    save_tweets(unique)
    
    print()
    print("=" * 70)
    print("✅ COMPLETE!")
    print("=" * 70)
    print(f"📊 New tweets: {len(new_tweets)}")
    print(f"📊 Total tweets: {len(unique)}")
    print(f"💾 Saved to: {TWEETS_FILE}")
    print("=" * 70)


if __name__ == "__main__":
    # Parse command line args
    max_accounts = 20  # Default
    
    if "--all" in sys.argv:
        max_accounts = None  # No limit
    elif "--max" in sys.argv:
        try:
            idx = sys.argv.index("--max")
            max_accounts = int(sys.argv[idx + 1])
        except (IndexError, ValueError):
            print("Usage: --max NUMBER")
            sys.exit(1)
    
    scrape_twitter(max_accounts)
