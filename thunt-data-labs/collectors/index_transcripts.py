#!/usr/bin/env python3.12
"""
Bitcoin Group Transcript Indexer
Builds search index and viewer pages from PRIMARY SOURCE transcripts.
NEVER modifies original transcripts.
"""
import json, os, re, html
from pathlib import Path
from datetime import datetime

TRANSCRIPT_DIR = Path.home() / 'Sites' / '1n2.org' / 'bitcoingroup-audio' / 'transcripts'
DATA_JSON = Path.home() / 'Sites' / '1n2.org' / 'tbg-mirrors' / 'data.json'
OUTPUT_DIR = Path.home() / 'Sites' / '1n2.org' / 'tbg-mirrors' / 'transcripts'
DEPLOY_HOST = 'root@157.245.186.58'
DEPLOY_PATH = '/var/www/html/tbg-mirrors/transcripts/'

def load_episodes():
    """Load episode metadata from data.json."""
    d = json.load(open(DATA_JSON))
    eps = {}
    for e in d['episodes']:
        eps[e['num']] = e
    return eps

def parse_transcript(filepath):
    """Read transcript, extract metadata from header comments."""
    text = filepath.read_text(errors='ignore')
    lines = text.split('\n')
    
    meta = {}
    body_start = 0
    for i, line in enumerate(lines):
        if line.startswith('# '):
            if 'Date:' in line:
                meta['date'] = line.split('Date:')[1].strip()
            elif 'Duration:' in line:
                meta['duration'] = line.split('Duration:')[1].strip()
            elif 'Transcribed' in line:
                meta['model'] = line.split('Whisper')[1].strip().strip('()') if 'Whisper' in line else ''
            elif not meta.get('title'):
                meta['title'] = line.lstrip('# ').strip()
        elif line.strip() and not line.startswith('#'):
            body_start = i
            break
    
    body = '\n'.join(lines[body_start:]).strip()
    meta['body'] = body
    meta['word_count'] = len(body.split())
    return meta

def build_search_index(episodes, transcripts):
    """Build lightweight search index for client-side search."""
    index = []
    for num in sorted(transcripts.keys()):
        t = transcripts[num]
        ep = episodes.get(num, {})
        
        # Extract key sentences (first 500 words for preview)
        preview = ' '.join(t['body'].split()[:80])
        
        index.append({
            'num': num,
            'title': ep.get('title', t.get('title', f'Episode #{num}')),
            'date': ep.get('date', t.get('date', '')),
            'words': t['word_count'],
            'preview': preview
        })
    
    return index

def build_transcript_page(num, meta, episode):
    """Build a styled reader page for a single transcript. Read-only view."""
    title = episode.get('title', meta.get('title', f'The Bitcoin Group #{num}'))
    date = episode.get('date', meta.get('date', ''))
    words = meta['word_count']
    
    # Escape body for HTML but preserve paragraphs
    body = html.escape(meta['body'])
    # Split into paragraphs on double newlines or long gaps
    paragraphs = re.split(r'\n\n+', body)
    if len(paragraphs) < 3:
        # Single block — split on sentences for readability
        paragraphs = re.split(r'(?<=[.!?])\s{2,}', body)
    
    body_html = '\n'.join(f'<p>{p.strip()}</p>' for p in paragraphs if p.strip())
    
    return f'''<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>TBG #{num} Transcript — {html.escape(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
:root{{--bg:#0a0e17;--card:#111827;--border:#1e293b;--text:#e2e8f0;--muted:#64748b;--accent:#22d3ee}}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'DM Sans',system-ui,sans-serif;background:var(--bg);color:var(--text);font-size:17px;line-height:1.8}}
a{{color:var(--accent);text-decoration:none}}a:hover{{color:#fff}}
.wrap{{max-width:800px;margin:0 auto;padding:2rem 1.5rem}}
.nav{{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;font-size:.9rem;flex-wrap:wrap;gap:8px}}
h1{{font-size:1.3rem;margin-bottom:.3rem;font-weight:700;color:#fff}}
.meta{{color:var(--muted);font-size:.85rem;font-family:'JetBrains Mono',monospace;margin-bottom:1.5rem}}
.meta span{{margin-right:1rem}}
.body{{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:1.5rem 2rem}}
.body p{{margin-bottom:1.2rem;font-size:1.05rem;color:#cbd5e1}}
.body p:last-child{{margin-bottom:0}}
.notice{{font-size:.72rem;color:var(--muted);text-align:center;margin-top:1.5rem;font-style:italic}}
.search-hl{{background:rgba(34,211,238,.2);border-radius:2px;padding:0 2px}}
</style></head><body>
<div class="wrap">
<div class="nav">
<a href="/tbg-mirrors/transcripts/">← All Transcripts</a>
<span>
{f'<a href="TBG-{num-1:03d}.html">← Prev</a> · ' if num > 1 else ''}
<a href="/tbg-mirrors/">Episode Tracker</a>
{f' · <a href="TBG-{num+1:03d}.html">Next →</a>' if num < 485 else ''}
</span>
</div>
<h1>#{num} — {html.escape(title)}</h1>
<div class="meta"><span>📅 {date}</span><span>📝 {words:,} words</span></div>
<div class="body">
{body_html}
</div>
<div class="notice">Primary source transcript. Whisper AI transcription — may contain errors. Do not edit.</div>
</div></body></html>'''

def build_index_page(index_data, episodes):
    """Build the main transcript index/browser page."""
    total_words = sum(e['words'] for e in index_data)
    total_eps = len(index_data)
    
    rows = ''
    for e in sorted(index_data, key=lambda x: -x['num']):
        rows += f'''<a href="TBG-{e['num']:03d}.html" class="row">
<span class="num">#{e['num']}</span>
<span class="title">{html.escape(e['title'][:70])}</span>
<span class="date">{e['date']}</span>
<span class="words">{e['words']:,}w</span>
</a>\n'''
    
    return f'''<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Bitcoin Group Transcripts — Index</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
:root{{--bg:#0a0e17;--card:#111827;--border:#1e293b;--text:#e2e8f0;--muted:#64748b;--accent:#22d3ee}}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'DM Sans',system-ui,sans-serif;background:var(--bg);color:var(--text);font-size:17px}}
a{{color:var(--accent);text-decoration:none}}a:hover{{color:#fff}}
.wrap{{max-width:1000px;margin:0 auto;padding:2rem 1.5rem}}
header{{margin-bottom:1.5rem}}
header h1{{font-family:'JetBrains Mono',monospace;font-size:1.4rem;color:var(--accent);margin-bottom:.5rem}}
.stats{{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:1rem}}
.stat{{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 16px;text-align:center}}
.stat .n{{font-family:'JetBrains Mono',monospace;font-size:1.3rem;font-weight:700;color:var(--accent)}}
.stat .l{{font-size:.7rem;color:var(--muted)}}
.search-box{{width:100%;padding:10px 14px;background:var(--card);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:1rem;font-family:'DM Sans',sans-serif;margin-bottom:1rem}}
.search-box:focus{{outline:none;border-color:var(--accent)}}
.search-box::placeholder{{color:var(--muted)}}
.row{{display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid rgba(30,41,59,.3);text-decoration:none;color:var(--text);transition:background .15s}}
.row:hover{{background:rgba(34,211,238,.04)}}
.num{{font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--accent);min-width:50px;font-size:.9rem}}
.title{{flex:1;font-size:.95rem}}
.date{{font-family:'JetBrains Mono',monospace;font-size:.78rem;color:var(--muted);min-width:90px}}
.words{{font-size:.75rem;color:var(--muted);min-width:60px;text-align:right}}
.results-count{{font-size:.85rem;color:var(--muted);margin-bottom:.5rem}}
@media(max-width:700px){{.date,.words{{display:none}}.num{{min-width:40px}}}}
</style></head><body>
<div class="wrap">
<header>
<a href="/tbg-mirrors/" style="font-size:.85rem">← Episode Tracker</a>
<h1>📜 Bitcoin Group Transcripts</h1>
<div class="stats">
<div class="stat"><div class="n">{total_eps}</div><div class="l">Transcripts</div></div>
<div class="stat"><div class="n">{total_words:,}</div><div class="l">Total Words</div></div>
<div class="stat"><div class="n">#1–#485</div><div class="l">Range</div></div>
<div class="stat"><div class="n">28.5 MB</div><div class="l">Text Data</div></div>
</div>
</header>
<input type="text" class="search-box" id="q" placeholder="Search transcripts... (episode #, title, topic)" oninput="filter(this.value)">
<div class="results-count" id="rc">{total_eps} transcripts</div>
<div id="list">
{rows}
</div>
</div>
<script>
const rows=document.querySelectorAll('.row');
function filter(q){{
  q=q.toLowerCase().trim();
  let c=0;
  rows.forEach(r=>{{
    const t=r.textContent.toLowerCase();
    const show=!q||t.includes(q);
    r.style.display=show?'flex':'none';
    if(show)c++;
  }});
  document.getElementById('rc').textContent=c+' transcript'+(c!==1?'s':'');
}}
// Check URL hash for search
if(location.hash){{const q=decodeURIComponent(location.hash.slice(1));document.getElementById('q').value=q;filter(q);}}
</script>
</body></html>'''

def main():
    print("📜 Bitcoin Group Transcript Indexer")
    print("   NEVER modifies original transcripts\n")
    
    episodes = load_episodes()
    transcripts = {}
    
    # Parse all transcripts
    files = sorted(TRANSCRIPT_DIR.glob('TBG-*.txt'))
    for f in files:
        num = int(f.stem.replace('TBG-', ''))
        meta = parse_transcript(f)
        transcripts[num] = meta
    
    print(f"  Parsed {len(transcripts)} transcripts")
    
    # Build search index
    index_data = build_search_index(episodes, transcripts)
    index_path = OUTPUT_DIR / 'search-index.json'
    json.dump(index_data, open(index_path, 'w'), ensure_ascii=False)
    print(f"  Built search index: {len(index_data)} entries")
    
    # Build individual transcript pages
    for num, meta in transcripts.items():
        ep = episodes.get(num, {})
        page = build_transcript_page(num, meta, ep)
        (OUTPUT_DIR / f'TBG-{num:03d}.html').write_text(page)
    print(f"  Built {len(transcripts)} transcript pages")
    
    # Build index page
    index_html = build_index_page(index_data, episodes)
    (OUTPUT_DIR / 'index.html').write_text(index_html)
    print("  Built index page")
    
    # Deploy
    import subprocess
    subprocess.run(['ssh', '-o', 'ConnectTimeout=10', DEPLOY_HOST,
                   f'mkdir -p {DEPLOY_PATH}'], capture_output=True, timeout=10)
    
    # Deploy index and search data first
    for f in ['index.html', 'search-index.json']:
        subprocess.run(['scp', '-o', 'ConnectTimeout=10',
                       str(OUTPUT_DIR / f), f'{DEPLOY_HOST}:{DEPLOY_PATH}'],
                      capture_output=True, timeout=30)
    
    # Deploy transcript pages in batches
    html_files = list(OUTPUT_DIR.glob('TBG-*.html'))
    batch_size = 50
    for i in range(0, len(html_files), batch_size):
        batch = html_files[i:i+batch_size]
        cmd = ['scp', '-o', 'ConnectTimeout=10'] + [str(f) for f in batch] + [f'{DEPLOY_HOST}:{DEPLOY_PATH}']
        subprocess.run(cmd, capture_output=True, timeout=60)
        print(f"  Deployed batch {i//batch_size + 1}/{(len(html_files)-1)//batch_size + 1}")
    
    print(f"\n  Done! View at https://1n2.org/tbg-mirrors/transcripts/")

if __name__ == '__main__':
    main()
