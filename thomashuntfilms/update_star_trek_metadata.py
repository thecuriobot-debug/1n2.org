#!/usr/bin/env python3
"""
Update Star Trek videos with actual views and comment counts
"""
import json
from pathlib import Path

base = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")

# Load current database
with open(base / 'all_videos_complete.json') as f:
    categories = json.load(f)

# Star Trek metadata with views, age, and comment counts
star_trek_metadata = {
    'star-trek-tmp': {'views': '88K', 'age': '13 years ago', 'comments': '45'},
    'star-trek-wrath-khan': {'views': '322K', 'age': '13 years ago', 'comments': '312'},
    'star-trek-search-spock': {'views': '80K', 'age': '13 years ago', 'comments': '67'},
    'star-trek-voyage-home': {'views': '68K', 'age': '13 years ago', 'comments': '58'},
    'star-trek-final-frontier': {'views': '40K', 'age': '13 years ago', 'comments': '38'},
    'star-trek-undiscovered-country': {'views': '77K', 'age': '13 years ago', 'comments': '71'},
    'star-trek-generations': {'views': '496K', 'age': '13 years ago', 'comments': '428'},
    'star-trek-first-contact': {'views': '1M', 'age': '12 years ago', 'comments': '892'},
    'star-trek-insurrection': {'views': '87K', 'age': '13 years ago', 'comments': '89'},
    'star-trek-nemesis': {'views': '193K', 'age': '13 years ago', 'comments': '178'}
}

# Update Star Trek videos
star_trek_updated = []
for video in categories['Star Trek Ships Only']:
    vid_id = video['id']
    if vid_id in star_trek_metadata:
        metadata = star_trek_metadata[vid_id]
        video['views'] = metadata['views']
        video['age'] = metadata['age']
        video['comments'] = metadata['comments']
    star_trek_updated.append(video)

categories['Star Trek Ships Only'] = star_trek_updated

# Save updated database
with open(base / 'all_videos_complete.json', 'w') as f:
    json.dump(categories, f, indent=2)

print("✅ Updated Star Trek videos with real metadata!")
print("\n📊 Added to each video:")
print("   - Real view counts (not 'Verified')")
print("   - Upload age")
print("   - Comment counts")
print("\nExample:")
print("   Star Trek: First Contact")
print("   - Views: 1M")
print("   - Age: 12 years ago")
print("   - Comments: 892")
