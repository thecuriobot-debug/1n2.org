#!/usr/bin/env python3
"""
Complete Thunt.net rebuild with:
- Chronological post list on homepage
- Net interest with yearly separators
- Full DVD site with covers
- Full review site with thumbnails
- Random content button
"""

import re
import json
from pathlib import Path
from datetime import datetime
from urllib.parse import quote

# Read SQL file
sql_file = Path(__file__).parent / "thuntnet.sql"
with open(sql_file, 'r', encoding='latin-1') as f:
    sql_content = f.read()

def unescape_sql(text):
    if not text:
        return ""
    return text.replace("\\'", "'").replace("\\r\\n", "\n").replace("\\n", "\n")

def format_timestamp(ts):
    if not ts or len(str(ts)) < 8:
        return "Unknown"
    ts_str = str(ts)
    try:
        year = ts_str[0:4]
        month = ts_str[4:6]
        day = ts_str[6:8]
        dt = datetime(int(year), int(month), int(day))
        return dt.strftime("%B %d, %Y"), int(year)
    except:
        return ts_str, 2000

def get_movie_poster(title, year):
    """Generate OMDb API URL for movie poster"""
    return f"https://img.omdbapi.com/?t={quote(title)}&y={year}&apikey=placeholder"

# Parse archive posts
archive_pattern = r"INSERT INTO thuntnet_archive VALUES \((\d+), '(.*?)', '(.*?)', '(.*?)', '(.*?)', '(.*?)', (\d+), '(.*?)', '(.*?)'\);"
posts = []
for match in re.finditer(archive_pattern, sql_content, re.DOTALL):
    id_num, headline, author, email, story, summary, date_posted, section, link = match.groups()
    posts.append({
        'id': id_num,
        'headline': unescape_sql(headline),
        'author': unescape_sql(author),
        'story': unescape_sql(story),
        'summary': unescape_sql(summary),
        'date': date_posted,
        'section': section,
        'link': link
    })

# Parse messages
message_pattern = r"INSERT INTO thuntmessage VALUES \((\d+), '(.*?)', (\d+)\);"
messages = []
for match in re.finditer(message_pattern, sql_content):
    id_num, message, date_posted = match.groups()
    messages.append({
        'id': id_num,
        'message': unescape_sql(message),
        'date': date_posted,
        'type': 'message'
    })

# Parse DVDs
dvd_pattern = r"INSERT INTO dvd VALUES \('(.*?)', '(.*?)', '(.*?)', '.*?', '.*?', '.*?', (\d+)\);"
dvds = []
for match in re.finditer(dvd_pattern, sql_content):
    name, director, writer, id_num = match.groups()
    dvds.append({
        'id': id_num,
        'name': unescape_sql(name),
        'director': unescape_sql(director),
        'writer': unescape_sql(writer)
    })

# Parse reviews - updated pattern
review_pattern = r"INSERT INTO thuntnet_reviews VALUES \((\d+), '(.*?)', '(.*?)', '(.*?)', '(.*?)', '(.*?)', '(.*?)', '(.*?)', (\d+)\);"
reviews = []
for match in re.finditer(review_pattern, sql_content, re.DOTALL):
    id_num, title, year, plot, opinion, rating, creator, section, date = match.groups()
    reviews.append({
        'id': id_num,
        'title': unescape_sql(title),
        'year': year,
        'plot': unescape_sql(plot),
        'opinion': unescape_sql(opinion),
        'rating': rating,
        'creator': creator,
        'section': section,
        'date': date,
        'type': 'review'
    })

# Parse random quotes
random_pattern = r"INSERT INTO random VALUES \((\d+), '(.*?)'\);"
quotes = []
for match in re.finditer(random_pattern, sql_content):
    id_num, quote = match.groups()
    quotes.append({
        'id': id_num,
        'quote': unescape_sql(quote),
        'type': 'quote'
    })

# Organize data
blog_posts = [p for p in posts if p['section'] == 'normal']
net_interest = [p for p in posts if p['section'] == 'net_interest']

# Sort chronologically (oldest first for homepage)
blog_posts.sort(key=lambda x: x['date'])
net_interest.sort(key=lambda x: x['date'])

# Group net_interest by year
net_by_year = {}
for link in net_interest:
    _, year = format_timestamp(link['date'])
    if year not in net_by_year:
        net_by_year[year] = []
    net_by_year[year].append(link)

# Sort DVDs alphabetically
dvds.sort(key=lambda x: x['name'])

# Sort reviews by date (newest first)
reviews.sort(key=lambda x: x['date'], reverse=True)

# Create all content array for random
all_content = []
for post in blog_posts:
    all_content.append({'type': 'post', 'data': post})
for msg in messages:
    all_content.append({'type': 'message', 'data': msg})
for rev in reviews:
    all_content.append({'type': 'review', 'data': rev})
for quote in quotes:
    all_content.append({'type': 'quote', 'data': quote})

# Save to JSON for random button
json_path = Path(__file__).parent / "content.json"
with open(json_path, 'w') as f:
    json.dump(all_content, f)

print(f"✅ Found {len(blog_posts)} blog posts")
print(f"✅ Found {len(net_interest)} net interest links")
print(f"✅ Found {len(messages)} messages")
print(f"✅ Found {len(dvds)} DVDs")
print(f"✅ Found {len(reviews)} reviews")
print(f"✅ Found {len(quotes)} quotes")
print(f"✅ Total content items: {len(all_content)}")

# Generate HTML - I'll continue in the next file due to size
print(f"\n📝 Generating HTML pages...")
