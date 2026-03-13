#!/usr/bin/env python3
"""
Standardize navigation across Press and IG-88 pages to match homepage
"""
from pathlib import Path

base = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")

# Read a Star Trek page to get the exact styles
star_trek_page = open(base / 'videos/star-trek-tmp.html').read()

# Extract the complete style section
style_start = star_trek_page.find('<style>')
style_end = star_trek_page.find('</style>') + 8
exact_styles = star_trek_page[style_start:style_end]

# Standard navigation HTML
standard_nav = '''    <nav>
        <a href="index.html">🏠 Home</a>
        <a href="index.html#star-trek">⭐ Star Trek</a>
        <a href="index.html#star-wars">🚀 Star Wars</a>
        <a href="index.html#john-wick">🥋 John Wick</a>
        <a href="index.html#movies">🎬 Movie Edits</a>
        <a href="index.html#batman">🦇 Batman '66</a>
        <a href="index.html#other">📽️ Other</a>
        <a href="stolen-channel-story.html">🤖 IG-88</a>
        <a href="press.html">📰 Press</a>
    </nav>'''

# Update Press page
print("Updating Press page...")
press_html = open(base / 'press.html').read()

# Replace the nav section
nav_start = press_html.find('    <nav>')
nav_end = press_html.find('    </nav>') + len('    </nav>')
press_html = press_html[:nav_start] + standard_nav + press_html[nav_end:]

# Save
with open(base / 'press.html', 'w') as f:
    f.write(press_html)

print("✅ Press page navigation updated")

# Update IG-88 page
print("\nUpdating IG-88 page...")
ig88_html = open(base / 'stolen-channel-story.html').read()

# Replace the nav section
nav_start = ig88_html.find('    <nav>')
nav_end = ig88_html.find('    </nav>') + len('    </nav>')
ig88_html = ig88_html[:nav_start] + standard_nav + ig88_html[nav_end:]

# Save
with open(base / 'stolen-channel-story.html', 'w') as f:
    f.write(ig88_html)

print("✅ IG-88 page navigation updated")

print("\n🎉 Both pages now have matching navigation!")
print("\n📋 Navigation links:")
print("   🏠 Home")
print("   ⭐ Star Trek")
print("   🚀 Star Wars") 
print("   🥋 John Wick")
print("   🎬 Movie Edits")
print("   🦇 Batman '66")
print("   📽️ Other")
print("   🤖 IG-88")
print("   📰 Press")
