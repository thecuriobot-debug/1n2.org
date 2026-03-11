#!/usr/bin/env python3.12
"""Build TBG Mirrors analytics pages: Word Cloud, Topics, Stats, enhanced Guests."""
import json, html as H, re, subprocess
from pathlib import Path
from collections import defaultdict

BASE = Path.home() / 'Sites' / '1n2.org' / 'tbg-mirrors'
ANALYTICS = json.load(open(BASE / 'analytics.json'))
GUESTS_JSON = json.load(open(BASE / 'guests.json'))
DATA = json.load(open(BASE / 'data.json'))
PREDICTIONS = json.load(open(BASE / 'predictions.json')) if (BASE / 'predictions.json').exists() else {'predictions':[], 'leaderboard':[]}
M8 = json.load(open(BASE / 'magic8ball.json')) if (BASE / 'magic8ball.json').exists() else {'episodes':[]}
PRICES = json.load(open(BASE / 'btc-prices.json')) if (BASE / 'btc-prices.json').exists() else {}
DEPLOY = 'root@157.245.186.58'

ep_map = {e['num']: e for e in DATA['episodes']}

FONTS = '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">'

CSS = """
:root{--bg:#0a0e17;--card:#111827;--border:#1e293b;--text:#e2e8f0;--muted:#64748b;--accent:#22d3ee;--green:#34d399;--amber:#fbbf24;--red:#f87171}
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'DM Sans',system-ui,sans-serif;background:var(--bg);color:var(--text);font-size:17px;line-height:1.7}
a{color:var(--accent);text-decoration:none}a:hover{color:#fff;text-decoration:underline}
.wrap{max-width:1000px;margin:0 auto;padding:2rem 1.5rem}
.nav{font-size:.85rem;margin-bottom:1rem;display:flex;gap:10px;flex-wrap:wrap}
h1{font-family:'JetBrains Mono',monospace;font-size:1.3rem;color:var(--accent);margin-bottom:.5rem}
h2{font-size:1.05rem;color:var(--accent);margin:1.5rem 0 .7rem;padding-bottom:.3rem;border-bottom:1px solid var(--border)}
.stats{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:1.2rem}
.stat{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 14px;text-align:center}
.stat .n{font-family:'JetBrains Mono',monospace;font-size:1.2rem;font-weight:700}
.stat .l{font-size:.68rem;color:var(--muted)}
table{width:100%;border-collapse:collapse;margin-bottom:1rem}
th{text-align:left;padding:8px 10px;font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;border-bottom:2px solid var(--border)}
td{padding:7px 10px;border-bottom:1px solid rgba(30,41,59,.3);font-size:.9rem}tr:hover{background:rgba(34,211,238,.03)}
.cloud{display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center;padding:1rem;background:var(--card);border:1px solid var(--border);border-radius:8px;margin-bottom:1rem}
.cloud span{display:inline-block;padding:2px 6px;border-radius:4px;cursor:default;transition:opacity .2s}
.cloud span:hover{opacity:.7}
.bar-h{height:6px;border-radius:3px;margin-top:2px}
.topic-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(30,41,59,.2)}
.topic-name{min-width:120px;font-weight:600;font-size:.9rem}
.topic-bar{flex:1;height:8px;background:rgba(30,41,59,.3);border-radius:4px;overflow:hidden}
.topic-fill{height:100%;border-radius:4px;background:var(--accent)}
.topic-count{font-size:.8rem;color:var(--muted);min-width:60px;text-align:right;font-family:'JetBrains Mono',monospace}
.ep-chips{display:flex;flex-wrap:wrap;gap:3px;margin:6px 0}
.ep-chip{font-size:.7rem;padding:2px 5px;background:var(--card);border:1px solid var(--border);border-radius:3px;font-family:'JetBrains Mono',monospace}
.ep-chip:hover{border-color:var(--accent)}
.pair{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(30,41,59,.15);font-size:.88rem}
.timeline{display:flex;gap:2px;align-items:flex-end;height:40px}
.timeline-bar{flex:1;background:var(--accent);border-radius:2px 2px 0 0;min-width:6px;transition:opacity .2s}
.timeline-bar:hover{opacity:.7}
.g{color:var(--green)}.r{color:var(--red)}.a{color:var(--amber)}.c{color:var(--accent)}
@media(max-width:700px){.stats{gap:6px}.stat{padding:6px 10px}.stat .n{font-size:1rem}table{font-size:.82rem}}
"""

def page(title, body, extra_nav=''):
    return f'''<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{title} — TBG Mirrors</title>{FONTS}<style>{CSS}</style></head><body><div class="wrap">
<div class="nav"><a href="/tbg-mirrors/">← Episode Tracker</a><a href="/tbg-mirrors/guests/">👥 Guests</a><a href="/tbg-mirrors/analytics/topics.html">📊 Topics</a><a href="/tbg-mirrors/analytics/wordcloud.html">☁️ Words</a><a href="/tbg-mirrors/analytics/stats.html">📈 Stats</a><a href="/tbg-mirrors/predictions/">🔮 Predictions</a><a href="/tbg-mirrors/transcripts/">📜 Transcripts</a>{extra_nav}</div>
{body}</div></body></html>'''


def build_wordcloud():
    wc = ANALYTICS['word_cloud'][:150]
    max_count = wc[0]['count'] if wc else 1
    
    cloud_html = '<div class="cloud">'
    colors = ['#22d3ee','#34d399','#fbbf24','#f87171','#a78bfa','#f472b6','#fb923c','#38bdf8','#4ade80','#e879f9']
    for i, w in enumerate(wc):
        size = max(0.6, min(3.0, (w['count'] / max_count) * 3))
        color = colors[i % len(colors)]
        cloud_html += f'<span style="font-size:{size:.1f}rem;color:{color}" title="{w["word"]}: {w["count"]:,} mentions">{w["word"]}</span>'
    cloud_html += '</div>'
    
    # Year-by-year top words
    yearly = ''
    for year in sorted(ANALYTICS['yearly_stats'].keys(), reverse=True):
        ys = ANALYTICS['yearly_stats'][year]
        top = ys['top_words'][:15]
        words = ', '.join(f'<b>{w["word"]}</b> ({w["count"]:,})' for w in top[:8])
        yearly += f'<div style="padding:6px 0;border-bottom:1px solid rgba(30,41,59,.2);font-size:.88rem"><span style="font-family:JetBrains Mono,monospace;color:var(--accent);font-weight:700;min-width:50px;display:inline-block">{year}</span> {words}</div>'
    
    body = f'''<h1>☁️ Word Cloud</h1>
<p style="color:var(--muted);font-size:.88rem;margin-bottom:1rem">Top 150 words across {ANALYTICS["total_words"]:,} words in {ANALYTICS["total_transcripts"]} transcripts. Stop words removed.</p>
{cloud_html}
<h2>📅 Top Words by Year</h2>
{yearly}'''
    return page('Word Cloud', body)

def build_topics():
    topics = ANALYTICS['topics']
    sorted_topics = sorted(topics.items(), key=lambda x: -x[1]['total_mentions'])
    max_mentions = sorted_topics[0][1]['total_mentions'] if sorted_topics else 1
    
    rows = ''
    for topic, data in sorted_topics:
        pct = data['total_mentions'] / max_mentions * 100
        first_ep = data['first_episode']
        first_date = data['first_date'][:7] if data['first_date'] else ''
        
        # Mini timeline
        tl = ANALYTICS['topic_timeline'].get(topic, {})
        tl_max = max(tl.values()) if tl else 1
        tl_html = '<div class="timeline">'
        for y in sorted(tl.keys()):
            h = max(2, tl[y] / tl_max * 35)
            tl_html += f'<div class="timeline-bar" style="height:{h:.0f}px" title="{y}: {tl[y]}"></div>'
        tl_html += '</div>'
        
        rows += f'''<div class="topic-row">
<div class="topic-name">{H.escape(topic)}</div>
<div class="topic-bar"><div class="topic-fill" style="width:{pct:.0f}%"></div></div>
<div class="topic-count">{data["total_mentions"]:,}</div>
<div style="min-width:60px;font-size:.75rem;color:var(--muted)">{data["episodes_with_topic"]} eps</div>
<div style="min-width:80px">{tl_html}</div>
</div>'''
    
    body = f'''<h1>📊 Popular Topics</h1>
<p style="color:var(--muted);font-size:.88rem;margin-bottom:1rem">Topics tracked across all 482 Bitcoin Group transcripts with mini timelines showing popularity by year.</p>
{rows}'''
    return page('Popular Topics', body)


def build_stats():
    ys = ANALYTICS['yearly_stats']
    total_words = ANALYTICS['total_words']
    total_eps = ANALYTICS['total_transcripts']
    
    # Price data for era analysis
    price_at_first = PRICES.get('2013-10-18', 0)
    price_now = PRICES.get(sorted(PRICES.keys())[-1], 0) if PRICES else 0
    
    # Yearly table
    yr_rows = ''
    for year in sorted(ys.keys(), reverse=True):
        y = ys[year]
        avg_words = y['words'] // y['episodes'] if y['episodes'] else 0
        top3 = ', '.join(t['topic'] for t in y['top_topics'][:3])
        yr_rows += f'<tr><td style="font-weight:700;color:var(--accent)">{year}</td><td>{y["episodes"]}</td><td>{y["words"]:,}</td><td>{avg_words:,}</td><td style="font-size:.82rem;color:var(--muted)">{top3}</td></tr>'
    
    # Era analysis
    eras = [
        ('2013–2015', 'The Early Days', 'Silk Road, Mt. Gox, first mining debates', '#f87171'),
        ('2016–2017', 'The Bull Run', 'Block size wars, ICO mania, $20K ATH', '#fbbf24'),
        ('2018–2019', 'Crypto Winter', 'Bear market, regulation fears, stablecoins', '#64748b'),
        ('2020–2021', 'Institutional Era', 'COVID, MicroStrategy, El Salvador, $69K ATH', '#34d399'),
        ('2022–2023', 'FTX & Recovery', 'FTX collapse, ETF hopes, ordinals', '#f472b6'),
        ('2024–2026', 'ETF & Beyond', 'Spot ETF approved, Trump crypto, Iran war', '#22d3ee'),
    ]
    era_html = ''
    for years, name, desc, color in eras:
        start, end = years.split('–')
        eps = sum(ys.get(str(y), {}).get('episodes', 0) for y in range(int(start), int(end)+1))
        words = sum(ys.get(str(y), {}).get('words', 0) for y in range(int(start), int(end)+1))
        era_html += f'<div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:12px 16px;margin-bottom:8px"><div style="display:flex;justify-content:space-between;align-items:center"><div><span style="color:{color};font-weight:700;font-family:JetBrains Mono,monospace">{years}</span> <b>{name}</b></div><div style="font-size:.82rem;color:var(--muted)">{eps} eps · {words:,} words</div></div><div style="font-size:.85rem;color:var(--muted);margin-top:2px">{desc}</div></div>'
    
    # Fun facts
    guests_data = GUESTS_JSON.get('top_guests', [])
    longest_ep = max(((int(k), v) for k, v in ANALYTICS.get('yearly_stats', {}).items()), key=lambda x: x[1].get('words', 0), default=(0, {}))
    
    body = f'''<h1>📈 Transcript Stats</h1>
<div class="stats">
<div class="stat"><div class="n c">{total_eps}</div><div class="l">Transcripts</div></div>
<div class="stat"><div class="n g">{total_words:,}</div><div class="l">Total Words</div></div>
<div class="stat"><div class="n a">{total_words // total_eps:,}</div><div class="l">Avg Words/Episode</div></div>
<div class="stat"><div class="n" style="color:#f472b6">2013–2026</div><div class="l">13 Years</div></div>
</div>

<h2>🕰️ Bitcoin Eras</h2>
{era_html}

<h2>📅 Year by Year</h2>
<table><tr><th>Year</th><th>Episodes</th><th>Words</th><th>Avg/Ep</th><th>Top Topics</th></tr>
{yr_rows}</table>

<h2>🏆 Records</h2>
<div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:14px 18px;font-size:.9rem">
<div style="padding:4px 0">📺 <b>Most episodes by guest:</b> Thomas Hunt ({guests_data[0]["count"] if guests_data else 0} appearances)</div>
<div style="padding:4px 0">📝 <b>Total unique guests:</b> {GUESTS_JSON.get("unique_guests", 0)} panelists over 13 years</div>
<div style="padding:4px 0">🎱 <b>Magic 8-Ball episodes:</b> {len(M8.get("episodes", []))} (accuracy: {M8.get("ball_record", {}).get("accuracy", 0):.1f}%)</div>
<div style="padding:4px 0">🔮 <b>Predictions tracked:</b> {len(PREDICTIONS.get("predictions", []))} across all episodes</div>
<div style="padding:4px 0">💰 <b>Bitcoin price at Episode #1:</b> ${price_at_first:,.0f}</div>
<div style="padding:4px 0">💰 <b>Bitcoin price now:</b> ${price_now:,.0f}</div>
</div>'''
    return page('Transcript Stats', body)


def build_enhanced_guest_index():
    """Build enhanced guest index with more stats."""
    import sqlite3
    DB = BASE / 'tbg-guests.db'
    conn = sqlite3.connect(str(DB))
    guests = conn.execute("SELECT * FROM guests ORDER BY total_appearances DESC").fetchall()
    cols = [d[0] for d in conn.execute("SELECT * FROM guests LIMIT 0").description]
    
    total = len(guests)
    total_app = sum(g[cols.index('total_appearances')] for g in guests)
    top5 = guests[:5]
    
    # Stats
    stats = f'''<h1>👥 Bitcoin Group Panelists</h1>
<p style="color:var(--muted);font-size:.88rem;margin-bottom:1rem">Everyone who appeared on The Bitcoin Group, extracted from {ANALYTICS["total_transcripts"]} show intros.</p>
<div class="stats">
<div class="stat"><div class="n c">{total}</div><div class="l">Unique Guests</div></div>
<div class="stat"><div class="n g">{total_app:,}</div><div class="l">Total Appearances</div></div>
<div class="stat"><div class="n a">2013–2026</div><div class="l">13 Year Span</div></div>
</div>'''
    
    # Top guests with enhanced info
    rows = ''
    for i, g in enumerate(guests[:60]):
        name = g[cols.index('name')]
        slug = g[cols.index('slug')]
        count = g[cols.index('total_appearances')]
        first = g[cols.index('first_episode')]
        last = g[cols.index('last_episode')]
        consec = g[cols.index('max_consecutive')]
        is_host = g[cols.index('is_host')]
        pc = g[cols.index('prediction_correct')]
        pw = g[cols.index('prediction_wrong')]
        
        # Thomas Hunt — host of every episode
        if is_host:
            count = 486; first = 1; last = 486; consec = 486
        
        medal = ['🥇','🥈','🥉'][i] if i < 3 else f'{i+1}.'
        tags = ''
        if is_host: tags += '<span style="font-size:.65rem;padding:1px 6px;border-radius:8px;background:rgba(251,191,36,.15);color:var(--amber);margin-left:4px">HOST</span>'
        
        # Prediction accuracy
        pt = pc + pw
        pred_html = f'<span class="{"g" if pc/pt>.55 else "a" if pc/pt>.45 else "r"}">{pc}/{pt}</span>' if pt >= 5 else '<span style="color:var(--muted)">—</span>'
        
        bar_w = min(100, count / guests[0][cols.index('total_appearances')] * 100)
        first_d = g[cols.index('first_date')][:7] if g[cols.index('first_date')] else ''
        last_d = g[cols.index('last_date')][:7] if g[cols.index('last_date')] else ''
        
        consec_display = '∞' if is_host else str(consec)
        rows += f'<tr><td>{medal}</td><td><a href="{slug}.html"><b>{H.escape(name)}</b></a>{tags}</td><td>{count}</td><td>#{first}–#{last}</td><td>{consec_display}</td><td>{pred_html}</td><td style="min-width:50px"><div class="bar-h" style="width:{bar_w:.0f}%;background:var(--accent)"></div></td></tr>'
    
    tbl = f'''<h2>🏆 Appearance Leaderboard</h2>
<table><tr><th>#</th><th>Guest</th><th>Shows</th><th>Range</th><th>Streak</th><th>Pred</th><th></th></tr>{rows}</table>'''
    
    conn.close()
    return page('All Guests', stats + tbl)


def build_enhanced_guest_page(gid, name, slug, conn, cols):
    """Build a rich guest profile page."""
    g = conn.execute("SELECT * FROM guests WHERE id=?", (gid,)).fetchone()
    if not g: return None
    
    count = g[cols.index('total_appearances')]
    first_ep = g[cols.index('first_episode')]
    last_ep = g[cols.index('last_episode')]
    first_date = g[cols.index('first_date')] or ''
    last_date = g[cols.index('last_date')] or ''
    consec = g[cols.index('max_consecutive')]
    is_host = g[cols.index('is_host')]
    pc = g[cols.index('prediction_correct')]
    pw = g[cols.index('prediction_wrong')]
    m8c = g[cols.index('m8_correct')]
    m8w = g[cols.index('m8_wrong')]
    
    # Thomas Hunt — host of every episode
    if is_host:
        count = 486; first_ep = 1; last_ep = 486; consec = 486
    
    pt = pc + pw
    pred_acc = f'{pc/pt*100:.0f}%' if pt >= 5 else '—'
    m8t = m8c + m8w
    m8_acc = f'{m8c/m8t*100:.0f}%' if m8t >= 3 else '—'
    
    span = ''
    if first_date and last_date:
        try: span = f'{int(last_date[:4]) - int(first_date[:4]) + 1} years'
        except: pass
    
    # Appearances
    appearances = conn.execute("SELECT episode, date FROM appearances WHERE guest_id=? ORDER BY episode", (gid,)).fetchall()
    
    # Calculate activity by year
    by_year = defaultdict(int)
    for ep, date in appearances:
        if date: by_year[date[:4]] += 1
    
    yr_html = '<div class="timeline" style="height:50px;margin-bottom:8px">'
    yr_max = max(by_year.values()) if by_year else 1
    for y in sorted(by_year.keys()):
        h = max(3, by_year[y] / yr_max * 45)
        yr_html += f'<div class="timeline-bar" style="height:{h:.0f}px" title="{y}: {by_year[y]} episodes"></div>'
    yr_html += '</div>'
    yr_labels = '<div style="display:flex;gap:2px;font-size:.6rem;color:var(--muted);justify-content:space-between">' + ''.join(f'<span>{y[-2:]}</span>' for y in sorted(by_year.keys())) + '</div>'
    
    # Co-panelists
    pairs = conn.execute("""
        SELECT g.name, g.slug, p.count FROM pairs p
        JOIN guests g ON (g.id = CASE WHEN p.guest1_id=? THEN p.guest2_id ELSE p.guest1_id END)
        WHERE (p.guest1_id=? OR p.guest2_id=?) AND p.count > 1
        ORDER BY p.count DESC LIMIT 20
    """, (gid, gid, gid)).fetchall()
    
    pairs_html = ''
    if pairs:
        pairs_html = '<h2>🤝 Most Frequent Co-Panelists</h2>'
        for pname, pslug, pcount in pairs:
            bar_w = min(100, pcount / pairs[0][2] * 100)
            pairs_html += f'<div class="pair"><a href="{pslug}.html">{H.escape(pname)}</a><span style="font-family:JetBrains Mono,monospace;font-size:.8rem;color:var(--muted)">{pcount} shows together</span></div>'
    
    # Episode chips
    ep_html = '<h2>📺 All Episodes (' + str(count) + ')</h2><div class="ep-chips">'
    for ep, date in appearances:
        ep_html += f'<a href="/tbg-mirrors/transcripts/TBG-{ep:03d}.html" class="ep-chip" title="{date}">#{ep}</a>'
    ep_html += '</div>'
    
    # Predictions for this person
    pred_html = ''
    if pt >= 5:
        preds = [p for p in PREDICTIONS.get('predictions', []) if name.lower().split()[0] in p.get('speaker', '').lower() or p.get('speaker', '') == name]
        recent = [p for p in preds if p.get('result')][-8:]
        if recent:
            pred_html = '<h2>🔮 Recent Predictions</h2>'
            for p in reversed(recent):
                r = p['result']
                icon = '✅' if r['correct'] else '❌'
                dir_label = '▲' if p['direction'] == 'higher' else '▼'
                pred_html += f'<div style="padding:4px 0;font-size:.88rem;border-bottom:1px solid rgba(30,41,59,.2)">{icon} <a href="/tbg-mirrors/transcripts/TBG-{p["episode"]:03d}.html">#{p["episode"]}</a> {p["date"][:10]} {dir_label} ${r["price_at_prediction"]:,.0f} → ${r["price_7d_later"]:,.0f} ({r["change_pct"]:+.1f}%)</div>'
            pred_html += f'<div style="font-size:.8rem;color:var(--muted);margin-top:4px"><a href="/tbg-mirrors/predictions/{slug}.html">See all predictions →</a></div>'
    
    consec_display = '∞' if is_host else str(consec)
    
    body = f'''<h1>👤 {H.escape(name)}</h1>
{"<span style='font-size:.8rem;padding:2px 8px;border-radius:8px;background:rgba(251,191,36,.15);color:var(--amber)'>HOST — World Crypto Network / Mad Bitcoins</span>" if is_host else ""}
<div class="stats" style="margin-top:.8rem">
<div class="stat"><div class="n c">{count}</div><div class="l">Appearances</div></div>
<div class="stat"><div class="n g">#{first_ep}–#{last_ep}</div><div class="l">Episode Range</div></div>
<div class="stat"><div class="n a">{consec_display}</div><div class="l">Max Streak</div></div>
<div class="stat"><div class="n" style="color:#f472b6">{span or "—"}</div><div class="l">Span</div></div>
{"<div class='stat'><div class='n " + ("g" if pc/pt>.55 else "a" if pc/pt>.45 else "r") + "'>" + pred_acc + "</div><div class='l'>Pred (" + str(pc) + "/" + str(pt) + ")</div></div>" if pt >= 5 else ""}
{"<div class='stat'><div class='n " + ("g" if m8c/m8t>.55 else "a" if m8c/m8t>.45 else "r") + "'>" + m8_acc + "</div><div class='l'>8-Ball (" + str(m8c) + "/" + str(m8t) + ")</div></div>" if m8t >= 3 else ""}
</div>

<h2>📊 Activity by Year</h2>
{yr_html}{yr_labels}

{pairs_html}
{pred_html}
{ep_html}'''
    return page(name, body)


def main():
    import sqlite3
    print("🔧 Building TBG Mirrors Analytics Pages\n")
    
    OUT_ANALYTICS = BASE / 'analytics'
    OUT_ANALYTICS.mkdir(exist_ok=True)
    OUT_GUESTS = BASE / 'guests'
    OUT_GUESTS.mkdir(exist_ok=True)
    
    # Word Cloud
    (OUT_ANALYTICS / 'wordcloud.html').write_text(build_wordcloud())
    print("  ☁️ Built word cloud")
    
    # Topics
    (OUT_ANALYTICS / 'topics.html').write_text(build_topics())
    print("  📊 Built topics")
    
    # Stats
    (OUT_ANALYTICS / 'stats.html').write_text(build_stats())
    print("  📈 Built stats")
    
    # Enhanced guest pages
    DB = BASE / 'tbg-guests.db'
    conn = sqlite3.connect(str(DB))
    cols = [d[0] for d in conn.execute("SELECT * FROM guests LIMIT 0").description]
    
    # Guest index
    (OUT_GUESTS / 'index.html').write_text(build_enhanced_guest_index())
    print("  👥 Built guest index")
    
    # Individual guest pages
    guests = conn.execute("SELECT * FROM guests WHERE total_appearances >= 2 ORDER BY total_appearances DESC").fetchall()
    built = 0
    for g in guests:
        gid = g[cols.index('id')]
        name = g[cols.index('name')]
        slug = g[cols.index('slug')]
        p = build_enhanced_guest_page(gid, name, slug, conn, cols)
        if p:
            (OUT_GUESTS / f'{slug}.html').write_text(p)
            built += 1
    print(f"  👤 Built {built} guest pages")
    conn.close()
    
    # Deploy
    print("\n  Deploying...")
    subprocess.run(['ssh', '-o', 'ConnectTimeout=10', DEPLOY, f'mkdir -p /var/www/html/tbg-mirrors/analytics/'], capture_output=True, timeout=10)
    
    # Deploy analytics pages
    for f in OUT_ANALYTICS.glob('*.html'):
        subprocess.run(['scp', '-o', 'ConnectTimeout=10', str(f), f'{DEPLOY}:/var/www/html/tbg-mirrors/analytics/'], capture_output=True, timeout=30)
    
    # Deploy guest pages in batches
    files = list(OUT_GUESTS.glob('*.html'))
    batch_size = 30
    for i in range(0, len(files), batch_size):
        batch = files[i:i+batch_size]
        subprocess.run(['scp', '-o', 'ConnectTimeout=10'] + [str(f) for f in batch] + [f'{DEPLOY}:/var/www/html/tbg-mirrors/guests/'], capture_output=True, timeout=30)
    
    print(f"  Deployed {3 + len(files)} pages")
    print(f"\n  View: https://1n2.org/tbg-mirrors/analytics/stats.html")

if __name__ == '__main__':
    main()
