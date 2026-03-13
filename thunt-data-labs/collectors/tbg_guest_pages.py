#!/usr/bin/env python3.12
"""
TBG Guest Database & Stats Builder
Creates SQLite DB, computes all stats, generates guest pages.

Usage:
  python3.12 tbg_guest_pages.py          # Build DB + pages + deploy
  python3.12 tbg_guest_pages.py --stats   # Show stats only
"""
import json, sqlite3, os, re, html as H, argparse, subprocess
from pathlib import Path
from collections import defaultdict, Counter
from datetime import datetime
from itertools import combinations

BASE = Path.home() / 'Sites' / '1n2.org' / 'tbg-mirrors'
GUESTS_JSON = BASE / 'guests.json'
PREDICTIONS_JSON = BASE / 'predictions.json'
M8_JSON = BASE / 'magic8ball.json'
DATA_JSON = BASE / 'data.json'
DB_PATH = BASE / 'tbg-guests.db'
OUT = BASE / 'guests'
DEPLOY_HOST = 'root@157.245.186.58'
DEPLOY_PATH = '/var/www/html/tbg-mirrors/guests/'


def build_db():
    """Create/rebuild SQLite database with all guest data."""
    guests = json.load(open(GUESTS_JSON))
    episodes_data = json.load(open(DATA_JSON))
    ep_map = {e['num']: e for e in episodes_data['episodes']}
    
    # Load predictions if available
    preds = {}
    if PREDICTIONS_JSON.exists():
        pd = json.load(open(PREDICTIONS_JSON))
        for p in pd.get('predictions', []):
            preds.setdefault(p['speaker'], []).append(p)
    
    # Load 8-ball if available
    m8_episodes = {}
    if M8_JSON.exists():
        m8 = json.load(open(M8_JSON))
        for ep in m8.get('episodes', []):
            m8_episodes[ep['episode']] = ep
    
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("DROP TABLE IF EXISTS guests")
    conn.execute("DROP TABLE IF EXISTS appearances")
    conn.execute("DROP TABLE IF EXISTS pairs")
    conn.execute("DROP TABLE IF EXISTS predictions")
    
    conn.execute("""CREATE TABLE guests (
        id INTEGER PRIMARY KEY, name TEXT UNIQUE, slug TEXT,
        total_appearances INTEGER DEFAULT 0, first_episode INTEGER, last_episode INTEGER,
        first_date TEXT, last_date TEXT, is_host INTEGER DEFAULT 0,
        prediction_correct INTEGER DEFAULT 0, prediction_wrong INTEGER DEFAULT 0,
        m8_correct INTEGER DEFAULT 0, m8_wrong INTEGER DEFAULT 0,
        max_consecutive INTEGER DEFAULT 0, active_streak INTEGER DEFAULT 0)""")
    
    conn.execute("""CREATE TABLE appearances (
        id INTEGER PRIMARY KEY, guest_id INTEGER, episode INTEGER, date TEXT,
        FOREIGN KEY(guest_id) REFERENCES guests(id))""")
    
    conn.execute("""CREATE TABLE pairs (
        guest1_id INTEGER, guest2_id INTEGER, count INTEGER DEFAULT 0,
        PRIMARY KEY(guest1_id, guest2_id))""")
    
    conn.execute("""CREATE TABLE predictions (
        id INTEGER PRIMARY KEY, guest_id INTEGER, episode INTEGER, date TEXT,
        direction TEXT, correct INTEGER, price_at REAL, price_7d REAL, context TEXT,
        source TEXT DEFAULT 'prediction')""")
    
    # Insert guests
    guest_ids = {}
    by_episode = guests.get('by_episode', {})
    
    # Collect all appearances
    all_appearances = defaultdict(list)  # name -> [ep_nums]
    for ep_str, guest_list in by_episode.items():
        ep_num = int(ep_str)
        for g in guest_list:
            all_appearances[g['name']].append(ep_num)
    
    # Insert each guest
    for name, ep_list in all_appearances.items():
        ep_list.sort()
        slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
        first_ep = ep_list[0]
        last_ep = ep_list[-1]
        first_date = ep_map.get(first_ep, {}).get('date', '')
        last_date = ep_map.get(last_ep, {}).get('date', '')
        is_host = 1 if name == 'Thomas Hunt' else 0
        
        # Calculate max consecutive and active streak
        max_consec = 1
        current = 1
        all_eps = sorted(set(int(k) for k in by_episode.keys()))
        ep_set = set(ep_list)
        for i in range(1, len(all_eps)):
            if all_eps[i] in ep_set and all_eps[i-1] in ep_set:
                current += 1
                max_consec = max(max_consec, current)
            elif all_eps[i] in ep_set:
                current = 1
        
        # Active streak — consecutive from the latest episode backwards
        active_streak = 0
        for i in range(len(all_eps)-1, -1, -1):
            if all_eps[i] in ep_set:
                active_streak += 1
            else:
                break
        
        # Prediction stats
        pred_correct = pred_wrong = 0
        name_lower = name.lower().split()[0] if name.split() else name.lower()
        for speaker, pred_list in preds.items():
            if speaker.lower() == name_lower or speaker.lower() in name.lower():
                for p in pred_list:
                    r = p.get('result')
                    if r:
                        if r.get('correct'): pred_correct += 1
                        else: pred_wrong += 1
        
        # 8-ball stats
        m8c = m8w = 0
        for ep_num in ep_list:
            m8ep = m8_episodes.get(ep_num)
            if m8ep:
                for gc in m8ep.get('guest_calls', []):
                    if gc['name'].lower().startswith(name_lower):
                        if gc.get('correct') == True: m8c += 1
                        elif gc.get('correct') == False: m8w += 1
        
        conn.execute("""INSERT INTO guests (name, slug, total_appearances, first_episode, last_episode,
            first_date, last_date, is_host, prediction_correct, prediction_wrong,
            m8_correct, m8_wrong, max_consecutive, active_streak)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (name, slug, len(ep_list), first_ep, last_ep, first_date, last_date, is_host,
             pred_correct, pred_wrong, m8c, m8w, max_consec, active_streak))
        guest_ids[name] = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        
        # Insert appearances
        for ep_num in ep_list:
            date = ep_map.get(ep_num, {}).get('date', '')
            conn.execute("INSERT INTO appearances (guest_id, episode, date) VALUES (?,?,?)",
                        (guest_ids[name], ep_num, date))
    
    # Calculate pairs (who appeared together)
    pair_counts = Counter()
    for ep_str, guest_list in by_episode.items():
        names = [g['name'] for g in guest_list if g['name'] in guest_ids]
        for a, b in combinations(sorted(set(names)), 2):
            pair_counts[(a, b)] += 1
    
    for (a, b), count in pair_counts.items():
        if a in guest_ids and b in guest_ids:
            conn.execute("INSERT INTO pairs VALUES (?,?,?)", (guest_ids[a], guest_ids[b], count))
    
    conn.commit()
    
    total_guests = conn.execute("SELECT COUNT(*) FROM guests").fetchone()[0]
    total_appearances = conn.execute("SELECT COUNT(*) FROM appearances").fetchone()[0]
    total_pairs = conn.execute("SELECT COUNT(*) FROM pairs WHERE count > 1").fetchone()[0]
    
    print(f'  DB: {total_guests} guests, {total_appearances} appearances, {total_pairs} pairs')
    conn.close()


CSS = """
:root{--bg:#0a0e17;--card:#111827;--border:#1e293b;--text:#e2e8f0;--muted:#64748b;--accent:#22d3ee;--green:#34d399;--amber:#fbbf24;--red:#f87171}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',system-ui,sans-serif;background:var(--bg);color:var(--text);font-size:17px;line-height:1.7}
a{color:var(--accent);text-decoration:none}a:hover{color:#fff;text-decoration:underline}
.wrap{max-width:1000px;margin:0 auto;padding:2rem 1.5rem}
.nav{font-size:.9rem;margin-bottom:1rem;display:flex;gap:12px;flex-wrap:wrap}
h1{font-family:'JetBrains Mono',monospace;font-size:1.4rem;color:var(--accent);margin-bottom:.5rem}
h2{font-size:1.1rem;color:var(--accent);margin:1.5rem 0 .8rem;padding-bottom:.4rem;border-bottom:1px solid var(--border)}
.stats{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:1.5rem}
.stat{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 16px;text-align:center}
.stat .n{font-family:'JetBrains Mono',monospace;font-size:1.3rem;font-weight:700}
.stat .l{font-size:.7rem;color:var(--muted)}
table{width:100%;border-collapse:collapse;margin-bottom:1rem}
th{text-align:left;padding:8px 10px;font-size:.78rem;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;border-bottom:2px solid var(--border)}
td{padding:8px 10px;border-bottom:1px solid rgba(30,41,59,.3);font-size:.92rem}
tr:hover{background:rgba(34,211,238,.03)}
.tag{display:inline-block;font-size:.7rem;padding:2px 8px;border-radius:10px;font-weight:600;margin-left:4px}
.tag-host{background:rgba(251,191,36,.15);color:var(--amber)}.tag-top{background:rgba(52,211,153,.15);color:var(--green)}
.bar{height:4px;border-radius:2px;margin-top:2px;background:var(--accent)}
.ep-list{display:flex;flex-wrap:wrap;gap:4px;margin:8px 0}
.ep-chip{font-size:.72rem;padding:2px 6px;background:var(--card);border:1px solid var(--border);border-radius:4px;font-family:'JetBrains Mono',monospace}
.ep-chip:hover{border-color:var(--accent)}
.pair{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(30,41,59,.2);font-size:.9rem}
@media(max-width:700px){.stats{gap:6px}.stat{padding:6px 10px}.stat .n{font-size:1rem}table{font-size:.85rem}}
"""
FONTS = '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">'

def page(title, body, nav=''):
    return f'''<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{title} — TBG Guests</title>{FONTS}<style>{CSS}</style></head><body><div class="wrap">
<div class="nav"><a href="/tbg-mirrors/">← Episode Tracker</a><a href="/tbg-mirrors/guests/">👥 All Guests</a><a href="/tbg-mirrors/predictions/">🔮 Predictions</a><a href="/tbg-mirrors/transcripts/">📜 Transcripts</a>{nav}</div>
{body}</div></body></html>'''


def build_index_page(conn):
    """Build the main guests index with leaderboard."""
    guests = conn.execute("""SELECT * FROM guests ORDER BY total_appearances DESC""").fetchall()
    cols = [d[0] for d in conn.execute("SELECT * FROM guests LIMIT 0").description]
    
    total = len(guests)
    total_app = sum(g[cols.index('total_appearances')] for g in guests)
    top = guests[0] if guests else None
    
    stats = f'''<h1>👥 Bitcoin Group Panelists</h1>
<p style="color:var(--muted);font-size:.9rem;margin-bottom:1rem">Everyone who appeared on The Bitcoin Group, extracted from show intros across 472 episodes.</p>
<div class="stats">
<div class="stat"><div class="n" style="color:var(--accent)">{total}</div><div class="l">Unique Guests</div></div>
<div class="stat"><div class="n" style="color:var(--green)">{total_app:,}</div><div class="l">Total Appearances</div></div>
<div class="stat"><div class="n" style="color:var(--amber)">472</div><div class="l">Episodes Scanned</div></div>
</div>'''
    
    # Main table
    rows = ''
    for i, g in enumerate(guests[:80]):
        name = g[cols.index('name')]
        slug = g[cols.index('slug')]
        count = g[cols.index('total_appearances')]
        first = g[cols.index('first_episode')]
        last = g[cols.index('last_episode')]
        consec = g[cols.index('max_consecutive')]
        is_host = g[cols.index('is_host')]
        first_date = g[cols.index('first_date')][:7] if g[cols.index('first_date')] else ''
        last_date = g[cols.index('last_date')][:7] if g[cols.index('last_date')] else ''
        
        medal = ['🥇','🥈','🥉'][i] if i < 3 else f'{i+1}.'
        tags = ''
        if is_host: tags += '<span class="tag tag-host">HOST</span>'
        if count >= 40: tags += '<span class="tag tag-top">TOP</span>'
        
        bar_w = min(100, count / (guests[0][cols.index('total_appearances')]  ) * 100)
        
        rows += f'''<tr>
<td>{medal}</td>
<td><a href="{slug}.html"><b>{H.escape(name)}</b></a>{tags}</td>
<td>{count}</td>
<td>#{first}</td><td>#{last}</td>
<td>{consec}</td>
<td style="min-width:60px"><div class="bar" style="width:{bar_w:.0f}%"></div></td>
</tr>'''
    
    table = f'''<h2>🏆 Appearance Leaderboard</h2>
<table><tr><th>#</th><th>Guest</th><th>Shows</th><th>First</th><th>Last</th><th>Consec</th><th>Bar</th></tr>{rows}</table>'''
    if total > 80:
        table += f'<p style="color:var(--muted);font-size:.85rem">Showing top 80 of {total} guests</p>'
    
    return page('All Guests', stats + table)


def build_guest_page(conn, guest_row, cols):
    """Build individual guest profile page."""
    name = guest_row[cols.index('name')]
    slug = guest_row[cols.index('slug')]
    count = guest_row[cols.index('total_appearances')]
    first_ep = guest_row[cols.index('first_episode')]
    last_ep = guest_row[cols.index('last_episode')]
    first_date = guest_row[cols.index('first_date')] or ''
    last_date = guest_row[cols.index('last_date')] or ''
    consec = guest_row[cols.index('max_consecutive')]
    is_host = guest_row[cols.index('is_host')]
    pred_c = guest_row[cols.index('prediction_correct')]
    pred_w = guest_row[cols.index('prediction_wrong')]
    m8c = guest_row[cols.index('m8_correct')]
    m8w = guest_row[cols.index('m8_wrong')]
    gid = guest_row[cols.index('id')]
    
    pred_total = pred_c + pred_w
    pred_acc = f'{pred_c/pred_total*100:.0f}%' if pred_total else '—'
    m8_total = m8c + m8w
    m8_acc = f'{m8c/m8_total*100:.0f}%' if m8_total else '—'
    
    # Span
    span_years = ''
    if first_date and last_date:
        try:
            y1 = int(first_date[:4])
            y2 = int(last_date[:4])
            span_years = f'{y2 - y1 + 1} years'
        except: pass
    
    stats = f'''<h1>👤 {H.escape(name)}</h1>
<div class="stats">
<div class="stat"><div class="n" style="color:var(--accent)">{count}</div><div class="l">Appearances</div></div>
<div class="stat"><div class="n" style="color:var(--green)">#{first_ep}–#{last_ep}</div><div class="l">Range</div></div>
<div class="stat"><div class="n" style="color:var(--amber)">{consec}</div><div class="l">Max Consecutive</div></div>
<div class="stat"><div class="n" style="color:var(--accent)">{span_years or "—"}</div><div class="l">Span</div></div>
</div>'''
    
    if pred_total or m8_total:
        stats += '<div class="stats">'
        if pred_total:
            pc = 'var(--green)' if pred_c/pred_total>.55 else 'var(--amber)' if pred_c/pred_total>.45 else 'var(--red)'
            stats += f'<div class="stat"><div class="n" style="color:{pc}">{pred_acc}</div><div class="l">Prediction Accuracy ({pred_c}/{pred_total})</div></div>'
        if m8_total:
            mc = 'var(--green)' if m8c/m8_total>.55 else 'var(--amber)' if m8c/m8_total>.45 else 'var(--red)'
            stats += f'<div class="stat"><div class="n" style="color:{mc}">{m8_acc}</div><div class="l">8-Ball Accuracy ({m8c}/{m8_total})</div></div>'
        stats += '</div>'
    
    # Episode list
    appearances = conn.execute("SELECT episode, date FROM appearances WHERE guest_id=? ORDER BY episode", (gid,)).fetchall()
    ep_html = '<h2>📺 All Episodes (' + str(len(appearances)) + ')</h2><div class="ep-list">'
    for ep, date in appearances:
        ep_html += f'<a href="/tbg-mirrors/transcripts/TBG-{ep:03d}.html" class="ep-chip" title="{date}">#{ep}</a>'
    ep_html += '</div>'
    
    # Co-appearances (who they appeared with most)
    pairs = conn.execute("""
        SELECT g.name, g.slug, p.count FROM pairs p
        JOIN guests g ON (g.id = CASE WHEN p.guest1_id=? THEN p.guest2_id ELSE p.guest1_id END)
        WHERE p.guest1_id=? OR p.guest2_id=?
        ORDER BY p.count DESC LIMIT 15
    """, (gid, gid, gid)).fetchall()
    
    pairs_html = ''
    if pairs:
        pairs_html = '<h2>🤝 Most Frequent Co-Panelists</h2>'
        for pname, pslug, pcount in pairs:
            bar_w = min(100, pcount / (pairs[0][2]) * 100)
            pairs_html += f'<div class="pair"><a href="{pslug}.html">{H.escape(pname)}</a><span style="color:var(--muted);font-family:JetBrains Mono,monospace;font-size:.82rem">{pcount} shows</span></div>'
    
    return page(name, stats + ep_html + pairs_html)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--stats', action='store_true')
    args = parser.parse_args()
    
    print(f'👥 TBG Guest Database & Page Builder\n')
    
    # Build DB
    print('  Building database...')
    build_db()
    
    conn = sqlite3.connect(str(DB_PATH))
    cols = [d[0] for d in conn.execute("SELECT * FROM guests LIMIT 0").description]
    
    if args.stats:
        guests = conn.execute("SELECT * FROM guests ORDER BY total_appearances DESC LIMIT 20").fetchall()
        for g in guests:
            print(f'  {g[cols.index("name")]:<25} {g[cols.index("total_appearances")]:>4} eps  consec:{g[cols.index("max_consecutive")]:>3}  pred:{g[cols.index("prediction_correct")]}/{g[cols.index("prediction_correct")]+g[cols.index("prediction_wrong")]}')
        conn.close()
        return
    
    # Build pages
    OUT.mkdir(exist_ok=True)
    
    # Index page
    (OUT / 'index.html').write_text(build_index_page(conn))
    print('  Built index page')
    
    # Individual guest pages
    guests = conn.execute("SELECT * FROM guests ORDER BY total_appearances DESC").fetchall()
    built = 0
    for g in guests:
        if g[cols.index('total_appearances')] >= 2:  # Only build pages for 2+ appearances
            p = build_guest_page(conn, g, cols)
            slug = g[cols.index('slug')]
            (OUT / f'{slug}.html').write_text(p)
            built += 1
    print(f'  Built {built} guest pages')
    
    conn.close()
    
    # Deploy
    subprocess.run(['ssh', '-o', 'ConnectTimeout=10', DEPLOY_HOST, f'mkdir -p {DEPLOY_PATH}'], capture_output=True, timeout=10)
    files = list(OUT.glob('*.html'))
    # Deploy in batches
    batch_size = 30
    for i in range(0, len(files), batch_size):
        batch = files[i:i+batch_size]
        subprocess.run(['scp', '-o', 'ConnectTimeout=10'] + [str(f) for f in batch] + [f'{DEPLOY_HOST}:{DEPLOY_PATH}'], capture_output=True, timeout=30)
    print(f'  Deployed {len(files)} pages')
    
    # Deploy DB
    subprocess.run(['scp', '-o', 'ConnectTimeout=10', str(DB_PATH), f'{DEPLOY_HOST}:/var/www/html/tbg-mirrors/'], capture_output=True, timeout=30)
    print(f'  Deployed database')
    
    # Add link to main TBG page
    print(f'\n  View: https://1n2.org/tbg-mirrors/guests/')

if __name__ == '__main__':
    main()
