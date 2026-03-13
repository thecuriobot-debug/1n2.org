#!/usr/bin/env python3
"""
Tweetster LOCAL Fetcher — runs on YOUR Mac, pushes tweets to your server.

The DigitalOcean server IP is blocked by Cloudflare/Twitter, so we fetch 
tweets locally and upload results to the server via SCP.

Setup (one-time):
  pip3 install twikit

Usage:
  python3 local-fetch.py --login                # First: login to Twitter
  python3 local-fetch.py --home                 # Fetch home timeline
  python3 local-fetch.py --fetch=30             # Fetch from top 30 followed accounts
  python3 local-fetch.py --search="bitcoin"     # Search tweets
  python3 local-fetch.py --auto                 # Auto: home + top 30 + search bitcoin

After fetching, tweets are automatically uploaded to the server via SCP.
"""

import asyncio
import json
import os
import sys
import time
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, '..', 'data')
TWEETS_FILE = os.path.join(DATA_DIR, 'tweets.json')
FOLLOWING_FILE = os.path.join(DATA_DIR, 'following.json')
COOKIES_FILE = os.path.join(SCRIPT_DIR, 'twitter-cookies.json')
LOG_FILE = os.path.join(DATA_DIR, 'fetch-log.json')

# Server config — change if needed
SERVER = 'root@157.245.186.58'
REMOTE_TWEETS = '/var/www/html/tweetster/data/tweets.json'
REMOTE_LOG = '/var/www/html/tweetster/data/fetch-log.json'


async def do_login():
    from twikit import Client
    client = Client('en-US')
    
    username = input("Twitter username (without @): ").strip()
    email = input("Email on your Twitter account: ").strip()
    password = input("Twitter password: ").strip()
    
    print(f"\n🔑 Logging in as @{username}...")
    try:
        await client.login(
            auth_info_1=username,
            auth_info_2=email,
            password=password,
        )
        client.save_cookies(COOKIES_FILE)
        print(f"✅ Logged in! Cookies saved to {COOKIES_FILE}")
        return True
    except Exception as e:
        print(f"❌ Login failed: {e}")
        return False


async def get_client():
    from twikit import Client
    client = Client('en-US')
    
    if os.path.exists(COOKIES_FILE):
        client.load_cookies(COOKIES_FILE)
        print("🍪 Loaded saved cookies")
        return client
    
    print("❌ No cookies found. Run with --login first.")
    return None


def tweet_to_dict(t):
    """Convert twikit Tweet to our dict format"""
    media = []
    if t.media:
        for m in t.media:
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
        'source': 'twikit-local',
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


async def fetch_home(client, count=50):
    print(f"🏠 Fetching home timeline...")
    try:
        tweets = await client.get_home_timeline(count=count)
        results = [tweet_to_dict(t) for t in tweets]
        print(f"   Got {len(results)} tweets")
        return results
    except Exception as e:
        print(f"   ❌ {e}")
        return []


async def fetch_user_tweets(client, handles, per_user=15):
    all_tweets = []
    for i, handle in enumerate(handles):
        handle = handle.lstrip('@')
        print(f"  [{i+1}/{len(handles)}] @{handle}...", end=' ', flush=True)
        try:
            user = await client.get_user_by_screen_name(handle)
            if not user:
                print("⚠️ not found")
                continue
            tweets = await client.get_user_tweets(user.id, 'Tweets', count=per_user)
            count = 0
            for t in tweets:
                all_tweets.append(tweet_to_dict(t))
                count += 1
            print(f"✅ {count}")
            await asyncio.sleep(1.5)  # Rate limit courtesy
        except Exception as e:
            err = str(e)
            print(f"❌ {err[:60]}")
            if '429' in err:
                print("   ⏳ Rate limited, waiting 60s...")
                await asyncio.sleep(60)
            elif '401' in err:
                print("   🔑 Auth expired. Re-run with --login")
                break
    return all_tweets


async def search_tweets(client, query, count=50):
    print(f"🔍 Searching: '{query}'...")
    try:
        tweets = await client.search_tweet(query, 'Latest', count=count)
        results = [tweet_to_dict(t) for t in tweets]
        print(f"   Got {len(results)} results")
        return results
    except Exception as e:
        print(f"   ❌ {e}")
        return []


def save_and_upload(new_tweets, following_map):
    """Classify, merge, save locally, and upload to server"""
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
    
    # Save locally
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(TWEETS_FILE, 'w') as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)
    
    # Save log
    log = {
        'completed': time.strftime('%Y-%m-%dT%H:%M:%S'),
        'method': 'twikit-local',
        'new_tweets': new_count,
        'total_tweets': len(merged),
    }
    with open(LOG_FILE, 'w') as f:
        json.dump(log, f, indent=2)
    
    print(f"\n💾 Saved locally: {new_count} new, {len(merged)} total")
    
    # Upload to server
    print(f"📤 Uploading to server...")
    try:
        r1 = subprocess.run(['scp', TWEETS_FILE, f'{SERVER}:{REMOTE_TWEETS}'], 
                          capture_output=True, text=True, timeout=30)
        r2 = subprocess.run(['scp', LOG_FILE, f'{SERVER}:{REMOTE_LOG}'],
                          capture_output=True, text=True, timeout=30)
        if r1.returncode == 0:
            print(f"   ✅ Uploaded {len(merged)} tweets to server")
        else:
            print(f"   ❌ SCP failed: {r1.stderr}")
    except Exception as e:
        print(f"   ❌ Upload error: {e}")
        print(f"   Manual upload: scp {TWEETS_FILE} {SERVER}:{REMOTE_TWEETS}")
    
    return new_count, len(merged)


async def main():
    action = None
    param = None
    for arg in sys.argv[1:]:
        if arg == '--login': action = 'login'
        elif arg == '--home': action = 'home'
        elif arg == '--auto': action = 'auto'
        elif arg.startswith('--fetch'):
            action = 'fetch'
            p = arg.split('=')
            param = int(p[1]) if len(p) > 1 else 30
        elif arg.startswith('--search'):
            action = 'search'
            p = arg.split('=', 1)
            param = p[1] if len(p) > 1 else 'bitcoin'
    
    if not action:
        print(__doc__)
        return
    
    print("🐦 Tweetster LOCAL Fetcher")
    print("   Runs on your Mac → uploads to server")
    print()
    
    if action == 'login':
        await do_login()
        return
    
    # Load following
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
    
    all_tweets = []
    
    if action == 'home':
        all_tweets = await fetch_home(client)
    
    elif action == 'fetch':
        following.sort(key=lambda x: x.get('followers', 0), reverse=True)
        handles = [a.get('handle', '').lstrip('@') for a in following[:param] if a.get('handle')]
        print(f"📋 Fetching from top {len(handles)} accounts...")
        all_tweets = await fetch_user_tweets(client, handles)
    
    elif action == 'search':
        all_tweets = await search_tweets(client, param)
    
    elif action == 'auto':
        # Do everything: home + top accounts + search
        print("🤖 Auto mode: fetching everything...\n")
        
        # Home timeline
        home = await fetch_home(client)
        all_tweets.extend(home)
        
        # Top 20 accounts
        if following:
            following.sort(key=lambda x: x.get('followers', 0), reverse=True)
            handles = [a.get('handle', '').lstrip('@') for a in following[:20] if a.get('handle')]
            print(f"\n📋 Fetching from top {len(handles)} accounts...")
            user_tweets = await fetch_user_tweets(client, handles)
            all_tweets.extend(user_tweets)
        
        # Search bitcoin
        print()
        btc = await search_tweets(client, 'bitcoin', 30)
        all_tweets.extend(btc)
    
    if all_tweets:
        save_and_upload(all_tweets, following_map)
        print(f"\n{'='*50}")
        print(f"✅ Done! Visit https://1n2.org/tweetster/ to see your feed.")
    else:
        print("\n❌ No tweets fetched. Try --login to refresh auth.")


if __name__ == '__main__':
    asyncio.run(main())
