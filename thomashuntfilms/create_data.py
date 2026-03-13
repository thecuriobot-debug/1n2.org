#!/usr/bin/env python3
"""
Build Thomas Hunt Films website MVP
"""
from pathlib import Path
import json

base_dir = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")
base_dir.mkdir(exist_ok=True)

# Video data - manual list from YouTube channel
videos = [
    {
        'id': 'star-trek-tmp',
        'title': 'Star Trek: The Motion Picture (Ships Only)',
        'youtube_id': '0gywz1PgM_I',
        'year': 1979,
        'runtime': '11:30',
        'description': 'All the spaceship scenes from Star Trek: The Motion Picture, edited together.',
        'series': 'Star Trek',
        'views': '500K+'
    },
    {
        'id': 'star-trek-wrath-khan',
        'title': 'Star Trek II: The Wrath of Khan (Ships Only)',
        'youtube_id': 'rFG58m7xAig',
        'year': 1982,
        'runtime': '9:45',
        'description': 'The space battle sequences from The Wrath of Khan.',
        'series': 'Star Trek',
        'views': '400K+'
    },
    {
        'id': 'star-trek-search-spock',
        'title': 'Star Trek III: The Search for Spock (Ships Only)',
        'youtube_id': '3EQ9cFey-3U',
        'year': 1984,
        'runtime': '8:20',
        'description': 'Ship sequences from The Search for Spock.',
        'series': 'Star Trek',
        'views': '300K+'
    },
    {
        'id': 'star-trek-voyage-home',
        'title': 'Star Trek IV: The Voyage Home (Ships Only)',
        'youtube_id': '6RGTyaJrbj0',
        'year': 1986,
        'runtime': '5:15',
        'description': 'Spaceship scenes from The Voyage Home.',
        'series': 'Star Trek',
        'views': '250K+'
    },
    {
        'id': 'star-trek-final-frontier',
        'title': 'Star Trek V: The Final Frontier (Ships Only)',
        'youtube_id': '5LOtf5Yq39Y',
        'year': 1989,
        'runtime': '6:30',
        'description': 'All ship sequences from The Final Frontier.',
        'series': 'Star Trek',
        'views': '200K+'
    },
]

# Press coverage
press_articles = [
    {
        'title': 'All the Star Trek movies cut down to just spaceships',
        'publication': 'The A.V. Club',
        'date': '2015',
        'url': 'avclub.com',
        'excerpt': 'Great Job, Internet! feature on the Star Trek Ships Only series.',
        'local_file': 'All the Star Trek movies cut down to just spaceships · Great Job, Internet! · The A.V. Club.html'
    },
    {
        'title': 'Star Trek movie supercuts: just the spaceships',
        'publication': 'Boing Boing',
        'date': '2015',
        'url': 'boingboing.net',
        'excerpt': 'Coverage of the innovative editing project.',
        'local_file': 'Star Trek movie supercuts  just the spaceships - Boing Boing.html'
    },
    {
        'title': "This Genius Slices 'Star Trek' Movies Down to Just the Ships",
        'publication': 'Popular Mechanics',
        'date': '2015',
        'url': 'popularmechanics.com',
        'excerpt': 'In-depth look at the editing process and appeal.',
        'local_file': "This Genius Slices 'Star Trek' Movies Down to Just the Ships.html"
    },
    {
        'title': 'Star Trek movies (ships only)',
        'publication': 'MetaFilter',
        'date': '2015',
        'url': 'metafilter.com',
        'excerpt': 'Community discussion and appreciation.',
        'local_file': 'Star Trek movies (ships only)   MetaFilter.html'
    },
    {
        'title': 'Star Trek movies (ships only)',
        'publication': 'jwz.org',
        'date': '2015',
        'url': 'jwz.org',
        'excerpt': 'Blog feature from Jamie Zawinski.',
        'local_file': 'jwz  Star Trek movies (ships only).html'
    },
]

# Sample comments
sample_comments = [
    {
        'text': 'This is absolutely brilliant. Pure spaceship action without all the talking.',
        'author': 'SciFiFan42',
        'video': 'star-trek-tmp',
        'likes': 523
    },
    {
        'text': 'The Battle of the Mutara Nebula has never looked better. Just ships doing what they do best.',
        'author': 'TrekkerForLife',
        'video': 'star-trek-wrath-khan',
        'likes': 892
    },
    {
        'text': "I've watched the original movies a hundred times, but seeing just the ship sequences makes me appreciate the special effects even more.",
        'author': 'VFXEnthusiast',
        'video': 'star-trek-search-spock',
        'likes': 445
    },
    {
        'text': 'This is my new favorite way to watch Star Trek. Thank you for making these!',
        'author': 'SpaceshipLover',
        'video': 'star-trek-voyage-home',
        'likes': 678
    },
    {
        'text': 'The dedication to editing all of these is amazing. Every frame is perfect.',
        'author': 'EditingPro',
        'video': 'star-trek-final-frontier',
        'likes': 334
    },
]

# Save data
with open(base_dir / 'videos.json', 'w') as f:
    json.dump(videos, f, indent=2)

with open(base_dir / 'press.json', 'w') as f:
    json.dump(press_articles, f, indent=2)

with open(base_dir / 'comments.json', 'w') as f:
    json.dump(sample_comments, f, indent=2)

print(f"✅ Created data files:")
print(f"   - {len(videos)} videos")
print(f"   - {len(press_articles)} press articles")
print(f"   - {len(sample_comments)} sample comments")
