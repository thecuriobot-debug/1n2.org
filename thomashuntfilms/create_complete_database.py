#!/usr/bin/env python3
"""
Complete video database with ALL real YouTube IDs
Extracted from actual YouTube channel
"""
import json
from pathlib import Path

base = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")

# Load existing Star Trek data
with open(base / 'videos_verified.json') as f:
    star_trek_videos = json.load(f)

# STAR WARS SHIPS ONLY (4 videos - with real IDs!)
star_wars_videos = [
    {
        'id': 'spaceballs-ships-only',
        'youtube_id': 'NixclLOskjc',
        'title': 'Spaceballs (ships only)',
        'year': 1987,
        'runtime': '10:29',
        'views': '14K',
        'description': 'All spaceship scenes from Spaceballs.',
        'series': 'Star Wars'
    },
    {
        'id': 'star-wars-ships-only',
        'youtube_id': 'jgGr15RvpiI',
        'title': 'Star Wars (ships only)',
        'year': 1977,
        'runtime': '8:13',
        'views': '164K',
        'description': 'All spaceship scenes from the original Star Wars.',
        'series': 'Star Wars'
    },
    {
        'id': 'empire-strikes-back-ships-only',
        'youtube_id': 'TYrq1mLsPlo',
        'title': 'Empire Strikes Back (ships only)',
        'year': 1980,
        'runtime': '13:05',
        'views': '1.6M',
        'description': 'Epic space battles from The Empire Strikes Back.',
        'series': 'Star Wars'
    },
    {
        'id': 'return-jedi-ships-only',
        'youtube_id': 'jTMK8McUdE0',
        'title': 'Return of the Jedi (ships only)',
        'year': 1983,
        'runtime': '11:56',
        'views': '346K',
        'description': 'The Battle of Endor and all ship sequences.',
        'series': 'Star Wars'
    },
]

# MOVIE REMIX EDITS (with real IDs!)
movie_remixes = [
    {
        'id': 'hunt-red-october-ships',
        'youtube_id': 'afGFDYy8RNc',
        'title': 'Hunt for Red October (ships only)',
        'year': 1990,
        'runtime': '12:56',
        'views': '3.3K',
        'description': 'All submarine sequences from Hunt for Red October.',
        'category': 'Ships Only'
    },
    {
        'id': 'jaws-sharks-only',
        'youtube_id': 'pYuxe-1IHos',
        'title': 'Jaws (sharks only)',
        'year': 1975,
        'runtime': '14:03',
        'views': '193',
        'description': 'Every shark appearance from Jaws.',
        'category': 'Animals Only'
    },
    {
        'id': 'john-wick-gun-fu',
        'youtube_id': '7Z9dyeeLKt8',
        'title': 'John Wick (Gun-Fu)',
        'year': 2014,
        'runtime': '3:57',
        'views': '191',
        'description': 'All gun-fu action sequences from John Wick.',
        'category': 'Action Edits'
    },
    {
        'id': 'john-wick-2-gun-fu',
        'youtube_id': 'Je0cLFxdk-Q',
        'title': 'John Wick 2 (Gun-Fu)',
        'year': 2017,
        'runtime': '9:08',
        'views': '47',
        'description': 'Gun-fu sequences from John Wick: Chapter 2.',
        'category': 'Action Edits'
    },
    {
        'id': 'john-wick-2-thrown-out',
        'youtube_id': 'e0n2qfc8FBA',
        'title': 'John Wick 2 (thrown out)',
        'year': 2017,
        'runtime': '0:22',
        'views': '23',
        'description': 'John Wick getting thrown out compilation.',
        'category': 'Action Edits'
    },
    {
        'id': 'john-wick-3-gun-fu',
        'youtube_id': 'HjqsPt9U6UQ',
        'title': 'John Wick 3 (Gun-Fu)',
        'year': 2019,
        'runtime': '8:30',
        'views': '117',
        'description': 'Gun-fu action from John Wick: Chapter 3.',
        'category': 'Action Edits'
    },
    {
        'id': 'pulp-fiction-silent',
        'youtube_id': 'kpp246b2tCY',
        'title': 'Pulp Fiction (Silent Version)',
        'year': 1994,
        'runtime': '5:21',
        'views': '78',
        'description': 'Pulp Fiction with no dialogue.',
        'category': 'Silent Edits'
    },
    {
        'id': 'top-gun-planes-only',
        'youtube_id': 'XdgKDqBQy00',
        'title': 'Top Gun (planes only)',
        'year': 1986,
        'runtime': '16:08',
        'views': '1.5K',
        'description': 'All aerial sequences from Top Gun.',
        'category': 'Vehicles Only'
    },
]

# BATMAN '66 EDITS (with real IDs!)
batman_edits = [
    {
        'id': 'batman-robin-balloon',
        'youtube_id': 'PPsVE6JERGo',
        'title': 'Batman and Robin on a Balloon',
        'year': 1966,
        'runtime': '0:38',
        'views': '339',
        'description': 'Classic Batman 1966 balloon scene.',
        'category': "Batman '66"
    },
    {
        'id': 'batman-real-please-stand',
        'youtube_id': 'c1beuePqCYk',
        'title': 'Will the real Batman please stand up?',
        'year': 1966,
        'runtime': '0:19',
        'views': '782',
        'description': 'Batman identity confusion remix.',
        'category': "Batman '66"
    },
    {
        'id': 'same-bat-time-channel',
        'youtube_id': 'VeIOuWlmZrk',
        'title': 'Same Bat Time, Same Bat Channel (remix)',
        'year': 1966,
        'runtime': '21:56',
        'views': '44K',
        'description': 'Classic Batman cliffhanger endings compilation.',
        'category': "Batman '66"
    },
    {
        'id': 'next-week-batman-remix',
        'youtube_id': 'oOv5xh4Mah4',
        'title': 'Next Week on Batman! (remix)',
        'year': 1966,
        'runtime': '3:07',
        'views': '812',
        'description': 'Next week teasers from Batman 1966.',
        'category': "Batman '66"
    },
    {
        'id': 'glorious-morning-gotham',
        'youtube_id': 'b6QeQVKicko',
        'title': 'Another Glorious Morning in Gotham City (remix)',
        'year': 1966,
        'runtime': '12:42',
        'views': '562',
        'description': 'Gotham City morning scenes compilation.',
        'category': "Batman '66"
    },
]

# OTHER EDITS (with real IDs!)
other_edits = [
    {
        'id': 'david-lynch-tribute-2025',
        'youtube_id': 'R5Gcva1QfsQ',
        'title': 'David Lynch Tribute at the 2025 Academy Awards (fixed)',
        'year': 2025,
        'runtime': '1:53',
        'views': '298',
        'description': 'Tribute to David Lynch at the Academy Awards.',
        'category': 'Tributes'
    },
    {
        'id': 'jackrabbit-always-wins',
        'youtube_id': 'NAemnMNuhcQ',
        'title': '"The Jackrabbit Always Wins" (The Hunt Remix)',
        'year': 2012,
        'runtime': '18:00',
        'views': '75',
        'description': 'Remix of The Hunt.',
        'category': 'Remixes'
    },
    {
        'id': 'california-girls-remix',
        'youtube_id': '0Lcx03bAiOQ',
        'title': 'California Girls (remix)',
        'year': 2015,
        'runtime': '0:53',
        'views': '156',
        'description': 'California Girls music remix.',
        'category': 'Music Remixes'
    },
    {
        'id': 'midget-remix',
        'youtube_id': 'Wmj_PMt8mto',
        'title': 'MIDGET (remix)',
        'year': 2020,
        'runtime': '0:54',
        'views': '66',
        'description': 'MIDGET film remix.',
        'category': 'Remixes'
    },
    {
        'id': 'six-punches-silent',
        'youtube_id': 'aozd-EpUAII',
        'title': 'Six Punches of Ali (silent less cuts)',
        'year': 2020,
        'runtime': '0:25',
        'views': '138',
        'description': 'Muhammad Ali boxing compilation.',
        'category': 'Boxing Edits'
    },
    {
        'id': 'six-punches-all',
        'youtube_id': 'HOBOymqo-WY',
        'title': 'Six Punches of Ali',
        'year': 2020,
        'runtime': '0:25',
        'views': '103',
        'description': 'Another Ali boxing compilation.',
        'category': 'Boxing Edits'
    },
    {
        'id': 'how-to-fire-player',
        'youtube_id': 'Wjz4EbyIFiQ',
        'title': 'How to Fire a Player',
        'year': 2022,
        'runtime': '2:11',
        'views': '22',
        'description': 'Sports management remix.',
        'category': 'Sports'
    },
    {
        'id': 'baseball-game-remix',
        'youtube_id': 'cgnyT_Hx59M',
        'title': 'I am at a baseball game (remix)',
        'year': 2022,
        'runtime': '1:13',
        'views': '30',
        'description': 'Baseball game remix.',
        'category': 'Sports'
    },
    {
        'id': 'just-keep-swinging',
        'youtube_id': '9LkSG23GsW0',
        'title': 'Just keep swinging',
        'year': 2022,
        'runtime': '1:47',
        'views': '71',
        'description': 'Baseball swinging compilation.',
        'category': 'Sports'
    },
    {
        'id': 'now-this-is-driving',
        'youtube_id': 'abLvddIog0I',
        'title': 'Now this is driving',
        'year': 2022,
        'runtime': '0:26',
        'views': '110',
        'description': 'Driving scenes compilation.',
        'category': 'Vehicles'
    },
]

# Save complete database
complete_data = {
    'Star Trek Ships Only': star_trek_videos,
    'Star Wars Ships Only': star_wars_videos,
    'Movie Remixes': movie_remixes,
    "Batman '66 Edits": batman_edits,
    'Other Edits': other_edits
}

with open(base / 'all_videos_complete.json', 'w') as f:
    json.dump(complete_data, f, indent=2)

total = len(star_trek_videos) + len(star_wars_videos) + len(movie_remixes) + len(batman_edits) + len(other_edits)

print("✅ Complete video database with ALL YouTube IDs!")
print(f"   - Star Trek: {len(star_trek_videos)} videos")
print(f"   - Star Wars: {len(star_wars_videos)} videos")
print(f"   - Movie Remixes: {len(movie_remixes)} videos")
print(f"   - Batman '66: {len(batman_edits)} videos")
print(f"   - Other Edits: {len(other_edits)} videos")
print(f"   - TOTAL: {total} videos with real YouTube IDs!")
print("\n💾 Saved to: all_videos_complete.json")
print("\nReady to generate full series page with video previews!")
