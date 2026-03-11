#!/usr/bin/env python3.12
"""Build TBG Predictions web pages — leaderboard + speaker subpages with source quotes."""
import json, html, os, subprocess
from pathlib import Path
from collections import defaultdict

DATA = json.load(open(Path.home() / 'Sites' / '1n2.org' / 'tbg-mirrors' / 'predictions.json'))
OUT = Path.home() / 'Sites' / '1n2.org' / 'tbg-mirrors' / 'predictions'
DEPLOY_HOST = 'root@157.245.186.58'
DEPLOY_PATH = '/var/www/html/tbg-mirrors/predictions/'

CSS = """
:root{--bg:#0a0e17;--card:#111827;--border:#1e293b;--text:#e2e8f0;--muted:#64748b;--accent:#22d3ee;--green:#34d399;--amber:#fbbf24;--red:#f87171}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',system-ui,sans-serif;background:var(--bg);color:var(--text);font-size:17px;line-height:1.7}
a{color:var(--accent);text-decoration:none}a:hover{color:#fff;text-decoration:underline}
.wrap{max-width:1000px;margin:0 auto;padding:2rem 1.5rem}
.nav{font-size:.9rem;margin-bottom:1rem;display:flex;gap:12px;flex-wrap:wrap}
h1{font-family:'JetBrains Mono',monospace;font-size:1.4rem;color:var(--accent);margin-bottom:.3rem}
h2{font-size:1.15rem;color:var(--accent);margin:1.5rem 0 .8rem;padding-bottom:.4rem;border-bottom:1px solid var(--border)}
.stats{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:1.5rem}
.stat{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:10px 18px;text-align:center}
.stat .n{font-family:'JetBrains Mono',monospace;font-size:1.4rem;font-weight:700}
.stat .n.g{color:var(--green)}.stat .n.r{color:var(--red)}.stat .n.a{color:var(--amber)}.stat .n.c{color:var(--accent)}
.stat .l{font-size:.72rem;color:var(--muted)}
table{width:100%;border-collapse:collapse;margin-bottom:1rem}
th{text-align:left;padding:10px 12px;font-size:.8rem;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;border-bottom:2px solid var(--border)}
td{padding:10px 12px;border-bottom:1px solid rgba(30,41,59,.3);font-size:.95rem}
tr:hover{background:rgba(34,211,238,.03)}
.medal{font-size:1.1rem;min-width:30px;display:inline-block}
.acc{font-family:'JetBrains Mono',monospace;font-weight:700}
.acc-g{color:var(--green)}.acc-y{color:var(--amber)}.acc-r{color:var(--red)}
.bar{height:4px;border-radius:2px;margin-top:2px}
.bar-g{background:var(--green)}.bar-r{background:var(--red)}.bar-a{background:var(--amber)}
.pred{background:var(--card);border:1px solid var(--border);border-radius:8px;margin-bottom:10px;padding:14px 18px}
.pred-head{display:flex;align-items:center;gap:10px;margin-bottom:6px}
.pred-ep{font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--accent);font-size:.9rem}
.pred-dir{font-size:.75rem;padding:2px 8px;border-radius:10px;font-weight:700}
.dir-up{background:rgba(52,211,153,.15);color:var(--green)}.dir-dn{background:rgba(248,113,113,.15);color:var(--red)}
.pred-result{margin-left:auto;font-size:.85rem;font-weight:700}
.res-correct{color:var(--green)}.res-wrong{color:var(--red)}.res-na{color:var(--muted)}
.pred-quote{font-size:.9rem;color:#94a3b8;font-style:italic;border-left:3px solid var(--border);padding-left:12px;margin:6px 0}
.pred-price{font-size:.82rem;color:var(--muted);font-family:'JetBrains Mono',monospace}
.pred-link{font-size:.8rem;margin-top:4px}
@media(max-width:700px){.stats{gap:8px}.stat{padding:8px 12px}.stat .n{font-size:1.1rem}}
"""

FONTS = '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">'

def page_wrap(title, body, nav_extra=''):
    return f'''<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{title} — TBG Predictions</title>
{FONTS}<style>{CSS}</style></head><body>
<div class="wrap">
<div class="nav"><a href="/tbg-mirrors/">← Episode Tracker</a><a href="/tbg-mirrors/predictions/">🏆 Leaderboard</a><a href="/tbg-mirrors/transcripts/">📜 Transcripts</a>{nav_extra}</div>
{body}
</div></body></html>'''

def build_leaderboard():
    lb = DATA['leaderboard']
    preds = DATA['predictions']
    total = len(preds)
    evaluated = sum(1 for p in preds if p.get('result'))
    correct = sum(1 for p in preds if p.get('result') and p['result'].get('correct'))
    
    stats_html = f'''
<h1>🔮 TBG Prediction Tracker</h1>
<p style="color:var(--muted);font-size:.9rem;margin-bottom:1rem">Price predictions extracted from 482 Bitcoin Group transcripts, verified against actual BTC prices.</p>
<div class="stats">
<div class="stat"><div class="n c">{total:,}</div><div class="l">Predictions Found</div></div>
<div class="stat"><div class="n g">{evaluated:,}</div><div class="l">Price-Verified</div></div>
<div class="stat"><div class="n g">{correct:,}</div><div class="l">Correct</div></div>
<div class="stat"><div class="n a">{correct/evaluated*100:.1f}%</div><div class="l">Overall Accuracy</div></div>
</div>'''
    
    # Leaderboard table
    rows = ''
    for i, entry in enumerate(lb):
        if entry['evaluated'] < 5:
            continue
        medal = ['🥇','🥈','🥉'][i] if i < 3 else f'&nbsp;{i+1}.'
        acc_class = 'acc-g' if entry['accuracy'] >= 60 else 'acc-y' if entry['accuracy'] >= 45 else 'acc-r'
        bar_class = 'bar-g' if entry['accuracy'] >= 60 else 'bar-a' if entry['accuracy'] >= 45 else 'bar-r'
        bar_w = entry['accuracy']
        qualified = ' ★' if entry['evaluated'] >= 5 else ''
        name_link = f'<a href="{entry["name"].lower().replace(" ","-")}.html">{entry["name"]}</a>'
        rows += f'''<tr>
<td><span class="medal">{medal}</span></td>
<td>{name_link}{qualified}</td>
<td>{entry['correct']}</td>
<td>{entry['wrong']}</td>
<td><span class="acc {acc_class}">{entry['accuracy']:.1f}%</span><div class="bar {bar_class}" style="width:{bar_w}%"></div></td>
<td>{entry['evaluated']}</td>
</tr>'''
    
    table = f'''<h2>🏆 Leaderboard</h2>
<p style="font-size:.82rem;color:var(--muted);margin-bottom:.5rem">★ = 5+ verified predictions (qualified). Checked against BTC price 7 days after episode.</p>
<table>
<tr><th>Rank</th><th>Speaker</th><th>Correct</th><th>Wrong</th><th>Accuracy</th><th>Verified</th></tr>
{rows}
</table>'''
    
    # Recent predictions sample
    recent = [p for p in preds if p.get('result') and p['speaker'] != 'Unknown'][-15:]
    recent.reverse()
    recent_html = '<h2>📝 Recent Verified Predictions</h2>'
    for p in recent:
        r = p['result']
        ep = p['episode']
        dir_class = 'dir-up' if p['direction'] == 'higher' else 'dir-dn'
        dir_label = '▲ Higher' if p['direction'] == 'higher' else '▼ Lower'
        res_class = 'res-correct' if r['correct'] else 'res-wrong'
        res_label = '✅ Correct' if r['correct'] else '❌ Wrong'
        ctx = html.escape(p.get('context', '')[:200])
        recent_html += f'''<div class="pred">
<div class="pred-head">
<span class="pred-ep"><a href="/tbg-mirrors/transcripts/TBG-{ep:03d}.html">#{ep}</a></span>
<span>{p['date']}</span>
<a href="{p['speaker'].lower().replace(' ','-')}.html">{p['speaker']}</a>
<span class="pred-dir {dir_class}">{dir_label}</span>
<span class="pred-result {res_class}">{res_label}</span>
</div>
<div class="pred-quote">"{ctx}"</div>
<div class="pred-price">${r['price_at_prediction']:,.0f} → ${r['price_7d_later']:,.0f} ({r['change_pct']:+.1f}% after 7d)</div>
<div class="pred-link"><a href="/tbg-mirrors/transcripts/TBG-{ep:03d}.html">Read full transcript →</a></div>
</div>'''
    
    return page_wrap('Prediction Leaderboard', stats_html + table + recent_html)

def build_speaker_page(name, preds):
    slug = name.lower().replace(' ', '-')
    evaluated = [p for p in preds if p.get('result')]
    correct = sum(1 for p in evaluated if p['result']['correct'])
    wrong = len(evaluated) - correct
    acc = correct / len(evaluated) * 100 if evaluated else 0
    
    stats_html = f'''
<h1>🔮 {html.escape(name)}</h1>
<p style="color:var(--muted);font-size:.9rem;margin-bottom:1rem">Prediction history from The Bitcoin Group transcripts</p>
<div class="stats">
<div class="stat"><div class="n c">{len(preds)}</div><div class="l">Total</div></div>
<div class="stat"><div class="n g">{correct}</div><div class="l">Correct</div></div>
<div class="stat"><div class="n r">{wrong}</div><div class="l">Wrong</div></div>
<div class="stat"><div class="n {'g' if acc>=55 else 'a' if acc>=45 else 'r'}">{acc:.1f}%</div><div class="l">Accuracy</div></div>
</div>'''
    
    # All predictions with quotes
    preds_html = '<h2>All Predictions</h2>'
    for p in sorted(preds, key=lambda x: -x['episode']):
        r = p.get('result')
        ep = p['episode']
        dir_class = 'dir-up' if p['direction'] == 'higher' else 'dir-dn'
        dir_label = '▲ Higher' if p['direction'] == 'higher' else '▼ Lower'
        ctx = html.escape(p.get('context', '')[:250])
        
        if r:
            res_class = 'res-correct' if r['correct'] else 'res-wrong'
            res_label = '✅' if r['correct'] else '❌'
            price_html = f'<div class="pred-price">${r["price_at_prediction"]:,.0f} → ${r["price_7d_later"]:,.0f} ({r["change_pct"]:+.1f}%)</div>'
        else:
            res_class = 'res-na'
            res_label = '—'
            price_html = '<div class="pred-price" style="color:var(--muted)">No price data</div>'
        
        preds_html += f'''<div class="pred">
<div class="pred-head">
<span class="pred-ep"><a href="/tbg-mirrors/transcripts/TBG-{ep:03d}.html">#{ep}</a></span>
<span style="font-size:.85rem;color:var(--muted)">{p['date']}</span>
<span class="pred-dir {dir_class}">{dir_label}</span>
<span class="pred-result {res_class}">{res_label}</span>
</div>
<div class="pred-quote">"{ctx}"</div>
{price_html}
<div class="pred-link"><a href="/tbg-mirrors/transcripts/TBG-{ep:03d}.html">Source transcript →</a></div>
</div>'''
    
    return page_wrap(f'{name} — Predictions', stats_html + preds_html)

def main():
    print("🔮 Building TBG Prediction Pages")
    OUT.mkdir(exist_ok=True)
    
    # Build main leaderboard
    (OUT / 'index.html').write_text(build_leaderboard())
    print("  Built leaderboard")
    
    # Group predictions by speaker
    by_speaker = defaultdict(list)
    for p in DATA['predictions']:
        by_speaker[p['speaker']].append(p)
    
    # Build speaker pages
    for name, preds in by_speaker.items():
        slug = name.lower().replace(' ', '-')
        page = build_speaker_page(name, preds)
        (OUT / f'{slug}.html').write_text(page)
    print(f"  Built {len(by_speaker)} speaker pages")
    
    # Deploy
    subprocess.run(['ssh', '-o', 'ConnectTimeout=10', DEPLOY_HOST, f'mkdir -p {DEPLOY_PATH}'], capture_output=True, timeout=10)
    files = list(OUT.glob('*.html'))
    subprocess.run(['scp', '-o', 'ConnectTimeout=10'] + [str(f) for f in files] + [f'{DEPLOY_HOST}:{DEPLOY_PATH}'], capture_output=True, timeout=30)
    print(f"  Deployed {len(files)} pages")
    print(f"  View at https://1n2.org/tbg-mirrors/predictions/")

if __name__ == '__main__':
    main()
