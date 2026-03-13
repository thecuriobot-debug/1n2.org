#!/usr/bin/env python3
"""
Create comprehensive tabbed website with ALL Thomas Hunt Films categories
Based on actual YouTube channel content
"""
import json
from pathlib import Path

base = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")

# Load existing Star Trek data
with open(base / 'videos_verified.json') as f:
    star_trek_videos = json.load(f)

# NEW CATEGORIES from YouTube channel

# Star Wars Ships Only
star_wars_videos = [
    {'id': 'spaceballs-ships-only', 'youtube_id': 'YOUTUBE_ID', 'title': 'Spaceballs (ships only)', 'year': 1987, 'runtime': '10:29', 'views': '14K', 'series': 'Star Wars'},
    {'id': 'star-wars-ships-only', 'youtube_id': 'YOUTUBE_ID', 'title': 'Star Wars (ships only)', 'year': 1977, 'runtime': '8:13', 'views': '164K', 'series': 'Star Wars'},
    {'id': 'empire-strikes-back-ships-only', 'youtube_id': 'YOUTUBE_ID', 'title': 'Empire Strikes Back (ships only)', 'year': 1980, 'runtime': '13:05', 'views': '1.6M', 'series': 'Star Wars'},
    {'id': 'return-jedi-ships-only', 'youtube_id': 'YOUTUBE_ID', 'title': 'Return of the Jedi (ships only)', 'year': 1983, 'runtime': '11:56', 'views': '346K', 'series': 'Star Wars'},
]

# Movie Remix Edits
movie_remixes = [
    {'id': 'hunt-red-october-ships', 'title': 'Hunt for Red October (ships only)', 'views': '3.3K', 'category': 'Ships Only'},
    {'id': 'jaws-sharks-only', 'title': 'Jaws (sharks only)', 'views': '193', 'category': 'Animals Only'},
    {'id': 'john-wick-gun-fu', 'title': 'John Wick (Gun-Fu)', 'views': '191', 'category': 'Action Edits'},
    {'id': 'john-wick-2-gun-fu', 'title': 'John Wick 2 (Gun-Fu)', 'views': '47', 'category': 'Action Edits'},
    {'id': 'john-wick-2-thrown-out', 'title': 'John Wick 2 (thrown out)', 'views': '23', 'category': 'Action Edits'},
    {'id': 'john-wick-3-gun-fu', 'title': 'John Wick 3 (Gun-Fu)', 'views': '117', 'category': 'Action Edits'},
    {'id': 'pulp-fiction-silent', 'title': 'Pulp Fiction (Silent Version)', 'views': '78', 'category': 'Silent Edits'},
    {'id': 'top-gun-planes-only', 'title': 'Top Gun (planes only)', 'views': '1.5K', 'category': 'Vehicles Only'},
]

# Batman '66 Edits
batman_edits = [
    {'id': 'batman-robin-balloon', 'title': 'Batman and Robin on a Balloon', 'views': '339', 'category': "Batman '66"},
    {'id': 'batman-real-please-stand', 'title': 'Will the real Batman please stand up?', 'views': '782', 'category': "Batman '66"},
    {'id': 'same-bat-time-channel', 'title': 'Same Bat Time, Same Bat Channel (remix)', 'views': '44K', 'category': "Batman '66"},
    {'id': 'next-week-batman-remix', 'title': 'Next Week on Batman! (remix)', 'views': '812', 'category': "Batman '66"},
    {'id': 'glorious-morning-gotham', 'title': 'Another Glorious Morning in Gotham City (remix)', 'views': '562', 'category': "Batman '66"},
]

# Other Edits
other_edits = [
    {'id': 'david-lynch-tribute-2025', 'title': 'David Lynch Tribute at the 2025 Academy Awards (fixed)', 'views': '298', 'category': 'Tributes'},
    {'id': 'jackrabbit-always-wins', 'title': '"The Jackrabbit Always Wins" (The Hunt Remix)', 'views': '75', 'category': 'Remixes'},
    {'id': 'california-girls-remix', 'title': 'California Girls (remix)', 'views': '156', 'category': 'Music Remixes'},
    {'id': 'midget-remix', 'title': 'MIDGET (remix)', 'views': '56', 'category': 'Remixes'},
    {'id': 'six-punches-silent', 'title': 'Six Punches of All (silent less cuts)', 'views': '138', 'category': 'Boxing Edits'},
    {'id': 'six-punches-all', 'title': 'Six Punches of All', 'views': '103', 'category': 'Boxing Edits'},
    {'id': 'how-to-fire-player', 'title': 'How to Fire a Player', 'views': '22', 'category': 'Sports'},
    {'id': 'baseball-game-remix', 'title': 'I am at a baseball game (remix)', 'views': '30', 'category': 'Sports'},
    {'id': 'just-keep-swinging', 'title': 'Just keep swinging', 'views': '71', 'category': 'Sports'},
    {'id': 'now-this-is-driving', 'title': 'Now this is driving', 'views': '110', 'category': 'Vehicles'},
]

# Combine all for reference
all_categories = {
    'Star Trek Ships Only': star_trek_videos,
    'Star Wars Ships Only': star_wars_videos,
    'Movie Remixes': movie_remixes,
    "Batman '66 Edits": batman_edits,
    'Other Edits': other_edits
}

# Save comprehensive data
with open(base / 'all_videos_categorized.json', 'w') as f:
    json.dump(all_categories, f, indent=2)

print("✅ Created comprehensive video categorization!")
print(f"   - Star Trek: {len(star_trek_videos)} videos")
print(f"   - Star Wars: {len(star_wars_videos)} videos")
print(f"   - Movie Remixes: {len(movie_remixes)} videos")
print(f"   - Batman '66: {len(batman_edits)} videos")
print(f"   - Other Edits: {len(other_edits)} videos")
print(f"   - Total: {len(star_trek_videos) + len(star_wars_videos) + len(movie_remixes) + len(batman_edits) + len(other_edits)} videos")
print("\n💾 Saved to: all_videos_categorized.json")
print("\nNext: Create multi-tab series page like Batman '68!")
