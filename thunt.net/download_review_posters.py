#!/usr/bin/env python3
"""
Download posters for movie reviews
"""
import re, json, time, urllib.request, urllib.parse
from pathlib import Path

TMDB_API_KEY = "15d2ea6d0dc1d476efbca3eba2b9bbfb"

sql_file = Path(__file__).parent / "thuntnet.sql"
with open(sql_file, 'r', encoding='latin-1') as f:
    sql = f.read()

def esc(t):
    return t.replace("\\'", "'").replace("\\r\\n", "\n") if t else ""

# Parse reviews
revs = []
for m in re.finditer(r"INSERT INTO thuntnet_reviews VALUES \((\d+), '(.*?)', '(.*?)', '(.*?)', '(.*?)', '(.*?)', '(.*?)', '(.*?)', (\d+)\);", sql, re.DOTALL):
    revs.append({
        'id': m[1], 
        'title': esc(m[2]),
        'year': m[3], 
        'plot': esc(m[4]), 
        'opinion': esc(m[5]), 
        'rating': m[6], 
        'creator': m[7], 
        'date': m[9]
    })

posters_dir = Path(__file__).parent / "posters"
posters_dir.mkdir(exist_ok=True)

print(f"🎬 Downloading posters for {len(revs)} reviews...")

def search_movie(title, year):
    try:
        clean = title.replace("'", "").strip()
        url = f"https://api.themoviedb.org/3/search/movie?api_key={TMDB_API_KEY}&query={urllib.parse.quote(clean)}&year={year}"
        
        with urllib.request.urlopen(url, timeout=10) as response:
            data = json.loads(response.read().decode())
        
        if data.get('results') and len(data['results']) > 0:
            poster_path = data['results'][0].get('poster_path')
            if poster_path:
                return f"https://image.tmdb.org/t/p/w500{poster_path}"
        return None
    except:
        return None

successful = 0
for i, rev in enumerate(revs):
    print(f"{i+1}/{len(revs)}: {rev['title']} ({rev['year']})")
    
    poster_url = search_movie(rev['title'], rev['year'])
    
    if poster_url:
        poster_file = posters_dir / f"review_{rev['id']}.jpg"
        try:
            urllib.request.urlretrieve(poster_url, poster_file)
            print(f"  ✅ Downloaded")
            rev['poster'] = f"posters/review_{rev['id']}.jpg"
            successful += 1
        except:
            print(f"  ❌ Failed")
            rev['poster'] = None
    else:
        print(f"  ❌ Not found")
        rev['poster'] = None
    
    time.sleep(0.3)

print(f"\n✅ Downloaded {successful}/{len(revs)} posters")

with open(Path(__file__).parent / "review_posters.json", 'w') as f:
    json.dump(revs, f, indent=2)

print("💾 Saved to review_posters.json")
