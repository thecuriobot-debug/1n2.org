#!/usr/bin/env python3
"""
Get YouTube video metadata for all Thomas Hunt Films videos
"""
import re
import subprocess
import json

videos = [
    ("David Lynch Tribute at the 2025 Academy Awards (fixed)", "R5Gcva1QfsQ"),
    ("Pulp Fiction (Silent Version)", "kpp246b2tCY"),
    ("John Wick 3 (Gun-Fu)", "HjqsPt9U6UQ"),
    ("Jaws (sharks only)", "pYuxe-1IHos"),
    ("How to Fire a Player", "Wjz4EbyIFiQ"),
    ("I am at a baseball game (remix)", "cgnyT_Hx59M"),
    ("John Wick 2 (Gun-Fu)", "Je0cLFxdk-Q"),
    ("John Wick 2 (thrown out)", "e0n2qfc8FBA"),
    ("John Wick (Gun-Fu)", "7Z9dyeeLKt8"),
    ("Just keep swinging", "9LkSG23GsW0"),
    ("Now this is driving", "abLvddIog0I"),
    ("The Jackrabbit Always Wins (The Hunt Remix)", "NAemnMNuhcQ"),
    ("MIDGET (remix)", "Wmj_PMt8mto"),
    ("Top Gun (planes only)", "XdgKDqBQy00"),
    ("California Girls (remix)", "0Lcx03bAiOQ"),
    ("Six Punches of Ali (silent less cuts)", "aozd-EpUAII"),
    ("Six Punches of Ali", "HOBOymqo-WY"),
    ("My only problem now is whether to buy amalgamated or consolidated.", "2DdamyuIwQg"),
    ("Batman and Robin on a Balloon", "PPsVE6JERGo"),
    ("Will the real Batman please stand up?", "c1beuePqCYk"),
    ("Same Bat Time, Same Bat Channel (remix)", "VeIOuWlmZrk"),
    ("Another Glorious Morning in Gotham City (remix)", "b6QeQVKicko"),
    ("Next Week on Batman! (remix)", "oOv5xh4Mah4"),
    ("Hunt for Red October (ships only)", "afGFDYy8RNc"),
    ("Spaceballs (ships only)", "NixclLOskjc"),
    ("Star Wars (ships only)", "jgGr15RvpiI"),
    ("Empire Strikes Back (ships only)", "TYrq1mLsPlo"),
    ("Return of the Jedi (ships only)", "jTMK8McUdE0"),
    ("San Andreas (aTomMix)", "tCu-fQPUU-4"),
    ("The Last Boy Scout (aTomMix)", "nhqtz1uixk0"),
    ("Hear this Crowd go Crazy", "s6aHrIyT5n0"),
    ("Citizen Kane: The Musical", "wvsZ9d-q9FQ"),
    ("Star Trek: Nemesis (ships only)", "IQ0rpNEupfA"),
    ("Star Trek: Insurrection (ships only)", "5LOtf5Yq39Y"),
    ("Star Trek: First Contact (ships only)", "yRhQ1ydXT6c"),
    ("Star Trek: Generations (ships only)", "0gywz1PgM_I"),
    ("Star Trek VI: The Undiscovered Country (ships only)", "ILcCcldyB7M"),
    ("Star Trek V: The Final Frontier (ships only)", "6RGTyaJrbj0"),
    ("Star Trek IV: The Voyage Home (ships only)", "n0WnsAwsG8s"),
    ("Star Trek III: The Search for Spock (ships only)", "iHMXrxXCfWs"),
    ("Star Trek II: The Wrath of Khan (ships only)", "3EQ9cFey-3U"),
    ("Star Trek: The Motion Picture (ships only)", "afMDkTUJhMo"),
]

# Categorize videos
categories = {
    "star_trek": [],
    "star_wars": [],
    "john_wick": [],
    "batman": [],
    "movies": [],
    "other": []
}

for title, video_id in videos:
    video_data = {
        "title": title,
        "video_id": video_id,
        "url": f"https://www.youtube.com/watch?v={video_id}"
    }
    
    if "Star Trek" in title:
        categories["star_trek"].append(video_data)
    elif "Star Wars" in title or "Empire Strikes Back" in title or "Return of the Jedi" in title:
        categories["star_wars"].append(video_data)
    elif "John Wick" in title:
        categories["john_wick"].append(video_data)
    elif "Batman" in title or "Bat Time" in title or "Gotham" in title:
        categories["batman"].append(video_data)
    elif "ships only" in title or "planes only" in title or "sharks only" in title or "aTomMix" in title or "Spaceballs" in title or "Hunt for Red October" in title or "Pulp Fiction" in title:
        categories["movies"].append(video_data)
    else:
        categories["other"].append(video_data)

# Print summary
print("📊 Video Categories:")
print(f"⭐ Star Trek: {len(categories['star_trek'])} videos")
print(f"🚀 Star Wars: {len(categories['star_wars'])} videos")
print(f"🥋 John Wick: {len(categories['john_wick'])} videos")
print(f"🦇 Batman: {len(categories['batman'])} videos")
print(f"🎬 Movies: {len(categories['movies'])} videos")
print(f"📽️ Other: {len(categories['other'])} videos")
print(f"\n✅ Total: {sum(len(v) for v in categories.values())} videos")

# Save to JSON
with open('/tmp/thomashunt_videos.json', 'w') as f:
    json.dump(categories, f, indent=2)

print("\n💾 Saved to /tmp/thomashunt_videos.json")
