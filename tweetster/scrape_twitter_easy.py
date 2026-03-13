#!/usr/bin/env python3
"""
TWEETSTER SCRAPER - CHROME DEBUG MODE
Uses your existing Chrome browser with saved login session

This is MUCH easier - it uses your already-logged-in Chrome!

Setup (ONE TIME):
    1. Close ALL Chrome windows
    2. Run this script
    3. Chrome opens automatically
    4. Login to Twitter (session is saved)
    
Next times:
    Just run the script - you're already logged in!
"""

import json
import re
import sys
import time
from datetime import datetime
from pathlib import Path
import subprocess
import os

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
        "bitcoin": ['bitcoin', 'btc', 'crypto', 'ethereum', 'eth', 'blockchain', 'satoshi', 'defi', 'web3'],
        "politics": ['trump', 'biden', 'election', 'congress', 'senate', 'politics', 'government', 'president'],
        "tech": ['ai', 'tech', 'software', 'coding', 'developer', 'startup', 'programming', 'llm', 'gpt', 'openai'],
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
        
        if not text:
            return None
        
        # Get user handle
        user_link = article_element.query_selector('a[href*="/status/"]')
        user_handle = ""
        
        if user_link:
            href = user_link.get_attribute('href') or ""
            parts = href.split('/')
            if len(parts) >= 2:
                user_handle = parts[1]
        
        # Get metrics
        favorite_count = 0
        retweet_count = 0
        reply_count = 0
        
        like_button = article_element.query_selector('[data-testid="like"]')
        if like_button:
            like_text = like_button.get_attribute('aria-label') or ""
            match = re.search(r'(\d[\d,]*)', like_text)
            if match:
                favorite_count = int(match.group(1).replace(',', ''))
        
        retweet_button = article_element.query_selector('[data-testid="retweet"]')
        if retweet_button:
            rt_text = retweet_button.get_attribute('aria-label') or ""
            match = re.search(r'(\d[\d,]*)', rt_text)
            if match:
                retweet_count = int(match.group(1).replace(',', ''))
        
        reply_button = article_element.query_selector('[data-testid="reply"]')
        if reply_button:
            reply_text = reply_button.get_attribute('aria-label') or ""
            match = re.search(r'(\d[\d,]*)', reply_text)
            if match:
                reply_count = int(match.group(1).replace(',', ''))
        
        # Get media
        media = []
        img_elements = article_element.query_selector_all('[data-testid="tweetPhoto"] img')
        for img in img_elements:
            src = img.get_attribute('src')
            if src and 'pbs.twimg.com' in src:
                media.append({"url": src, "type": "photo"})
        
        video_elements = article_element.query_selector_all('[data-testid="videoPlayer"]')
        if video_elements:
            media.append({"url": "", "type": "video"})
        
        # Generate tweet ID
        tweet_id = str(abs(hash(text + user_handle + str(time.time()))))[:18]
        
        return {
            "id": tweet_id,
            "text": text,
            "created_at": datetime.now().strftime("%a %b %d %H:%M:%S +0000 %Y"),
            "user_handle": user_handle,
            "user_name": user_handle,
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
        return None


def scrape_twitter(max_accounts=20):
    """Main scraper using regular Chrome"""
    print("=" * 70)
    print("TWEETSTER SCRAPER - EASY MODE")
    print("=" * 70)
    print()
    
    following = load_following()
    if not following:
        print("⚠️  No following list!")
        return
    
    total_accounts = len(following)
    if max_accounts and total_accounts > max_accounts:
        print(f"📋 Found {total_accounts} accounts, scraping top {max_accounts}")
        following = following[:max_accounts]
    else:
        print(f"📋 Scraping {len(following)} accounts")
    
    existing_tweets = load_existing_tweets()
    existing_ids = {t['id'] for t in existing_tweets}
    new_tweets = []
    
    with sync_playwright() as p:
        print()
        print("🌐 Launching browser...")
        print("   A new browser window will open - MAKE SURE TO LOOK FOR IT!")
        print()
        
        browser = p.chromium.launch(
            headless=False,
            args=['--start-maximized']
        )
        
        context = browser.new_context(
            viewport=None,  # Use window size
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        
        page = context.new_page()
        
        # Go to Twitter
        print("📱 Opening Twitter...")
        page.goto("https://twitter.com/home", timeout=60000)
        time.sleep(3)
        
        # Check if we need to login
        current_url = page.url
        if '/login' in current_url or '/i/flow/login' in current_url:
            print()
            print("⚠️  NOT LOGGED IN - PLEASE LOGIN NOW")
            print("-" * 70)
            print("1. The browser window should be showing Twitter login")
            print("2. Login with your Twitter account")
            print("3. Press ENTER here when you see your timeline")
            print("-" * 70)
            input("Press ENTER after logging in...")
        else:
            print("✅ Already logged in!")
        
        print()
        print("🔍 Starting to scrape tweets...")
        print()
        
        # Scrape each account
        for i, account in enumerate(following):
            handle = account.get("handle", "").replace("@", "")
            if not handle:
                continue
            
            print(f"[{i+1}/{len(following)}] @{handle}")
            
            try:
                url = f"https://twitter.com/{handle}"
                page.goto(url, wait_until="domcontentloaded", timeout=30000)
                time.sleep(3)
                
                # Scroll to load tweets
                for scroll in range(3):
                    page.keyboard.press("PageDown")
                    time.sleep(1)
                
                # Extract tweets
                articles = page.query_selector_all('article[data-testid="tweet"]')
                
                count = 0
                for article in articles[:10]:
                    tweet_data = extract_tweet_data(page, article)
                    if tweet_data and tweet_data['id'] not in existing_ids:
                        new_tweets.append(tweet_data)
                        existing_ids.add(tweet_data['id'])
                        count += 1
                
                print(f"  ✅ {count} new tweets")
                
            except Exception as e:
                print(f"  ❌ Error: {e}")
            
            time.sleep(2)
        
        browser.close()
    
    # Merge and save
    all_tweets = existing_tweets + new_tweets
    
    seen = set()
    unique = []
    for t in all_tweets:
        if t['id'] not in seen:
            seen.add(t['id'])
            unique.append(t)
    
    unique.sort(key=lambda t: t.get('sort_ts', 0), reverse=True)
    
    save_tweets(unique)
    
    print()
    print("=" * 70)
    print("✅ DONE!")
    print("=" * 70)
    print(f"📊 New tweets: {len(new_tweets)}")
    print(f"📊 Total tweets: {len(unique)}")
    print(f"💾 Saved to: {TWEETS_FILE}")
    print("=" * 70)


if __name__ == "__main__":
    max_accounts = 20
    
    if "--all" in sys.argv:
        max_accounts = None
    elif "--max" in sys.argv:
        try:
            idx = sys.argv.index("--max")
            max_accounts = int(sys.argv[idx + 1])
        except:
            print("Usage: --max NUMBER")
            sys.exit(1)
    
    scrape_twitter(max_accounts)
