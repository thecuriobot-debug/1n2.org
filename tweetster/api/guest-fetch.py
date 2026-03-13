#!/usr/bin/env python3
"""
Tweetster: Fetch tweets using twikit GuestClient (no login required!)
Fetches tweets from top followed accounts and saves to data/tweets.json
"""
import asyncio
import json
import os
import sys
import time
from datetime import datetime

# Add the script's directory to help find data files
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, '..', 'data')
TWEETS_FILE = os.path.join(DATA_DIR, 'tweets.json')
FOLLOWING_FILE = os.path.join(DATA_DIR, 'following.json')
LOG_FILE = os.path.join(DATA_DIR, 'guest-fetch-log.json')

async def main():
    from twikit.guest import GuestClient
    
    max_accounts = int(sys.argv[1]) if len(sys.argv) > 1 else 25
    
    print(f"🐦 Tweetster Guest Fetcher")
    print(f"   Fetching tweets from top {max_accounts} accounts...")
    print()
    
    # Load following list
    with open(FOLLOWING_FILE, 'r') as f:
        following = json.load(f)
    
    # Sort by followers, pick top accounts
    following.sort(key=lambda x: x.get('followers', 0), reverse=True)
    top_accounts = following[:max_accounts]
    
    # Build following map for topic classification
    following_map = {}
    for acct in following:
        handle = acct.get('handle', '').lstrip('@').lower()
        if handle:
            following_map[handle] = acct
    
    # Initialize guest client
    client = GuestClient()
    print("🔑 Activating guest token...")
    try:
        await client.activate()
        print("✅ Guest token activated!")
    except Exception as e:
        print(f"❌ Failed to activate guest token: {e}")
        sys.exit(1)
    
    all_tweets = []
    errors = []
    success_count = 0
    
    for i, account in enumerate(top_accounts):
        handle = account.get('handle', '').lstrip('@')
        if not handle:
            continue
        
        print(f"  [{i+1}/{len(top_accounts)}] @{handle} ({account.get('followers', 0):,} followers)...", end=' ', flush=True)
        
        try:
            # First get user info to get their ID
            user = await client.get_user_by_screen_name(handle)
            if not user:
                print("⚠️ User not found")
                errors.append(f"@{handle}: User not found")
                continue
            
            user_id = user.id
            
            # Get their tweets
            tweets = await client.get_user_tweets(user_id)
            
            tweet_count = 0
            for tweet in tweets:
                tweet_data = {
                    'id': str(tweet.id),
                    'text': tweet.text or '',
                    'created_at': tweet.created_at or '',
                    'sort_ts': int(tweet.created_at_datetime.timestamp()) if tweet.created_at_datetime else 0,
                    'user_handle': handle,
                    'user_name': user.name or handle,
                    'user_avatar': user.profile_image_url or account.get('img', ''),
                    'user_verified': getattr(user, 'is_blue_verified', False),
                    'retweet_count': tweet.retweet_count or 0,
                    'favorite_count': tweet.favorite_count or 0,
                    'reply_count': tweet.reply_count or 0,
                    'views': str(tweet.view_count or 0),
                    'is_retweet': (tweet.text or '').startswith('RT @'),
                    'media': extract_media(tweet),
                    'topics': [],
                }
                all_tweets.append(tweet_data)
                tweet_count += 1
            
            print(f"✅ {tweet_count} tweets")
            success_count += 1
            
            # Be polite with rate limits
            await asyncio.sleep(0.5)
            
        except Exception as e:
            err_msg = str(e)
            if 'rate limit' in err_msg.lower() or '429' in err_msg:
                print(f"⏳ Rate limited, waiting 15s...")
                await asyncio.sleep(15)
                # Re-activate guest token
                try:
                    await client.activate()
                    print("  🔑 New guest token activated")
                except:
                    pass
            else:
                print(f"❌ {err_msg[:60]}")
                errors.append(f"@{handle}: {err_msg[:100]}")
            
            # After 5 consecutive errors, try refreshing token
            if len(errors) > 0 and len(errors) % 5 == 0:
                try:
                    await client.activate()
                    print("  🔑 Refreshed guest token")
                except:
                    pass
    
    if not all_tweets:
        print(f"\n❌ No tweets fetched. {len(errors)} errors.")
        for e in errors[:10]:
            print(f"  • {e}")
        sys.exit(1)
    
    # Classify topics
    for tweet in all_tweets:
        tweet['topics'] = classify_tweet(tweet, following_map)
    
    # Merge with existing tweets
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
        if tweet['id'] and tweet['id'] not in by_id:
            new_count += 1
        if tweet['id']:
            by_id[tweet['id']] = tweet
    
    # Sort by timestamp
    merged = sorted(by_id.values(), key=lambda t: t.get('sort_ts', 0), reverse=True)
    merged = merged[:2000]  # Cap at 2000
    
    with open(TWEETS_FILE, 'w') as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)
    
    # Save log
    log = {
        'completed': datetime.now().isoformat(),
        'provider': 'twikit_guest',
        'accounts_attempted': len(top_accounts),
        'accounts_success': success_count,
        'new_tweets': new_count,
        'total_tweets': len(merged),
        'errors': errors[:20],
    }
    with open(LOG_FILE, 'w') as f:
        json.dump(log, f, indent=2)
    
    print(f"\n{'='*50}")
    print(f"✅ Done! {success_count}/{len(top_accounts)} accounts fetched")
    print(f"   📊 {new_count} new tweets, {len(merged)} total")
    print(f"   💾 Saved to {TWEETS_FILE}")
    if errors:
        print(f"   ⚠️  {len(errors)} errors")


def extract_media(tweet):
    media = []
    for m in (tweet.media or []):
        media_item = {
            'url': getattr(m, 'media_url_https', '') or getattr(m, 'url', '') or '',
            'type': getattr(m, 'type', 'photo'),
        }
        if media_item['url']:
            media.append(media_item)
    return media


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
    btc = ['bitcoin','btc','satoshi','lightning network','crypto','blockchain','hodl','sats','#bitcoin','nostr','web3','defi','eth','ethereum','mining','halving','wallet','stablecoin','mempool','₿']
    sports = ['nfl','nba','mlb','nhl','super bowl','touchdown','quarterback','playoffs','championship','baseball','football','basketball','hockey','soccer','world cup','olympics','athlete','coach','draft','roster','raiders','chiefs','seahawks','patriots','lakers','celtics','yankees','dodgers','ufc','mma']
    tech = ['ai ','artificial intelligence','machine learning','gpt','openai','claude','anthropic','programming','software','startup','silicon valley','developer','github','coding','api','saas','cloud','cybersecurity','robotics','quantum','spacex','tesla','apple ','google','microsoft','nvidia','llm']
    politics = ['trump','biden','congress','senate','democrat','republican','election','vote ','legislation','policy','governor','president','supreme court','political','gop','dnc','rnc','partisan','liberal','conservative','tariff','white house','doge ','maga','executive order']
    
    for kw in btc:
        if kw in text:
            topics.append('bitcoin')
            break
    for kw in sports:
        if kw in text:
            topics.append('sports')
            break
    for kw in tech:
        if kw in text:
            topics.append('tech')
            break
    for kw in politics:
        if kw in text:
            topics.append('politics')
            break
    
    return topics or ['general']


if __name__ == '__main__':
    asyncio.run(main())
