#!/usr/bin/env python3
"""
Search ALL press files for YouTube video IDs
"""
import re
from pathlib import Path

press_dir = Path("/Users/curiobot/Sites/1n2.org/star_trek_ships_only/Star Trek Ships Only Press")

# All HTML files to search
html_files = list(press_dir.glob("*.html"))

all_video_ids = {}

for html_file in html_files:
    print(f"\n📄 Searching: {html_file.name}")
    print("=" * 70)
    
    try:
        with open(html_file, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Find all YouTube video IDs
        patterns = [
            r'youtube\.com/watch\?v=([a-zA-Z0-9_-]+)',
            r'youtube\.com/embed/([a-zA-Z0-9_-]+)',
            r'youtube\.com/v/([a-zA-Z0-9_-]+)',
            r'youtu\.be/([a-zA-Z0-9_-]+)',
        ]
        
        found_ids = set()
        for pattern in patterns:
            matches = re.findall(pattern, content)
            found_ids.update(matches)
        
        if found_ids:
            print(f"   Found {len(found_ids)} video IDs:")
            for vid_id in sorted(found_ids):
                print(f"      {vid_id}")
                all_video_ids[vid_id] = html_file.name
    
    except Exception as e:
        print(f"   Error: {e}")

print("\n" + "=" * 70)
print(f"📊 TOTAL UNIQUE VIDEO IDs FOUND: {len(all_video_ids)}")
print("=" * 70)

# Group by source
from collections import defaultdict
by_source = defaultdict(list)
for vid_id, source in all_video_ids.items():
    by_source[source].append(vid_id)

for source in sorted(by_source.keys()):
    print(f"\n{source}:")
    for vid_id in sorted(by_source[source]):
        print(f"   {vid_id}")

# Save all found IDs
import json
output = {
    'total_videos': len(all_video_ids),
    'videos': {vid_id: source for vid_id, source in all_video_ids.items()},
    'by_source': {source: ids for source, ids in by_source.items()}
}

output_file = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms/all_found_video_ids.json")
with open(output_file, 'w') as f:
    json.dump(output, f, indent=2)

print(f"\n💾 Saved to: {output_file}")
