#!/usr/bin/env python3
"""
Patch index.html to add Unsorted category and use exclusive classification.
"""

filepath = '/var/www/html/tweetster/index.html'

with open(filepath, 'r') as f:
    html = f.read()

# ── 1. Add unsorted color variable ──
html = html.replace(
    '--politics-red: #e0245e;',
    '--politics-red: #e0245e;\n            --unsorted-gray: #8899a6;'
)

# ── 2. Add CSS for unsorted topic button states ──
html = html.replace(
    ".topic-btn.active.politics { color: var(--politics-red); background: #fce8ed; }",
    ".topic-btn.active.politics { color: var(--politics-red); background: #fce8ed; }\n        .topic-btn.active.unsorted { color: var(--unsorted-gray); background: #f0f2f4; }"
)
html = html.replace(
    ".mobile-topic-btn.active.politics {",
    ".mobile-topic-btn.active.unsorted {\n            color: var(--unsorted-gray);\n            background: #f0f2f4;\n            border-color: var(--unsorted-gray);\n        }\n        .mobile-topic-btn.active.politics {"
)

# ── 3. Add desktop sidebar Unsorted button ──
html = html.replace(
    '''                <button class="topic-btn politics" data-topic="politics" onclick="setTopic('politics')">
                    <div class="topic-dot" style="background: var(--politics-red)"></div>
                    Politics
                    <span class="topic-count" id="count-politics">\u2014</span>
                </button>''',
    '''                <button class="topic-btn politics" data-topic="politics" onclick="setTopic('politics')">
                    <div class="topic-dot" style="background: var(--politics-red)"></div>
                    Politics
                    <span class="topic-count" id="count-politics">\u2014</span>
                </button>
                <button class="topic-btn unsorted" data-topic="unsorted" onclick="setTopic('unsorted')">
                    <div class="topic-dot" style="background: var(--unsorted-gray)"></div>
                    Unsorted
                    <span class="topic-count" id="count-unsorted">\u2014</span>
                </button>'''
)

# ── 4. Add mobile Unsorted button (before the Fetch button) ──
html = html.replace(
    '''        <button class="mobile-fetch-btn" id="mobileFetchBtn" onclick="fetchMoreTweets()">''',
    '''        <button class="mobile-topic-btn unsorted" data-topic="unsorted" onclick="setTopic('unsorted')">
            <span class="mtb-dot" style="background: var(--unsorted-gray)"></span>
            Other
            <span class="mtb-count" id="m-count-unsorted">\u2014</span>
        </button>
        <button class="mobile-fetch-btn" id="mobileFetchBtn" onclick="fetchMoreTweets()">'''
)

# ── 5. Replace the TOPICS object and classifyAccount function with exclusive classification ──
# Find the old TOPICS definition and replace it
old_topics_start = "    const TOPICS = {"
old_topics_end_marker = "    };\n\n    function classifyAccount"

# Find the indices
idx_start = html.find(old_topics_start)
idx_end = html.find(old_topics_end_marker)

if idx_start > 0 and idx_end > 0:
    old_block = html[idx_start:idx_end]
    
    new_topics = """    const TOPICS = {
        bitcoin: {
            keywords: ['bitcoin', 'btc', '\u20bf', '#bitcoin', 'bitcoiner', 'satoshi', 'sats', 'stacking sats', 'hodl', 'hodler', 'lightning network', 'mempool', 'hash rate', 'proof of work', 'seed phrase', 'utxo', 'self-custody', 'cold storage', 'hyperbitcoinization', '21m', '21 million', 'nostr', 'halving', 'block reward', 'mining pool', 'asic', 'ledger', 'trezor', 'coldcard', 'sound money', 'hard money', 'crypto', 'blockchain', 'web3', 'defi', 'nft', 'ethereum', 'altcoin', 'stablecoin', 'coinbase', 'binance', 'kraken', 'fiat currency', 'monetary'],
            color: 'var(--bitcoin-orange)',
            label: 'Bitcoin',
            tagClass: 'tag-bitcoin',
            priority: 1
        },
        sports: {
            keywords: ['nfl', 'nba', 'mlb', 'nhl', 'wnba', 'mls', 'touchdown', 'quarterback', 'wide receiver', 'running back', 'free agency', 'draft pick', 'super bowl', 'world series', 'stanley cup', 'playoffs', 'postseason', 'offseason', 'scorigami', 'raiders', 'chiefs', 'eagles', 'cowboys', 'packers', 'bears', '49ers', 'seahawks', 'patriots', 'bills', 'dolphins', 'jets', 'ravens', 'steelers', 'bengals', 'browns', 'texans', 'colts', 'titans', 'jaguars', 'broncos', 'chargers', 'saints', 'falcons', 'buccaneers', 'panthers', 'commanders', 'lions', 'vikings', 'rams', 'cardinals', 'lakers', 'celtics', 'warriors', 'nets', 'knicks', 'heat', 'bucks', 'suns', 'nuggets', 'clippers', 'yankees', 'dodgers', 'mets', 'cubs', 'red sox', 'astros', 'espn', 'ufc', 'mma', 'boxing', 'formula 1', 'nascar', 'pga tour', 'golden knights'],
            color: 'var(--sports-green)',
            label: 'Sports',
            tagClass: 'tag-sports',
            priority: 3
        },
        tech: {
            keywords: ['artificial intelligence', 'machine learning', 'deep learning', 'neural network', 'openai', 'chatgpt', 'gpt-', 'llm', 'claude ', 'anthropic', 'programming', 'software engineer', 'developer', 'javascript', 'typescript', 'python ', 'rust ', 'github', 'open source', 'api ', 'spacex', 'tesla model', 'nvidia', 'semiconductor', 'cybersecurity', 'infosec', 'quantum computing', 'robotics', 'startup', 'silicon valley', 'linux', 'kubernetes', 'docker'],
            color: 'var(--tech-purple)',
            label: 'Tech',
            tagClass: 'tag-tech',
            priority: 4
        },
        politics: {
            keywords: ['trump', 'maga', 'biden', 'harris', 'democrat', 'republican', 'gop', 'congress', 'senate', 'senator', 'representative', 'liberal', 'conservative', 'progressive', 'election', 'ballot', 'campaign', 'legislation', 'executive order', 'governor', 'supreme court', 'scotus', 'white house', 'capitol', 'potus', 'political', 'politics', 'partisan', 'immigration', 'border patrol', 'doj', 'tariff', 'sanctions', 'epstein', 'detained', 'deported', 'stephen miller', 'bondi', 'lutnick'],
            color: 'var(--politics-red)',
            label: 'Politics',
            tagClass: 'tag-politics',
            priority: 2
        },
        unsorted: {
            keywords: [],
            color: 'var(--unsorted-gray)',
            label: 'Unsorted',
            tagClass: 'tag-unsorted',
            priority: 99
        }
    };

"""
    html = html[:idx_start] + new_topics + html[idx_end:]

# ── 6. Replace the classifyAccount function to use exclusive matching ──
old_classify = """    function classifyAccount(account) {
        const text = `${account.name} ${account.description || ''} ${account.handle}`.toLowerCase();
        for (const [topic, config] of Object.entries(TOPICS)) {
            for (const kw of config.keywords) {
                if (text.includes(kw)) {
                    return topic;
                }
            }
        }
        return 'general';
    }"""

new_classify = """    // Handle overrides for known accounts
    const HANDLE_CATS = {
        'cbouzy':'politics','atrupar':'politics','acyn':'politics','hqnewsnow':'politics',
        'patriottakes':'politics','ronfilipkowski':'politics','meidastouch':'politics',
        'harryjsisson':'politics','ddale8':'politics','govpressoffice':'politics',
        'repdeSaulnier':'politics','pabloreports':'politics','berniesanders':'politics',
        'adamkinzinger':'politics','senrickscott':'politics','randpaul':'politics',
        'marionawfal':'politics','jayplemons':'politics','radioGenoa':'politics',
        'benNiall1':'politics','afraidev':'politics','adammocklerr':'politics',
        'sfchronicle':'politics','michaeldweiss':'politics',
        'adamschefter':'sports','raiders':'sports','nfl_scorigami':'sports',
        'underdogmlb':'sports','byjasonb':'sports','john_mehaffey':'sports',
        'camskattebo5':'sports','will_schilling':'sports',
        'sama':'tech','jack':'tech','elonmusk':'tech','neiltyson':'tech',
        'swiftonsecurity':'tech','niccruzpatane':'tech','fsddreams':'tech',
        'austinhill':'tech','bryan_johnson':'tech','socrates1024':'tech',
        'avi_burra':'tech','marsxrobertson':'tech','mattPRD':'tech',
        'internetarchive':'tech','nicoleshanahan':'tech',
        'saylor':'bitcoin','vitalikbuterin':'bitcoin','alexbosworth':'bitcoin',
        'lopp':'bitcoin','alistairmilne':'bitcoin','russeiils':'bitcoin',
        'lasvegaslocally':'unsorted','vitalvegas':'unsorted','seventensuited':'unsorted',
        'lvcabchronicles':'unsorted','mountainman_mc':'unsorted','sandyofcthulhu':'unsorted',
        'cal_fire':'unsorted','nwssacramento':'unsorted','outbreakupdates':'unsorted',
        'planetclarke':'unsorted','planetcouncil':'unsorted','uncledoomer':'unsorted',
        'davidirvine':'unsorted',
    };

    function classifyExclusive(text, handle) {
        const h = (handle || '').replace('@','').toLowerCase();
        if (HANDLE_CATS[h]) return HANDLE_CATS[h];
        const t = (' ' + text.toLowerCase() + ' ');
        // Priority 1: Bitcoin
        for (const kw of TOPICS.bitcoin.keywords) { if (t.includes(kw)) return 'bitcoin'; }
        // Priority 2: Trump/MAGA -> politics
        if (t.includes('trump') || t.includes('maga ') || t.includes('epstein')) return 'politics';
        // Priority 3: Sports
        for (const kw of TOPICS.sports.keywords) { if (t.includes(kw)) return 'sports'; }
        // Priority 4: Tech
        for (const kw of TOPICS.tech.keywords) { if (t.includes(kw)) return 'tech'; }
        // Priority 5: Other politics
        for (const kw of TOPICS.politics.keywords) { if (t.includes(kw)) return 'politics'; }
        return 'unsorted';
    }

    function classifyAccount(account) {
        const text = [account.name, account.description || '', account.handle].join(' ');
        return classifyExclusive(text, account.handle);
    }"""

html = html.replace(old_classify, new_classify)

# ── 7. Update classifyTweet to be exclusive too ──
# Find the tweet classification function
old_tweet_classify_start = "    function classifyTweet(tweet) {"
idx = html.find(old_tweet_classify_start)
if idx > 0:
    # Find the closing brace of this function
    brace_count = 0
    end_idx = idx
    started = False
    for i in range(idx, len(html)):
        if html[i] == '{':
            brace_count += 1
            started = True
        elif html[i] == '}':
            brace_count -= 1
            if started and brace_count == 0:
                end_idx = i + 1
                break
    
    old_func = html[idx:end_idx]
    new_func = """    function classifyTweet(tweet) {
        // Use pre-classified topic from backend if available
        if (tweet.topics && tweet.topics.length > 0 && tweet.topics[0] !== 'general') {
            return tweet.topics;
        }
        // Fallback: classify by content exclusively
        const text = [tweet.text || '', tweet.name || '', tweet.handle || ''].join(' ');
        return [classifyExclusive(text, tweet.handle)];
    }"""
    html = html.replace(old_func, new_func)

# ── 8. Update the tag rendering for unsorted ──
html = html.replace(
    "'tag-bitcoin': 'BITCOIN'",
    "'tag-bitcoin': 'BITCOIN', 'tag-unsorted': 'OTHER'"
)

# ── 9. Update the count display to include unsorted ──
# Add unsorted count updates
count_update_area = "document.getElementById('count-politics')"
if count_update_area in html:
    html = html.replace(
        count_update_area,
        "document.getElementById('count-unsorted').textContent = topicCounts.unsorted || 0;\n        document.getElementById('m-count-unsorted').textContent = topicCounts.unsorted || 0;\n        " + count_update_area
    )

# ── 10. Add unsorted to the tag color map ──
html = html.replace(
    "const tagColors = {",
    "const tagColors = {\n            'tag-unsorted': 'var(--unsorted-gray)',"
)

# ── 11. Make sure setTopic handles 'unsorted' ──
# This should already work since the logic filters by topic name

with open(filepath, 'w') as f:
    f.write(html)

print('Done! Frontend updated with exclusive classification + Unsorted category.')
print('Changes:')
print('  - Added Unsorted button (desktop sidebar + mobile bar)')
print('  - Classification is now exclusive (one category per tweet)')
print('  - Handle overrides for known accounts')
print('  - Priority: Bitcoin > Trump/politics > Sports > Tech > Other politics > Unsorted')
