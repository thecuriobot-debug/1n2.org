#!/usr/bin/env python3.12
"""
TBG Magic 8-Ball Tracker
Scans all transcripts for the Magic 8-Ball segment.
Extracts: 8-ball answer, guest predictions, actual price outcome.

Usage:
  python3.12 tbg_magic8ball.py                 # Full scan
  python3.12 tbg_magic8ball.py --after 300     # Recent episodes only
  python3.12 tbg_magic8ball.py --export        # Save JSON + build web pages
"""
import re, json, argparse, os, html as htmlmod
from pathlib import Path
from collections import defaultdict
from datetime import datetime

TR_DIR = Path.home() / 'Sites' / '1n2.org' / 'bitcoingroup-audio' / 'transcripts'
DATA_JSON = Path.home() / 'Sites' / '1n2.org' / 'tbg-mirrors' / 'data.json'
PRICE_CACHE = Path.home() / 'Sites' / '1n2.org' / 'tbg-mirrors' / 'btc-prices.json'
OUT_DIR = Path.home() / 'Sites' / '1n2.org' / 'tbg-mirrors' / 'predictions'

# Official Magic 8-Ball responses
POSITIVE = ['it is certain','it is decidedly so','without a doubt','yes definitely',
            'you may rely on it','as i see it yes','most likely','outlook good','yes','signs point to yes']
NEUTRAL = ['reply hazy try again','reply hazy','ask again later','better not tell you now',
           'cannot predict now','concentrate and ask again']
NEGATIVE = ["don't count on it","my reply is no","my sources say no",
            "outlook not so good","very doubtful"]

C='\033[96m';G='\033[92m';Y='\033[93m';R='\033[91m';B='\033[1m';D='\033[2m';X='\033[0m'

KNOWN_GUESTS = [
    'Thomas','Hunt','Adam','Tone','Ansel','Jimmy','Vin','Chris','Jesse',
    'Junseth','David','Tosin','Derrick','Collin','Gabriel','Simon','Roger',
    'Victoria','Ben','Dan','Daniel','Jake','Dr. Bitcoin',
]

def load_prices():
    if PRICE_CACHE.exists():
        return json.load(open(PRICE_CACHE))
    return {}

def load_episodes():
    d = json.load(open(DATA_JSON))
    return {e['num']: e for e in d['episodes']}

def get_price(prices, date_str, offset=0):
    from datetime import timedelta
    try:
        d = datetime.strptime(date_str, '%Y-%m-%d') + timedelta(days=offset)
        for delta in range(0, 4):
            for sign in [1, -1]:
                key = (d + timedelta(days=delta*sign)).strftime('%Y-%m-%d')
                if key in prices:
                    return prices[key], key
    except: pass
    return None, None

def extract_8ball_segment(text, ep_num, ep_date):
    """Find and parse the Magic 8-Ball segment from a transcript."""
    tl = text.lower()
    
    # Find the 8-ball segment — look for the question
    patterns = [
        r'will the price of bitcoin be higher.*?(?:next week|this time)',
        r'magic.{0,5}(?:8|eight).{0,5}ball',
        r'shaking.{0,30}(?:ball|magic|eight)',
    ]
    
    seg_start = -1
    for p in patterns:
        m = re.search(p, tl)
        if m:
            seg_start = max(0, m.start() - 300)
            break
    
    if seg_start < 0:
        return None
    
    # Get the full segment (~1500 chars around the 8-ball question)
    segment = text[seg_start:seg_start+2000]
    seg_lower = segment.lower()
    
    result = {
        'episode': ep_num,
        'date': ep_date,
        'segment_text': segment[:800],
        'ball_answer': None,
        'ball_direction': None,
        'guest_calls': [],
    }
    
    # Find the 8-ball's answer — look for official phrases
    for phrase in POSITIVE + NEGATIVE + NEUTRAL:
        if phrase in seg_lower:
            result['ball_answer'] = phrase
            if phrase in [p.lower() for p in POSITIVE]:
                result['ball_direction'] = 'higher'
            elif phrase in [p.lower() for p in NEGATIVE]:
                result['ball_direction'] = 'lower'
            else:
                result['ball_direction'] = 'neutral'
            break
    
    # If no official phrase found, try to infer from context
    if not result['ball_answer']:
        # Check for informal answers
        question_idx = seg_lower.find('will the price')
        if question_idx < 0:
            question_idx = seg_lower.find('magic')
        after_q = seg_lower[question_idx:question_idx+600] if question_idx >= 0 else seg_lower
        
        if 'higher' in after_q and ('ball says' in after_q or 'it says' in after_q or 'the answer' in after_q):
            result['ball_answer'] = '(higher - informal)'
            result['ball_direction'] = 'higher'
        elif 'lower' in after_q and ('ball says' in after_q or 'it says' in after_q):
            result['ball_answer'] = '(lower - informal)'
            result['ball_direction'] = 'lower'
    
    # Extract guest predictions — look for "higher" or "lower" near guest names
    # The segment typically has guests saying higher/lower before the 8-ball
    sentences = re.split(r'[.!?]\s+', segment)
    for sent in sentences:
        sl = sent.lower()
        for name in KNOWN_GUESTS:
            nl = name.lower()
            if nl in sl:
                direction = None
                if 'higher' in sl or 'bullish' in sl or 'up' in sl.split(nl)[-1][:50]:
                    direction = 'higher'
                elif 'lower' in sl or 'bearish' in sl or 'down' in sl.split(nl)[-1][:50]:
                    direction = 'lower'
                if direction:
                    # Avoid duplicates
                    if not any(g['name'] == name for g in result['guest_calls']):
                        result['guest_calls'].append({
                            'name': name,
                            'direction': direction,
                            'quote': sent.strip()[:150]
                        })
    
    return result


def main():
    parser = argparse.ArgumentParser(description='TBG Magic 8-Ball Tracker')
    parser.add_argument('--after', type=int, default=0)
    parser.add_argument('--export', action='store_true', help='Build web pages')
    args = parser.parse_args()
    
    print(f'{B}🎱 TBG Magic 8-Ball Tracker{X}')
    print(f'   Scanning all transcripts for 8-Ball segments...\n')
    
    episodes = load_episodes()
    prices = load_prices()
    print(f'   {len(prices)} daily BTC prices loaded\n')
    
    results = []
    for f in sorted(TR_DIR.glob('TBG-*.txt')):
        num = int(f.stem.replace('TBG-', ''))
        if num < args.after: continue
        ep = episodes.get(num, {})
        date = ep.get('date', '')
        text = f.read_text(errors='ignore')
        
        # Skip header
        lines = text.split('\n')
        body = ''
        for i, line in enumerate(lines):
            if not line.startswith('#') and line.strip():
                body = '\n'.join(lines[i:])
                break
        
        r = extract_8ball_segment(body, num, date)
        if r and (r['ball_answer'] or r['guest_calls']):
            # Evaluate against actual price
            price_at, _ = get_price(prices, date)
            price_7d, date_7d = get_price(prices, date, 7)
            
            r['price_at'] = price_at
            r['price_7d'] = price_7d
            r['date_7d'] = date_7d
            
            if price_at and price_7d:
                r['actual'] = 'higher' if price_7d > price_at else 'lower'
                r['change_pct'] = round((price_7d - price_at) / price_at * 100, 2)
                r['ball_correct'] = (r['ball_direction'] == r['actual']) if r['ball_direction'] and r['ball_direction'] != 'neutral' else None
                for g in r['guest_calls']:
                    g['correct'] = (g['direction'] == r['actual'])
            else:
                r['actual'] = None
                r['change_pct'] = None
                r['ball_correct'] = None
            
            results.append(r)
    
    print(f'{G}   Found {len(results)} Magic 8-Ball episodes{X}\n')
    
    # Display results
    ball_correct = sum(1 for r in results if r.get('ball_correct') == True)
    ball_wrong = sum(1 for r in results if r.get('ball_correct') == False)
    ball_total = ball_correct + ball_wrong
    
    print(f'{B}🎱 MAGIC 8-BALL RECORD{X}')
    if ball_total > 0:
        print(f'   {G}{ball_correct} correct{X} / {R}{ball_wrong} wrong{X} = {Y}{ball_correct/ball_total*100:.1f}% accuracy{X} ({ball_total} verified)\n')
    
    # Table header
    print(f'{B}{"EP":>5} {"DATE":>12} {"8-BALL ANSWER":<28} {"CALL":>7} {"BTC PRICE":>11} {"7D LATER":>11} {"CHG":>8} {"RESULT":<10}{X}')
    print(f'{"─"*100}')
    
    for r in results:
        ans = (r['ball_answer'] or 'none')[:25]
        direction = f'{G}▲ UP{X}' if r['ball_direction'] == 'higher' else f'{R}▼ DN{X}' if r['ball_direction'] == 'lower' else f'{Y}── ?{X}'
        
        if r.get('price_at') and r.get('price_7d'):
            p1 = f"${r['price_at']:>10,.0f}"
            p2 = f"${r['price_7d']:>10,.0f}"
            chg = f"{r['change_pct']:>+7.1f}%"
            res = f'{G}✅ RIGHT{X}' if r.get('ball_correct') == True else f'{R}❌ WRONG{X}' if r.get('ball_correct') == False else f'{Y}  N/A{X}'
        else:
            p1 = p2 = chg = '—'.rjust(11)
            res = f'{D}no data{X}'
        
        print(f"  #{r['episode']:>3} {r['date']:>12} {ans:<28} {direction:>17} {p1} {p2} {chg} {res}")
        
        # Show guest calls
        for g in r.get('guest_calls', []):
            gdir = f'{G}▲{X}' if g['direction'] == 'higher' else f'{R}▼{X}'
            gres = f'{G}✅{X}' if g.get('correct') == True else f'{R}❌{X}' if g.get('correct') == False else ''
            print(f"         {D}└─ {g['name']:<15} {gdir} {gres}{X}")
    
    # Guest vs 8-ball leaderboard
    print(f'\n{B}{"═"*70}{X}')
    print(f'{B}🏆 8-BALL vs GUESTS — WHO BEATS THE BALL?{X}')
    print(f'{"═"*70}\n')
    
    guest_stats = defaultdict(lambda: {'correct': 0, 'wrong': 0})
    for r in results:
        for g in r.get('guest_calls', []):
            if g.get('correct') is not None:
                if g['correct']:
                    guest_stats[g['name']]['correct'] += 1
                else:
                    guest_stats[g['name']]['wrong'] += 1
    
    # Add 8-ball to comparison
    all_players = [('🎱 Magic 8-Ball', {'correct': ball_correct, 'wrong': ball_wrong})]
    all_players += sorted(guest_stats.items(), key=lambda x: -(x[1]['correct']/(x[1]['correct']+x[1]['wrong'])) if (x[1]['correct']+x[1]['wrong'])>0 else 0)
    
    print(f'{"RANK":<6} {"PLAYER":<22} {"CORRECT":>8} {"WRONG":>8} {"ACCURACY":>10} {"TOTAL":>8}')
    print(f'{"─"*65}')
    for i, (name, stats) in enumerate(all_players):
        total = stats['correct'] + stats['wrong']
        if total == 0: continue
        acc = stats['correct'] / total * 100
        acc_c = G if acc >= 55 else Y if acc >= 45 else R
        medal = '🥇' if i == 0 else '🥈' if i == 1 else '🥉' if i == 2 else f'  {i+1}.'
        print(f'{medal:<6} {name:<22} {stats["correct"]:>8} {stats["wrong"]:>8} {acc_c}{acc:>9.1f}%{X} {total:>8}')
    
    # Save data
    out_data = {
        'generated': datetime.now().isoformat(),
        'total_episodes': len(results),
        'ball_record': {'correct': ball_correct, 'wrong': ball_wrong, 'total': ball_total,
                       'accuracy': round(ball_correct/ball_total*100, 1) if ball_total else 0},
        'guest_stats': {n: dict(s) for n, s in guest_stats.items()},
        'episodes': results
    }
    
    out_path = Path.home() / 'Sites' / '1n2.org' / 'tbg-mirrors' / 'magic8ball.json'
    json.dump(out_data, open(out_path, 'w'), indent=2, default=str)
    print(f'\n   Saved to {out_path}')
    
    if args.export:
        build_web_page(out_data)


def build_web_page(data):
    """Build the Magic 8-Ball subpage for TBG Mirrors."""
    import subprocess
    
    br = data['ball_record']
    episodes = data['episodes']
    guest_stats = data['guest_stats']
    
    # Build episode rows
    ep_rows = ''
    for r in sorted(episodes, key=lambda x: -x['episode']):
        ans = htmlmod.escape(r.get('ball_answer') or 'none')
        dir_class = 'g' if r.get('ball_direction') == 'higher' else 'r' if r.get('ball_direction') == 'lower' else 'a'
        dir_label = '▲' if r.get('ball_direction') == 'higher' else '▼' if r.get('ball_direction') == 'lower' else '—'
        
        if r.get('price_at') and r.get('price_7d'):
            price_info = f"${r['price_at']:,.0f} → ${r['price_7d']:,.0f} ({r['change_pct']:+.1f}%)"
            if r.get('ball_correct') == True:
                res = '<span style="color:var(--green)">✅ RIGHT</span>'
            elif r.get('ball_correct') == False:
                res = '<span style="color:var(--red)">❌ WRONG</span>'
            else:
                res = '<span style="color:var(--muted)">N/A</span>'
        else:
            price_info = 'No price data'
            res = '<span style="color:var(--muted)">—</span>'
        
        # Guest calls HTML
        guests_html = ''
        for g in r.get('guest_calls', []):
            gc = 'var(--green)' if g.get('correct') else 'var(--red)' if g.get('correct') == False else 'var(--muted)'
            gdir = '▲' if g['direction'] == 'higher' else '▼'
            gres = '✅' if g.get('correct') else '❌' if g.get('correct') == False else ''
            guests_html += f'<div style="font-size:.8rem;color:{gc};padding-left:16px">└ {htmlmod.escape(g["name"])} {gdir} {gres}</div>'
        
        quote = htmlmod.escape(r.get('segment_text', '')[:200].replace('\n', ' '))
        
        ep_rows += f'''<div class="pred">
<div class="pred-head">
<span class="pred-ep"><a href="/tbg-mirrors/transcripts/TBG-{r['episode']:03d}.html">#{r['episode']}</a></span>
<span style="font-size:.85rem;color:var(--muted)">{r['date']}</span>
<span style="font-weight:600;color:var(--{dir_class})">{dir_label} {ans}</span>
<span class="pred-result">{res}</span>
</div>
<div class="pred-price">{price_info}</div>
{guests_html}
<div class="pred-quote" style="margin-top:6px">"{quote}..."</div>
<div class="pred-link"><a href="/tbg-mirrors/transcripts/TBG-{r['episode']:03d}.html">Source transcript →</a></div>
</div>'''
    
    # Guest vs Ball table
    all_players = [('🎱 Magic 8-Ball', br['correct'], br['wrong'])]
    for name, stats in sorted(guest_stats.items(), key=lambda x: -(x[1]['correct']/(x[1]['correct']+x[1]['wrong'])) if all((x[1]['correct']+x[1]['wrong'])>0 for x in [x]) else lambda x: 0):
        t = stats['correct'] + stats['wrong']
        if t > 0:
            all_players.append((name, stats['correct'], stats['wrong']))
    
    lb_rows = ''
    for i, (name, c, w) in enumerate(all_players):
        t = c + w
        if t == 0: continue
        acc = c / t * 100
        medal = ['🥇','🥈','🥉'][i] if i < 3 else f'&nbsp;{i+1}.'
        ac = 'var(--green)' if acc >= 55 else 'var(--amber)' if acc >= 45 else 'var(--red)'
        lb_rows += f'<tr><td>{medal}</td><td><b>{htmlmod.escape(name)}</b></td><td>{c}</td><td>{w}</td><td style="color:{ac};font-weight:700">{acc:.1f}%</td><td>{t}</td></tr>'
    
    html = f'''<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>🎱 Magic 8-Ball — TBG Predictions</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
:root{{--bg:#0a0e17;--card:#111827;--border:#1e293b;--text:#e2e8f0;--muted:#64748b;--accent:#22d3ee;--green:#34d399;--amber:#fbbf24;--red:#f87171;--g:var(--green);--r:var(--red);--a:var(--amber)}}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'DM Sans',system-ui,sans-serif;background:var(--bg);color:var(--text);font-size:17px;line-height:1.7}}
a{{color:var(--accent);text-decoration:none}}a:hover{{color:#fff}}
.wrap{{max-width:950px;margin:0 auto;padding:2rem 1.5rem}}
.nav{{font-size:.9rem;margin-bottom:1rem;display:flex;gap:12px;flex-wrap:wrap}}
h1{{font-family:'JetBrains Mono',monospace;font-size:1.4rem;color:var(--accent);margin-bottom:.3rem}}
h2{{font-size:1.15rem;color:var(--accent);margin:1.5rem 0 .8rem;padding-bottom:.4rem;border-bottom:1px solid var(--border)}}
.stats{{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:1.5rem}}
.stat{{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:10px 18px;text-align:center}}
.stat .n{{font-family:'JetBrains Mono',monospace;font-size:1.4rem;font-weight:700}}
.stat .l{{font-size:.72rem;color:var(--muted)}}
table{{width:100%;border-collapse:collapse}}th{{text-align:left;padding:10px 12px;font-size:.8rem;color:var(--muted);text-transform:uppercase;border-bottom:2px solid var(--border)}}
td{{padding:10px 12px;border-bottom:1px solid rgba(30,41,59,.3);font-size:.95rem}}tr:hover{{background:rgba(34,211,238,.03)}}
.pred{{background:var(--card);border:1px solid var(--border);border-radius:8px;margin-bottom:10px;padding:14px 18px}}
.pred-head{{display:flex;align-items:center;gap:10px;margin-bottom:4px;flex-wrap:wrap}}
.pred-ep{{font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--accent);font-size:.9rem}}
.pred-result{{margin-left:auto;font-size:.85rem;font-weight:700}}
.pred-quote{{font-size:.85rem;color:#94a3b8;font-style:italic;border-left:3px solid var(--border);padding-left:12px;margin:6px 0}}
.pred-price{{font-size:.82rem;color:var(--muted);font-family:'JetBrains Mono',monospace}}
.pred-link{{font-size:.8rem;margin-top:4px}}
</style></head><body>
<div class="wrap">
<div class="nav"><a href="/tbg-mirrors/">← Episode Tracker</a><a href="/tbg-mirrors/predictions/">🏆 All Predictions</a><a href="/tbg-mirrors/transcripts/">📜 Transcripts</a></div>
<h1>🎱 Magic 8-Ball Tracker</h1>
<p style="color:var(--muted);font-size:.9rem;margin-bottom:1rem">Every Bitcoin Group episode where the Magic 8-Ball predicted Bitcoin's price. Verified against actual prices 7 days later.</p>
<div class="stats">
<div class="stat"><div class="n" style="color:var(--accent)">{len(episodes)}</div><div class="l">8-Ball Episodes</div></div>
<div class="stat"><div class="n" style="color:var(--green)">{br['correct']}</div><div class="l">Ball Correct</div></div>
<div class="stat"><div class="n" style="color:var(--red)">{br['wrong']}</div><div class="l">Ball Wrong</div></div>
<div class="stat"><div class="n" style="color:var(--amber)">{br['accuracy']:.1f}%</div><div class="l">Ball Accuracy</div></div>
</div>
<h2>🏆 8-Ball vs Guests — Who Beats the Ball?</h2>
<table><tr><th>Rank</th><th>Player</th><th>Correct</th><th>Wrong</th><th>Accuracy</th><th>Total</th></tr>{lb_rows}</table>
<h2>📝 All 8-Ball Episodes</h2>
<p style="font-size:.82rem;color:var(--muted);margin-bottom:1rem">Click any episode to expand quote and see source transcript.</p>
{ep_rows}
</div></body></html>'''
    
    out_path = OUT_DIR / 'magic-8-ball.html'
    out_path.parent.mkdir(exist_ok=True)
    out_path.write_text(html)
    print(f'  Built magic-8-ball.html')
    
    # Deploy
    DEPLOY = 'root@157.245.186.58'
    subprocess.run(['scp', '-o', 'ConnectTimeout=10', str(out_path),
                   f'{DEPLOY}:/var/www/html/tbg-mirrors/predictions/'], capture_output=True, timeout=30)
    subprocess.run(['scp', '-o', 'ConnectTimeout=10', 
                   str(Path.home() / 'Sites' / '1n2.org' / 'tbg-mirrors' / 'magic8ball.json'),
                   f'{DEPLOY}:/var/www/html/tbg-mirrors/'], capture_output=True, timeout=30)
    print(f'  Deployed to https://1n2.org/tbg-mirrors/predictions/magic-8-ball.html')

if __name__ == '__main__':
    main()
