#!/usr/bin/env python3.12
"""Restyle article reader pages + archive to match Dashboarder dark theme"""
import os, re
from pathlib import Path

ARTICLES = Path.home() / 'Sites' / '1n2.org' / 'dashboarder' / 'articles'

# New dark theme CSS for reader pages
DARK_CSS = """body{font-family:'DM Sans',system-ui,sans-serif;background:#0a0e17;color:#e2e8f0;line-height:1.8;max-width:720px;margin:0 auto;padding:2rem 1.5rem;font-size:17px}
h1{font-size:1.5rem;margin-bottom:.5rem;line-height:1.3;font-weight:700;color:#fff}
.meta{color:#64748b;font-size:.82rem;margin-bottom:1.5rem;font-family:'JetBrains Mono',monospace}
a{color:#22d3ee;text-decoration:none}a:hover{color:#fff;text-decoration:underline}
.nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;font-size:.9rem}
p{margin-bottom:1.1rem;font-size:1.05rem;color:#cbd5e1}
.summary{color:#94a3b8;border-left:3px solid #22d3ee;padding-left:1rem;margin-bottom:1.5rem;font-style:italic}
.ft{margin-top:2rem;padding-top:1rem;border-top:1px solid #1e293b;font-size:.75rem;color:#64748b;text-align:center}"""

# Old style patterns to match
OLD_PATTERNS = [
    r"body\{font-family:'Source Serif 4'[^}]+\}",
    r"body\{font-family:'Source Serif[^}]+\}",
]

# Font link replacement
OLD_FONT = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=JetBrains+Mono:wght@300&display=swap"
NEW_FONT = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400&display=swap"

count = 0
errors = 0

for f in ARTICLES.glob('*.html'):
    try:
        html = f.read_text(errors='ignore')
        
        if '#F0E4D0' in html or 'Source Serif' in html or 'Playfair' in html:
            # Replace font link
            html = html.replace(OLD_FONT, NEW_FONT)
            
            # Replace entire style block
            # Match from <style> to </style>
            style_match = re.search(r'<style>(.*?)</style>', html, re.DOTALL)
            if style_match:
                html = html[:style_match.start()] + '<style>\n' + DARK_CSS + '\n</style>' + html[style_match.end():]
            
            f.write_text(html)
            count += 1
    except Exception as e:
        errors += 1

print(f'Restyled {count} article pages ({errors} errors)')
