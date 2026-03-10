#!/usr/bin/env python3.12
"""
TBG Transcript Search Framework
Search across all Bitcoin Group transcripts from the terminal.
PRIMARY SOURCE — read-only, never modify transcripts.

Usage:
  python3.12 tbg_search.py "bitcoin etf"           # Search all transcripts
  python3.12 tbg_search.py "silk road" --context 3  # Show 3 lines of context
  python3.12 tbg_search.py "iran" --episodes        # Show episode list only
  python3.12 tbg_search.py "quantum" --count         # Count matches only  
  python3.12 tbg_search.py "halving" --after 400     # Only episodes after #400
  python3.12 tbg_search.py "tether" --export results.txt  # Export to file
"""
import argparse, os, re, json, sys
from pathlib import Path
from collections import defaultdict

TRANSCRIPT_DIR = Path.home() / 'Sites' / '1n2.org' / 'bitcoingroup-audio' / 'transcripts'
DATA_JSON = Path.home() / 'Sites' / '1n2.org' / 'tbg-mirrors' / 'data.json'

# ANSI colors
CYAN = '\033[96m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
BOLD = '\033[1m'
DIM = '\033[2m'
RESET = '\033[0m'

def load_episode_meta():
    """Load episode metadata."""
    try:
        d = json.load(open(DATA_JSON))
        return {e['num']: e for e in d['episodes']}
    except:
        return {}

def search_transcripts(query, context=1, after=0, before=999, regex=False, case_sensitive=False):
    """Search all transcripts for a query string."""
    results = []
    
    if regex:
        flags = 0 if case_sensitive else re.IGNORECASE
        pattern = re.compile(query, flags)
    else:
        if not case_sensitive:
            query_lower = query.lower()
    
    files = sorted(TRANSCRIPT_DIR.glob('TBG-*.txt'))
    
    for f in files:
        num = int(f.stem.replace('TBG-', ''))
        if num < after or num > before:
            continue
        
        text = f.read_text(errors='ignore')
        lines = text.split('\n')
        
        # Skip header comments
        body_lines = []
        for i, line in enumerate(lines):
            if not line.startswith('#') and line.strip():
                body_lines = lines[i:]
                break
        
        matches = []
        for i, line in enumerate(body_lines):
            if regex:
                if pattern.search(line):
                    # Get context
                    start = max(0, i - context)
                    end = min(len(body_lines), i + context + 1)
                    ctx = body_lines[start:end]
                    matches.append({'line': i, 'text': line.strip(), 'context': ctx})
            else:
                check = line if case_sensitive else line.lower()
                if (query if case_sensitive else query_lower) in check:
                    start = max(0, i - context)
                    end = min(len(body_lines), i + context + 1)
                    ctx = body_lines[start:end]
                    matches.append({'line': i, 'text': line.strip(), 'context': ctx})
        
        if matches:
            results.append({
                'num': num,
                'file': str(f),
                'matches': matches,
                'total_matches': len(matches)
            })
    
    return results

def highlight(text, query, regex=False):
    """Highlight search term in text."""
    if regex:
        return re.sub(f'({query})', f'{YELLOW}\\1{RESET}', text, flags=re.IGNORECASE)
    else:
        # Case-insensitive highlight
        idx = text.lower().find(query.lower())
        if idx >= 0:
            return text[:idx] + YELLOW + text[idx:idx+len(query)] + RESET + text[idx+len(query):]
        return text

def main():
    parser = argparse.ArgumentParser(description='Search Bitcoin Group transcripts')
    parser.add_argument('query', help='Search term or regex pattern')
    parser.add_argument('--context', '-c', type=int, default=1, help='Lines of context (default: 1)')
    parser.add_argument('--episodes', '-e', action='store_true', help='Show episode list only')
    parser.add_argument('--count', action='store_true', help='Count matches only')
    parser.add_argument('--after', type=int, default=0, help='Only episodes after this number')
    parser.add_argument('--before', type=int, default=999, help='Only episodes before this number')
    parser.add_argument('--regex', '-r', action='store_true', help='Use regex pattern')
    parser.add_argument('--case', action='store_true', help='Case sensitive search')
    parser.add_argument('--export', help='Export results to file')
    parser.add_argument('--top', type=int, default=0, help='Show top N episodes by match count')
    args = parser.parse_args()
    
    meta = load_episode_meta()
    
    print(f'{BOLD}🔍 Searching {len(list(TRANSCRIPT_DIR.glob("TBG-*.txt")))} transcripts for: {CYAN}{args.query}{RESET}')
    if args.after > 0:
        print(f'   {DIM}Episodes #{args.after}+{RESET}')
    
    results = search_transcripts(
        args.query, 
        context=args.context, 
        after=args.after, 
        before=args.before,
        regex=args.regex, 
        case_sensitive=args.case
    )
    
    total_matches = sum(r['total_matches'] for r in results)
    print(f'{GREEN}   Found {total_matches} matches across {len(results)} episodes{RESET}\n')
    
    if args.count:
        # Just show counts per episode
        for r in sorted(results, key=lambda x: -x['total_matches']):
            ep = meta.get(r['num'], {})
            title = ep.get('title', f'Episode #{r["num"]}')[:60]
            date = ep.get('date', '')
            print(f'  {CYAN}#{r["num"]:>3}{RESET}  {r["total_matches"]:>3} matches  {DIM}{date}{RESET}  {title}')
        return
    
    if args.top:
        results = sorted(results, key=lambda x: -x['total_matches'])[:args.top]
    
    if args.episodes:
        for r in results:
            ep = meta.get(r['num'], {})
            title = ep.get('title', f'Episode #{r["num"]}')
            date = ep.get('date', '')
            print(f'  {CYAN}#{r["num"]:>3}{RESET}  {date}  {title}  ({r["total_matches"]} matches)')
        return
    
    # Full output with context
    output_lines = []
    for r in results:
        ep = meta.get(r['num'], {})
        title = ep.get('title', f'Episode #{r["num"]}')
        date = ep.get('date', '')
        
        header = f'━━━ #{r["num"]} — {title} ({date}) — {r["total_matches"]} matches ━━━'
        print(f'\n{BOLD}{CYAN}{header}{RESET}')
        output_lines.append(header)
        
        for m in r['matches'][:10]:  # Limit to 10 per episode
            for ctx_line in m['context']:
                hl = highlight(ctx_line.strip(), args.query, args.regex)
                print(f'  {hl}')
                output_lines.append(f'  {ctx_line.strip()}')
            print(f'  {DIM}---{RESET}')
            output_lines.append('  ---')
        
        if r['total_matches'] > 10:
            print(f'  {DIM}... and {r["total_matches"] - 10} more matches{RESET}')
    
    if args.export:
        with open(args.export, 'w') as f:
            f.write(f'Search: {args.query}\n')
            f.write(f'Results: {total_matches} matches in {len(results)} episodes\n\n')
            f.write('\n'.join(output_lines))
        print(f'\n{GREEN}Exported to {args.export}{RESET}')

if __name__ == '__main__':
    main()
