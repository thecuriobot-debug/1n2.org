#!/usr/bin/env python3
"""
Tweetster Syndication ID Scanner

Since the syndication CDN (cdn.syndication.twimg.com) works without auth,
but needs tweet IDs, this script discovers new tweet IDs by:

1. Taking the latest known tweet ID for each user
2. Trying sequential IDs after it (Twitter Snowflake IDs are roughly sequential)
3. Also tries IDs in the "current time range" based on Snowflake epoch

The syndication endpoint returns full tweet JSON for valid IDs and 404 for invalid ones.
This is slow but requires NO authentication at all.

Usage:
  python3 scan-fetch.py                    # Scan for new tweets from known users
  python3 scan-fetch.py --aggressive       # Try more IDs per user
  python3 scan-fetch.py --id=1234567890    # Test a specific tweet ID
"""

import json, os, sys, time, math, re
import urllib.request, urllib.error, ssl

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, '..', 'data')
TWEETS_FILE = os.path.join(DATA_DIR, 'tweets.json')
FOLLOWING_FILE = os.path.join(DATA_DIR, 'following.json')
LOG_FILE = os.path.join(DATA_DIR, 'scan-fetch-log.json')

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

# Twitter Snowflake epoch: Nov 4, 2010, in milliseconds
TWITTER_EPOCH = 1288834974657

def snowflake_to_time(snowflake_id):
    """Convert a Snowflake ID to Unix timestamp"""
    ms = (int(snowflake_id) >> 22) + TWITTER_EPOCH
    return ms / 1000

def time_to_snowflake(unix_ts):
    """Convert Unix timestamp to approximate Snowflake ID"""
    ms = int(unix_ts * 1000) - TWITTER_EPOCH
    return ms << 22


def fetch_tweet(tweet_id):
    """Fetch a single tweet from syndication CDN. FREE, no auth."""
    url = f'https://cdn.syndication.twimg.com/tweet-result?id={tweet_id}&token=!'
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10, context=ssl_ctx) as resp:
            data = json.loads(resp.read().decode())
            return parse_tweet(data)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None  # Not found, expected
        if e.code == 429:
            return {'_rate_limited': True}
        return None
    except:
        return None


def parse_tweet(data):
    if not data or data.get('__typename') == 'TweetTombstone':
        return None
    
    user = data.get('user', {})
    media = []
    for m in data.get('mediaDetails', []) + data.get('photos', []):
        url = m.get('media_url_https', m.get('url', ''))
        if url:
            media.append({'url': url, 'type': m.get('type', 'photo')})
    
    created_at = data.get('created_at', '')
    sort_ts = 0
    if created_at:
        try:
            from datetime import datetime
            dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            sort_ts = int(dt.timestamp())
        except:
            pass
    
    return {
        'id': data.get('id_str', ''),
        'text': data.get('text', ''),
        'created_at': created_at,
        'sort_ts': sort_ts,
        'user_handle': user.get('screen_name', ''),
        'user_name': user.get('name', ''),
        'user_avatar': user.get('profile_image_url_https', ''),
        'user_verified': user.get('is_blue_verified', False),
        'retweet_count': data.get('retweet_count', 0) or 0,
        'favorite_count': data.get('favorite_count', 0) or 0,
        'reply_count': data.get('reply_count', 0) or 0,
        'views': str(data.get('views', {}).get('count', '0') if isinstance(data.get('views'), dict) else '0'),
        'is_retweet': (data.get('text', '') or '').startswith('RT @'),
        'media': media,
        'topics': [],
        'source': 'syndication-scan',
    }


def classify_tweet(tweet, following_map={}):
    text = ' '.join([
        (tweet.get('text') or '').lower(),
        (tweet.get('user_name') or '').lower(),
        (tweet.get('user_handle') or '').lower(),
    ])
    handle = (tweet.get('user_handle') or '').lower()
    if handle in following_map:
        text += ' ' + (following_map[handle].get('description') or '').lower()
    topics = []
    cats = {
        'bitcoin': ['bitcoin','btc','satoshi','lightning network','crypto','blockchain','hodl','sats','#bitcoin','nostr','web3','defi','eth','ethereum','mining','halving','wallet','stablecoin','mempool','₿'],
        'sports': ['nfl','nba','mlb','nhl','super bowl','touchdown','quarterback','playoffs','championship','baseball','football','basketball','hockey','soccer','world cup','olympics','ufc','mma','raiders','chiefs','seahawks','patriots','lakers'],
        'tech': ['ai ','artificial intelligence','machine learning','gpt','openai','claude','anthropic','programming','software','startup','developer','github','coding','api','cloud','robotics','quantum','spacex','tesla','apple ','google','microsoft','nvidia','llm'],
        'politics': ['trump','biden','congress','senate','democrat','republican','election','vote ','legislation','policy','governor','president','supreme court','political','gop','tariff','white house','doge ','maga','executive order'],
    }
    for cat, kws in cats.items():
        for kw in kws:
            if kw in text:
                topics.append(cat)
                break
    return topics or ['general']


def scan_random_recent(count=200):
    """
    Scan random recent tweet IDs in the current time range.
    Twitter generates billions of IDs per day, so most will 404.
    But some will hit real tweets from popular accounts.
    """
    import random
    
    now = time.time()
    # Look at tweets from last 24 hours
    start_id = time_to_snowflake(now - 86400)
    end_id = time_to_snowflake(now)
    
    print(f"🎲 Scanning {count} random IDs in last 24h range...")
    print(f"   Range: {start_id} - {end_id}")
    
    found = []
    checked = 0
    rate_limited = 0
    
    for i in range(count):
        # Generate random ID in range
        random_id = random.randint(start_id, end_id)
        
        tweet = fetch_tweet(random_id)
        checked += 1
        
        if tweet and '_rate_limited' in tweet:
            rate_limited += 1
            print(f"   ⏳ Rate limited after {checked} checks, waiting 30s...")
            time.sleep(30)
            continue
        
        if tweet:
            found.append(tweet)
            handle = tweet.get('user_handle', '?')
            text_preview = tweet.get('text', '')[:60]
            print(f"   🎯 [{checked}] @{handle}: {text_preview}")
        
        if checked % 50 == 0:
            print(f"   ... {checked}/{count} checked, {len(found)} found")
        
        time.sleep(0.1)
    
    print(f"   Checked {checked}, found {len(found)} tweets, {rate_limited} rate limits")
    return found


def scan_conversation_threads(known_tweet_ids):
    """
    For each known recent tweet, fetch it and look for conversation_id 
    and in_reply_to IDs to discover more tweets.
    """
    # We already have the tweets, look for reply chains
    pass


def scan_near_known_ids(tweets_by_handle, per_user=50, step=1):
    """
    For each user, take their latest known tweet ID and scan nearby IDs.
    Twitter IDs are roughly sequential, but not per-user — there are gaps.
    We scan in a range after the latest known ID.
    """
    all_found = []
    
    for handle, latest_id in list(tweets_by_handle.items())[:30]:
        print(f"\n  @{handle} (latest: {latest_id})...")
        found_for_user = 0
        checked = 0
        
        # Scan forward from latest known ID
        # IDs aren't sequential per user — there could be millions between posts
        # So we use time-based estimation: check IDs every ~5 min worth of snowflake increment
        five_min_increment = (5 * 60 * 1000) << 22  # 5 minutes in snowflake units
        
        for offset in range(1, per_user + 1):
            check_id = latest_id + (offset * five_min_increment)
            
            # Don't go past "now"
            now_id = time_to_snowflake(time.time())
            if check_id > now_id:
                break
            
            tweet = fetch_tweet(check_id)
            checked += 1
            
            if tweet and '_rate_limited' in tweet:
                print(f"   ⏳ Rate limited, waiting 30s...")
                time.sleep(30)
                continue
            
            if tweet:
                # Found a tweet! Might not be from this user though
                found_handle = tweet.get('user_handle', '')
                all_found.append(tweet)
                found_for_user += 1
                text_preview = tweet.get('text', '')[:50]
                print(f"   🎯 @{found_handle}: {text_preview}")
            
            time.sleep(0.1)
        
        print(f"   Checked {checked}, found {found_for_user}")
    
    return all_found


def main():
    is_test_id = None
    aggressive = '--aggressive' in sys.argv
    
    for arg in sys.argv:
        if arg.startswith('--id='):
            is_test_id = arg.split('=')[1]
    
    print("🔍 Tweetster Syndication ID Scanner")
    print("   No auth needed — uses cdn.syndication.twimg.com")
    print()
    
    if is_test_id:
        print(f"Testing tweet ID {is_test_id}...")
        result = fetch_tweet(is_test_id)
        if result:
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print("Not found (404)")
        return
    
    # Load existing tweets to find latest IDs per user
    existing = []
    if os.path.exists(TWEETS_FILE):
        with open(TWEETS_FILE, 'r') as f:
            existing = json.load(f)
    
    # Load following map
    following_map = {}
    if os.path.exists(FOLLOWING_FILE):
        with open(FOLLOWING_FILE, 'r') as f:
            for a in json.load(f):
                h = a.get('handle', '').lstrip('@').lower()
                if h:
                    following_map[h] = a
    
    # Build handle -> latest ID map
    tweets_by_handle = {}
    for t in existing:
        h = (t.get('user_handle') or '').lower()
        tid = int(t.get('id', 0))
        if h and tid > tweets_by_handle.get(h, 0):
            tweets_by_handle[h] = tid
    
    print(f"📊 Have {len(existing)} existing tweets from {len(tweets_by_handle)} users")
    
    all_new = []
    
    # Strategy 1: Scan random recent IDs (finds popular tweets)
    random_count = 300 if aggressive else 100
    random_found = scan_random_recent(random_count)
    all_new.extend(random_found)
    
    if all_new:
        # Classify and save
        for t in all_new:
            t['topics'] = classify_tweet(t, following_map)
        
        by_id = {}
        for t in existing:
            if t.get('id'):
                by_id[t['id']] = t
        
        new_count = 0
        for t in all_new:
            if t.get('id') and t['id'] not in by_id:
                new_count += 1
            if t.get('id'):
                by_id[t['id']] = t
        
        merged = sorted(by_id.values(), key=lambda x: x.get('sort_ts', 0), reverse=True)
        merged = merged[:2000]
        
        with open(TWEETS_FILE, 'w') as f:
            json.dump(merged, f, indent=2, ensure_ascii=False)
        
        log = {
            'completed': time.strftime('%Y-%m-%dT%H:%M:%S'),
            'method': 'syndication-scan',
            'ids_checked': random_count,
            'new_tweets': new_count,
            'total_tweets': len(merged),
        }
        with open(LOG_FILE, 'w') as f:
            json.dump(log, f, indent=2)
        
        print(f"\n{'='*50}")
        print(f"✅ Found {new_count} new tweets, {len(merged)} total")
    else:
        print(f"\n❌ No new tweets found via scanning")
        print(f"   Random scanning has very low hit rate.")
        print(f"   Better option: run local-fetch.py from your Mac")


if __name__ == '__main__':
    main()
