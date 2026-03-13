#!/usr/bin/env python3
"""
Complete rebuild of Thomas Hunt Films with accurate YouTube data
This generates a brand new index.html with all 42 videos and correct view counts
"""

# Read the header/footer from backup
with open('/Users/curiobot/Sites/1n2.org/thomashuntfilms/index.html.backup', 'r') as f:
    original = f.read()

# Extract everything before the nav section starts
header_end = original.find('<nav>')
header = original[:header_end]

# Extract everything after the press section ends (IG-88, Press, footer, scripts)
press_start = original.find('<!-- Press Section -->')
footer_start = original.find('<!-- IG-88 Section -->')
footer = original[footer_start:]

# Video data with correct IDs and real YouTube view counts
videos = {
    "star_trek": {
        "title": "⭐ Star Trek Ships Only",
        "desc": "10 videos • TOS & TNG Films",
        "videos": [
            ("qHWlccpsYIA", "Star Trek: The Motion Picture (ships only)", 158470),
            ("3EQ9cFey-3U", "Star Trek II: The Wrath of Khan (ships only)", 57208),
            ("iHMXrxXCfWs", "Star Trek III: The Search for Spock (ships only)", 193906),
            ("n0WnsAwsG8s", "Star Trek IV: The Voyage Home (ships only)", 68361),
            ("6RGTyaJrbj0", "Star Trek V: The Final Frontier (ships only)", 40537),
            ("ILcCcldyB7M", "Star Trek VI: The Undiscovered Country (ships only)", 77233),
            ("0gywz1PgM_I", "Star Trek: Generations (ships only)", 496391),
            ("yRhQ1ydXT6c", "Star Trek: First Contact (ships only)", 80062),
            ("5LOtf5Yq39Y", "Star Trek: Insurrection (ships only)", 322067),
            ("IQ0rpNEupfA", "Star Trek: Nemesis (ships only)", 87353),
        ]
    },
    "star_wars": {
        "title": "🚀 Star Wars Ships Only",
        "desc": "3 videos • Original Trilogy",
        "videos": [
            ("jgGr15RvpiI", "Star Wars (ships only)", 164326),
            ("TYrq1mLsPlo", "Empire Strikes Back (ships only)", 1677297),
            ("jTMK8McUdE0", "Return of the Jedi (ships only)", 346755),
        ]
    },
    "john_wick": {
        "title": "🥋 John Wick Gun-Fu",
        "desc": "4 videos • Action Choreography",
        "videos": [
            ("7Z9dyeeLKt8", "John Wick (Gun-Fu)", 195),
            ("Je0cLFxdk-Q", "John Wick 2 (Gun-Fu)", 48),
            ("e0n2qfc8FBA", "John Wick 2 (thrown out)", 23),
            ("HjqsPt9U6UQ", "John Wick 3 (Gun-Fu)", 117),
        ]
    },
    "batman": {
        "title": "🦇 Batman '66 Remixes",
        "desc": "6 videos • Camp Classic TV",
        "videos": [
            ("PPsVE6JERGo", "Batman and Robin on a Balloon", 341),
            ("c1beuePqCYk", "Will the real Batman please stand up?", 783),
            ("VeIOuWlmZrk", "Same Bat Time, Same Bat Channel (remix)", 44737),
            ("b6QeQVKicko", "Another Glorious Morning in Gotham City (remix)", 564),
            ("oOv5xh4Mah4", "Next Week on Batman! (remix)", 824),
            ("2DdamyuIwQg", "My only problem now is whether to buy amalgamated or consolidated.", 111),
        ]
    },
    "movies": {
        "title": "Movie Edits",
        "desc": "7 videos • Ships Only, aTomMix, Silent",
        "videos": [
            ("NixclLOskjc", "Spaceballs (ships only)", 14250),
            ("afGFDYy8RNc", "Hunt for Red October (ships only)", 3322),
            ("pYuxe-1IHos", "Jaws (sharks only)", 193),
            ("kpp246b2tCY", "Pulp Fiction (Silent Version)", 78),
            ("XdgKDqBQy00", "Top Gun (planes only)", 1518),
            ("tCu-fQPUU-4", "San Andreas (aTomMix)", 43),
            ("nhqtz1uixk0", "The Last Boy Scout (aTomMix)", 58499),
        ]
    },
    "other": {
        "title": "Other Edits",
        "desc": "12 videos • Tributes, Music Remixes & More",
        "videos": [
            ("R5Gcva1QfsQ", "David Lynch Tribute at the 2025 Academy Awards (fixed)", 299),
            ("Wjz4EbyIFiQ", "How to Fire a Player", 22),
            ("cgnyT_Hx59M", "I am at a baseball game (remix)", 30),
            ("9LkSG23GsW0", "Just keep swinging", 71),
            ("abLvddIog0I", "Now this is driving", 110),
            ("NAemnMNuhcQ", "The Jackrabbit Always Wins (The Hunt Remix)", 77),
            ("Wmj_PMt8mto", "MIDGET (remix)", 66),
            ("0Lcx03bAiOQ", "California Girls (remix)", 156),
            ("aozd-EpUAII", "Six Punches of Ali (silent less cuts)", 138),
            ("HOBOymqo-WY", "Six Punches of Ali", 103),
            ("s6aHrIyT5n0", "Hear this Crowd go Crazy", 1087),
            ("wvsZ9d-q9FQ", "Citizen Kane: The Musical", 2617),
        ]
    }
}

def fmt(n):
    """Format view count"""
    if n >= 1000000: return f"{n/1000000:.1f}M".replace('.0M','M')
    if n >= 1000: return f"{n/1000:.1f}K".replace('.0K','K')
    return str(n)

# Calculate totals
totals = {}
grand_total = 0
for key, data in videos.items():
    total = sum(v[2] for v in data['videos'])
    totals[key] = total
    grand_total += total

print(f"Generating HTML for {sum(len(d['videos']) for d in videos.values())} videos...")
print(f"Total views: {fmt(grand_total)}")

# Build nav
nav = '<nav>\n'
for key in ['star_trek', 'star_wars', 'john_wick', 'movies', 'batman', 'other', 'ig-88', 'press']:
    if key == 'ig-88':
        nav += '        <a href="#ig-88">🤖 IG-88</a>\n'
    elif key == 'press':
        nav += '        <a href="#press">📰 Press</a>\n'
    else:
        title_map = {
            'star_trek': '⭐ Star Trek',
            'star_wars': '🚀 Star Wars',
            'john_wick': '🥋 John Wick',
            'batman': '🦇 Batman',
            'movies': '🎬 Movies',
            'other': '📽️ Other'
        }
        nav += f'        <a href="#{key}">{title_map[key]}</a>\n'
nav += '    </nav>\n\n'

# Build sections
content = '    <div class="content">\n        <div class="container">\n'

for key, data in videos.items():
    section_total = totals[key]
    content += f'            <div id="{key}" class="series-content">\n'
    content += f'                <h2 class="section-title">{data["title"]}</h2>\n'
    content += f'                <p style="text-align: center; color: #888; margin-bottom: 30px;">\n'
    content += f'                    {data["desc"]}<br>\n'
    content += f'                    <span style="color: #e94560; font-weight: 600;">{fmt(section_total)} views</span>\n'
    content += f'                </p>\n'
    content += f'                <div class="video-grid">\n\n'
    
    for vid_id, title, views in data['videos']:
        content += f'                    <a href="https://www.youtube.com/watch?v={vid_id}" target="_blank" style="text-decoration: none; color: inherit;">\n'
        content += f'                        <div class="video-card">\n'
        content += f'                            <div class="video-thumbnail">\n'
        content += f'                                <img src="https://img.youtube.com/vi/{vid_id}/hqdefault.jpg" alt="{title}" loading="lazy">\n'
        content += f'                                <div class="play-button">▶</div>\n'
        content += f'                            </div>\n'
        content += f'                            <div class="video-info">\n'
        content += f'                                <div class="video-title">{title}</div>\n'
        content += f'                                <div class="video-stats">{fmt(views)} views</div>\n'
        content += f'                            </div>\n'
        content += f'                        </div>\n'
        content += f'                    </a>\n\n'
    
    content += f'                </div>\n'
    content += f'            </div></div>\n\n'

content += '        </div>\n    </div>\n\n'

# Combine everything
html = header + nav + content + footer

# Write new file
with open('/Users/curiobot/Sites/1n2.org/thomashuntfilms/index.html', 'w') as f:
    f.write(html)

print(f"✅ Complete! Generated new index.html with all accurate data!")
print(f"   42 videos, {fmt(grand_total)} total views")
