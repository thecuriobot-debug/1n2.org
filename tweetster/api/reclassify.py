#!/usr/bin/env python3
"""
Reclassify all following accounts and tweets with exclusive categories.

Rules:
1. Bitcoin/crypto mention in profile OR tweets → bitcoin (exclusive)
2. Known political commentators OR Trump/MAGA mention → politics (exclusive)
3. Sports-specific content → sports (exclusive)
4. Tech-specific content → tech (exclusive)
5. Other political keywords → politics
6. Everything else → unsorted

Each account/tweet gets exactly ONE category.
"""

import json, os, re

DATA_DIR = '/var/www/html/tweetster/data'
FOLLOWING_FILE = os.path.join(DATA_DIR, 'following.json')
TWEETS_FILE = os.path.join(DATA_DIR, 'tweets.json')

# ── Known handle overrides (manual classification for key accounts) ──
HANDLE_OVERRIDES = {
    # Politics / News commentators
    'cbouzy': 'politics', 'atrupar': 'politics', 'acyn': 'politics',
    'hqnewsnow': 'politics', 'patriottakes': 'politics', 'ronfilipkowski': 'politics',
    'meidastouch': 'politics', 'harryjsisson': 'politics', 'ddale8': 'politics',
    'govpressoffice': 'politics', 'repdeSaulnier': 'politics', 'pabloreports': 'politics',
    'berniesanders': 'politics', 'adamkinzinger': 'politics', 'senrickscott': 'politics',
    'randpaul': 'politics', 'jayplemons': 'politics',
    'marionawfal': 'politics', 'marioNawfal': 'politics',
    'michaeldweiss': 'politics', 'magyarpetermp': 'politics',
    'sfchronicle': 'politics',
    'adammocklerr': 'politics',
    'internetarchive': 'tech',
    
    # Sports
    'adamschefter': 'sports', 'raiders': 'sports', 'nfl_scorigami': 'sports',
    'underdogmlb': 'sports', 'byjasonb': 'sports', 'john_mehaffey': 'sports',
    'camskattebo5': 'sports', 'will_schilling': 'sports',
    
    # Tech
    'sama': 'tech', 'jack': 'tech', 'elonmusk': 'tech',
    'neiltyson': 'tech', 'swiftonsecurity': 'tech',
    'niccruzpatane': 'tech', 'fsddreams': 'tech',
    'austinhill': 'tech', 'athyuttamre': 'tech',
    'seconds_0': 'tech', 'grantslatton': 'tech',
    'bryan_johnson': 'tech',
    'nicoleshanahan': 'tech',
    'cal_fire': 'unsorted', 'nwssacramento': 'unsorted',
    'outbreakupdates': 'unsorted',
    
    # Bitcoin
    'saylor': 'bitcoin', 'vitalikbuterin': 'bitcoin',
    'alexbosworth': 'bitcoin', 'lopp': 'bitcoin',
    'alistairmilne': 'bitcoin', 'russeiils': 'bitcoin',
    
    # Las Vegas
    'lasvegaslocally': 'unsorted', 'vitalvegas': 'unsorted',
    'seventensuited': 'unsorted',
    'lvcabchronicles': 'unsorted',
    
    # Other
    'mountainman_mc': 'unsorted',
    'radioGenoa': 'politics',
    'sandyofcthulhu': 'unsorted',
    'uncledoomer': 'unsorted',
    'benjamincrew1': 'unsorted',
    'planetcouncil': 'unsorted',
    'mcagney': 'unsorted',
    'davidirvine': 'unsorted',
    'mattPRD': 'tech',
    'marsxrobertson': 'tech',
    'avi_burra': 'tech',
    'planetclarke': 'unsorted',
    'benNiall1': 'politics',
    'socrates1024': 'tech',
    'afraidev': 'politics',
}

# ── Keywords (exclusive matching, priority order) ──
BITCOIN_KW = [
    'bitcoin', 'btc', '₿', '#bitcoin', 'bitcoiner',
    'satoshi', 'sats', 'stacking sats', 'hodl', 'hodler',
    'lightning network', 'mempool', 'hash rate', 'proof of work',
    'seed phrase', 'utxo', 'self-custody', 'cold storage',
    'hyperbitcoinization', '21m', '21 million',
    'nostr', 'zap', 'halving', 'block reward', 'mining pool', 'asic',
    'ledger', 'trezor', 'coldcard',
    'sound money', 'hard money',
    'crypto', 'blockchain', 'web3', 'defi', 'nft',
    'ethereum', 'altcoin', 'stablecoin', 'usdt', 'usdc',
    'coinbase', 'binance', 'kraken',
    'fiat currency', 'monetary',
    'bitcoin conference', 'bitcoin meetup',
]

SPORTS_KW = [
    # Leagues
    ' nfl', 'nfl ', ' nba', 'nba ', ' mlb', 'mlb ', ' nhl', 'nhl ',
    ' wnba', ' mls',
    # Sports terms (precise to avoid false positives)
    'touchdown', 'quarterback', 'wide receiver', 'running back',
    'free agency', 'draft pick', 'trade deadline',
    'super bowl', 'world series', 'stanley cup',
    'playoffs', 'postseason', 'offseason', 'off-season',
    'scorigami',
    # NFL teams
    'raiders', 'chiefs', 'eagles', 'cowboys', 'packers', 'bears',
    '49ers', 'seahawks', 'patriots', 'bills', 'dolphins', 'jets',
    'ravens', 'steelers', 'bengals', 'browns', 'texans', 'colts',
    'titans', 'jaguars', 'broncos', 'chargers', 'saints', 'falcons',
    'buccaneers', 'panthers', 'commanders', 'giants rb', 'lions', 'vikings',
    'rams', 'cardinals',
    # NBA teams  
    'lakers', 'celtics', 'warriors', 'nets', 'knicks', 'heat',
    'bucks', 'suns', 'nuggets', 'clippers',
    # MLB teams
    'yankees', 'dodgers', 'mets', 'cubs', 'red sox', 'astros',
    # Other
    ' espn', 'ufc ', ' mma', 'boxing match',
    'pga tour', 'formula 1', ' f1 ', 'nascar',
    'golden knights',
    'verlander', 'myles garrett', 'kyler murray', 'nick chubb',
]

TECH_KW = [
    # AI
    'artificial intelligence', 'machine learning', 'deep learning',
    'neural network', 'transformer model',
    'openai', 'chatgpt', 'gpt-', ' llm', 'llm ',
    'claude ', 'anthropic', 'gemini ai',
    # Programming
    'programming', 'software engineer', 'developer',
    'javascript', 'typescript', 'python ', 'rust ',
    'github', 'open source', 'api ',
    # Companies/Products
    'spacex', 'tesla model', 'tesla\'s', 'stargate',
    'nvidia', 'semiconductor',
    # General tech
    'cybersecurity', 'infosec',
    'quantum computing', 'robotics',
    'startup', 'silicon valley',
    'linux', 'kubernetes', 'docker',
    'app store', 'ios ', 'android ',
]

POLITICS_KW = [
    'trump', 'maga', 'biden', 'harris',
    'democrat', 'republican', 'gop', ' dnc', ' rnc',
    'congress', 'senate', 'senator', 'representative', 'congressman',
    'liberal', 'conservative', 'progressive',
    'election', 'ballot', 'campaign',
    'legislation', 'executive order',
    'governor', 'supreme court', 'scotus',
    'white house', 'capitol', 'potus',
    'political', 'politics', 'partisan',
    'immigration', 'border patrol', 'ice ',
    'doj', ' fbi', ' cia',
    'tariff', 'sanctions',
    'epstein', 'arrested',
    'doge ', 'elon doge',
    '#resist', 'accountability',
    'detained', 'deported',
    'disenfranchise', 'voting rights',
    'pepper spray', 'citizens being',
    'stephen miller', 'bondi', 'lutnick',
    'munich security',
]


def classify_text_exclusive(text, handle=''):
    """Classify text into exactly one category."""
    h = handle.lower().lstrip('@')
    t = (' ' + text.lower() + ' ')
    
    # Check handle overrides first
    if h in HANDLE_OVERRIDES:
        return HANDLE_OVERRIDES[h]
    
    # Priority 1: Bitcoin
    for kw in BITCOIN_KW:
        if kw in t:
            return 'bitcoin'
    
    # Priority 2: Explicit Trump/MAGA → politics
    for kw in ['trump', 'maga ', 'epstein']:
        if kw in t:
            return 'politics'
    
    # Priority 3: Sports (must be specific)
    for kw in SPORTS_KW:
        if kw in t:
            return 'sports'
    
    # Priority 4: Tech
    for kw in TECH_KW:
        if kw in t:
            return 'tech'
    
    # Priority 5: Other politics
    for kw in POLITICS_KW:
        if kw in t:
            return 'politics'
    
    return 'unsorted'


def classify_account(acct):
    """Classify a following account."""
    handle = (acct.get('handle', '') or '').lstrip('@')
    text = ' '.join([
        handle,
        acct.get('name', '') or '',
        acct.get('description', '') or '',
    ])
    return classify_text_exclusive(text, handle)


def classify_tweet_obj(tweet, account_cats):
    """Classify a tweet. Falls back to account category if tweet is unsorted."""
    handle = (tweet.get('user_handle', '') or '').lower()
    
    # First check handle override
    h_lower = handle.lstrip('@')
    if h_lower in HANDLE_OVERRIDES:
        return HANDLE_OVERRIDES[h_lower]
    
    # Classify by tweet content
    text = ' '.join([
        tweet.get('text', '') or '',
        tweet.get('user_name', '') or '',
    ])
    cat = classify_text_exclusive(text, handle)
    
    # If tweet text is unsorted, use account's known category
    if cat == 'unsorted':
        acct_cat = account_cats.get(h_lower, 'unsorted')
        if acct_cat != 'unsorted':
            return acct_cat
    
    return cat


def main():
    with open(FOLLOWING_FILE) as f:
        following = json.load(f)
    with open(TWEETS_FILE) as f:
        tweets = json.load(f)
    
    # Step 1: Classify accounts
    print("📋 Classifying accounts...")
    account_cats = {}
    acct_counts = {}
    for acct in following:
        handle = (acct.get('handle', '') or '').lstrip('@').lower()
        cat = classify_account(acct)
        account_cats[handle] = cat
        acct_counts[cat] = acct_counts.get(cat, 0) + 1
    
    print(f"   Accounts: {json.dumps(acct_counts, indent=4)}")
    
    # Step 2: Classify tweets
    print(f"\n🏷️  Classifying {len(tweets)} tweets...")
    tweet_counts = {}
    for tweet in tweets:
        cat = classify_tweet_obj(tweet, account_cats)
        tweet['topics'] = [cat]
        tweet_counts[cat] = tweet_counts.get(cat, 0) + 1
    
    print(f"   Tweets: {json.dumps(tweet_counts, indent=4)}")
    
    # Step 3: Verify — show examples
    for cat in ['bitcoin', 'sports', 'tech', 'politics', 'unsorted']:
        examples = [t for t in tweets if t.get('topics') == [cat]][:5]
        print(f"\n   {'='*40}")
        print(f"   {cat.upper()} ({tweet_counts.get(cat, 0)} tweets):")
        for t in examples:
            print(f"     @{t.get('user_handle','?')}: {t.get('text','')[:80]}")
    
    # Step 4: Save
    with open(TWEETS_FILE, 'w') as f:
        json.dump(tweets, f, indent=2, ensure_ascii=False)
    
    with open(os.path.join(DATA_DIR, 'account-categories.json'), 'w') as f:
        json.dump(account_cats, f, indent=2)
    
    print(f"\n✅ Done! {len(tweets)} tweets reclassified.")


if __name__ == '__main__':
    main()
