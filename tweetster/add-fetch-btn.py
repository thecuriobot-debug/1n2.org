#!/usr/bin/env python3
"""Add fetch button to Tweetster UI"""
import sys

filepath = '/var/www/html/tweetster/index.html'

with open(filepath, 'r') as f:
    html = f.read()

# 1. Add CSS for fetch button
fetch_css = """
        /* Fetch More button */
        .fetch-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: calc(100% - 32px);
            margin: 0 16px 16px;
            padding: 10px 16px;
            background: var(--twitter-blue);
            color: white;
            border: none;
            border-radius: 25px;
            font-size: 0.88em;
            font-weight: 700;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.2s;
        }
        .fetch-btn:hover { background: var(--twitter-dark-blue); transform: scale(1.02); }
        .fetch-btn:active { transform: scale(0.98); }
        .fetch-btn:disabled { background: var(--twitter-light-gray); cursor: not-allowed; transform: none; }
        .fetch-btn .spinner {
            width: 16px; height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            display: none;
        }
        .fetch-btn.loading .spinner { display: block; }
        .fetch-btn.loading .btn-icon { display: none; }
        .fetch-btn.success { background: var(--sports-green); }
        @keyframes spin { to { transform: rotate(360deg); } }
        .mobile-fetch-btn {
            display: none;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 8px 16px;
            background: var(--twitter-blue);
            color: white;
            border: none;
            border-radius: 20px;
            font-size: 0.82em;
            font-weight: 700;
            font-family: inherit;
            cursor: pointer;
            white-space: nowrap;
            flex-shrink: 0;
        }
        .mobile-fetch-btn:disabled { opacity: 0.6; }
        .mobile-fetch-btn .spinner {
            width: 14px; height: 14px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            display: none;
        }
        .mobile-fetch-btn.loading .spinner { display: block; }
        .mobile-fetch-btn.loading .btn-text { display: none; }
        @media (max-width: 768px) {
            .mobile-fetch-btn { display: flex; }
        }
"""
html = html.replace('    </style>', fetch_css + '    </style>')

# 2. Add desktop button in stats card
old_stats = '<div><strong style="color: var(--sports-green);">0</strong> ads shown \U0001f389</div>\n                </div>\n            </div>'
new_stats = '<div><strong style="color: var(--sports-green);">0</strong> ads shown \U0001f389</div>\n                </div>\n                <button class="fetch-btn" id="fetchBtn" onclick="fetchMoreTweets()">\n                    <span class="btn-icon">\U0001f504</span>\n                    <span class="spinner"></span>\n                    <span class="btn-label">Fetch More Tweets</span>\n                </button>\n            </div>'
html = html.replace(old_stats, new_stats)

# 3. Add mobile button after politics in topic bar
old_mobile = 'id="m-count-politics">\u2014</span>\n        </button>\n    </div>'
new_mobile = 'id="m-count-politics">\u2014</span>\n        </button>\n        <button class="mobile-fetch-btn" id="mobileFetchBtn" onclick="fetchMoreTweets()">\n            <span class="spinner"></span>\n            <span class="btn-text">\U0001f504 Fetch</span>\n        </button>\n    </div>'
html = html.replace(old_mobile, new_mobile)

# 4. Add JS function
fetch_js = """
        // Fetch More Tweets
        async function fetchMoreTweets() {
            const btn = document.getElementById('fetchBtn');
            const mobileBtn = document.getElementById('mobileFetchBtn');
            const label = btn ? btn.querySelector('.btn-label') : null;
            [btn, mobileBtn].forEach(b => { if (b) { b.classList.add('loading'); b.disabled = true; }});
            if (label) label.textContent = 'Fetching...';
            try {
                const resp = await fetch('api/fetch-tweets.php?action=cdn-refresh');
                const data = await resp.json();
                if (data.status === 'started' || data.status === 'already_running') {
                    if (label) label.textContent = 'Refreshing...';
                    let attempts = 0;
                    const startCount = parseInt(document.getElementById('stat-tweets').textContent) || 0;
                    const pollInterval = setInterval(async () => {
                        attempts++;
                        try {
                            const pr = await fetch('data/tweets.json?t=' + Date.now());
                            const nt = await pr.json();
                            if (nt.length > startCount || attempts >= 18) {
                                clearInterval(pollInterval);
                                if (nt.length > startCount) {
                                    if (label) label.textContent = '+' + (nt.length - startCount) + ' new!';
                                    [btn, mobileBtn].forEach(b => { if (b) { b.classList.remove('loading'); b.classList.add('success'); }});
                                    setTimeout(() => location.reload(), 1500);
                                } else {
                                    if (label) label.textContent = 'No new tweets found';
                                    [btn, mobileBtn].forEach(b => { if (b) { b.classList.remove('loading'); b.disabled = false; }});
                                    setTimeout(() => { if (label) label.textContent = 'Fetch More Tweets'; }, 3000);
                                }
                            }
                        } catch(e) {}
                    }, 5000);
                } else {
                    if (label) label.textContent = data.message || 'Error';
                    [btn, mobileBtn].forEach(b => { if (b) { b.classList.remove('loading'); b.disabled = false; }});
                }
            } catch(err) {
                if (label) label.textContent = 'Error: ' + err.message;
                [btn, mobileBtn].forEach(b => { if (b) { b.classList.remove('loading'); b.disabled = false; }});
                setTimeout(() => { if (label) label.textContent = 'Fetch More Tweets'; }, 3000);
            }
        }
"""
html = html.replace('    </script>', fetch_js + '    </script>')

with open(filepath, 'w') as f:
    f.write(html)

print('Done! Fetch button added to desktop sidebar and mobile topic bar.')
