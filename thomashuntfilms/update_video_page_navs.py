#!/usr/bin/env python3
"""
Update navigation on all Star Trek video pages to match homepage
"""
from pathlib import Path

base = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")

# New navigation HTML
new_nav = '''    <nav>
        <a href="../index.html">🏠 Home</a>
        <a href="../index.html#star-trek">⭐ Star Trek</a>
        <a href="../index.html#star-wars">🚀 Star Wars</a>
        <a href="../index.html#john-wick">🥋 John Wick</a>
        <a href="../index.html#movies">🎬 Movie Edits</a>
        <a href="../index.html#batman">🦇 Batman '66</a>
        <a href="../index.html#other">📽️ Other</a>
        <a href="../stolen-channel-story.html">🤖 IG-88</a>
        <a href="../press.html">📰 Press</a>
    </nav>'''

# Star Trek video pages
star_trek_pages = [
    'star-trek-tmp.html',
    'star-trek-wrath-khan.html',
    'star-trek-search-spock.html',
    'star-trek-voyage-home.html',
    'star-trek-final-frontier.html',
    'star-trek-undiscovered-country.html',
    'star-trek-generations.html',
    'star-trek-first-contact.html',
    'star-trek-insurrection.html',
    'star-trek-nemesis.html'
]

videos_dir = base / 'videos'
updated_count = 0

for page_name in star_trek_pages:
    page_path = videos_dir / page_name
    
    if page_path.exists():
        html = open(page_path).read()
        
        # Find and replace the nav section
        nav_start = html.find('    <nav>')
        if nav_start != -1:
            nav_end = html.find('    </nav>', nav_start) + len('    </nav>')
            
            # Replace old nav with new nav
            updated_html = html[:nav_start] + new_nav + html[nav_end:]
            
            # Save
            with open(page_path, 'w') as f:
                f.write(updated_html)
            
            print(f"✅ Updated {page_name}")
            updated_count += 1
        else:
            print(f"⚠️  Could not find nav in {page_name}")
    else:
        print(f"❌ File not found: {page_name}")

print(f"\n🎉 Updated {updated_count} Star Trek video pages!")
print("\n✨ Navigation now matches across:")
print("   - Homepage (index.html)")
print("   - Press page")
print("   - IG-88 article")
print("   - All 10 Star Trek video pages")
