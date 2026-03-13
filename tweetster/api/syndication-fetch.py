#!/usr/bin/env python3
"""
Tweetster Syndication Fetcher
Fetches individual tweets from the FREE cdn.syndication.twimg.com endpoint.
No API key, no auth, no login required.

Strategy:
  1. Use known tweet IDs (from previous fetches, or discovered via search)
  2. Use Twitter's embed/syndication API to get full tweet JSON
  3. Discover NEW tweet IDs by scraping user profile pages via the syndication timeline endpoint

Usage:
  python3 syndication-fetch.py               # Fetch using existing IDs + discover new ones
  python3 syndication-fetch.py --discover 30  # Discover tweets from top 30 accounts
  python3 syndication-fetch.py --test         # Test with a known tweet
"""

import asyncio
import json
import os
import sys
import time
import re
import urllib.request
import urllib.error
import ssl

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, '..', 'data')
TWEETS_FILE = os.path.join(DATA_DIR, 'tweets.json')
FOLLOWING_FILE = os.path.join(DATA_DIR, 'following.json')
IDS_FILE = os.path.join(DATA_DIR, 'known-tweet-ids.json')
LOG_FILE = os.path.join(DATA_DIR, 'syndication-fetch-log.json')

# Disable SSL verification for some endpoints
ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE


def get_token(tweet_id):
    """Generate token for syndication API (same algo as react-tweet)"""
    import math
    val = (int(tweet_id) / 1e15) * math.pi
    # Convert to base 36
    token = ''
    val_str = f'{val:.20f}'
    # Simple approach: use hash
    result = str(val).replace('0', '').replace('.', '')
    return result[:12] if result else '0'


def fetch_tweet_by_id(tweet_id):
    """Fetch a single tweet from the syndication API. FREE, no auth needed."""
    url = f'https://cdn.syndication.twimg.com/tweet-result?id={tweet_id}&token=!'
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10, context=ssl_ctx) as resp:
            data = json.loads(resp.read().decode())
            return parse_syndication_tweet(data)
    except urllib.error.HTTPError as e:
        return {'error': f'HTTP {e.code}'}
    except Exception as e:
        return {'error': str(e)}


def parse_syndication_tweet(data):
    """Parse syndication API JSON into our tweet format"""
    if not data or '__typename' not in data:
        return {'error': 'Invalid tweet data'}
    
    if data.get('__typename') == 'TweetTombstone':
        return {'error': 'Tweet tombstoned/deleted'}
    
    user = data.get('user', {})
    
    # Extract media
    media = []
    for m in data.get('mediaDetails', []):
        media.append({
            'url': m.get('media_url_https', ''),
            'type': m.get('type', 'photo'),
        })
    # Also check for photos in the data
    for p in data.get('photos', []):
        media.append({
            'url': p.get('url', ''),
            'type': 'photo',
        })
    
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
        'views': str(data.get('views', {}).get('count', '0') if isinstance(data.get('views'), dict) else data.get('views', '0')),
        'is_retweet': (data.get('text', '') or '').startswith('RT @'),
        'media': media,
        'topics': [],
        'source': 'syndication',
    }


def discover_tweet_ids_from_search(handle, count=20):
    """
    Try to discover tweet IDs by searching Google for recent tweets from a user.
    Returns a list of tweet IDs.
    """
    ids = []
    
    # Strategy 1: Try the Twitter timeline syndication endpoint
    url = f'https://syndication.twitter.com/srv/timeline-profile/screen-name/{handle}'
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10, context=ssl_ctx) as resp:
            html = resp.read().decode()
            # Extract tweet IDs from the HTML
            found = re.findall(r'data-tweet-id="(\d+)"', html)
            if not found:
                found = re.findall(r'/status/(\d{15,25})', html)
            ids.extend(found[:count])
    except Exception as e:
        pass  # Silently fail, try next strategy
    
    # Strategy 2: Try to estimate recent tweet IDs from known patterns
    # Twitter IDs are roughly time-ordered (Snowflake IDs)
    # We can try sequential IDs near the latest known ID for this user
    
    return list(set(ids))[:count]


def discover_via_syndication_timeline(handles, max_per_handle=10):
    """
    Try the syndication timeline endpoint for multiple handles.
    This endpoint returns HTML with embedded tweet data.
    """
    all_ids = {}
    for handle in handles:
        url = f'https://syndication.twitter.com/srv/timeline-profile/screen-name/{handle}'
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html',
        }
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=10, context=ssl_ctx) as resp:
                html = resp.read().decode()
                found = re.findall(r'/status/(\d{15,25})', html)
                if not found:
                    found = re.findall(r'"id_str":"(\d{15,25})"', html)
                if found:
                    all_ids[handle] = list(set(found))[:max_per_handle]
                    print(f"  ✅ @{handle}: found {len(all_ids[handle])} tweet IDs")
                else:
                    print(f"  ⚠️ @{handle}: no tweet IDs found")
        except urllib.error.HTTPError as e:
            if e.code == 429:
                print(f"  ⏳ Rate limited, waiting 30s...")
                time.sleep(30)
            else:
                print(f"  ❌ @{handle}: HTTP {e.code}")
        except Exception as e:
            print(f"  ❌ @{handle}: {str(e)[:50]}")
        
        time.sleep(0.3)  # Rate limit courtesy
    
    return all_ids


def classify_tweet(tweet, following_map={}):
    """Classify tweet into topic categories"""
    text = ' '.join([
        (tweet.get('text') or '').lower(),
        (tweet.get('user_name') or '').lower(),
        (tweet.get('user_handle') or '').lower(),
    ])
    handle = (tweet.get('user_handle') or '').lower()
    if handle in following_map:
        text += ' ' + (following_map[handle].get('description') or '').lower()
    
    topics = []
    categories = {
        'bitcoin': ['bitcoin','btc','satoshi','lightning network','crypto','blockchain','hodl','sats','#bitcoin','nostr','web3','defi','eth','ethereum','mining','halving','wallet','stablecoin','mempool','₿'],
        'sports': ['nfl','nba','mlb','nhl','super bowl','touchdown','quarterback','playoffs','championship','baseball','football','basketball','hockey','soccer','world cup','olympics','athlete','coach','draft','roster','raiders','chiefs','seahawks','patriots','lakers','celtics','yankees','dodgers','ufc','mma'],
        'tech': ['ai ','artificial intelligence','machine learning','gpt','openai','claude','anthropic','programming','software','startup','silicon valley','developer','github','coding','api','saas','cloud','cybersecurity','robotics','quantum','spacex','tesla','apple ','google','microsoft','nvidia','llm'],
        'politics': ['trump','biden','congress','senate','democrat','republican','election','vote ','legislation','policy','governor','president','supreme court','political','gop','dnc','rnc','partisan','liberal','conservative','tariff','white house','doge ','maga','executive order'],
    }
    
    for cat, keywords in categories.items():
        for kw in keywords:
            if kw in text:
                topics.append(cat)
                break
    
    return topics or ['general']


def main():
    is_test = '--test' in sys.argv
    discover_count = 30
    for arg in sys.argv:
        if arg.startswith('--discover'):
            parts = arg.split('=')
            if len(parts) > 1:
                discover_count = int(parts[1])
    
    print("🐦 Tweetster Syndication Fetcher")
    print("   Using FREE cdn.syndication.twimg.com endpoint")
    print()
    
    # Test mode
    if is_test:
        print("Testing syndication API...")
        result = fetch_tweet_by_id('20')  # Jack's first tweet
        if 'error' not in result:
            print(f"✅ Works! Got tweet: '{result['text']}' by @{result['user_handle']}")
        else:
            print(f"❌ Failed: {result['error']}")
        return
    
    # Load following list
    with open(FOLLOWING_FILE, 'r') as f:
        following = json.load(f)
    
    following.sort(key=lambda x: x.get('followers', 0), reverse=True)
    top_accounts = following[:discover_count]
    
    following_map = {}
    for acct in following:
        handle = acct.get('handle', '').lstrip('@').lower()
        if handle:
            following_map[handle] = acct
    
    # Step 1: Discover tweet IDs via syndication timeline
    print(f"📡 Step 1: Discovering tweet IDs from top {discover_count} accounts...")
    handles = [a.get('handle', '').lstrip('@') for a in top_accounts if a.get('handle')]
    discovered = discover_via_syndication_timeline(handles)
    
    # Flatten all discovered IDs
    all_ids = []
    for handle, ids in discovered.items():
        for tid in ids:
            all_ids.append((tid, handle))
    
    # Also load previously known IDs
    known_ids = {}
    if os.path.exists(IDS_FILE):
        try:
            with open(IDS_FILE, 'r') as f:
                known_ids = json.load(f)
        except:
            pass
    
    # Merge discovered into known
    for handle, ids in discovered.items():
        if handle not in known_ids:
            known_ids[handle] = []
        known_ids[handle] = list(set(known_ids[handle] + ids))
    
    # Save known IDs
    with open(IDS_FILE, 'w') as f:
        json.dump(known_ids, f, indent=2)
    
    print(f"\n   Found {len(all_ids)} tweet IDs from {len(discovered)} accounts")
    
    if not all_ids:
        print("❌ No tweet IDs discovered. Syndication timeline may be blocked.")
        print("   Alternative: Provide Twitter cookies for authenticated fetching.")
        return
    
    # Step 2: Fetch full tweet data from syndication API
    print(f"\n📥 Step 2: Fetching {len(all_ids)} tweets from syndication API...")
    all_tweets = []
    errors = 0
    
    for i, (tweet_id, handle) in enumerate(all_ids):
        if i % 20 == 0 and i > 0:
            print(f"   Progress: {i}/{len(all_ids)} ({len(all_tweets)} fetched, {errors} errors)")
        
        result = fetch_tweet_by_id(tweet_id)
        
        if 'error' in result:
            errors += 1
            if 'HTTP 429' in result.get('error', ''):
                print(f"   ⏳ Rate limited at tweet {i}, waiting 60s...")
                time.sleep(60)
                # Retry
                result = fetch_tweet_by_id(tweet_id)
                if 'error' in result:
                    errors += 1
                    continue
            else:
                continue
        
        all_tweets.append(result)
        time.sleep(0.15)  # Be polite
    
    print(f"\n   Fetched {len(all_tweets)} tweets ({errors} errors)")
    
    if not all_tweets:
        print("❌ No tweets fetched!")
        return
    
    # Step 3: Classify topics
    print("\n🏷️  Step 3: Classifying topics...")
    for tweet in all_tweets:
        tweet['topics'] = classify_tweet(tweet, following_map)
    
    # Step 4: Merge with existing
    print("💾 Step 4: Merging and saving...")
    existing = []
    if os.path.exists(TWEETS_FILE):
        try:
            with open(TWEETS_FILE, 'r') as f:
                existing = json.load(f)
        except:
            pass
    
    by_id = {}
    for t in existing:
        if t.get('id'):
            by_id[t['id']] = t
    
    new_count = 0
    for tweet in all_tweets:
        if tweet.get('id') and tweet['id'] not in by_id:
            new_count += 1
        if tweet.get('id'):
            by_id[tweet['id']] = tweet
    
    merged = sorted(by_id.values(), key=lambda t: t.get('sort_ts', 0), reverse=True)
    merged = merged[:2000]
    
    with open(TWEETS_FILE, 'w') as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)
    
    # Log
    log = {
        'completed': time.strftime('%Y-%m-%dT%H:%M:%S'),
        'method': 'syndication',
        'accounts_discovered': len(discovered),
        'tweet_ids_found': len(all_ids),
        'tweets_fetched': len(all_tweets),
        'new_tweets': new_count,
        'total_tweets': len(merged),
        'errors': errors,
    }
    with open(LOG_FILE, 'w') as f:
        json.dump(log, f, indent=2)
    
    print(f"\n{'='*50}")
    print(f"✅ Done!")
    print(f"   📊 {new_count} new tweets, {len(merged)} total")
    print(f"   🔍 Discovered from {len(discovered)} accounts")
    print(f"   💾 Saved to {TWEETS_FILE}")


if __name__ == '__main__':
    main()
