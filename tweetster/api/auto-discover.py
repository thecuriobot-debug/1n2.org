#!/usr/bin/env python3
"""
Tweetster Auto-Discovery Script
Uses Google search results to discover tweet IDs, then feeds them to the ingest API.
Runs entirely on the server - no Twitter auth needed!

The pipeline:
1. Google search: "site:x.com/{handle}/status 2025" to find tweet URLs
2. Extract tweet IDs from URLs
3. Send to ingest.php which fetches full data from cdn.syndication.twimg.com
4. Tweets saved to data/tweets.json

Usage:
  python3 auto-discover.py                    # Discover from top 30 accounts
  python3 auto-discover.py --accounts=50      # Discover from top 50
  python3 auto-discover.py --handle=saylor    # Single account
"""

import json
import os
import re
import sys
import time
import urllib.request
import urllib.parse
import urllib.error
import ssl

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, '..', 'data')
FOLLOWING_FILE = os.path.join(DATA_DIR, 'following.json')
INGEST_URL = 'http://localhost/tweetster/api/ingest.php'

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

# Known tweet IDs from previous discovery (to seed the system)
SEED_IDS = {
    'jack': ['1927399579613286600','1883976555686420844','1930261602202251446','1924121538485178658'],
    'elonmusk': ['1876301218097901709','2006105320318189763','1870969002354454982','1964582769302045121'],
    'saylor': ['1921898712801874273','1998015666344054815','2005625390283497952','1947266086627360854'],
    'neiltyson': ['1900251981039403384','1936085830205866317','1941613477337997641','1920920160900096409'],
    'BernieSanders': ['1932148252800905415','1877022130665083186'],
    'AdamSchefter': ['2019595108036039152','1983313860389220413','2002779416460759093','1985830059186237885'],
    'sama': ['1920341429655634024','1926061979031969909','1904598788687487422','1923399498019021298'],
}


def search_google_for_tweets(handle, max_results=10):
    """Search Google for recent tweets from a handle"""
    query = f'site:x.com/{handle}/status 2025'
    url = f'https://www.google.com/search?q={urllib.parse.quote(query)}&num={max_results}'
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
    }
    
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10, context=ssl_ctx) as resp:
            html = resp.read().decode()
            # Extract tweet IDs from Google results
            ids = re.findall(r'x\.com/\w+/status/(\d{15,25})', html)
            return list(set(ids))[:max_results]
    except Exception as e:
        return []


def search_bing_for_tweets(handle, max_results=10):
    """Search Bing for recent tweets"""
    query = f'site:x.com/{handle}/status 2025'
    url = f'https://www.bing.com/search?q={urllib.parse.quote(query)}&count={max_results}'
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html',
    }
    
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10, context=ssl_ctx) as resp:
            html = resp.read().decode()
            ids = re.findall(r'x\.com/\w+/status/(\d{15,25})', html)
            return list(set(ids))[:max_results]
    except:
        return []


def ingest_ids(ids):
    """Send tweet IDs to the ingest API"""
    if not ids:
        return {'fetched': 0, 'errors': 0}
    
    data = json.dumps({'ids': ids}).encode()
    req = urllib.request.Request(
        INGEST_URL,
        data=data,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        return {'fetched': 0, 'errors': len(ids), 'error': str(e)}


def main():
    # Parse args
    accounts_count = 30
    single_handle = None
    
    for arg in sys.argv[1:]:
        if arg.startswith('--accounts='):
            accounts_count = int(arg.split('=')[1])
        elif arg.startswith('--handle='):
            single_handle = arg.split('=')[1]
    
    print("🐦 Tweetster Auto-Discovery")
    print("   Pipeline: Google Search → Tweet IDs → Syndication API → tweets.json")
    print()
    
    # Load following list
    handles = []
    if single_handle:
        handles = [single_handle]
    elif os.path.exists(FOLLOWING_FILE):
        with open(FOLLOWING_FILE, 'r') as f:
            following = json.load(f)
        following.sort(key=lambda x: x.get('followers', 0), reverse=True)
        handles = [a.get('handle', '').lstrip('@') for a in following[:accounts_count] if a.get('handle')]
    else:
        handles = list(SEED_IDS.keys())
    
    print(f"📋 Processing {len(handles)} accounts...")
    
    all_ids = []
    total_fetched = 0
    total_errors = 0
    
    for i, handle in enumerate(handles):
        handle = handle.strip()
        if not handle:
            continue
        
        print(f"\n  [{i+1}/{len(handles)}] @{handle}...", end=' ', flush=True)
        
        # Get IDs from multiple sources
        ids = []
        
        # Source 1: Seed IDs
        if handle in SEED_IDS:
            ids.extend(SEED_IDS[handle])
        
        # Source 2: Google search
        google_ids = search_google_for_tweets(handle)
        if google_ids:
            ids.extend(google_ids)
            print(f"Google:{len(google_ids)}", end=' ', flush=True)
        
        # Source 3: Bing search (if Google found nothing)
        if not google_ids:
            bing_ids = search_bing_for_tweets(handle)
            if bing_ids:
                ids.extend(bing_ids)
                print(f"Bing:{len(bing_ids)}", end=' ', flush=True)
        
        ids = list(set(ids))
        
        if not ids:
            print("⚠️ no IDs found")
            continue
        
        # Ingest
        result = ingest_ids(ids)
        fetched = result.get('fetched', 0)
        skipped = result.get('skipped', 0)
        errors = result.get('errors', 0)
        total_fetched += fetched
        total_errors += errors
        
        print(f"✅ {fetched} new, {skipped} existing, {errors} errors")
        
        all_ids.extend(ids)
        time.sleep(2)  # Be polite to search engines
    
    total = ingest_ids([])  # Get current total (will return 0 fetched but show total)
    
    print(f"\n{'='*50}")
    print(f"✅ Auto-Discovery Complete!")
    print(f"   📊 {total_fetched} new tweets fetched")
    print(f"   🔍 {len(all_ids)} tweet IDs discovered")
    print(f"   ❌ {total_errors} errors")
    print(f"   💾 Total tweets: {total.get('total', '?')}")


if __name__ == '__main__':
    main()
