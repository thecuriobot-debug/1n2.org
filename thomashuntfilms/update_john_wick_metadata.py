#!/usr/bin/env python3
"""
Collect metadata from all John Wick videos
"""
import json
from pathlib import Path

base = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")

# Load current database
with open(base / 'all_videos_complete.json') as f:
    categories = json.load(f)

# Update John Wick videos with collected metadata
# Data gathered from YouTube via browser

john_wick_metadata = [
    {
        'id': 'john-wick-gun-fu',
        'youtube_id': '7Z9dyeeLKt8',
        'title': 'John Wick (Gun-Fu)',
        'year': 2014,
        'runtime': '3:57',
        'views': '191',
        'likes': '4',
        'premiered': 'Nov 26, 2023',
        'description': 'REMIX! FAIR USE! All gun-fu action sequences from John Wick.',
        'category': 'Action Edits',
        'poster': 'https://m.media-amazon.com/images/M/MV5BMTU2NjA1ODgzMF5BMl5BanBnXkFtZTgwMTM2MTI4MjE@._V1_FMjpg_UX1000_.jpg'
    },
    {
        'id': 'john-wick-2-gun-fu',
        'youtube_id': 'Je0cLFxdk-Q',
        'title': 'John Wick 2 (Gun-Fu)',
        'year': 2017,
        'runtime': '9:08',
        'views': '47',  # From original data
        'description': 'Gun-fu sequences from John Wick: Chapter 2.',
        'category': 'Action Edits',
        'poster': 'https://m.media-amazon.com/images/M/MV5BMjE2NDkxNTY2M15BMl5BanBnXkFtZTgwMDc2NzE0MTI@._V1_FMjpg_UX1000_.jpg'
    },
    {
        'id': 'john-wick-3-gun-fu',
        'youtube_id': 'HjqsPt9U6UQ',
        'title': 'John Wick 3 (Gun-Fu)',
        'year': 2019,
        'runtime': '8:30',
        'views': '117',  # From original data
        'description': 'Gun-fu action from John Wick: Chapter 3.',
        'category': 'Action Edits',
        'poster': 'https://m.media-amazon.com/images/M/MV5BMDg2YzI0ODctYjliMy00NTU0LTkxODYtYTNkNjQwMzVmOTcxXkEyXkFqcGdeQXVyNjg2NjQwMDQ@._V1_FMjpg_UX1000_.jpg'
    },
    {
        'id': 'john-wick-2-thrown-out',
        'youtube_id': 'e0n2qfc8FBA',
        'title': 'John Wick 2 (thrown out)',
        'year': 2017,
        'runtime': '0:22',
        'views': '23',  # From original data
        'description': 'John Wick getting thrown out compilation.',
        'category': 'Action Edits'
    }
]

# Update categories
categories['John Wick Gun-Fu'] = john_wick_metadata

# Save updated database
with open(base / 'all_videos_complete.json', 'w') as f:
    json.dump(categories, f, indent=2)

print("✅ Updated John Wick metadata!")
print(f"   - John Wick 1: {john_wick_metadata[0]['views']} views, {john_wick_metadata[0].get('likes', 'N/A')} likes")
print(f"   - John Wick 2: {john_wick_metadata[1]['views']} views")
print(f"   - John Wick 3: {john_wick_metadata[2]['views']} views")
print(f"   - JW2 Thrown Out: {john_wick_metadata[3]['views']} views")
print("\n📊 All metadata updated in database!")
