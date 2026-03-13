#!/usr/bin/env python3
"""
Complete Thunt.net site builder
"""

import re, json
from pathlib import Path
from datetime import datetime
from urllib.parse import quote

sql_file = Path(__file__).parent / "thuntnet.sql"
with open(sql_file, 'r', encoding='latin-1') as f:
    sql = f.read()

def esc(t):
    return t.replace("\\'", "'").replace("\\r\\n", "\n").replace("\\n", "\n") if t else ""

def fmt_ts(ts):
    if not ts or len(str(ts)) < 8: return ("Unknown", 2000)
    s = str(ts)
    try:
        y, m, d = s[0:4], s[4:6], s[6:8]
        dt = datetime(int(y), int(m), int(d))
        return (dt.strftime("%B %d, %Y"), int(y))
    except: return (s, 2000)

# Parse all data
posts = []
for m in re.finditer(r"INSERT INTO thuntnet_archive VALUES \((\d+), '(.*?)', '(.*?)', '(.*?)', '(.*?)', '(.*?)', (\d+), '(.*?)', '(.*?)'\);", sql, re.DOTALL):
    posts.append({'id': m[1], 'headline': esc(m[2]), 'author': esc(m[3]), 'story': esc(m[5]), 'summary': esc(m[6]), 'date': m[7], 'section': m[8], 'link': m[9]})

msgs = []
for m in re.finditer(r"INSERT INTO thuntmessage VALUES \((\d+), '(.*?)', (\d+)\);", sql):
    msgs.append({'id': m[1], 'msg': esc(m[2]), 'date': m[3]})

dvds = []
for m in re.finditer(r"INSERT INTO dvd VALUES \('(.*?)', '(.*?)', '(.*?)', '.*?', '.*?', '.*?', (\d+)\);", sql):
    dvds.append({'name': esc(m[1]), 'dir': esc(m[2]), 'writer': esc(m[3]), 'id': m[4]})

revs = []
for m in re.finditer(r"INSERT INTO thuntnet_reviews VALUES \((\d+), '(.*?)', '(.*?)', '(.*?)', '(.*?)', '(.*?)', '(.*?)', '(.*?)', (\d+)\);", sql, re.DOTALL):
    revs.append({'id': m[1], 'title': esc(m[2]), 'year': m[3], 'plot': esc(m[4]), 'opinion': esc(m[5]), 'rating': m[6], 'creator': m[7], 'section': m[8], 'date': m[9]})

quotes = []
for m in re.finditer(r"INSERT INTO random VALUES \((\d+), '(.*?)'\);", sql):
    quotes.append({'id': m[1], 'quote': esc(m[2])})

# Organize
blog = [p for p in posts if p['section'] == 'normal']
links = [p for p in posts if p['section'] == 'net_interest']

blog.sort(key=lambda x: x['date'])
links.sort(key=lambda x: x['date'])
dvds.sort(key=lambda x: x['name'])
revs.sort(key=lambda x: x['date'], reverse=True)

# Group links by year
by_year = {}
for l in links:
    _, y = fmt_ts(l['date'])
    by_year.setdefault(y, []).append(l)

# All content for random
all_c = []
for p in blog: all_c.append({'type': 'post', 'data': p})
for m in msgs: all_c.append({'type': 'msg', 'data': m})
for r in revs: all_c.append({'type': 'rev', 'data': r})
for q in quotes: all_c.append({'type': 'quote', 'data': q})

with open(Path(__file__).parent / "content.json", 'w') as f: 
    json.dump(all_c, f)

print(f"✅ {len(blog)} posts, {len(links)} links, {len(dvds)} DVDs, {len(revs)} reviews, {len(quotes)} quotes")

# Determine genre from director/title for DVDs
def guess_genre(name, director):
    name_lower = name.lower()
    dir_lower = director.lower()
    
    if 'star trek' in name_lower or 'star wars' in name_lower or 'space' in name_lower or 'matrix' in name_lower:
        return 'Sci-Fi'
    elif 'kubrick' in dir_lower:
        return 'Kubrick Classics'
    elif 'tarantino' in dir_lower or 'scorsese' in dir_lower:
        return 'Crime/Thriller'
    elif 'comedy' in name_lower or 'funny' in name_lower or 'austin powers' in name_lower:
        return 'Comedy'
    elif 'allen' in dir_lower:
        return 'Drama'
    elif any(word in name_lower for word in ['hunt', 'mission', 'impossible', 'bourne']):
        return 'Action'
    else:
        return 'Drama'

for dvd in dvds:
    dvd['genre'] = guess_genre(dvd['name'], dvd['dir'])

# Get top rated reviews
top_revs = [r for r in revs if r['rating'] in ['4', '5']][:6]

# Now generate the full HTML site...
print("📝 Generating HTML...")
