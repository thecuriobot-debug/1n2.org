#!/usr/bin/env python3.12
"""
TBG Verified Predictions — 3-tier verification system.

Verification Levels:
  ★★★ Level 3: Speaker name appears right before their prediction in the prediction segment
  ★★  Level 2: Speaker confirmed in show introduction (first 600 words)
  ★   Level 1: YouTube video exists (description could confirm, needs manual check)

Usage:
  python3.12 tbg_verified_predictions.py              # Full scan + build pages
  python3.12 tbg_verified_predictions.py --stats       # Show stats only
"""
import re, json, argparse, html as H
from pathlib import Path
from collections import defaultdict, Counter
from datetime import datetime, timedelta

BASE = Path.home() / 'Sites' / '1n2.org' / 'tbg-mirrors'
TR_DIR = Path.home() / 'Sites' / '1n2.org' / 'bitcoingroup-audio' / 'transcripts'
DATA_JSON = BASE / 'data.json'
GUESTS_JSON = BASE / 'guests.json'
PRICES_JSON = BASE / 'btc-prices.json'

C='\033[96m';G='\033[92m';Y='\033[93m';R='\033[91m';B='\033[1m';D='\033[2m';X='\033[0m'

SPEAKER_NORMALIZE = {
    'Thomas': 'Thomas Hunt', 'Hunt': 'Thomas Hunt', 'Mad Bitcoins': 'Thomas Hunt',
    'Adam': 'Adam Meister', 'Tone': 'Tone Vays', 'Tom Vays': 'Tone Vays',
    'Gabriel': 'Gabriel DeVine', 'Vin': 'Gabriel DeVine', 'Vine': 'Gabriel DeVine',
    'Chris': 'Chris Ellis', 'Dan': 'Dan Eve', 'Dan Eave': 'Dan Eve',
    'Ben': 'Ben Arc', 'Ben Arck': 'Ben Arc', 'Josh': 'Josh Scigala',
    'Victoria': 'Victoria Jones', 'Jimmy': 'Jimmy Song',
    'Jesse': 'Jesse', 'Roger': 'Roger Ver', 'Ansel': 'Ansel Lindner',
    'Theo': 'Theo Goodman', 'Blake': 'Blake Anderson',
    'Martin': 'Martin Wismeijer', 'Vlad': 'Vlad Costea',
}


def load_all():
    episodes = json.load(open(DATA_JSON))
    ep_map = {e['num']: e for e in episodes['episodes']}
    guests = json.load(open(GUESTS_JSON))
    prices = json.load(open(PRICES_JSON)) if PRICES_JSON.exists() else {}
    return ep_map, guests, prices

def get_price(prices, date_str, offset=0):
    try:
        d = datetime.strptime(date_str, '%Y-%m-%d') + timedelta(days=offset)
        for delta in range(0, 4):
            for sign in [1, -1]:
                key = (d + timedelta(days=delta*sign)).strftime('%Y-%m-%d')
                if key in prices:
                    return prices[key], key
    except: pass
    return None, None

def get_intro_guests(text):
    """Extract guest names from show intro (first ~600 words)."""
    lines = text.split('\n')
    body = ''
    for i, line in enumerate(lines):
        if not line.startswith('#') and line.strip():
            body = ' '.join(lines[i:i+8])
            break
    intro = ' '.join(body.split()[:600])
    names = set()
    # Find names after "panelists"
    for m in re.finditer(r'([A-Z][a-z]+(?: [A-Z][a-z\']+){0,3})\s+from\s', intro):
        name = m.group(1)
        if len(name) > 3 and not any(x in name.lower() for x in ['bitcoin','american','world crypto']):
            norm = SPEAKER_NORMALIZE.get(name.split()[0], name)
            names.add(norm)
    # Thomas Hunt detection
    if re.search(r"(?:Thomas Hunt|I'm Thomas|Mad Bitcoins|World Crypto Network)", intro, re.IGNORECASE):
        names.add('Thomas Hunt')
    return names

def find_prediction_segment(text):
    """Find the 'higher or lower' / Magic 8-Ball prediction segment (usually end of show)."""
    tl = text.lower()
    # Look for the prediction question
    markers = [
        r'will the price of bitcoin be higher',
        r'higher or lower.*next week',
        r'magic.{0,5}(?:8|eight).{0,5}ball',
        r'(?:what do you think|your prediction).*(?:higher|lower)',
    ]
    best_idx = -1
    for m in markers:
        match = re.search(m, tl)
        if match:
            # Take the latest occurrence (prediction segment is at the end)
            for mm in re.finditer(m, tl):
                best_idx = max(best_idx, mm.start())
    
    if best_idx < 0:
        return None, None
    
    # Get a wide window around the prediction segment
    start = max(0, best_idx - 800)
    end = min(len(text), best_idx + 2000)
    return text[start:end], best_idx


MAGIC_8_POSITIVE = ['it is certain','it is decidedly so','without a doubt','yes definitely',
    'you may rely on it','as i see it yes','most likely','outlook good','signs point to yes']
MAGIC_8_NEGATIVE = ["don't count on it","my reply is no","my sources say no",
    "outlook not so good","very doubtful"]
MAGIC_8_NEUTRAL = ['reply hazy','ask again later','better not tell you','cannot predict now',
    'concentrate and ask again']

def extract_verified_predictions(text, ep_num, ep_date, ep_data, intro_guests):
    """Extract predictions with verification levels."""
    predictions = []
    has_yt = bool(ep_data.get('yt', {}).get('wcn') or ep_data.get('yt', {}).get('mb'))
    
    segment, seg_idx = find_prediction_segment(text)
    if not segment:
        return predictions
    
    seg_lower = segment.lower()
    
    # Extract Magic 8-Ball answer
    ball_answer = None
    ball_direction = None
    for phrase in MAGIC_8_POSITIVE + MAGIC_8_NEGATIVE + MAGIC_8_NEUTRAL:
        if phrase in seg_lower:
            ball_answer = phrase
            if phrase in MAGIC_8_POSITIVE: ball_direction = 'higher'
            elif phrase in MAGIC_8_NEGATIVE: ball_direction = 'lower'
            else: ball_direction = 'neutral'
            break
    
    if ball_answer and ball_direction != 'neutral':
        predictions.append({
            'speaker': 'Magic 8-Ball', 'direction': ball_direction,
            'answer': ball_answer, 'verification': 3,  # always verified — it's the ball
            'context': segment[:250], 'episode': ep_num, 'date': ep_date, 'type': 'magic_8_ball'
        })
    
    # Extract guest predictions from the segment
    # Pattern: "[Name] higher/lower" or "higher/lower [Name]" or "[Name] says higher"
    # Thomas Hunt typically goes LAST and introduces others
    
    # Split segment into rough sentences
    sentences = re.split(r'[.!?]\s+', segment)
    
    all_names = list(SPEAKER_NORMALIZE.keys()) + list(set(SPEAKER_NORMALIZE.values()))
    
    for i, sent in enumerate(sentences):
        sl = sent.lower()
        
        # Look for higher/lower calls
        has_higher = bool(re.search(r'\b(?:higher|bullish|up)\b', sl))
        has_lower = bool(re.search(r'\b(?:lower|bearish|down)\b', sl))
        if not has_higher and not has_lower:
            continue
        
        direction = 'higher' if has_higher and not has_lower else 'lower' if has_lower and not has_higher else None
        if not direction:
            # Both words present — check which is closer to a name or "I think/say"
            h_idx = sl.find('higher') if 'higher' in sl else 999
            l_idx = sl.find('lower') if 'lower' in sl else 999
            direction = 'higher' if h_idx < l_idx else 'lower'
        
        # Find speaker name near this sentence
        context_window = ' '.join(sentences[max(0,i-1):min(len(sentences),i+2)])
        
        for name_key in all_names:
            nk_lower = name_key.lower()
            if nk_lower in sent.lower() or (i > 0 and nk_lower in sentences[i-1].lower()):
                canonical = SPEAKER_NORMALIZE.get(name_key, name_key)
                if canonical == 'Magic 8-Ball':
                    continue
                
                # Determine verification level
                # Level 3: Name appears RIGHT BEFORE their prediction in the prediction segment
                name_in_sent = nk_lower in sent.lower()
                # Level 2: Name confirmed in show introduction
                name_in_intro = canonical in intro_guests
                # Level 1: YouTube video exists
                
                if name_in_sent:
                    level = 3
                elif name_in_intro:
                    level = 2
                elif has_yt:
                    level = 1
                else:
                    level = 0  # unverified
                
                # Skip if we already have this person for this episode
                if any(p['speaker'] == canonical and p['episode'] == ep_num for p in predictions):
                    continue
                
                predictions.append({
                    'speaker': canonical, 'direction': direction,
                    'verification': level, 'context': sent.strip()[:250],
                    'episode': ep_num, 'date': ep_date, 'type': 'guest_call',
                })
                break
    
    # Thomas Hunt — assume he goes last, and if "higher" or "lower" appears at the end
    # of the segment without attribution, it's likely Thomas
    if not any(p['speaker'] == 'Thomas Hunt' and p['type'] == 'guest_call' for p in predictions):
        last_sentences = sentences[-5:]
        for sent in reversed(last_sentences):
            sl = sent.lower()
            if re.search(r'\b(?:higher|lower)\b', sl) and re.search(r'\b(?:thomas|hunt|i\'m going|i say|i think)\b', sl):
                direction = 'higher' if 'higher' in sl else 'lower'
                level = 3 if 'thomas' in sl or 'hunt' in sl else 2 if 'Thomas Hunt' in intro_guests else 1
                predictions.append({
                    'speaker': 'Thomas Hunt', 'direction': direction,
                    'verification': level, 'context': sent.strip()[:250],
                    'episode': ep_num, 'date': ep_date, 'type': 'guest_call',
                })
                break
    
    return predictions


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--stats', action='store_true')
    parser.add_argument('--after', type=int, default=0)
    args = parser.parse_args()
    
    print(f'{B}🔮 TBG Verified Predictions — 3-Tier System{X}')
    print(f'   ★★★ Level 3: Name before prediction in segment')
    print(f'   ★★  Level 2: Confirmed in show intro')
    print(f'   ★   Level 1: YouTube video exists\n')
    
    ep_map, guests_data, prices = load_all()
    
    all_preds = []
    for f in sorted(TR_DIR.glob('TBG-*.txt')):
        num = int(f.stem.replace('TBG-', ''))
        if num < args.after: continue
        ep = ep_map.get(num, {})
        date = ep.get('date', '')
        
        text = f.read_text(errors='ignore')
        lines = text.split('\n')
        body = ''
        for i, line in enumerate(lines):
            if not line.startswith('#') and line.strip():
                body = '\n'.join(lines[i:])
                break
        
        intro_guests = get_intro_guests(text)
        preds = extract_verified_predictions(body, num, date, ep, intro_guests)
        
        # Evaluate each prediction
        for p in preds:
            price_at, _ = get_price(prices, date)
            price_7d, date_7d = get_price(prices, date, 7)
            if price_at and price_7d:
                actual = 'higher' if price_7d > price_at else 'lower'
                p['price_at'] = price_at
                p['price_7d'] = price_7d
                p['change_pct'] = round((price_7d - price_at) / price_at * 100, 2)
                p['correct'] = (p['direction'] == actual) if p['direction'] != 'neutral' else None
            else:
                p['correct'] = None
        
        all_preds.extend(preds)
        if num % 100 == 0:
            print(f'   Scanned #{num}...')
    
    print(f'\n{G}   Found {len(all_preds)} verified predictions{X}\n')
    
    # Stats by verification level
    by_level = defaultdict(lambda: {'correct': 0, 'wrong': 0, 'total': 0})
    for p in all_preds:
        v = p['verification']
        by_level[v]['total'] += 1
        if p.get('correct') == True: by_level[v]['correct'] += 1
        elif p.get('correct') == False: by_level[v]['wrong'] += 1
    
    print(f'{B}📊 VERIFICATION BREAKDOWN{X}')
    for level in [3, 2, 1, 0]:
        s = by_level[level]
        stars = '★' * level if level > 0 else '☆'
        ev = s['correct'] + s['wrong']
        acc = f'{s["correct"]/ev*100:.1f}%' if ev else '—'
        print(f'   {stars:<4} Level {level}: {s["total"]:>5} predictions, {ev:>5} evaluated, accuracy: {acc}')
    
    # Leaderboard — weighted by verification level, min 5 predictions
    print(f'\n{B}🏆 VERIFIED PREDICTION LEADERBOARD (min 5, weighted by ★){X}')
    print(f'{"─"*80}')
    
    by_person = defaultdict(lambda: {'preds': [], 'correct': 0, 'wrong': 0, 'weighted_score': 0, 'stars': 0})
    for p in all_preds:
        if p['speaker'] == 'Unknown': continue
        s = by_person[p['speaker']]
        s['preds'].append(p)
        s['stars'] += p['verification']
        if p.get('correct') == True:
            s['correct'] += 1
            s['weighted_score'] += p['verification']  # weight correct by stars
        elif p.get('correct') == False:
            s['wrong'] += 1
    
    ranked = []
    for name, stats in by_person.items():
        ev = stats['correct'] + stats['wrong']
        if ev < 5: continue
        acc = stats['correct'] / ev * 100
        avg_stars = stats['stars'] / len(stats['preds'])
        ranked.append((name, stats, acc, ev, avg_stars))
    
    ranked.sort(key=lambda x: (-x[2], -x[4]))  # sort by accuracy, then avg stars
    
    print(f'{"RANK":<5} {"SPEAKER":<20} {"✅":>4} {"❌":>4} {"ACC":>8} {"AVG ★":>6} {"TOTAL":>6}')
    print(f'{"─"*60}')
    for i, (name, stats, acc, ev, avg_stars) in enumerate(ranked):
        medal = '🥇' if i == 0 else '🥈' if i == 1 else '🥉' if i == 2 else f' {i+1}.'
        ac = G if acc >= 55 else Y if acc >= 45 else R
        star_str = '★' * round(avg_stars) + '☆' * (3 - round(avg_stars))
        print(f'{medal:<5} {name:<20} {stats["correct"]:>4} {stats["wrong"]:>4} {ac}{acc:>7.1f}%{X} {star_str:>6} {ev:>6}')
    
    # Show recent predictions with stars
    print(f'\n{B}📝 RECENT PREDICTIONS WITH VERIFICATION{X}')
    recent = [p for p in all_preds if p.get('correct') is not None and p['speaker'] != 'Unknown'][-20:]
    for p in reversed(recent):
        stars = '★' * p['verification'] + '☆' * (3 - p['verification'])
        icon = f'{G}✅{X}' if p['correct'] else f'{R}❌{X}'
        dir_s = '▲' if p['direction'] == 'higher' else '▼'
        print(f'  {icon} {stars} #{p["episode"]:>3} {p["date"][:10]} {p["speaker"]:<18} {dir_s} ${p.get("price_at",0):>8,.0f} → ${p.get("price_7d",0):>8,.0f} ({p.get("change_pct",0):+.1f}%)')
    
    # Save
    output = {
        'generated': datetime.now().isoformat(),
        'total': len(all_preds),
        'by_level': {str(k): dict(v) for k, v in by_level.items()},
        'leaderboard': [{'name': n, 'correct': s['correct'], 'wrong': s['wrong'],
                        'accuracy': round(a, 1), 'evaluated': e, 'avg_stars': round(avg, 1)}
                       for n, s, a, e, avg in ranked],
        'predictions': all_preds,
    }
    json.dump(output, open(BASE / 'verified-predictions.json', 'w'), indent=2, default=str)
    print(f'\n   Saved verified-predictions.json')
    
    if not args.stats:
        build_verified_page(output)


def build_verified_page(data):
    """Build the verified predictions web page."""
    import subprocess
    lb = data['leaderboard']
    by_level = data['by_level']
    preds = data['predictions']
    total = len(preds)
    
    # Leaderboard rows
    lb_rows = ''
    for i, entry in enumerate(lb):
        medal = ['🥇','🥈','🥉'][i] if i < 3 else f'&nbsp;{i+1}.'
        ac = 'var(--green)' if entry['accuracy'] >= 55 else 'var(--amber)' if entry['accuracy'] >= 45 else 'var(--red)'
        stars = '★' * round(entry['avg_stars']) + '☆' * (3 - round(entry['avg_stars']))
        lb_rows += f'<tr><td>{medal}</td><td><b>{H.escape(entry["name"])}</b></td><td>{entry["correct"]}</td><td>{entry["wrong"]}</td><td style="color:{ac};font-weight:700">{entry["accuracy"]:.1f}%</td><td style="font-family:JetBrains Mono,monospace;color:var(--amber)">{stars}</td><td>{entry["evaluated"]}</td></tr>'
    
    # Recent predictions
    recent_html = ''
    recent = [p for p in preds if p.get('correct') is not None and p['speaker'] != 'Unknown'][-25:]
    for p in reversed(recent):
        stars = '<span style="color:var(--amber)">' + '★' * p['verification'] + '☆' * (3 - p['verification']) + '</span>'
        icon = '<span style="color:var(--green)">✅</span>' if p['correct'] else '<span style="color:var(--red)">❌</span>'
        dir_c = 'var(--green)' if p['direction'] == 'higher' else 'var(--red)'
        dir_s = '▲' if p['direction'] == 'higher' else '▼'
        ctx = H.escape(p.get('context', '')[:180])
        recent_html += f'''<div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:12px 16px;margin-bottom:8px">
<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
{icon} {stars}
<a href="/tbg-mirrors/transcripts/TBG-{p["episode"]:03d}.html" style="font-family:JetBrains Mono,monospace;font-weight:700">#{p["episode"]}</a>
<span style="color:var(--muted);font-size:.85rem">{p["date"][:10]}</span>
<b>{H.escape(p["speaker"])}</b>
<span style="color:{dir_c};font-weight:700">{dir_s}</span>
<span style="margin-left:auto;font-family:JetBrains Mono,monospace;font-size:.82rem;color:var(--muted)">${p.get("price_at",0):,.0f} → ${p.get("price_7d",0):,.0f} ({p.get("change_pct",0):+.1f}%)</span>
</div>
<div style="font-size:.82rem;color:#94a3b8;font-style:italic;margin-top:4px;border-left:3px solid var(--border);padding-left:10px">"{ctx}"</div>
</div>'''

    # Verification breakdown
    vb = ''
    for level in [3, 2, 1, 0]:
        s = data['by_level'].get(str(level), {'total': 0, 'correct': 0, 'wrong': 0})
        ev = s['correct'] + s['wrong']
        acc = f'{s["correct"]/ev*100:.0f}%' if ev else '—'
        stars_display = '★' * level + '☆' * (3 - level) if level > 0 else '☆☆☆'
        labels = ['Unverified', 'YouTube exists', 'In show intro', 'Named in prediction']
        vb += f'<div style="padding:6px 0;border-bottom:1px solid rgba(30,41,59,.2);display:flex;gap:12px;align-items:center"><span style="color:var(--amber);min-width:50px">{stars_display}</span><span style="min-width:150px;font-size:.9rem">{labels[level]}</span><span style="font-family:JetBrains Mono,monospace;font-size:.85rem;color:var(--muted)">{s["total"]} predictions · {ev} verified · {acc}</span></div>'

    html = f'''<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Verified Predictions — TBG Mirrors</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
:root{{--bg:#0a0e17;--card:#111827;--border:#1e293b;--text:#e2e8f0;--muted:#64748b;--accent:#22d3ee;--green:#34d399;--amber:#fbbf24;--red:#f87171}}
*{{margin:0;padding:0;box-sizing:border-box}}body{{font-family:'DM Sans',system-ui,sans-serif;background:var(--bg);color:var(--text);font-size:17px;line-height:1.7}}
a{{color:var(--accent);text-decoration:none}}a:hover{{color:#fff}}.wrap{{max-width:950px;margin:0 auto;padding:2rem 1.5rem}}
.nav{{font-size:.85rem;margin-bottom:1rem;display:flex;gap:10px;flex-wrap:wrap}}
h1{{font-family:'JetBrains Mono',monospace;font-size:1.3rem;color:var(--accent);margin-bottom:.5rem}}
h2{{font-size:1.05rem;color:var(--accent);margin:1.5rem 0 .7rem;padding-bottom:.3rem;border-bottom:1px solid var(--border)}}
.stats{{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:1.2rem}}
.stat{{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 14px;text-align:center}}
.stat .n{{font-family:'JetBrains Mono',monospace;font-size:1.2rem;font-weight:700}}.stat .l{{font-size:.68rem;color:var(--muted)}}
table{{width:100%;border-collapse:collapse}}th{{text-align:left;padding:8px 10px;font-size:.75rem;color:var(--muted);text-transform:uppercase;border-bottom:2px solid var(--border)}}
td{{padding:8px 10px;border-bottom:1px solid rgba(30,41,59,.3);font-size:.9rem}}tr:hover{{background:rgba(34,211,238,.03)}}
</style></head><body><div class="wrap">
<div class="nav"><a href="/tbg-mirrors/">← Episode Tracker</a><a href="/tbg-mirrors/guests/">👥 Guests</a><a href="/tbg-mirrors/predictions/">🔮 All Predictions</a><a href="/tbg-mirrors/predictions/magic-8-ball.html">🎱 8-Ball</a><a href="/tbg-mirrors/transcripts/">📜 Transcripts</a></div>
<h1>🔮 Verified Prediction Leaderboard</h1>
<p style="color:var(--muted);font-size:.88rem;margin-bottom:1rem">Predictions weighted by verification level. Higher stars = more confidence the attribution is correct.</p>
<div class="stats">
<div class="stat"><div class="n" style="color:var(--accent)">{total}</div><div class="l">Total Predictions</div></div>
<div class="stat"><div class="n" style="color:var(--amber)">3 Tiers</div><div class="l">Verification</div></div>
<div class="stat"><div class="n" style="color:var(--green)">Min 5</div><div class="l">To Qualify</div></div>
</div>
<h2>🔍 Verification Levels</h2>
{vb}
<h2>🏆 Leaderboard (min 5 verified predictions)</h2>
<table><tr><th>#</th><th>Speaker</th><th>✅</th><th>❌</th><th>Accuracy</th><th>Confidence</th><th>Verified</th></tr>{lb_rows}</table>
<h2>📝 Recent Verified Predictions</h2>
{recent_html}
</div></body></html>'''
    
    out_path = BASE / 'predictions' / 'verified.html'
    out_path.write_text(html)
    print(f'  Built verified.html')
    
    subprocess.run(['scp', '-o', 'ConnectTimeout=10', str(out_path),
                   f'root@157.245.186.58:/var/www/html/tbg-mirrors/predictions/'], capture_output=True, timeout=30)
    subprocess.run(['scp', '-o', 'ConnectTimeout=10', str(BASE / 'verified-predictions.json'),
                   f'root@157.245.186.58:/var/www/html/tbg-mirrors/'], capture_output=True, timeout=30)
    print(f'  Deployed to https://1n2.org/tbg-mirrors/predictions/verified.html')

if __name__ == '__main__':
    main()
