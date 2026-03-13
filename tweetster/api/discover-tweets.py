#!/usr/bin/env python3
"""
Tweetster Timeline Discovery - probes for new tweets from known users
by scanning Snowflake IDs near the current time and checking if they
belong to any followed accounts.

Also uses fxtwitter API to get tweet details including author info.
"""
import json, urllib.request, time, datetime, random, sys, os

TWEETS_FILE = '/var/www/html/tweetster/data/tweets.json'
FOLLOWING_FILE = '/var/www/html/tweetster/data/following.json'

def snowflake_to_ms(sf):
    return (sf >> 22) + 1288834974657

def ms_to_snowflake(ms):
    return (ms - 1288834974657) << 22

def fetch_cdn(tweet_id):
    """Fetch tweet from CDN syndication endpoint"""
    url = f'https://cdn.syndication.twimg.com/tweet-result?id={tweet_id}&token=x'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        resp = urllib.request.urlopen(req, timeout=5)
        return json.loads(resp.read())
    except:
        return None

def fetch_fxtwitter(tweet_id):
    """Fetch tweet from fxtwitter API - returns author handle"""
    url = f'https://api.fxtwitter.com/x/status/{tweet_id}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        resp = urllib.request.urlopen(req, timeout=5)
        data = json.loads(resp.read())
        tweet = data.get('tweet', {})
        author = tweet.get('author', {})
        return {
            'handle': author.get('screen_name', '').lower(),
            'name': author.get('name', ''),
            'text': tweet.get('text', ''),
            'id': str(tweet.get('id', tweet_id)),
            'created_at': tweet.get('created_at', ''),
        }
    except:
        return None

def classify_tweet(text):
    text_lower = text.lower()
    topics = []
    btc_kw = ['bitcoin', 'btc', 'satoshi', 'sats', 'crypto', 'blockchain', 'lightning network', 'mining', 'hodl', 'halving', '₿']
    sports_kw = ['nfl', 'nba', 'mlb', 'nhl', 'super bowl', 'touchdown', 'home run', 'goal', 'championship', 'playoff', 'game', 'coach', 'player', 'team', 'score', 'espn', 'stadium', 'season']
    tech_kw = ['ai ', 'artificial intelligence', 'machine learning', 'openai', 'chatgpt', 'llm', 'startup', 'silicon valley', 'coding', 'developer', 'programming', 'software', 'tech', 'apple', 'google', 'microsoft', 'nvidia']
    politics_kw = ['trump', 'biden', 'congress', 'senate', 'democrat', 'republican', 'gop', 'maga', 'liberal', 'conservative', 'election', 'vote', 'president', 'governor', 'policy', 'legislation', 'political']
    if any(k in text_lower for k in btc_kw): topics.append('bitcoin')
    if any(k in text_lower for k in sports_kw): topics.append('sports')
    if any(k in text_lower for k in tech_kw): topics.append('tech')
    if any(k in text_lower for k in politics_kw): topics.append('politics')
    return topics if topics else ['general']

def main():
    print("🔍 Tweetster Timeline Discovery")
    
    # Load following list
    following = json.load(open(FOLLOWING_FILE))
    followed_handles = set()
    for a in following:
        h = (a.get('handle', '') or '').replace('@', '').lower()
        if h: followed_handles.add(h)
    print(f"   Tracking {len(followed_handles)} followed accounts")
    
    # Load existing tweets
    tweets = json.load(open(TWEETS_FILE))
    existing_ids = set(str(t.get('id', '')) for t in tweets)
    print(f"   Have {len(tweets)} existing tweets")
    
    # Get per-user latest tweet timestamps
    user_latest = {}
    for t in tweets:
        h = (t.get('user_handle', '') or '').lower()
        ts = t.get('sort_ts', 0)
        if h and ts > user_latest.get(h, 0):
            user_latest[h] = ts
    
    # Strategy: probe random Snowflake IDs in recent time windows
    # Each second has ~4000+ possible IDs, so we sample
    now_ms = int(time.time() * 1000)
    
    new_tweets = []
    checked = 0
    found = 0
    
    # Scan windows: last 48 hours in 5-minute chunks, random sample
    windows = []
    for hours_ago in range(0, 48):
        for mins in range(0, 60, 5):
            target_ms = now_ms - (hours_ago * 3600000) - (mins * 60000)
            windows.append(target_ms)
    
    random.shuffle(windows)
    
    # Take up to 200 windows
    windows = windows[:200]
    
    print(f"   Probing {len(windows)} time windows for tweets...")
    
    for i, target_ms in enumerate(windows):
        base_id = ms_to_snowflake(target_ms)
        
        # Try a few random offsets within this millisecond range
        for offset in range(0, 3):
            probe_id = base_id + random.randint(0, 4095)  # Worker/sequence bits
            
            if str(probe_id) in existing_ids:
                continue
            
            # Use fxtwitter first (faster, gives author info)
            result = fetch_fxtwitter(probe_id)
            checked += 1
            
            if result and result.get('handle'):
                handle = result['handle'].lower()
                if handle in followed_handles and str(result.get('id', probe_id)) not in existing_ids:
                    print(f"   ✅ Found! @{handle}: {result['text'][:60]}...")
                    
                    # Now get full details from CDN
                    cdn_data = fetch_cdn(result.get('id', probe_id))
                    
                    tweet_obj = {
                        'id': str(result.get('id', probe_id)),
                        'text': result.get('text', ''),
                        'user_handle': handle,
                        'user_name': result.get('name', ''),
                        'created_at': result.get('created_at', ''),
                        'sort_ts': int(snowflake_to_ms(int(result.get('id', probe_id))) / 1000),
                        'topics': classify_tweet(result.get('text', '')),
                        'reply_count': 0,
                        'retweet_count': 0,
                        'favorite_count': 0,
                    }
                    
                    # Enrich from CDN if available
                    if cdn_data:
                        tweet_obj['user_avatar'] = cdn_data.get('user', {}).get('profile_image_url_https', '')
                        tweet_obj['reply_count'] = cdn_data.get('reply_count', 0)
                        tweet_obj['retweet_count'] = cdn_data.get('retweet_count', 0)
                        tweet_obj['favorite_count'] = cdn_data.get('favorite_count', 0)
                        media = []
                        for m in cdn_data.get('mediaDetails', []):
                            media.append({
                                'type': m.get('type', 'photo'),
                                'url': m.get('media_url_https', ''),
                            })
                        if media:
                            tweet_obj['media'] = media
                    
                    new_tweets.append(tweet_obj)
                    existing_ids.add(str(tweet_obj['id']))
                    found += 1
            
            time.sleep(0.15)  # Rate limit
        
        if (i + 1) % 25 == 0:
            target_dt = datetime.datetime.fromtimestamp(target_ms/1000, datetime.timezone.utc)
            print(f"   Progress: {i+1}/{len(windows)} windows, {checked} probes, {found} found ({target_dt.strftime('%m/%d %H:%M')})")
        
        if found >= 50:
            print("   Hit 50 new tweets, stopping early")
            break
    
    print(f"\n   📊 Checked {checked} IDs, found {found} new tweets from followed accounts")
    
    if new_tweets:
        tweets.extend(new_tweets)
        tweets.sort(key=lambda t: t.get('sort_ts', 0), reverse=True)
        tweets = tweets[:2000]
        with open(TWEETS_FILE, 'w') as f:
            json.dump(tweets, f, indent=1)
        print(f"   ✅ Saved! Now have {len(tweets)} total tweets")
    else:
        print("   No new tweets found. The random probe approach has very low hit rates.")
        print("   Run local-fetch.py from your Mac for guaranteed fresh tweets.")

if __name__ == '__main__':
    main()
