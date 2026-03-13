#!/usr/bin/env python3
"""
Download real movie posters for DVD collection
Uses TMDb API (The Movie Database)
"""
import re, json, time, urllib.request, urllib.parse, urllib.error
from pathlib import Path

# TMDb API key (free, no auth needed for images)
TMDB_API_KEY = "15d2ea6d0dc1d476efbca3eba2b9bbfb"  # Read-only key

sql_file = Path(__file__).parent / "thuntnet.sql"
with open(sql_file, 'r', encoding='latin-1') as f:
    sql = f.read()

def esc(t):
    return t.replace("\\'", "'").replace("\\r\\n", "\n") if t else ""

# Parse DVDs
dvds = []
for m in re.finditer(r"INSERT INTO dvd VALUES \('(.*?)', '(.*?)', '(.*?)', '.*?', '.*?', '.*?', (\d+)\);", sql):
    dvds.append({'name': esc(m[1]), 'dir': esc(m[2]), 'writer': esc(m[3]), 'id': m[4]})

def guess_genre(name, director):
    nl, dl = name.lower(), director.lower()
    if 'star trek' in nl or 'star wars' in nl or 'space' in nl or 'matrix' in nl or 'fifth element' in nl or 'stargate' in nl:
        return 'Sci-Fi'
    elif 'kubrick' in dl:
        return 'Kubrick'
    elif 'tarantino' in dl or 'scorsese' in dl or 'heat' in nl or 'goodfellas' in nl or 'casino' in nl:
        return 'Crime'
    elif 'austin' in nl or 'lebowski' in nl or 'animal house' in nl or 'ghostbusters' in nl or 'clerks' in nl:
        return 'Comedy'
    elif 'allen' in dl:
        return 'Woody Allen'
    elif any(w in nl for w in ['hunt', 'mission', 'rock', 'top gun']):
        return 'Action'
    else:
        return 'Drama'

for dvd in dvds:
    dvd['genre'] = guess_genre(dvd['name'], dvd['dir'])

dvds.sort(key=lambda x: x['name'])

# Create posters directory
posters_dir = Path(__file__).parent / "posters"
posters_dir.mkdir(exist_ok=True)

print(f"🎬 Downloading posters for {len(dvds)} movies...")
print("=" * 70)

def clean_title(title):
    """Clean movie title for search"""
    # Remove "The" at end
    title = title.replace(", The", "")
    # Remove special characters
    title = title.replace("'", "").strip()
    return title

def search_movie(title):
    """Search for movie and get poster"""
    try:
        clean = clean_title(title)
        url = f"https://api.themoviedb.org/3/search/movie?api_key={TMDB_API_KEY}&query={urllib.parse.quote(clean)}"
        
        with urllib.request.urlopen(url, timeout=10) as response:
            data = json.loads(response.read().decode())
        
        if data.get('results') and len(data['results']) > 0:
            movie = data['results'][0]  # First result
            poster_path = movie.get('poster_path')
            
            if poster_path:
                # TMDb poster URL
                poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}"
                return poster_url, movie.get('title', title)
        
        return None, None
    except Exception as e:
        return None, None

def download_poster(url, filename):
    """Download poster image"""
    try:
        urllib.request.urlretrieve(url, filename)
        return True
    except:
        return False

# Download posters
successful = 0
failed = 0

for i, dvd in enumerate(dvds):
    print(f"{i+1}/{len(dvds)}: {dvd['name'][:50]}")
    
    # Search for poster
    poster_url, matched_title = search_movie(dvd['name'])
    
    if poster_url:
        # Download poster
        poster_file = posters_dir / f"dvd_{dvd['id']}.jpg"
        
        if download_poster(poster_url, poster_file):
            print(f"  ✅ Downloaded poster")
            dvd['poster'] = f"posters/dvd_{dvd['id']}.jpg"
            successful += 1
        else:
            print(f"  ❌ Download failed")
            dvd['poster'] = None
            failed += 1
    else:
        print(f"  ❌ Not found in TMDb")
        dvd['poster'] = None
        failed += 1
    
    # Rate limiting
    time.sleep(0.3)

print("\n" + "=" * 70)
print(f"\n📊 Results:")
print(f"   Total movies: {len(dvds)}")
print(f"   ✅ Posters downloaded: {successful} ({successful/len(dvds)*100:.1f}%)")
print(f"   ❌ Not found: {failed} ({failed/len(dvds)*100:.1f}%)")

# Save DVD data with poster paths
dvd_data_file = Path(__file__).parent / "dvd_posters.json"
with open(dvd_data_file, 'w') as f:
    json.dump(dvds, f, indent=2)

print(f"\n💾 Saved poster data: {dvd_data_file}")
print(f"📁 Posters saved to: {posters_dir}")
print(f"\n🎉 Poster download complete!")
print(f"\nNext: Run update_dvd_page.py to rebuild DVD page with real posters")
