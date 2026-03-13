#!/usr/bin/env python3
"""
Extract REAL YouTube video IDs from press HTML files
"""
import re
from pathlib import Path

press_dir = Path("/Users/curiobot/Sites/1n2.org/star_trek_ships_only/Star Trek Ships Only Press")
jwz_file = press_dir / "jwz  Star Trek movies (ships only).html"

# Read the jwz HTML file which has all the video IDs
with open(jwz_file, 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()

# Extract YouTube video IDs from the HTML
# Pattern: youtube.com/watch?v=VIDEO_ID or youtube.com/embed/VIDEO_ID
video_pattern = r'youtube\.com/watch\?v=([a-zA-Z0-9_-]+)'
video_ids = re.findall(video_pattern, html)

# Also check iframe embeds
iframe_pattern = r'youtube\.com/embed/([a-zA-Z0-9_-]+)'
iframe_ids = re.findall(iframe_pattern, html)

# Combine and deduplicate
all_ids = list(dict.fromkeys(video_ids + iframe_ids))

print("🎬 Found YouTube Video IDs from jwz press article:")
print("=" * 70)

# The HTML shows them in order with titles
videos_found = []

# Parse more carefully to get titles
title_pattern = r'<a href="http://www\.youtube\.com/watch\?v=([^"]+)">([^<]+)</a>'
matches = re.findall(title_pattern, html)

for video_id, title in matches:
    print(f"{title}: {video_id}")
    videos_found.append({'id': video_id, 'title': title})

print(f"\n✅ Found {len(videos_found)} videos")
print(f"\nVideo IDs: {all_ids}")

# Save to file
import json
output = {
    'source': 'jwz blog post',
    'date_found': '2026-02-16',
    'videos': videos_found,
    'video_ids': all_ids
}

with open('/Users/curiobot/Sites/1n2.org/thomashuntfilms/real_video_ids.json', 'w') as f:
    json.dump(output, f, indent=2)

print(f"\n💾 Saved to real_video_ids.json")
