#!/usr/bin/env python3.12
"""
TBG Prediction Tracker
Scans all Bitcoin Group transcripts for price predictions.
Builds a leaderboard of who called it right.

PRIMARY SOURCE — never modifies transcripts.

Usage:
  python3.12 tbg_predictions.py                    # Full scan, build leaderboard
  python3.12 tbg_predictions.py --quick             # Scan last 100 episodes only
  python3.12 tbg_predictions.py --person "Thomas"   # Filter by person
  python3.12 tbg_predictions.py --export predictions.json  # Export raw data
"""
import re, json, os, sys, argparse, time
from pathlib import Path
from collections import defaultdict
from datetime import datetime, timedelta

TRANSCRIPT_DIR = Path.home() / 'Sites' / '1n2.org' / 'bitcoingroup-audio' / 'transcripts'
DATA_JSON = Path.home() / 'Sites' / '1n2.org' / 'tbg-mirrors' / 'data.json'
PRICE_CACHE = Path.home() / 'Sites' / '1n2.org' / 'tbg-mirrors' / 'btc-prices.json'
OUTPUT_DIR = Path.home() / 'Sites' / '1n2.org' / 'tbg-mirrors'

# Known panelists / speakers
KNOWN_SPEAKERS = [
    'Thomas', 'Thomas Hunt', 'Hunt',
    'Adam', 'Adam Meister',
    'Tone', 'Tone Vays',
    'Ansel', 'Ansel Lindner',
    'Jimmy', 'Jimmy Song',
    'Vin', 'Vin Armani',
    'Chris', 'Chris Ellis',
    'Jesse',
    'Junseth',
    'David', 'David Bennett',
    'Tosin',
    'Derrick', 'Derrick Broze',
    'Collin',
    'Gabriel', 'Gabriel DeVine',
    'Simon', 'Simon Dixon',
    'Josh', 'Josh Scigala',
    'Victoria', 'Victoria Jones',
    'Ben', 'Ben Arc',
    'Dan', 'Dan Eve',
]

# Map short/ambiguous names to canonical names
SPEAKER_NORMALIZE = {
    'Thomas': 'Thomas Hunt', 'Hunt': 'Thomas Hunt', 'Mad Bitcoins': 'Thomas Hunt',
    'Adam': 'Adam Meister',
    'Tone': 'Tone Vays', 'Tom Vays': 'Tone Vays', 'Toned Vays': 'Tone Vays',
    'Gabriel': 'Gabriel DeVine',
    'Chris': 'Chris Ellis',
    'Vin': 'Vin Armani', 'Vine': 'Vin Armani',
    'Dan': 'Dan Eve', 'Dan Eave': 'Dan Eve',
    'Ben': 'Ben Arc', 'Ben Arck': 'Ben Arc',
    'Josh': 'Josh Scigala',
    'Victoria': 'Victoria Jones',
    'Jimmy': 'Jimmy Song',
    'Jesse': 'Jesse',
    'Ansel': 'Ansel Lindner',
}

# ANSI colors
C = '\033[96m'; G = '\033[92m'; Y = '\033[93m'; R = '\033[91m'
B = '\033[1m'; D = '\033[2m'; X = '\033[0m'


def fetch_btc_prices():
    """Fetch/cache daily BTC prices from CoinGecko."""
    if PRICE_CACHE.exists():
        age = time.time() - os.path.getmtime(PRICE_CACHE)
        if age < 86400:  # cache for 24h
            return json.load(open(PRICE_CACHE))
    
    print(f'{B}📊 Fetching Bitcoin price history...{X}')
    import requests
    prices = {}
    
    # CoinGecko free API — max 365 days per call, so loop by year
    for year in range(2013, 2027):
        start = f'{year}-01-01'
        end = f'{year}-12-31'
        try:
            # Use CoinGecko market_chart/range
            start_ts = int(datetime(year, 1, 1).timestamp())
            end_ts = int(min(datetime(year, 12, 31), datetime.now()).timestamp())
            url = f'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from={start_ts}&to={end_ts}'
            r = requests.get(url, timeout=30)
            if r.status_code == 200:
                data = r.json()
                for ts, price in data.get('prices', []):
                    date = datetime.fromtimestamp(ts/1000).strftime('%Y-%m-%d')
                    prices[date] = round(price, 2)
                print(f'  {year}: {len([k for k in prices if k.startswith(str(year))])} days')
            else:
                print(f'  {year}: API error {r.status_code}')
            time.sleep(1.5)  # rate limit
        except Exception as e:
            print(f'  {year}: {e}')
    
    if prices:
        json.dump(prices, open(PRICE_CACHE, 'w'))
        print(f'  Cached {len(prices)} daily prices')
    return prices

def get_price_at_date(prices, date_str, offset_days=0):
    """Get BTC price at a date, with optional offset."""
    try:
        d = datetime.strptime(date_str, '%Y-%m-%d')
        d += timedelta(days=offset_days)
        # Try exact date, then nearby dates
        for delta in range(0, 5):
            key = (d + timedelta(days=delta)).strftime('%Y-%m-%d')
            if key in prices:
                return prices[key], key
            key = (d - timedelta(days=delta)).strftime('%Y-%m-%d')
            if key in prices:
                return prices[key], key
    except:
        pass
    return None, None


def extract_predictions(text, ep_num, ep_date):
    """Extract price predictions from transcript text.
    Looks for patterns like:
    - "higher" / "lower" (Magic 8 Ball segment)
    - "will go to $X" / "bitcoin will hit $X"
    - "$X by [time]" 
    - price predictions with specific targets
    """
    predictions = []
    
    # Normalize
    lines = text.split('\n')
    full = ' '.join(lines)
    
    # Split into rough sentences
    sentences = re.split(r'(?<=[.!?])\s+', full)
    
    # PATTERN 1: Magic 8 Ball / Higher or Lower
    # The show ends with "Will the price of Bitcoin be higher next week?"
    magic8_patterns = [
        r'(?:will|price|bitcoin).*(?:higher|lower).*(?:next week|this time next)',
        r'(?:magic.?(?:8|eight).?ball|magic ball)',
        r'(?:higher or lower|up or down).*(?:next|week)',
        r'(?:without a doubt|signs point|very likely|don.t count on)',
    ]
    
    for i, sent in enumerate(sentences):
        sl = sent.lower()
        
        # Magic 8 Ball predictions
        if any(re.search(p, sl) for p in magic8_patterns):
            # Look for the answer in surrounding sentences
            context = ' '.join(sentences[max(0,i-2):min(len(sentences),i+3)])
            cl = context.lower()
            
            direction = None
            if 'higher' in cl and ('without a doubt' in cl or 'signs point to yes' in cl or 'very likely' in cl or 'yes' in cl or 'it is certain' in cl):
                direction = 'higher'
            elif 'higher' in cl and ('don\'t count' in cl or 'unlikely' in cl or 'no' in cl or 'doubtful' in cl):
                direction = 'lower'
            elif 'lower' in cl:
                direction = 'lower'
            elif 'higher' in cl:
                direction = 'higher'
            
            if direction:
                predictions.append({
                    'type': 'magic_8_ball',
                    'speaker': 'Magic 8 Ball',
                    'direction': direction,
                    'context': context[:300],
                    'episode': ep_num,
                    'date': ep_date,
                })
    
    # PATTERN 2: Explicit price predictions
    price_patterns = [
        # "$X by [time]"
        (r'(?:bitcoin|btc|price).*?(?:will|going to|gonna|could|should|reach|hit)\s.*?\$[\d,]+', 'target'),
        # "I think it will go higher/lower"  
        (r'(?:i think|i believe|i predict|my prediction|i.m (?:bullish|bearish)).*?(?:higher|lower|up|down|bull|bear)', 'opinion'),
        # "price will be $X"
        (r'(?:price|bitcoin).*?(?:will be|should be|going to be|could be)\s.*?\$[\d,]+', 'target'),
        # "100K by end of year"
        (r'\$?[\d,]+[kK]?\s*(?:by|before|end of|in)\s*(?:year|month|week|\d{4})', 'target'),
    ]
    
    for i, sent in enumerate(sentences):
        sl = sent.lower()
        for pattern, ptype in price_patterns:
            if re.search(pattern, sl):
                context = ' '.join(sentences[max(0,i-1):min(len(sentences),i+2)])
                
                # Try to extract speaker
                speaker = identify_speaker(context, sentences, i)
                
                # Extract direction
                direction = 'higher' if any(w in sl for w in ['higher', 'up', 'bull', 'rise', 'moon', 'rally']) else \
                           'lower' if any(w in sl for w in ['lower', 'down', 'bear', 'crash', 'drop', 'fall']) else \
                           'higher'  # default bullish if can't tell
                
                # Extract target price if mentioned
                target = None
                price_match = re.search(r'\$\s*([\d,]+(?:\.\d+)?)\s*(?:k|K)?', context)
                if price_match:
                    target = price_match.group(1).replace(',', '')
                    if 'k' in context[price_match.end():price_match.end()+2].lower():
                        target = str(int(float(target) * 1000))
                
                predictions.append({
                    'type': ptype,
                    'speaker': speaker,
                    'direction': direction,
                    'target': target,
                    'context': context[:300],
                    'episode': ep_num,
                    'date': ep_date,
                })
                break  # one prediction per sentence

    # PATTERN 3: Person says "higher" or "lower" directly
    for i, sent in enumerate(sentences):
        sl = sent.lower()
        if re.search(r'\b(?:i\s+(?:say|think|go|vote|call)\s+(?:higher|lower|up|down|bullish|bearish))', sl):
            context = ' '.join(sentences[max(0,i-1):min(len(sentences),i+2)])
            speaker = identify_speaker(context, sentences, i)
            direction = 'higher' if any(w in sl for w in ['higher', 'up', 'bullish']) else 'lower'
            predictions.append({
                'type': 'call',
                'speaker': speaker,
                'direction': direction,
                'context': context[:300],
                'episode': ep_num,
                'date': ep_date,
            })
    
    return predictions


def identify_speaker(context, sentences, idx):
    """Try to identify who is speaking, normalize to canonical name."""
    cl = context.lower()
    # Check for direct name mentions near the prediction
    for name in KNOWN_SPEAKERS:
        if name.lower() in cl:
            return SPEAKER_NORMALIZE.get(name, name)
    # Check preceding sentences for speaker indicators
    if idx > 0:
        prev = sentences[idx-1].lower()
        for name in KNOWN_SPEAKERS:
            if name.lower() in prev:
                return SPEAKER_NORMALIZE.get(name, name)
    return 'Unknown'

def evaluate_prediction(pred, prices):
    """Check if the prediction was correct by looking at the price 7 days later."""
    date = pred.get('date', '')
    if not date:
        return None
    
    price_at, _ = get_price_at_date(prices, date)
    price_7d, date_7d = get_price_at_date(prices, date, 7)
    
    if price_at is None or price_7d is None:
        return None
    
    actual_direction = 'higher' if price_7d > price_at else 'lower'
    predicted = pred['direction']
    correct = (predicted == actual_direction)
    
    change_pct = ((price_7d - price_at) / price_at) * 100
    
    return {
        'price_at_prediction': price_at,
        'price_7d_later': price_7d,
        'date_checked': date_7d,
        'actual_direction': actual_direction,
        'change_pct': round(change_pct, 2),
        'correct': correct,
    }

def load_episodes():
    d = json.load(open(DATA_JSON))
    return {e['num']: e for e in d['episodes']}


def main():
    parser = argparse.ArgumentParser(description='TBG Prediction Tracker')
    parser.add_argument('--quick', action='store_true', help='Scan last 100 episodes only')
    parser.add_argument('--person', help='Filter by speaker name')
    parser.add_argument('--export', help='Export predictions to JSON file')
    parser.add_argument('--no-prices', action='store_true', help='Skip price fetching')
    parser.add_argument('--after', type=int, default=0, help='Start from episode #')
    args = parser.parse_args()
    
    print(f'{B}🔮 TBG Prediction Tracker{X}')
    print(f'   Scanning transcripts for price predictions...\n')
    
    episodes = load_episodes()
    
    # Fetch BTC prices
    if not args.no_prices:
        prices = fetch_btc_prices()
    else:
        prices = {}
        if PRICE_CACHE.exists():
            prices = json.load(open(PRICE_CACHE))
    
    print(f'   {len(prices)} daily prices loaded\n')
    
    # Scan transcripts
    files = sorted(TRANSCRIPT_DIR.glob('TBG-*.txt'))
    all_predictions = []
    
    for f in files:
        num = int(f.stem.replace('TBG-', ''))
        if args.quick and num < max(1, max(int(ff.stem.replace('TBG-','')) for ff in files) - 100):
            continue
        if num < args.after:
            continue
        
        ep = episodes.get(num, {})
        date = ep.get('date', '')
        
        text = f.read_text(errors='ignore')
        # Skip headers
        lines = text.split('\n')
        body = ''
        for i, line in enumerate(lines):
            if not line.startswith('#') and line.strip():
                body = '\n'.join(lines[i:]).strip()
                break
        
        preds = extract_predictions(body, num, date)
        
        if preds:
            for p in preds:
                result = evaluate_prediction(p, prices)
                p['result'] = result
            all_predictions.extend(preds)
        
        if num % 50 == 0:
            print(f'   Scanned #{num}... ({len(all_predictions)} predictions found)')
    
    print(f'\n{G}   Found {len(all_predictions)} predictions across {len(set(p["episode"] for p in all_predictions))} episodes{X}\n')
    
    # Filter by person if requested
    if args.person:
        all_predictions = [p for p in all_predictions if args.person.lower() in p['speaker'].lower()]
        print(f'   Filtered to {len(all_predictions)} predictions for "{args.person}"\n')
    
    # Display results
    print(f'{B}{"="*90}{X}')
    print(f'{B}{"EP":>5} {"DATE":>12} {"SPEAKER":<18} {"CALL":<8} {"PRICE":>10} {"7D LATER":>10} {"CHG":>8} {"RESULT":<10}{X}')
    print(f'{"="*90}')
    
    for p in all_predictions:
        r = p.get('result')
        if r:
            price_str = f'${r["price_at_prediction"]:,.0f}'
            later_str = f'${r["price_7d_later"]:,.0f}'
            chg_str = f'{r["change_pct"]:+.1f}%'
            result_str = f'{G}✅ CORRECT{X}' if r['correct'] else f'{R}❌ WRONG{X}'
        else:
            price_str = later_str = chg_str = '—'
            result_str = f'{D}no data{X}'
        
        direction_str = f'{G}▲ Higher{X}' if p['direction'] == 'higher' else f'{R}▼ Lower{X}'
        print(f'  #{p["episode"]:>3} {p["date"]:>12} {p["speaker"]:<18} {direction_str:<18} {price_str:>10} {later_str:>10} {chg_str:>8} {result_str}')
    
    # LEADERBOARD
    print(f'\n{B}{"="*60}{X}')
    print(f'{B}🏆 PREDICTION LEADERBOARD{X}')
    print(f'{"="*60}')
    
    by_person = defaultdict(lambda: {'correct': 0, 'wrong': 0, 'total': 0, 'no_data': 0})
    for p in all_predictions:
        speaker = p['speaker']
        r = p.get('result')
        by_person[speaker]['total'] += 1
        if r is None:
            by_person[speaker]['no_data'] += 1
        elif r['correct']:
            by_person[speaker]['correct'] += 1
        else:
            by_person[speaker]['wrong'] += 1
    
    # Sort by accuracy (min 3 predictions to qualify)
    ranked = []
    for name, stats in by_person.items():
        evaluated = stats['correct'] + stats['wrong']
        if evaluated >= 5:
            accuracy = stats['correct'] / evaluated * 100 if evaluated > 0 else 0
            ranked.append((name, stats, accuracy, evaluated))
    
    ranked.sort(key=lambda x: (-x[2], -x[3]))
    
    print(f'\n{"RANK":<6} {"SPEAKER":<20} {"CORRECT":>8} {"WRONG":>8} {"ACC":>8} {"TOTAL":>8}')
    print(f'{"-"*60}')
    
    for i, (name, stats, accuracy, evaluated) in enumerate(ranked):
        medal = '🥇' if i == 0 else '🥈' if i == 1 else '🥉' if i == 2 else f'  {i+1}.'
        acc_color = G if accuracy >= 60 else Y if accuracy >= 45 else R
        qualified = ' ★' if evaluated >= 5 else ''
        print(f'{medal:<6} {name:<20} {stats["correct"]:>8} {stats["wrong"]:>8} {acc_color}{accuracy:>7.1f}%{X} {evaluated:>8}{qualified}')
    
    print(f'\n  ★ = 5+ evaluated predictions (qualified)')
    print(f'  Predictions checked against actual BTC price 7 days after episode air date')
    
    # DETAILED PROOF
    print(f'\n{B}{"="*90}{X}')
    print(f'{B}📝 PREDICTION EVIDENCE (showing proof text){X}')
    print(f'{"="*90}')
    
    for p in all_predictions[:50]:  # Show first 50
        r = p.get('result')
        if r:
            result_str = f'{G}✅{X}' if r['correct'] else f'{R}❌{X}'
            price_info = f'${r["price_at_prediction"]:,.0f} → ${r["price_7d_later"]:,.0f} ({r["change_pct"]:+.1f}%)'
        else:
            result_str = '—'
            price_info = 'no price data'
        
        print(f'\n  {result_str} #{p["episode"]} ({p["date"]}) — {p["speaker"]} predicts {p["direction"].upper()}')
        print(f'     Price: {price_info}')
        # Show the proof text
        ctx = p['context'][:250].replace('\n', ' ')
        print(f'     {D}"{ctx}"{X}')
    
    if len(all_predictions) > 50:
        print(f'\n  ... and {len(all_predictions) - 50} more predictions (use --export to see all)')
    
    # Export
    if args.export:
        export_data = {
            'generated': datetime.now().isoformat(),
            'total_predictions': len(all_predictions),
            'leaderboard': [{'name': n, 'correct': s['correct'], 'wrong': s['wrong'], 
                           'accuracy': round(a, 1), 'evaluated': e} for n, s, a, e in ranked],
            'predictions': all_predictions
        }
        json.dump(export_data, open(args.export, 'w'), indent=2, default=str)
        print(f'\n{G}Exported to {args.export}{X}')
    
    # Also save leaderboard for web display
    lb_path = OUTPUT_DIR / 'predictions-leaderboard.json'
    lb = {
        'generated': datetime.now().isoformat(),
        'total': len(all_predictions),
        'leaderboard': [{'name': n, 'correct': s['correct'], 'wrong': s['wrong'],
                        'accuracy': round(a, 1), 'evaluated': e} for n, s, a, e in ranked],
        'recent': all_predictions[-20:]
    }
    json.dump(lb, open(lb_path, 'w'), indent=2, default=str)

if __name__ == '__main__':
    main()
