#!/usr/bin/env python3.12
"""
Updates TBG Mirrors data.json with transcript links as they become available.
Run this periodically or after transcription completes.
"""
import json, os

TRANSCRIPT_DIR = '/Users/curiobot/Sites/1n2.org/bitcoingroup-audio/transcripts'
MIRRORS_DATA = '/Users/curiobot/Sites/1n2.org/tbg-mirrors/data.json'

with open(MIRRORS_DATA) as f:
    data = json.load(f)

count = 0
for ep in data['episodes']:
    num = ep['num']
    padded = f"{num:03d}"
    txt_file = os.path.join(TRANSCRIPT_DIR, f"TBG-{padded}.txt")
    if os.path.exists(txt_file) and os.path.getsize(txt_file) > 100:
        ep['transcript'] = f"/bitcoingroup-audio/transcripts/TBG-{padded}.txt"
        count += 1
    else:
        ep['transcript'] = None

with open(MIRRORS_DATA, 'w') as f:
    json.dump(data, f)

print(f"Updated: {count}/{len(data['episodes'])} episodes have transcripts")
