#!/usr/bin/env python3.12
"""
TBG Guest Extractor
Scans the intro of each transcript to identify panelists.
Updates predictions and 8-ball data with verified guest names.

Usage:
  python3.12 tbg_guests.py                    # Extract all guests
  python3.12 tbg_guests.py --update-8ball     # Also update 8-ball with guest data
  python3.12 tbg_guests.py --export           # Save guests.json + rebuild web pages
"""
import re, json, argparse
from pathlib import Path
from collections import defaultdict, Counter
from datetime import datetime

TR_DIR = Path.home() / 'Sites' / '1n2.org' / 'bitcoingroup-audio' / 'transcripts'
DATA_JSON = Path.home() / 'Sites' / '1n2.org' / 'tbg-mirrors' / 'data.json'
OUT = Path.home() / 'Sites' / '1n2.org' / 'tbg-mirrors'

C='\033[96m';G='\033[92m';Y='\033[93m';R='\033[91m';B='\033[1m';D='\033[2m';X='\033[0m'

def extract_guests_from_intro(text, ep_num):
    """Extract guest names from the show intro (first ~600 words)."""
    lines = text.split('\n')
    # Skip header comments
    body = ''
    for i, line in enumerate(lines):
        if not line.startswith('#') and line.strip():
            body = ' '.join(lines[i:i+8])  # first ~8 lines
            break
    
    # The intro follows: "We'd like to welcome our panelists, [Name] from [Place]."
    # Find the intro section (first 600 words)
    words = body.split()
    intro = ' '.join(words[:600])
    
    guests = []
    
    # Find "welcome our panelists" marker
    intro_lower = intro.lower()
    panel_idx = intro_lower.find('panelist')
    if panel_idx < 0:
        panel_idx = intro_lower.find('welcome')
    if panel_idx < 0:
        panel_idx = 0
    
    # Extract from panelist intro to "moving on to issue" or "issue one"
    end_idx = len(intro)
    for marker in ['moving on to issue', 'issue one', 'issue 1', 'with a quick news']:
        m = intro_lower.find(marker, panel_idx)
        if m > panel_idx:
            end_idx = min(end_idx, m)
    
    intro_section = intro[panel_idx:end_idx]
    
    # Pattern: "Name from Affiliation" or "Name, Affiliation" 
    # Names are typically 2-3 words before "from" or a comma
    name_patterns = [
        # "Name from Place"
        r"([A-Z][a-z]+(?: [A-Z][a-z']+){0,3})\s+from\s+(?:the\s+)?([A-Za-z][A-Za-z\s.']+?)(?:\.|,|And |and |\n|$)",
        # "I'm Name from Place"
        r"I'm\s+([A-Z][a-z]+(?: [A-Z][a-z']+){0,2})\s+from",
        # After comma: "Name, description"
        r"panelists?,?\s*([A-Z][a-z]+(?: [A-Z][a-z']+){0,2})",
    ]
    
    # Also look for names right after panelists intro
    # Split on common delimiters  
    parts = re.split(r'(?:And |and I\'m |, and |\.(?=\s+[A-Z]))', intro_section)
    
    for part in parts:
        for pat in name_patterns:
            matches = re.finditer(pat, part)
            for m in matches:
                name = m.group(1).strip()
                # Filter out false positives
                skip = ['The Bitcoin', 'Bitcoin Group', 'American Original', 'World Crypto',
                        'For Over', 'Welcome Our', 'Moving On', 'Issue One', 'The Price',
                        'Hey Everybody', 'Hey Everyone', 'Good Evening', 'What Up',
                        'How You', 'Got To', 'All Right', 'Oh My', 'Oh God', 'The Best',
                        'Check Out', 'That Was']
                if any(name.lower().startswith(s.lower()) for s in skip):
                    continue
                if len(name) < 3 or len(name.split()) > 4:
                    continue
                # Clean up
                name = name.rstrip('.')
                if name not in [g['name'] for g in guests]:
                    affiliation = ''
                    if m.lastindex and m.lastindex >= 2:
                        affiliation = m.group(2).strip().rstrip('.,')
                    guests.append({'name': name, 'affiliation': affiliation})
    
    # Thomas Hunt / Mad Bitcoins detection — he is the HOST and on nearly every episode
    # Check for any Thomas Hunt reference in the intro
    thomas_patterns = [
        r"I'm\s+Thomas\s+Hunt",
        r"Thomas\s+Hunt\s+from",
        r"Mad\s+Bitcoins",
        r"World\s+Crypto\s+Network",
        r"I'm\s+Thomas\s+from",
    ]
    has_thomas = any(g['name'] == 'Thomas Hunt' for g in guests)
    if not has_thomas:
        for tp in thomas_patterns:
            if re.search(tp, intro, re.IGNORECASE):
                guests.append({'name': 'Thomas Hunt', 'affiliation': 'World Crypto Network', 'host': True})
                has_thomas = True
                break
    
    # Also check the full first 1500 words for Thomas Hunt references (he often self-IDs later)
    if not has_thomas:
        full_intro = ' '.join(body.split()[:1500]) if body else ''
        for tp in thomas_patterns:
            if re.search(tp, full_intro, re.IGNORECASE):
                guests.append({'name': 'Thomas Hunt', 'affiliation': 'World Crypto Network', 'host': True})
                has_thomas = True
                break
    
    # Thomas Hunt is the host — assume present unless this is a known guest-only episode
    # He appears in all but ~2-3 episodes across the entire run
    if not has_thomas and ep_num not in []:
        # Check if transcript mentions his name anywhere at all
        full_text_lower = (body or '').lower()
        if any(x in full_text_lower for x in ['thomas hunt', 'thomas from', 'mad bitcoins', 'world crypto network', 'i\'m thomas']):
            guests.append({'name': 'Thomas Hunt', 'affiliation': 'World Crypto Network', 'host': True})
    
    # Normalize known name variants (Whisper STT variations)
    NORMALIZATIONS = {
        # Host
        'Thomas': 'Thomas Hunt', 'Tomas Hunt': 'Thomas Hunt', 'Hunt': 'Thomas Hunt',
        'Mad Bitcoins': 'Thomas Hunt', 'Nine Thomas Hunt': 'Thomas Hunt',
        'Now I M Thomas Hunt': 'Thomas Hunt', 'Time Thomas Hunt': 'Thomas Hunt',
        # Tone Vays
        'Tom Vays': 'Tone Vays', 'Toned Vays': 'Tone Vays', 'Tony Vays': 'Tone Vays',
        'Tone Bays': 'Tone Vays', 'Tony Vaze': 'Tone Vays', 'Ton Vays': 'Tone Vays', 'Tones': 'Tone Vays',
        # Dan Eve (correct spelling per user)
        'Dan Eave': 'Dan Eve', 'Dan Eve': 'Dan Eve',
        # Josh Scigala (correct spelling per user)
        'Josh Shigala': 'Josh Scigala', 'Josh Shigalla': 'Josh Scigala', 'Josh Gagalla': 'Josh Scigala',
        'Josh Egala': 'Josh Scigala', 'Josh Gala': 'Josh Scigala', 'Josh Shagalla': 'Josh Scigala',
        'Josh Sigala': 'Josh Scigala', 'Josh Tagala': 'Josh Scigala', 'Josh Agala': 'Josh Scigala',
        'Josh Jagala': 'Josh Scigala', 'Josh Kigala': 'Josh Scigala', 'Josh Legala': 'Josh Scigala',
        'Josh Gigala': 'Josh Scigala', 'Josh Seagala': 'Josh Scigala', 'Josh Gagala': 'Josh Scigala',
        'Joshua Gala': 'Josh Scigala', 'Joshua Shagalla': 'Josh Scigala', 'Joshua Shigala': 'Josh Scigala',
        'Jessica Gala': 'Josh Scigala', 'Gala': 'Josh Scigala',
        # Jeffrey Jones / The Vortex
        'Jeffrey Jones': 'Jeffery Jones', 'Jeffery Jones': 'Jeffery Jones',
        # Vin Armani
        'Vine': 'Vin Armani', 'Vin': 'Vin Armani', 'Vaan': 'Vin Armani',
        # Megan Lords
        'Megan Lourds': 'Megan Lords', 'Megan Lourdes': 'Megan Lords', 'Megan Lawrence': 'Megan Lords',
        'Megan Lors': 'Megan Lords',
        # Will Pangman
        'Will Penguin': 'Will Pangman', 'Will Pangmann': 'Will Pangman', 'Will Pengman': 'Will Pangman',
        # Ben Arc
        'Ben Arck': 'Ben Arc', 'Ben Ark': 'Ben Arc',
        # Vlad Costea
        'Vlad Kosta': 'Vlad Costea', 'Vlad Costa': 'Vlad Costea',
        # Martin Wismeijer
        'Martin Wishmare': 'Martin Wismeijer', 'Martin Wismer': 'Martin Wismeijer',
        'Martin Wishmeyer': 'Martin Wismeijer', 'Martin Wishmer': 'Martin Wismeijer',
        'Martine Wishmare': 'Martin Wismeijer', 'Martine Wismer': 'Martin Wismeijer',
        # Adam McBride
        'Adam Mc': 'Adam McBride', 'Bride': 'Adam McBride',
        # Derrick Freeman
        'Freeman': 'Derrick Freeman', 'Derek Freeman': 'Derrick Freeman', 'Derek': 'Derrick Freeman',
        # Other
        'Mike Dupree': 'Michael Dupree',
        'Christoph Atlas': 'Kristoff Atlas', 'Christoph Atlis': 'Kristoff Atlas',
        'Christoph Atlus': 'Kristoff Atlas', 'Kristoff Atlus': 'Kristoff Atlas',
        'Chris Dough Atlas': 'Kristoff Atlas',
        'Max Hillabran': 'Max Hillebrand', 'Max Hillabrand': 'Max Hillebrand',
        'Gabriel Devon': 'Gabriel D Vine', 'Gabriel Divine': 'Gabriel D Vine',
        'Dovey Barker': 'Davy Barker',
    }
    for g in guests:
        if g['name'] in NORMALIZATIONS:
            g['name'] = NORMALIZATIONS[g['name']]
    
    return guests

def main():
    parser = argparse.ArgumentParser(description='TBG Guest Extractor')
    parser.add_argument('--update-8ball', action='store_true')
    parser.add_argument('--export', action='store_true')
    args = parser.parse_args()
    
    print(f'{B}👥 TBG Guest Extractor{X}')
    print(f'   Scanning show intros for panelist names...\n')
    
    episodes = json.load(open(DATA_JSON))
    ep_map = {e['num']: e for e in episodes['episodes']}
    
    all_guests = {}  # ep_num -> [guests]
    name_counter = Counter()
    name_episodes = defaultdict(list)
    
    for f in sorted(TR_DIR.glob('TBG-*.txt')):
        num = int(f.stem.replace('TBG-', ''))
        text = f.read_text(errors='ignore')
        guests = extract_guests_from_intro(text, num)
        
        if guests:
            all_guests[num] = guests
            for g in guests:
                name_counter[g['name']] += 1
                name_episodes[g['name']].append(num)
    
    print(f'{G}   Extracted guests from {len(all_guests)} episodes{X}\n')
    
    # Display top guests
    print(f'{B}🏆 MOST FREQUENT PANELISTS{X}')
    print(f'{"─"*60}')
    print(f'{"RANK":<6} {"NAME":<25} {"APPEARANCES":>12} {"FIRST":>8} {"LAST":>8}')
    print(f'{"─"*60}')
    
    for i, (name, count) in enumerate(name_counter.most_common(30)):
        eps = sorted(name_episodes[name])
        first = f'#{eps[0]}'
        last = f'#{eps[-1]}'
        medal = '🥇' if i == 0 else '🥈' if i == 1 else '🥉' if i == 2 else f'  {i+1}.'
        print(f'{medal:<6} {name:<25} {count:>12} {first:>8} {last:>8}')
    
    # Show a few episodes as samples
    print(f'\n{B}📝 SAMPLE EPISODES{X}')
    for num in [485, 480, 470, 400, 300, 200, 100, 50]:
        if num in all_guests:
            ep = ep_map.get(num, {})
            names = ', '.join(g['name'] for g in all_guests[num])
            print(f'  #{num} ({ep.get("date","")[:10]}): {names}')
    
    # Save guests data
    guests_data = {
        'generated': datetime.now().isoformat(),
        'total_episodes_with_guests': len(all_guests),
        'unique_guests': len(name_counter),
        'top_guests': [{'name': n, 'count': c, 'episodes': sorted(name_episodes[n])} 
                      for n, c in name_counter.most_common(50)],
        'by_episode': {str(k): v for k, v in all_guests.items()}
    }
    
    guests_path = OUT / 'guests.json'
    json.dump(guests_data, open(guests_path, 'w'), indent=2)
    print(f'\n   Saved {guests_path}')
    
    if args.update_8ball:
        update_8ball_guests(all_guests)
    
    if args.export:
        deploy_guests(guests_data)

def update_8ball_guests(all_guests):
    """Cross-reference 8-ball data with verified guest lists."""
    m8_path = OUT / 'magic8ball.json'
    if not m8_path.exists():
        print('   No magic8ball.json found — run tbg_magic8ball.py first')
        return
    
    m8 = json.load(open(m8_path))
    updated = 0
    
    for ep in m8['episodes']:
        num = ep['episode']
        if num in all_guests:
            verified = [g['name'] for g in all_guests[num]]
            # Update guest calls to use verified names
            for gc in ep.get('guest_calls', []):
                # Try to match the extracted name to a verified guest
                for vname in verified:
                    if gc['name'].lower() in vname.lower() or vname.lower().startswith(gc['name'].lower()):
                        if gc['name'] != vname:
                            gc['name'] = vname
                            updated += 1
                        break
            # Store verified guest list on the episode
            ep['verified_guests'] = verified
    
    json.dump(m8, open(m8_path, 'w'), indent=2)
    print(f'   Updated {updated} guest names in magic8ball.json')

def deploy_guests(data):
    """Deploy guests data to server."""
    import subprocess
    DEPLOY = 'root@157.245.186.58'
    subprocess.run(['scp', '-o', 'ConnectTimeout=10', str(OUT / 'guests.json'),
                   f'{DEPLOY}:/var/www/html/tbg-mirrors/'], capture_output=True, timeout=30)
    print(f'   Deployed guests.json')

if __name__ == '__main__':
    main()
