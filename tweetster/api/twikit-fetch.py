#!/usr/bin/env python3
"""
Tweetster Tweet Fetcher via Twikit (authenticated)

Requires Twitter login credentials. On first run, logs in and saves cookies.
Subsequent runs use saved cookies (no re-login needed).

Setup:
  1. Create /var/www/html/tweetster/api/twitter-creds.json:
     {"username": "YourHandle", "email": "your@email.com", "password": "yourpass"}
  2. Run: python3 twikit-fetch.py --login
  3. Then: python3 twikit-fetch.py --fetch 30

Usage:
  python3 twikit-fetch.py --login              # Login & save cookies
  python3 twikit-fetch.py --fetch 30           # Fetch from top 30 accounts  
  python3 twikit-fetch.py --home               # Fetch home timeline
  python3 twikit-fetch.py --search "bitcoin"   # Search tweets
"""

import asyncio
import json
import os
import sys
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, '..', 'data')
TWEETS_FILE = os.path.join(DATA_DIR, 'tweets.json')
FOLLOWING_FILE = os.path.join(DATA_DIR, 'following.json')
COOKIES_FILE = os.path.join(SCRIPT_DIR, 'twitter-cookies.json')
CREDS_FILE = os.path.join(SCRIPT_DIR, 'twitter-creds.json')
LOG_FILE = os.path.join(DATA_DIR, 'twikit-fetch-log.json')


async def do_login():
    """Login and save cookies"""
    from twikit import Client
    
    if not os.path.exists(CREDS_FILE):
        print(f"❌ Credentials file not found: {CREDS_FILE}")
        print(f"   Create it with: {{\"username\": \"X\", \"email\": \"X\", \"password\": \"X\"}}")
        return False
    
    with open(CREDS_FILE, 'r') as f:
        creds = json.load(f)
    
    client = Client('en-US')
    print(f"🔑 Logging in as @{creds['username']}...")
    
    try:
        await client.login(
            auth_info_1=creds['username'],
            auth_info_2=creds.get('email', ''),
            password=creds['password'],
            cookies_file=COOKIES_FILE,
        )
        print(f"✅ Logged in! Cookies saved to {COOKIES_FILE}")
        return True
    except Exception as e:
        print(f"❌ Login failed: {e}")
        return False


async def get_client():
    """Get authenticated client using saved cookies"""
    from twikit import Client
    
    client = Client('en-US')
    
    if os.path.exists(COOKIES_FILE):
        client.load_cookies(COOKIES_FILE)
        print("🍪 Loaded saved cookies")
        return client
    
    # Try login
    if os.path.exists(CREDS_FILE):
        with open(CREDS_FILE, 'r') as f:
            creds = json.load(f)
        try:
            await client.login(
                auth_info_1=creds['username'],
                auth_info_2=creds.get('email', ''),
                password=creds['password'],
                cookies_file=COOKIES_FILE,
            )
            print("🔑 Logged in fresh")
            return client
        except Exception as e:
            print(f"❌ Login failed: {e}")
            return None
    
    print(f"❌ No cookies or credentials found")
    print(f"   Run with --login first, or create {CREDS_FILE}")
    return None


async def fetch_home_timeline(client, count=40):
    """Fetch home timeline tweets"""
    print(f"🏠 Fetching home timeline...")
    try:
        tweets = await client.get_home_timeline(count=count)
        results = []
        for t in tweets:
            results.append(tweet_to_dict(t))
        print(f"   Got {len(results)} tweets from home timeline")
        return results
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return []


async def fetch_user_tweets(client, handles, tweets_per_user=20):
    """Fetch tweets from specific users"""
    all_tweets = []
    errors = []
    
    for i, handle in enumerate(handles):
        handle = handle.lstrip('@')
        print(f"  [{i+1}/{len(handles)}] @{handle}...", end=' ', flush=True)
        
        try:
            user = await client.get_user_by_screen_name(handle)
            if not user:
                print("⚠️ not found")
                continue
            
            tweets = await client.get_user_tweets(user.id, 'Tweets', count=tweets_per_user)
            count = 0
            for t in tweets:
                all_tweets.append(tweet_to_dict(t))
                count += 1
            print(f"✅ {count} tweets")
            
            await asyncio.sleep(1)  # Rate limit courtesy
            
        except Exception as e:
            err = str(e)
            print(f"❌ {err[:50]}")
            errors.append(f"@{handle}: {err[:80]}")
            
            if '429' in err or 'rate' in err.lower():
                print("   ⏳ Rate limited, waiting 60s...")
                await asyncio.sleep(60)
            elif '401' in err or 'auth' in err.lower():
                print("   🔑 Auth error — cookies may be expired. Re-run with --login")
                break
    
    return all_tweets, errors


async def search_tweets(client, query, count=50):
    """Search for tweets"""
    print(f"🔍 Searching: '{query}'...")
    try:
        tweets = await client.search_tweet(query, 'Latest', count=count)
        results = []
        for t in tweets:
            results.append(tweet_to_dict(t))
        print(f"   Got {len(results)} results")
        return results
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return []


def tweet_to_dict(t):
    """Convert twikit Tweet object to our dict format"""
    media = []
    for m in (t.media or []):
        url = getattr(m, 'media_url_https', '') or getattr(m, 'url', '') or ''
        mtype = getattr(m, 'type', 'photo')
        if url:
            media.append({'url': url, 'type': mtype})
    
    sort_ts = 0
    if t.created_at_datetime:
        sort_ts = int(t.created_at_datetime.timestamp())
    
    user = t.user
    return {
        'id': str(t.id),
        'text': t.text or '',
        'created_at': t.created_at or '',
        'sort_ts': sort_ts,
        'user_handle': user.screen_name if user else '',
        'user_name': user.name if user else '',
        'user_avatar': user.profile_image_url if user else '',
        'user_verified': getattr(user, 'is_blue_verified', False) if user else False,
        'retweet_count': t.retweet_count or 0,
        'favorite_count': t.favorite_count or 0,
        'reply_count': t.reply_count or 0,
        'views': str(t.view_count or 0),
        'is_retweet': (t.text or '').startswith('RT @'),
        'media': media,
        'topics': [],
        'source': 'twikit',
    }


def classify_tweet(tweet, following_map={}):
    """Classify tweet into topics"""
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
        'sports': ['nfl','nba','mlb','nhl','super bowl','touchdown','quarterback','playoffs','championship','baseball','football','basketball','hockey','soccer','world cup','olympics','athlete','coach','draft','roster','raiders','chiefs','seahawks','patriots','lakers','celtics','yankees','dodgers','ufc','mma'],
        'tech': ['ai ','artificial intelligence','machine learning','gpt','openai','claude','anthropic','programming','software','startup','silicon valley','developer','github','coding','api','saas','cloud','cybersecurity','robotics','quantum','spacex','tesla','apple ','google','microsoft','nvidia','llm'],
        'politics': ['trump','biden','congress','senate','democrat','republican','election','vote ','legislation','policy','governor','president','supreme court','political','gop','dnc','rnc','partisan','liberal','conservative','tariff','white house','doge ','maga','executive order'],
    }
    for cat, kws in cats.items():
        for kw in kws:
            if kw in text:
                topics.append(cat)
                break
    return topics or ['general']


def save_tweets(new_tweets, following_map):
    """Classify, merge, and save tweets"""
    # Classify
    for t in new_tweets:
        t['topics'] = classify_tweet(t, following_map)
    
    # Load existing
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
    for t in new_tweets:
        if t.get('id') and t['id'] not in by_id:
            new_count += 1
        if t.get('id'):
            by_id[t['id']] = t
    
    merged = sorted(by_id.values(), key=lambda x: x.get('sort_ts', 0), reverse=True)
    merged = merged[:2000]
    
    with open(TWEETS_FILE, 'w') as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)
    
    return new_count, len(merged)


async def main():
    action = None
    param = None
    for arg in sys.argv[1:]:
        if arg == '--login':
            action = 'login'
        elif arg == '--home':
            action = 'home'
        elif arg.startswith('--fetch'):
            action = 'fetch'
            parts = arg.split('=')
            param = int(parts[1]) if len(parts) > 1 else 30
        elif arg.startswith('--search'):
            action = 'search'
            parts = arg.split('=')
            param = parts[1] if len(parts) > 1 else 'bitcoin'
    
    if not action:
        print("Usage:")
        print("  python3 twikit-fetch.py --login              # First: login & save cookies")
        print("  python3 twikit-fetch.py --home               # Fetch home timeline")
        print("  python3 twikit-fetch.py --fetch=30           # Fetch from top 30 followed accounts")
        print("  python3 twikit-fetch.py --search=bitcoin     # Search for tweets")
        return
    
    print("🐦 Tweetster Twikit Fetcher")
    print()
    
    if action == 'login':
        await do_login()
        return
    
    # Load following map
    following_map = {}
    following = []
    if os.path.exists(FOLLOWING_FILE):
        with open(FOLLOWING_FILE, 'r') as f:
            following = json.load(f)
        for a in following:
            h = a.get('handle', '').lstrip('@').lower()
            if h:
                following_map[h] = a
    
    client = await get_client()
    if not client:
        return
    
    new_tweets = []
    errors = []
    
    if action == 'home':
        new_tweets = await fetch_home_timeline(client)
    
    elif action == 'fetch':
        following.sort(key=lambda x: x.get('followers', 0), reverse=True)
        handles = [a.get('handle', '').lstrip('@') for a in following[:param] if a.get('handle')]
        print(f"📋 Fetching tweets from top {len(handles)} accounts...")
        new_tweets, errors = await fetch_user_tweets(client, handles)
    
    elif action == 'search':
        new_tweets = await search_tweets(client, param)
    
    if new_tweets:
        new_count, total = save_tweets(new_tweets, following_map)
        print(f"\n{'='*50}")
        print(f"✅ {new_count} new tweets, {total} total saved")
        if errors:
            print(f"⚠️  {len(errors)} errors")
        
        # Save log
        log = {
            'completed': time.strftime('%Y-%m-%dT%H:%M:%S'),
            'method': f'twikit_{action}',
            'new_tweets': new_count,
            'total_tweets': total,
            'errors': errors[:20],
        }
        with open(LOG_FILE, 'w') as f:
            json.dump(log, f, indent=2)
    else:
        print("\n❌ No tweets fetched")


if __name__ == '__main__':
    asyncio.run(main())
