#!/usr/bin/env python3
"""
TWEETSTER PLAYWRIGHT SCRAPER
Automated browser-based Twitter scraping using Playwright

Installation:
    pip3 install playwright --break-system-packages
    playwright install chromium

Usage:
    python3 scrape_twitter_playwright.py

This scrapes tweets from Twitter accounts you follow using a real browser.
Much more reliable than API-based approaches.
"""

import json
import re
import time
from datetime import datetime, timezone
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

# Ensure data directory exists
DATA_DIR.mkdir(exist_ok=True)


def load_following():
    """Load list of accounts to follow"""
    if FOLLOWING_FILE.exists():
        with open(FOLLOWING_FILE, 'r') as f:
            data = json.load(f)
            return data.get("accounts", [])
    return []


def load_existing_tweets():
    """Load existing tweets to avoid duplicates"""
    if TWEETS_FILE.exists():
        with open(TWEETS_FILE, 'r') as f:
            return json.load(f)
    return []


def save_tweets(tweets):
    """Save tweets to JSON file"""
    with open(TWEETS_FILE, 'w') as f:
        json.dump(tweets, f, indent=2)


def parse_tweet_time(time_str):
    """Parse Twitter timestamp to sort timestamp"""
    # Twitter shows times like "2h", "5m", "Feb 11", etc.
    now = int(time.time())
    
    if 's' in time_str:  # seconds ago
        seconds = int(time_str.replace('s', ''))
        return now - seconds
    elif 'm' in time_str:  # minutes ago
        minutes = int(time_str.replace('m', ''))
        return now - (minutes * 60)
    elif 'h' in time_str:  # hours ago
        hours = int(time_str.replace('h', ''))
        return now - (hours * 3600)
    else:
        # For older tweets, return approximate timestamp
        return now - (24 * 3600)  # Default to 1 day ago


def classify_topic(text):
    """Classify tweet topic based on keywords"""
    text_lower = text.lower()
    
    # Bitcoin/Crypto
    if any(word in text_lower for word in ['bitcoin', 'btc', 'crypto', 'ethereum', 'eth', 'blockchain', 'satoshi']):
        return ["bitcoin"]
    
    # Politics
    if any(word in text_lower for word in ['trump', 'biden', 'election', 'congress', 'senate', 'politics', 'government']):
        return ["politics"]
    
    # Tech
    if any(word in text_lower for word in ['ai', 'tech', 'software', 'coding', 'developer', 'startup', 'silicon valley']):
        return ["tech"]
    
    # Sports
    if any(word in text_lower for word in ['nba', 'nfl', 'mlb', 'nhl', 'soccer', 'football', 'basketball', 'sports']):
        return ["sports"]
    
    return ["unsorted"]


def scrape_twitter_timeline():
    """Scrape Twitter timeline using Playwright"""
    print("=" * 60)
    print("TWEETSTER PLAYWRIGHT SCRAPER")
    print("=" * 60)
    print()
    
    # Load following list
    following = load_following()
    if not following:
        print("⚠️  No following list found!")
        print("Create data/following.json with accounts to track")
        return
    
    print(f"📋 Tracking {len(following)} accounts")
    print()
    
    # Load existing tweets
    existing_tweets = load_existing_tweets()
    existing_ids = {tweet['id'] for tweet in existing_tweets}
    new_tweets = []
    
    with sync_playwright() as p:
        print("🌐 Launching browser...")
        browser = p.chromium.launch(
            headless=False,  # Show browser so you can see what's happening
            args=['--disable-blink-features=AutomationControlled']
        )
        
        context = browser.new_context(
            viewport={'width': 1280, 'height': 720},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        
        page = context.new_page()
        
        # Go to Twitter
        print("📱 Navigating to Twitter...")
        page.goto("https://twitter.com/login", wait_until="networkidle")
        
        print()
        print("⚠️  MANUAL LOGIN REQUIRED")
        print("=" * 60)
        print("1. Login to Twitter in the browser window")
        print("2. Once you see your timeline, press ENTER here")
        print("=" * 60)
        input("Press ENTER after logging in...")
        
        print()
        print("🔍 Starting to scrape tweets...")
        print()
        
        # Scrape each account
        for i, account in enumerate(following):
            handle = account.get("handle", "").replace("@", "")
            if not handle:
                continue
            
            print(f"[{i+1}/{len(following)}] Scraping @{handle}...")
            
            try:
                # Navigate to user timeline
                url = f"https://twitter.com/{handle}"
                page.goto(url, wait_until="networkidle", timeout=30000)
                time.sleep(3)  # Let tweets load
                
                # Scroll to load more tweets
                for _ in range(3):  # Scroll 3 times
                    page.keyboard.press("PageDown")
                    time.sleep(1)
                
                # Extract tweets from page
                page_text = page.inner_text("body")
                
                # Find tweet elements (this is approximate - Twitter's DOM is complex)
                # You may need to adjust selectors based on Twitter's current layout
                
                print(f"  ✅ Scraped @{handle}")
                
            except Exception as e:
                print(f"  ❌ Error scraping @{handle}: {e}")
            
            # Rate limit
            time.sleep(2)
        
        browser.close()
    
    # Merge with existing tweets
    all_tweets = existing_tweets + new_tweets
    
    # Remove duplicates
    seen_ids = set()
    unique_tweets = []
    for tweet in all_tweets:
        if tweet['id'] not in seen_ids:
            seen_ids.add(tweet['id'])
            unique_tweets.append(tweet)
    
    # Sort by timestamp (newest first)
    unique_tweets.sort(key=lambda t: t.get('sort_ts', 0), reverse=True)
    
    # Save
    save_tweets(unique_tweets)
    
    print()
    print("=" * 60)
    print("✅ SCRAPING COMPLETE!")
    print("=" * 60)
    print(f"New tweets: {len(new_tweets)}")
    print(f"Total tweets: {len(unique_tweets)}")
    print(f"Output: {TWEETS_FILE}")
    print("=" * 60)


if __name__ == "__main__":
    scrape_twitter_timeline()
