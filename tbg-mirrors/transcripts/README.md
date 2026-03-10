# The Bitcoin Group — Transcript Archive

## Overview
482 transcripts from The Bitcoin Group podcast (#1–#485), spanning 2013–2026.
**5.5 million words** of primary source material. Whisper AI transcriptions.

⚠️ **PRIMARY SOURCE — DO NOT EDIT TRANSCRIPTS** ⚠️
These are verbatim transcriptions. We learn and infer from them, but never modify them.

## File Locations

| What | Where |
|------|-------|
| Original transcripts | `/Users/curiobot/Sites/1n2.org/bitcoingroup-audio/transcripts/TBG-*.txt` |
| Episode metadata | `/Users/curiobot/Sites/1n2.org/tbg-mirrors/data.json` |
| Web viewer pages | `/Users/curiobot/Sites/1n2.org/tbg-mirrors/transcripts/TBG-*.html` |
| Search index | `/Users/curiobot/Sites/1n2.org/tbg-mirrors/transcripts/search-index.json` |
| Terminal search tool | `/Users/curiobot/Sites/1n2.org/thunt-data-labs/collectors/tbg_search.py` |
| Indexer (rebuilds pages) | `/Users/curiobot/Sites/1n2.org/thunt-data-labs/collectors/index_transcripts.py` |

## Web URLs

- Episode Tracker: https://1n2.org/tbg-mirrors/
- Transcript Index: https://1n2.org/tbg-mirrors/transcripts/
- Individual: https://1n2.org/tbg-mirrors/transcripts/TBG-485.html
- Full-text search: https://1n2.org/tbg-mirrors/transcripts/#search=bitcoin+etf

## Terminal Search — Quick Reference

```bash
cd ~/Sites/1n2.org/thunt-data-labs/collectors

# Basic search — find all mentions across 482 episodes
python3.12 tbg_search.py "bitcoin etf"

# Episode list — which episodes mention a topic
python3.12 tbg_search.py "silk road" --episodes

# Count mode — rank episodes by match frequency
python3.12 tbg_search.py "tether" --count

# Top N — most relevant episodes
python3.12 tbg_search.py "halving" --count --top 10

# Context — show surrounding lines
python3.12 tbg_search.py "quantum" --context 3

# Episode range — filter by number
python3.12 tbg_search.py "iran" --after 400
python3.12 tbg_search.py "mt gox" --before 200

# Regex — complex patterns
python3.12 tbg_search.py "elon|musk" --regex --episodes

# Case sensitive
python3.12 tbg_search.py "ETF" --case

# Export — save results to file
python3.12 tbg_search.py "curio cards" --export results.txt
```

## Advanced Search Examples

```bash
# Who was discussed most in early episodes?
python3.12 tbg_search.py "satoshi" --count --before 100

# Track a narrative across time
python3.12 tbg_search.py "china ban" --episodes

# Find price predictions
python3.12 tbg_search.py "100,000\|100K\|hundred thousand" --regex --count

# All mentions of a guest
python3.12 tbg_search.py "andreas" --count --top 20

# Find discussion of specific events
python3.12 tbg_search.py "FTX" --after 330 --context 2

# Combine with shell tools for deeper analysis
python3.12 tbg_search.py "regulation" --count | head -20
python3.12 tbg_search.py "regulation" --export /tmp/reg.txt && wc -l /tmp/reg.txt
```

## Building Custom Search Scripts

The search framework is designed to be extended. Here's how:

### Pattern: Frequency Analysis
```python
#!/usr/bin/env python3.12
"""Count how often a term appears per year."""
from tbg_search import search_transcripts, load_episode_meta
from collections import Counter

meta = load_episode_meta()
results = search_transcripts("bitcoin etf")
by_year = Counter()
for r in results:
    date = meta.get(r['num'], {}).get('date', '')
    if date:
        by_year[date[:4]] += r['total_matches']
for year, count in sorted(by_year.items()):
    print(f"  {year}: {count} mentions")
```

### Pattern: Multi-term Comparison
```python
#!/usr/bin/env python3.12
"""Compare frequency of multiple terms across episodes."""
from tbg_search import search_transcripts

terms = ["bitcoin etf", "spot etf", "futures etf"]
for term in terms:
    results = search_transcripts(term)
    total = sum(r['total_matches'] for r in results)
    print(f"  {term}: {total} matches in {len(results)} episodes")
```

### Pattern: Timeline Tracker
```python
#!/usr/bin/env python3.12
"""Track when a topic first and last appeared."""
from tbg_search import search_transcripts, load_episode_meta

meta = load_episode_meta()
results = search_transcripts("silk road")
if results:
    first = min(results, key=lambda r: r['num'])
    last = max(results, key=lambda r: r['num'])
    print(f"First mention: #{first['num']} ({meta.get(first['num'],{}).get('date','')})")
    print(f"Last mention: #{last['num']} ({meta.get(last['num'],{}).get('date','')})")
    print(f"Total episodes: {len(results)}")
```

## Rebuilding

```bash
# Rebuild all transcript viewer pages + search index (does NOT modify originals)
python3.12 index_transcripts.py

# This:
# 1. Reads original .txt transcripts (read-only)
# 2. Builds HTML viewer pages in /tbg-mirrors/transcripts/
# 3. Builds search-index.json
# 4. Deploys to server
```

## Transcript Format

Each transcript file follows this structure:
```
# The Bitcoin Group #NNN
# The Bitcoin Group #NNN - Title - Topics
# Date: YYYY-MM-DD
# Transcribed with Whisper (base)
# Duration: en

[Full transcript text follows...]
```

## Server Deployment

```bash
# Local → Server
scp -r ~/Sites/1n2.org/tbg-mirrors/transcripts/*.html root@157.245.186.58:/var/www/html/tbg-mirrors/transcripts/
scp ~/Sites/1n2.org/tbg-mirrors/transcripts/search-index.json root@157.245.186.58:/var/www/html/tbg-mirrors/transcripts/
```
