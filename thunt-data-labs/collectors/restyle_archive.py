#!/usr/bin/env python3.12
"""Restyle archived briefing pages to match Dashboarder dark theme."""
import re
from pathlib import Path

ARCHIVE = Path.home() / 'Sites' / '1n2.org' / 'dashboarder' / 'archive'

TEMPLATE_HEAD = '''<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{title} — Dashboarder</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
:root{{--bg:#0a0e17;--card:#111827;--border:#1e293b;--text:#e2e8f0;--muted:#64748b;--accent:#22d3ee;--green:#34d399;--amber:#fbbf24;--red:#f87171}}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'DM Sans',system-ui,sans-serif;background:var(--bg);color:var(--text);font-size:17px;line-height:1.7}}
a{{color:var(--accent);text-decoration:none}}a:hover{{color:#fff;text-decoration:underline}}
.wrap{{max-width:800px;margin:0 auto;padding:2rem 1.5rem}}
.nav{{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;font-size:.9rem}}
h1{{font-family:'JetBrains Mono',monospace;font-size:1.3rem;font-weight:700;color:var(--accent);margin-bottom:1.5rem}}
.sec{{background:var(--card);border:1px solid var(--border);border-radius:8px;margin-bottom:12px;overflow:hidden}}
.sh{{padding:14px 16px;font-weight:600;font-size:1.1rem;color:var(--accent);border-bottom:1px solid var(--border)}}
.sb{{padding:4px 16px 12px}}
.ns{{padding:14px 0;border-bottom:1px solid rgba(30,41,59,.3);font-size:1.05rem;line-height:1.7;color:#cbd5e1}}
.ns:last-child{{border-bottom:none}}
.nl{{color:var(--accent);font-weight:700;font-size:.9rem;letter-spacing:.3px}}
.nm{{color:var(--accent);font-size:.85rem;font-weight:600}}
.it{{padding:6px 0;font-size:1rem;border-bottom:1px solid rgba(30,41,59,.3)}}
.it:last-child{{border:none}}
.it a,.il{{color:var(--text)}}
.it a:hover{{color:var(--accent)}}
.it .sr{{color:var(--muted);font-size:.75rem;float:right}}
.tp{{font-size:.78rem;color:var(--muted);padding:7px 0 2px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}}
.cc{{padding:0}}.cl{{font-weight:600}}.cp{{font-size:1.1rem}}.ch{{font-size:.8rem}}
.ch.dn{{color:var(--red)}}.ch.up{{color:var(--green)}}
.wx{{padding:4px 0}}.wx-city{{font-weight:600;color:var(--accent)}}.wx-now{{color:var(--text)}}
.ft{{text-align:center;color:var(--muted);font-size:.7rem;padding:14px;border-top:1px solid var(--border);margin-top:12px}}
</style></head><body>
<div class="wrap">
<div class="nav"><a href="/dashboarder/">← Back to Dashboarder</a><a href="/dashboarder/archive/">All Briefings</a></div>
<h1>📰 {title}</h1>
'''

TEMPLATE_FOOT = '''
</div></body></html>'''

count = 0
for f in sorted(ARCHIVE.glob('briefing-*.html')):
    html = f.read_text(errors='ignore')
    
    # Skip if already restyled
    if '--bg:#0a0e17' in html:
        continue
    
    date = f.stem.replace('briefing-', '')
    title = f'Briefing — {date}'
    
    # Extract the content sections from the old HTML
    # Find all .sec blocks
    secs = re.findall(r'<div class="sec">.*?</div>\s*</div>', html, re.DOTALL)
    
    if not secs:
        # Try extracting body content
        body_match = re.search(r'<body[^>]*>(.*)</body>', html, re.DOTALL)
        if body_match:
            content = body_match.group(1)
        else:
            content = html
    else:
        content = '\n'.join(secs)
    
    new_html = TEMPLATE_HEAD.format(title=title) + content + TEMPLATE_FOOT
    f.write_text(new_html)
    count += 1

print(f'Restyled {count} archived briefings')
