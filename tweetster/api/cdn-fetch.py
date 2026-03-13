#!/usr/bin/env python3
"""
Tweetster CDN Batch Fetcher

Uses the WORKING cdn.syndication.twimg.com endpoint to:
1. Refresh all existing tweets (get updated counts)
2. Discover new tweets from conversation threads (quoted tweets, replies)
3. Use oEmbed to discover tweets mentioned in existing content

No auth needed. Works from server despite Cloudflare blocks on x.com.
"""

import json, os, sys, time, re
import urllib.request, urllib.error, ssl
from datetime import datetime, timedelta

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, '..', 'data')
TWEETS_FILE = os.path.join(DATA_DIR, 'tweets.json')
FOLLOWING_FILE = os.path.join(DATA_DIR, 'following.json')
LOG_FILE = os.path.join(DATA_DIR, 'cdn-fetch-log.json')

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE


def fetch_tweet_cdn(tweet_id):
    """Fetch tweet from syndication CDN"""
    url = f'https://cdn.syndication.twimg.com/tweet-result?id={tweet_id}&token=!'
    headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10, context=ssl_ctx) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        if e.code == 429:
            return {'_rate_limited': True}
        return None
    except:
        return None


def fetch_oembed(tweet_url):
    """Fetch tweet via oEmbed — returns HTML with tweet text"""
    url = f'https://publish.twitter.com/oembed?url={tweet_url}&omit_script=true'
    headers = {'User-Agent': 'Mozilla/5.0'}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10, context=ssl_ctx) as resp:
            return json.loads(resp.read().decode())
    except:
        return None


def parse_cdn_tweet(data):
    """Parse CDN syndication response into our format"""
    if not data or data.get('__typename') == 'TweetTombstone':
        return None
    if '_rate_limited' in data:
        return data
    
    user = data.get('user', {})
    media = []
    for m in data.get('mediaDetails', []):
        url = m.get('media_url_https', '')
        if url:
            media.append({'url': url, 'type': m.get('type', 'photo')})
    for p in data.get('photos', []):
        url = p.get('url', '')
        if url:
            media.append({'url': url, 'type': 'photo'})
    
    created_at = data.get('created_at', '')
    sort_ts = 0
    if created_at:
        try:
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
        'source': 'cdn-syndication',
    }


def extract_tweet_ids_from_data(data):
    """Extract referenced tweet IDs from a CDN tweet response (quoted tweets, etc.)"""
    ids = set()
    
    # Quoted tweet
    qt = data.get('quoted_tweet')
    if qt and isinstance(qt, dict):
        qtid = qt.get('id_str', '')
        if qtid:
            ids.add(qtid)
    
    # In-reply-to
    reply_id = data.get('in_reply_to_status_id_str', '')
    if reply_id:
        ids.add(reply_id)
    
    # URLs that contain tweet IDs
    for entity in data.get('entities', {}).get('urls', []):
        expanded = entity.get('expanded_url', '')
        match = re.search(r'/status/(\d{10,25})', expanded)
        if match:
            ids.add(match.group(1))
    
    # Also in text
    text = data.get('text', '')
    for match in re.finditer(r'twitter\.com/\w+/status/(\d{10,25})', text):
        ids.add(match.group(1))
    for match in re.finditer(r'x\.com/\w+/status/(\d{10,25})', text):
        ids.add(match.group(1))
    
    return ids


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


def main():
    print("📡 Tweetster CDN Batch Fetcher")
    print("   Using cdn.syndication.twimg.com (no auth needed)")
    print()
    
    # Load existing
    existing = []
    if os.path.exists(TWEETS_FILE):
        with open(TWEETS_FILE, 'r') as f:
            existing = json.load(f)
    
    following_map = {}
    if os.path.exists(FOLLOWING_FILE):
        with open(FOLLOWING_FILE, 'r') as f:
            for a in json.load(f):
                h = a.get('handle', '').lstrip('@').lower()
                if h:
                    following_map[h] = a
    
    existing_ids = {t.get('id') for t in existing if t.get('id')}
    
    # Collect all tweet IDs to fetch
    all_ids = set()
    
    # Add existing IDs (to refresh them)
    for t in existing:
        tid = t.get('id')
        if tid:
            all_ids.add(tid)
    
    print(f"📋 Starting with {len(all_ids)} known tweet IDs")
    
    # Phase 1: Fetch all known tweets and discover linked tweets
    print(f"\n📥 Phase 1: Fetching {len(all_ids)} known tweets + discovering links...")
    fetched = {}
    discovered_ids = set()
    rate_limits = 0
    errors = 0
    
    for i, tid in enumerate(sorted(all_ids, reverse=True)):
        if i % 25 == 0 and i > 0:
            print(f"   Progress: {i}/{len(all_ids)} ({len(fetched)} ok, {len(discovered_ids)} discovered, {errors} errors)")
        
        raw = fetch_tweet_cdn(tid)
        
        if raw and '_rate_limited' in raw:
            rate_limits += 1
            print(f"   ⏳ Rate limited at {i}, waiting 60s...")
            time.sleep(60)
            raw = fetch_tweet_cdn(tid)  # Retry
            if not raw or '_rate_limited' in raw:
                continue
        
        if not raw:
            errors += 1
            continue
        
        parsed = parse_cdn_tweet(raw)
        if parsed and parsed.get('id'):
            fetched[parsed['id']] = parsed
            
            # Discover linked tweets
            new_ids = extract_tweet_ids_from_data(raw)
            for nid in new_ids:
                if nid not in existing_ids and nid not in all_ids:
                    discovered_ids.add(nid)
        
        time.sleep(0.1)
    
    print(f"\n   ✅ Fetched {len(fetched)} tweets, discovered {len(discovered_ids)} linked tweets")
    
    # Phase 2: Fetch discovered tweets
    if discovered_ids:
        print(f"\n📥 Phase 2: Fetching {len(discovered_ids)} newly discovered tweets...")
        for i, tid in enumerate(sorted(discovered_ids, reverse=True)):
            raw = fetch_tweet_cdn(tid)
            
            if raw and '_rate_limited' in raw:
                print(f"   ⏳ Rate limited, waiting 60s...")
                time.sleep(60)
                raw = fetch_tweet_cdn(tid)
                if not raw or '_rate_limited' in raw:
                    continue
            
            if raw:
                parsed = parse_cdn_tweet(raw)
                if parsed and parsed.get('id'):
                    fetched[parsed['id']] = parsed
            
            time.sleep(0.1)
        
        print(f"   ✅ Now have {len(fetched)} total tweets")
    
    # Phase 3: Classify and save
    print(f"\n🏷️  Phase 3: Classifying and saving...")
    
    # Merge with existing (keep old tweets not in fetched)
    by_id = {}
    for t in existing:
        if t.get('id'):
            by_id[t['id']] = t
    
    new_count = 0
    updated_count = 0
    for tid, tweet in fetched.items():
        tweet['topics'] = classify_tweet(tweet, following_map)
        if tid not in by_id:
            new_count += 1
        else:
            updated_count += 1
        by_id[tid] = tweet
    
    merged = sorted(by_id.values(), key=lambda x: x.get('sort_ts', 0), reverse=True)
    merged = merged[:2000]
    
    with open(TWEETS_FILE, 'w') as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)
    
    log = {
        'completed': time.strftime('%Y-%m-%dT%H:%M:%S'),
        'method': 'cdn-syndication',
        'known_ids': len(all_ids),
        'discovered_ids': len(discovered_ids),
        'fetched': len(fetched),
        'new_tweets': new_count,
        'updated_tweets': updated_count,
        'total_tweets': len(merged),
        'rate_limits': rate_limits,
        'errors': errors,
    }
    with open(LOG_FILE, 'w') as f:
        json.dump(log, f, indent=2)
    
    print(f"\n{'='*50}")
    print(f"✅ Done!")
    print(f"   📊 {new_count} new + {updated_count} updated = {len(merged)} total tweets")
    print(f"   🔗 Discovered {len(discovered_ids)} linked tweets from conversations")
    if rate_limits:
        print(f"   ⏳ Hit {rate_limits} rate limits")


if __name__ == '__main__':
    main()
