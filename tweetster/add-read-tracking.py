#!/usr/bin/env python3
"""
Add read/unread tracking + show/hide read tweets + fetch button at bottom of feed
"""

with open('/var/www/html/tweetster/index.html', 'r') as f:
    html = f.read()

# ═══════════════════════════════════════════
# 1. ADD CSS
# ═══════════════════════════════════════════
read_css = """
        /* Read/unread tweet states */
        .tweet-card.read { opacity: 0.5; }
        .tweet-card.read:hover { opacity: 0.8; }
        .tweets-hidden-notice { display: none; }

        /* Feed bottom controls */
        .feed-bottom {
            background: var(--twitter-white);
            border-radius: 0 0 16px 16px;
            padding: 20px;
            text-align: center;
            border-top: 1px solid var(--twitter-border);
        }
        .feed-bottom-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px 24px;
            border: none;
            border-radius: 25px;
            font-size: 0.9em;
            font-weight: 700;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.2s;
            margin: 4px;
        }
        .feed-bottom-btn:hover { transform: scale(1.03); }
        .feed-bottom-btn:active { transform: scale(0.97); }
        .feed-bottom-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .feed-bottom-btn.primary {
            background: var(--twitter-blue);
            color: white;
        }
        .feed-bottom-btn.primary:hover { background: var(--twitter-dark-blue); }
        .feed-bottom-btn.primary .spinner {
            width: 16px; height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            display: none;
        }
        .feed-bottom-btn.primary.loading .spinner { display: inline-block; }
        .feed-bottom-btn.primary.loading .btn-icon { display: none; }
        .feed-bottom-btn.primary.success { background: var(--sports-green); }
        .feed-bottom-btn.secondary {
            background: transparent;
            color: var(--twitter-gray);
            border: 1.5px solid var(--twitter-border);
        }
        .feed-bottom-btn.secondary:hover { background: var(--twitter-hover); color: var(--twitter-text); border-color: var(--twitter-light-gray); }
        .feed-bottom-btn.secondary.active {
            background: var(--twitter-light-blue);
            color: var(--twitter-blue);
            border-color: var(--twitter-blue);
        }
        .mark-all-read-btn {
            background: transparent;
            color: var(--twitter-gray);
            border: 1.5px solid var(--twitter-border);
        }
        .mark-all-read-btn:hover { background: var(--twitter-hover); color: var(--twitter-text); }
        .read-count-badge {
            display: inline-block;
            background: var(--twitter-light-gray);
            color: white;
            font-size: 0.75em;
            padding: 1px 7px;
            border-radius: 10px;
            margin-left: 4px;
        }
        .feed-bottom-btn.secondary.active .read-count-badge {
            background: var(--twitter-blue);
        }
"""
html = html.replace('        /* Fetch More button */', read_css + '\n        /* Fetch More button */')

# ═══════════════════════════════════════════
# 2. ADD MARK ALL READ BUTTON next to feed title
# ═══════════════════════════════════════════
old_feed_header = '<span id="feed-title">Following Timeline</span>'
new_feed_header = '<span id="feed-title">Following Timeline</span>\n                <button onclick="markAllRead()" style="margin-left:auto;padding:6px 14px;background:transparent;border:1.5px solid var(--twitter-border);border-radius:20px;font-size:0.78em;font-weight:700;color:var(--twitter-gray);cursor:pointer;font-family:inherit;transition:all 0.2s;" onmouseover="this.style.borderColor=\'var(--twitter-blue)\';this.style.color=\'var(--twitter-blue)\'" onmouseout="this.style.borderColor=\'var(--twitter-border)\';this.style.color=\'var(--twitter-gray)\'">✓ Mark All Read</button>'
html = html.replace(old_feed_header, new_feed_header)

# ═══════════════════════════════════════════
# 3. ADD FEED BOTTOM SECTION (after tweet-feed div, before </main>)
# ═══════════════════════════════════════════
old_main_close = """            </div>
        </main>

        <!-- Right Sidebar -->"""
new_main_close = """            </div>
            <div class="feed-bottom" id="feedBottom">
                <button class="feed-bottom-btn primary" id="bottomFetchBtn" onclick="fetchMoreTweets()">
                    <span class="btn-icon">\U0001f504</span>
                    <span class="spinner"></span>
                    <span class="btn-label">Fetch More Tweets</span>
                </button>
                <button class="feed-bottom-btn secondary" id="showReadBtn" onclick="toggleShowRead()">
                    <span id="showReadIcon">\U0001f441</span>
                    <span id="showReadLabel">Show Read</span>
                    <span class="read-count-badge" id="readCountBadge">0</span>
                </button>
            </div>
        </main>

        <!-- Right Sidebar -->"""
html = html.replace(old_main_close, new_main_close)

# ═══════════════════════════════════════════
# 4. ADD JAVASCRIPT for read tracking
# ═══════════════════════════════════════════
# Insert before the existing fetchMoreTweets function
read_js = """
        // ── Read/Unread Tweet Tracking ──
        let readTweetIds = new Set(JSON.parse(localStorage.getItem('tweetster_read') || '[]'));
        let showReadTweets = false;

        function saveReadState() {
            // Keep max 5000 read IDs to avoid bloating localStorage
            const arr = [...readTweetIds].slice(-5000);
            localStorage.setItem('tweetster_read', JSON.stringify(arr));
        }

        function markTweetRead(tweetId) {
            if (!tweetId) return;
            readTweetIds.add(tweetId);
            saveReadState();
        }

        function markAllRead() {
            const tweets = getMergedTweets();
            let topic = currentTopic;
            let visible = tweets;
            if (topic !== 'all') {
                visible = tweets.filter(t => t.topics.includes(topic));
            }
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                visible = visible.filter(t =>
                    t.text.toLowerCase().includes(q) ||
                    t.name.toLowerCase().includes(q) ||
                    t.handle.toLowerCase().includes(q)
                );
            }
            visible.forEach(t => { if (t.id) readTweetIds.add(t.id); });
            saveReadState();
            renderFeed();
            updateReadBadge();
        }

        function toggleShowRead() {
            showReadTweets = !showReadTweets;
            const btn = document.getElementById('showReadBtn');
            const label = document.getElementById('showReadLabel');
            const icon = document.getElementById('showReadIcon');
            if (showReadTweets) {
                btn.classList.add('active');
                label.textContent = 'Hide Read';
                icon.textContent = '\U0001f441\ufe0f\u200d\U0001f5e8\ufe0f';
            } else {
                btn.classList.remove('active');
                label.textContent = 'Show Read';
                icon.textContent = '\U0001f441';
            }
            renderFeed();
        }

        function updateReadBadge() {
            const tweets = getMergedTweets();
            let readCount = tweets.filter(t => t.id && readTweetIds.has(t.id)).length;
            const badge = document.getElementById('readCountBadge');
            if (badge) badge.textContent = readCount;
        }

        // Mark tweets as read when they scroll into view
        function setupReadObserver() {
            if (!('IntersectionObserver' in window)) return;
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const card = entry.target;
                        const tweetId = card.dataset.tweetId;
                        if (tweetId && !readTweetIds.has(tweetId)) {
                            // Mark read after 1.5s of visibility
                            card._readTimer = setTimeout(() => {
                                markTweetRead(tweetId);
                                card.classList.add('read');
                                updateReadBadge();
                            }, 1500);
                        }
                    } else {
                        const card = entry.target;
                        if (card._readTimer) {
                            clearTimeout(card._readTimer);
                            card._readTimer = null;
                        }
                    }
                });
            }, { threshold: 0.6 });

            document.querySelectorAll('.tweet-card[data-tweet-id]').forEach(card => {
                observer.observe(card);
            });
            // Store observer so we can disconnect later
            window._tweetReadObserver = observer;
        }

"""
html = html.replace('        // Fetch More Tweets', read_js + '        // Fetch More Tweets')

# ═══════════════════════════════════════════
# 5. MODIFY renderTweet to add data-tweet-id and read class
# ═══════════════════════════════════════════
# The tweet card div in the SECOND renderTweet (the one that overrides)
old_tweet_card = '''<div class="tweet-card" onclick="window.open('https://twitter.com/${tweet.handle}', '_blank')">
            <img class="tweet-avatar" src="${bigImg}"'''

# We need to find the second occurrence (the override renderTweet)
# Add tweet ID and read class
new_tweet_card = '''<div class="tweet-card ${tweet.id && readTweetIds.has(tweet.id) ? 'read' : ''}" data-tweet-id="${tweet.id || ''}" onclick="window.open('https://twitter.com/${tweet.handle}', '_blank')">
            <img class="tweet-avatar" src="${bigImg}"'''

# Replace second occurrence only
first_pos = html.find(old_tweet_card)
if first_pos >= 0:
    second_pos = html.find(old_tweet_card, first_pos + 1)
    if second_pos >= 0:
        html = html[:second_pos] + new_tweet_card + html[second_pos + len(old_tweet_card):]
    else:
        # Only one occurrence, replace it
        html = html.replace(old_tweet_card, new_tweet_card, 1)

# ═══════════════════════════════════════════
# 6. MODIFY getMergedTweets to include id field
# ═══════════════════════════════════════════
old_is_real = "isReal: true"
new_is_real = "id: t.id || '',\n                isReal: true"
html = html.replace(old_is_real, new_is_real)

# ═══════════════════════════════════════════
# 7. MODIFY renderFeed to filter read tweets + setup observer
# ═══════════════════════════════════════════
old_render_end = "feed.innerHTML = tweets.slice(0, 100).map(renderTweet).join('');"
new_render_end = """// Filter out read tweets unless showReadTweets is on
        if (!showReadTweets) {
            const unread = tweets.filter(t => !t.id || !readTweetIds.has(t.id));
            if (unread.length > 0) {
                tweets = unread;
            }
            // If ALL tweets are read, show message
            if (unread.length === 0 && tweets.length > 0) {
                feed.innerHTML = `
                    <div class="empty-state">
                        <svg width="50" height="50" fill="#17bf63" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                        <h3>All caught up!</h3>
                        <p>You've read all ${tweets.length} tweets. Click "Show Read" below to see them again.</p>
                    </div>`;
                updateReadBadge();
                return;
            }
        }

        feed.innerHTML = tweets.slice(0, 100).map(renderTweet).join('');

        // Setup intersection observer for auto-marking read
        if (window._tweetReadObserver) window._tweetReadObserver.disconnect();
        setupReadObserver();
        updateReadBadge();"""
html = html.replace(old_render_end, new_render_end)

# ═══════════════════════════════════════════
# 8. UPDATE bottomFetchBtn in fetchMoreTweets
# ═══════════════════════════════════════════
old_fetch_btns = "const btn = document.getElementById('fetchBtn');\n            const mobileBtn = document.getElementById('mobileFetchBtn');"
new_fetch_btns = "const btn = document.getElementById('fetchBtn');\n            const mobileBtn = document.getElementById('mobileFetchBtn');\n            const bottomBtn = document.getElementById('bottomFetchBtn');"
html = html.replace(old_fetch_btns, new_fetch_btns)

# Add bottomBtn to all the forEach loops
html = html.replace("[btn, mobileBtn].forEach(b =>", "[btn, mobileBtn, bottomBtn].forEach(b =>")

# ═══════════════════════════════════════════
# 9. Call updateReadBadge on initial load
# ═══════════════════════════════════════════
old_initial_render = "updateCounts();\n        renderFeed();\n        populateWhoToFollow(accounts);"
new_initial_render = "updateCounts();\n        renderFeed();\n        populateWhoToFollow(accounts);\n        updateReadBadge();"
html = html.replace(old_initial_render, new_initial_render)

with open('/var/www/html/tweetster/index.html', 'w') as f:
    f.write(html)

print('Done! Added:')
print('  - Tweets auto-mark as read when scrolled into view (1.5s)')
print('  - Read tweets hidden by default (faded if shown)')
print('  - "Mark All Read" button in feed header')
print('  - "Show Read" toggle button at bottom of feed')
print('  - "Fetch More Tweets" button at bottom of feed')
print('  - "All caught up!" message when everything is read')
print('  - Read state persisted in localStorage')
