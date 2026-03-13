#!/usr/bin/env python3
"""
Create comprehensive press page with local articles and thumbnails
"""
import json
from pathlib import Path
import shutil

base = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")
press_source = Path("/Users/curiobot/Sites/1n2.org/star_trek_ships_only/Star Trek Ships Only Press")
press_dir = base / "press"
press_dir.mkdir(exist_ok=True)

# Press articles with local files
press_articles = [
    {
        'id': 'avclub',
        'publication': 'The A.V. Club',
        'title': 'All the Star Trek movies cut down to just spaceships',
        'date': 'March 2015',
        'excerpt': 'Great Job, Internet! Someone edited all the Star Trek movies to show only the spaceships.',
        'source_html': 'All the Star Trek movies cut down to just spaceships · Great Job, Internet! · The A.V. Club.html',
        'source_folder': 'All the Star Trek movies cut down to just spaceships · Great Job, Internet! · The A.V. Club_files',
        'thumbnail': 'All the Star Trek movies cut down to just spaceships · Great Job  Internet  · The A.V. Club.png',
        'url': 'https://www.avclub.com/all-the-star-trek-movies-cut-down-to-just-spaceships-1798276638',
        'local_url': 'press/avclub.html'
    },
    {
        'id': 'boingboing',
        'publication': 'Boing Boing',
        'title': 'Star Trek movie supercuts: just the spaceships',
        'date': 'March 2015',
        'excerpt': 'Thomas Hunt edited the Star Trek films to show nothing but spaceships.',
        'source_html': 'Star Trek movie supercuts  just the spaceships - Boing Boing.html',
        'source_folder': 'Star Trek movie supercuts  just the spaceships - Boing Boing_files',
        'thumbnail': 'Star Trek movie supercuts  just the spaceships   Boing Boing.png',
        'url': 'https://boingboing.net/2015/03/07/star-trek-movie-supercuts-ju.html',
        'local_url': 'press/boingboing.html'
    },
    {
        'id': 'popularmechanics',
        'publication': 'Popular Mechanics',
        'title': 'This Genius Slices \'Star Trek\' Movies Down to Just the Ships',
        'date': 'March 2015',
        'excerpt': 'A YouTuber has edited all ten Star Trek films to feature only the spaceship sequences.',
        'source_html': 'This Genius Slices \'Star Trek\' Movies Down to Just the Ships.html',
        'source_folder': 'This Genius Slices \'Star Trek\' Movies Down to Just the Ships_files',
        'thumbnail': 'This Genius Slices  Star Trek  Movies Down to Just the Ships.png',
        'url': 'https://www.popularmechanics.com/culture/movies/a14456/star-trek-ships-only/',
        'local_url': 'press/popularmechanics.html'
    },
    {
        'id': 'metafilter',
        'publication': 'MetaFilter',
        'title': 'Star Trek movies (ships only)',
        'date': 'March 2015',
        'excerpt': 'Community discussion about the Star Trek Ships Only video series.',
        'source_html': 'Star Trek movies (ships only)   MetaFilter.html',
        'source_folder': 'Star Trek movies (ships only)   MetaFilter_files',
        'thumbnail': 'Star Trek movies  ships only    MetaFilter.png',
        'url': 'https://www.metafilter.com/147873/Star-Trek-movies-ships-only',
        'local_url': 'press/metafilter.html'
    },
    {
        'id': 'jwz',
        'publication': 'jwz.org',
        'title': 'Star Trek movies (ships only)',
        'date': 'March 2015',
        'excerpt': 'jwz blog post featuring all ten Star Trek Ships Only videos.',
        'source_html': 'jwz  Star Trek movies (ships only).html',
        'source_folder': 'jwz  Star Trek movies (ships only)_files',
        'thumbnail': 'jwz  Star Trek movies  ships only .png',
        'url': 'https://www.jwz.org/blog/2015/03/star-trek-movies-ships-only/',
        'local_url': 'press/jwz.html'
    }
]

# Copy HTML files and assets to press directory
print("📁 Copying press articles and assets...")
for article in press_articles:
    # Copy HTML file
    src_html = press_source / article['source_html']
    dst_html = base / f"press/{article['id']}.html"
    if src_html.exists():
        shutil.copy2(src_html, dst_html)
        print(f"   ✅ {article['id']}.html")
    
    # Copy assets folder
    src_folder = press_source / article['source_folder']
    dst_folder = base / f"press/{article['id']}_files"
    if src_folder.exists():
        shutil.copytree(src_folder, dst_folder, dirs_exist_ok=True)
        print(f"   ✅ {article['id']}_files/")
    
    # Copy thumbnail
    src_thumb = press_source / article['thumbnail']
    dst_thumb = base / f"press/{article['id']}_thumb.png"
    if src_thumb.exists():
        shutil.copy2(src_thumb, dst_thumb)
        print(f"   ✅ {article['id']}_thumb.png")

# Save press data
with open(base / 'press_complete.json', 'w') as f:
    json.dump(press_articles, f, indent=2)

print(f"\n✅ Copied all press articles!")
print(f"   - {len(press_articles)} HTML articles")
print(f"   - {len(press_articles)} asset folders")
print(f"   - {len(press_articles)} thumbnails")
print(f"\n💾 Saved to press/ directory")
print(f"📄 Press data: press_complete.json")
