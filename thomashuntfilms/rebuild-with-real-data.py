#!/usr/bin/env python3
"""
Rebuild Thomas Hunt Films with accurate view counts and correct categorizations
"""
import subprocess
import json

def get_view_count(video_id):
    """Fetch real view count from YouTube"""
    try:
        result = subprocess.run(
            f'curl -s "https://www.youtube.com/watch?v={video_id}" | grep -o \'"viewCount":"[0-9]*"\' | head -1 | grep -o \'[0-9]*\'',
            shell=True, capture_output=True, text=True
        )
        views = result.stdout.strip()
        return int(views) if views else 0
    except:
        return 0

def format_views(views):
    """Format view count for display"""
    if views >= 1000000:
        return f"{views/1000000:.1f}M"
    elif views >= 1000:
        return f"{views/1000:.1f}K" 
    else:
        return str(views)

# All videos with correct categorization
videos = {
    "star_trek": [
        ("afMDkTUJhMo", "Star Trek: The Motion Picture (ships only)", "1979", ""),
        ("3EQ9cFey-3U", "Star Trek II: The Wrath of Khan (ships only)", "1982", ""),
        ("iHMXrxXCfWs", "Star Trek III: The Search for Spock (ships only)", "1984", ""),
        ("n0WnsAwsG8s", "Star Trek IV: The Voyage Home (ships only)", "1986", ""),
        ("6RGTyaJrbj0", "Star Trek V: The Final Frontier (ships only)", "1989", ""),
        ("ILcCcldyB7M", "Star Trek VI: The Undiscovered Country (ships only)", "1991", ""),
        ("0gywz1PgM_I", "Star Trek: Generations (ships only)", "1994", ""),
        ("yRhQ1ydXT6c", "Star Trek: First Contact (ships only)", "1996", ""),
        ("5LOtf5Yq39Y", "Star Trek: Insurrection (ships only)", "1998", ""),
        ("IQ0rpNEupfA", "Star Trek: Nemesis (ships only)", "2002", ""),
    ],
    "star_wars": [
        ("jgGr15RvpiI", "Star Wars (ships only)", "1977", ""),
        ("TYrq1mLsPlo", "Empire Strikes Back (ships only)", "1980", ""),
        ("jTMK8McUdE0", "Return of the Jedi (ships only)", "1983", ""),
    ],
    "john_wick": [
        ("7Z9dyeeLKt8", "John Wick (Gun-Fu)", "2014", ""),
        ("Je0cLFxdk-Q", "John Wick 2 (Gun-Fu)", "2017", ""),
        ("e0n2qfc8FBA", "John Wick 2 (thrown out)", "2017", ""),
        ("HjqsPt9U6UQ", "John Wick 3 (Gun-Fu)", "2019", ""),
    ],
    "batman": [
        ("PPsVE6JERGo", "Batman and Robin on a Balloon", "1966", ""),
        ("c1beuePqCYk", "Will the real Batman please stand up?", "1966", ""),
        ("VeIOuWlmZrk", "Same Bat Time, Same Bat Channel (remix)", "1966", ""),
        ("b6QeQVKicko", "Another Glorious Morning in Gotham City (remix)", "1966", ""),
        ("oOv5xh4Mah4", "Next Week on Batman! (remix)", "1966", ""),
        ("2DdamyuIwQg", "My only problem now is whether to buy amalgamated or consolidated.", "1966", ""),  # MOVED FROM OTHER
    ],
    "movies": [
        ("NixclLOskjc", "Spaceballs (ships only)", "1987", ""),
        ("afGFDYy8RNc", "Hunt for Red October (ships only)", "1990", ""),
        ("pYuxe-1IHos", "Jaws (sharks only)", "1975", ""),
        ("kpp246b2tCY", "Pulp Fiction (Silent Version)", "1994", ""),
        ("XdgKDqBQy00", "Top Gun (planes only)", "1986", ""),
        ("tCu-fQPUU-4", "San Andreas (aTomMix)", "2015", ""),
        ("nhqtz1uixk0", "The Last Boy Scout (aTomMix)", "2014", ""),
    ],
    "other": [
        ("R5Gcva1QfsQ", "David Lynch Tribute at the 2025 Academy Awards (fixed)", "2025", ""),
        ("Wjz4EbyIFiQ", "How to Fire a Player", "2022", ""),  # MOVED FROM MOVIES
        ("cgnyT_Hx59M", "I am at a baseball game (remix)", "2022", ""),
        ("9LkSG23GsW0", "Just keep swinging", "2022", ""),  # MOVED FROM MOVIES
        ("abLvddIog0I", "Now this is driving", "2022", ""),
        ("NAemnMNuhcQ", "The Jackrabbit Always Wins (The Hunt Remix)", "2012", ""),
        ("Wmj_PMt8mto", "MIDGET (remix)", "2020", ""),  # MOVED FROM MOVIES
        ("0Lcx03bAiOQ", "California Girls (remix)", "2015", ""),
        ("aozd-EpUAII", "Six Punches of Ali (silent less cuts)", "2020", ""),
        ("HOBOymqo-WY", "Six Punches of Ali", "2020", ""),
        ("s6aHrIyT5n0", "Hear this Crowd go Crazy", "2012", ""),
        ("wvsZ9d-q9FQ", "Citizen Kane: The Musical", "2012", ""),
    ]
}

print("🔍 Fetching real view counts from YouTube...")
print()

# Fetch all view counts
all_videos_with_views = {}
total_views = 0

for category, vids in videos.items():
    category_views = []
    for video_id, title, year, _ in vids:
        views = get_view_count(video_id)
        total_views += views
        category_views.append((video_id, title, year, views))
        print(f"{title}: {format_views(views)}")
    all_videos_with_views[category] = category_views

print()
print(f"✅ Total views across all videos: {format_views(total_views)}")
print()

# Save to JSON
with open('/tmp/thomashunt_videos_with_views.json', 'w') as f:
    json.dump(all_videos_with_views, f, indent=2)

print("💾 Saved to /tmp/thomashunt_videos_with_views.json")
