#!/usr/bin/env python3
"""Add dark mode to Tweetster with day/night toggle, default dark"""

filepath = '/var/www/html/tweetster/index.html'

with open(filepath, 'r') as f:
    html = f.read()

# 1. Add dark mode CSS variables after :root
dark_css = """
        /* Dark Mode */
        [data-theme="dark"] {
            --twitter-blue: #1DA1F2;
            --twitter-dark-blue: #1a91da;
            --twitter-light-blue: #1a2734;
            --twitter-bg: #15202b;
            --twitter-white: #192734;
            --twitter-text: #e1e8ed;
            --twitter-gray: #8899a6;
            --twitter-light-gray: #657786;
            --twitter-border: #38444d;
            --twitter-hover: #1e2d3d;
            --shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
            --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
            --shadow-lg: 0 8px 30px rgba(0,0,0,0.5);
        }
        [data-theme="dark"] .topic-btn.active.bitcoin { color: var(--bitcoin-orange); background: #2a1f0e; }
        [data-theme="dark"] .topic-btn.active.sports { color: var(--sports-green); background: #0e2a18; }
        [data-theme="dark"] .topic-btn.active.tech { color: var(--tech-purple); background: #1e0e2a; }
        [data-theme="dark"] .topic-btn.active.politics { color: var(--politics-red); background: #2a0e18; }
        [data-theme="dark"] .topic-btn.active.unsorted { color: #8899a6; background: #1e2830; }
        [data-theme="dark"] .topic-btn.active { color: var(--twitter-blue); background: var(--twitter-light-blue); }
        [data-theme="dark"] .topic-count { background: #1e2d3d; color: #657786; }
        [data-theme="dark"] .search-bar { background: #253341; }
        [data-theme="dark"] .search-bar:focus-within { background: #192734; border-color: var(--twitter-blue); }
        [data-theme="dark"] .search-bar input { color: var(--twitter-text); }
        [data-theme="dark"] .search-bar svg { stroke: #657786; }
        [data-theme="dark"] .tweet-topic-tag { opacity: 0.85; }
        [data-theme="dark"] .tweet-card.read { opacity: 0.35; }
        [data-theme="dark"] .tweet-card.read:hover { opacity: 0.65; }
        [data-theme="dark"] .hashtag { color: var(--twitter-blue); }
        [data-theme="dark"] .user-info { color: #8899a6; }
        [data-theme="dark"] .user-info img { border-color: #38444d; }
        [data-theme="dark"] .feed-bottom-btn.secondary { background: #253341; border-color: #38444d; color: #8899a6; }
        [data-theme="dark"] .feed-bottom-btn.secondary:hover { background: #1e2d3d; color: var(--twitter-text); }
        [data-theme="dark"] .mobile-topic-btn { color: #8899a6; }
        [data-theme="dark"] .mobile-topic-btn:hover { background: #1e2d3d; }
        [data-theme="dark"] .mobile-topic-btn.active { color: var(--twitter-blue); background: var(--twitter-light-blue); }
        [data-theme="dark"] .mobile-topic-btn.active.bitcoin { color: var(--bitcoin-orange); background: #2a1f0e; }
        [data-theme="dark"] .mobile-topic-btn.active.sports { color: var(--sports-green); background: #0e2a18; }
        [data-theme="dark"] .mobile-topic-btn.active.tech { color: var(--tech-purple); background: #1e0e2a; }
        [data-theme="dark"] .mobile-topic-btn.active.politics { color: var(--politics-red); background: #2a0e18; }
        [data-theme="dark"] .mark-read-hdr-btn { color: #657786; }
        [data-theme="dark"] .mark-read-hdr-btn:hover { background: #253341; color: var(--twitter-text); }

        /* Theme toggle button */
        .theme-toggle {
            background: none;
            border: 2px solid var(--twitter-border);
            border-radius: 50%;
            width: 36px;
            height: 36px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            transition: all 0.3s;
            flex-shrink: 0;
            padding: 0;
            line-height: 1;
        }
        .theme-toggle:hover {
            border-color: var(--twitter-blue);
            background: var(--twitter-hover);
            transform: rotate(30deg);
        }
"""
html = html.replace('        * { margin: 0;', dark_css + '        * { margin: 0;')

# 2. Add data-theme="dark" to <html> tag and a tiny inline script to prevent flash
old_html_tag = '<html lang="en">'
new_html_tag = '''<html lang="en">
<script>
    // Prevent flash: apply theme before render
    (function(){
        var t = localStorage.getItem('tweetster_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', t);
    })();
</script>'''
# Remove the old html tag and add our version
html = html.replace(old_html_tag, new_html_tag, 1)

# 3. Add theme toggle button in the top bar (between search bar and user-info)
old_user_info = '''<div class="user-info">
                <span>@MadBitcoins</span>'''
new_user_info = '''<button class="theme-toggle" id="themeToggle" onclick="toggleTheme()" title="Toggle dark/light mode">
                    <span id="themeIcon">☀️</span>
                </button>
                <div class="user-info">
                <span>@MadBitcoins</span>'''
html = html.replace(old_user_info, new_user_info)

# 4. Add toggleTheme JS function (before closing </script>)
theme_js = """
        // Theme toggle
        function toggleTheme() {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('tweetster_theme', next);
            updateThemeIcon(next);
        }
        function updateThemeIcon(theme) {
            const icon = document.getElementById('themeIcon');
            if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
        // Set icon on load
        updateThemeIcon(document.documentElement.getAttribute('data-theme') || 'dark');
"""
html = html.replace('    </script>', theme_js + '    </script>')

# 5. Also update meta theme-color for dark
old_meta_vp = '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
new_meta_vp = '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <meta name="theme-color" content="#15202b">'
html = html.replace(old_meta_vp, new_meta_vp)

with open(filepath, 'w') as f:
    f.write(html)

print('Done! Dark mode added with toggle.')
