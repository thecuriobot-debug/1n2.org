#!/usr/bin/env python3
"""
Complete Thunt.net site generator with all data tables
Tan, white, and maroon color scheme
"Thunt.net - Inform the masses" header
"""

import re
import sqlite3
from pathlib import Path
from datetime import datetime

# Read SQL file
sql_file = Path(__file__).parent / "thuntnet.sql"
with open(sql_file, 'r', encoding='latin-1') as f:
    sql_content = f.read()

# Create SQLite database
db_path = Path(__file__).parent / "thuntnet.db"
db_path.unlink(missing_ok=True)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Parse and get all data
def unescape_sql(text):
    """Unescape SQL strings"""
    if not text:
        return ""
    return text.replace("\\'", "'").replace("\\r\\n", "\n").replace("\\n", "\n")

# Get archive posts
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

# Get messages
message_pattern = r"INSERT INTO thuntmessage VALUES \((\d+), '(.*?)', (\d+)\);"
messages = []
for match in re.finditer(message_pattern, sql_content):
    id_num, message, date_posted = match.groups()
    messages.append({
        'id': id_num,
        'message': unescape_sql(message),
        'date': date_posted
    })

# Get DVDs
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

# Get reviews
review_pattern = r"INSERT INTO thuntnet_reviews VALUES \((\d+), '(.*?)', '(.*?)', '(.*?)', '(.*?)', '(.*?)', '(.*?)', (\d+)\);"
reviews = []
for match in re.finditer(review_pattern, sql_content, re.DOTALL):
    id_num, title, year, plot, opinion, stars, genre, date = match.groups()
    reviews.append({
        'id': id_num,
        'title': unescape_sql(title),
        'year': year,
        'plot': unescape_sql(plot),
        'opinion': unescape_sql(opinion),
        'stars': stars,
        'genre': genre,
        'date': date
    })

# Get random quotes
random_pattern = r"INSERT INTO random VALUES \((\d+), '(.*?)'\);"
quotes = []
for match in re.finditer(random_pattern, sql_content):
    id_num, quote = match.groups()
    quotes.append({
        'id': id_num,
        'quote': unescape_sql(quote)
    })

def format_timestamp(ts):
    """Convert MySQL timestamp to readable date"""
    if not ts or len(str(ts)) < 8:
        return "Unknown Date"
    ts_str = str(ts)
    try:
        year = ts_str[0:4]
        month = ts_str[4:6]
        day = ts_str[6:8]
        dt = datetime(int(year), int(month), int(day))
        return dt.strftime("%B %d, %Y")
    except:
        return ts_str

# Separate posts by section
blog_posts = [p for p in posts if p['section'] == 'normal']
net_interest = [p for p in posts if p['section'] == 'net_interest']
other_posts = [p for p in posts if p['section'] not in ['normal', 'net_interest']]

# Sort by date descending
blog_posts.sort(key=lambda x: x['date'], reverse=True)
net_interest.sort(key=lambda x: x['date'], reverse=True)
messages.sort(key=lambda x: x['date'], reverse=True)
dvds.sort(key=lambda x: x['name'])
reviews.sort(key=lambda x: x['date'], reverse=True)

print(f"✅ Found {len(blog_posts)} blog posts")
print(f"✅ Found {len(net_interest)} net interest links")
print(f"✅ Found {len(messages)} messages")
print(f"✅ Found {len(dvds)} DVDs")
print(f"✅ Found {len(reviews)} reviews")
print(f"✅ Found {len(quotes)} random quotes")

# Generate HTML
html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thunt.net - Inform the masses</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Georgia, 'Times New Roman', serif;
            font-size: 14px;
            background: #f5deb3;
            color: #000;
        }
        
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: #fff;
            box-shadow: 0 0 20px rgba(0,0,0,0.3);
        }
        
        header {
            background: linear-gradient(180deg, #800020 0%, #600010 100%);
            color: #f5deb3;
            padding: 40px 20px;
            text-align: center;
            border-bottom: 5px solid #f5deb3;
        }
        
        header h1 {
            font-size: 48px;
            font-weight: bold;
            text-shadow: 3px 3px 6px rgba(0,0,0,0.5);
            margin-bottom: 10px;
            letter-spacing: 2px;
        }
        
        header .tagline {
            font-size: 18px;
            font-style: italic;
            color: #f5deb3;
            opacity: 0.9;
            font-family: Georgia, serif;
        }
        
        .tabs {
            background: #800020;
            padding: 0;
            display: flex;
            border-bottom: 3px solid #600010;
        }
        
        .tab {
            flex: 1;
            padding: 15px 20px;
            background: #600010;
            color: #f5deb3;
            text-align: center;
            cursor: pointer;
            border-right: 2px solid #800020;
            font-size: 15px;
            font-weight: bold;
            transition: all 0.3s;
        }
        
        .tab:last-child {
            border-right: none;
        }
        
        .tab:hover {
            background: #800020;
        }
        
        .tab.active {
            background: #f5deb3;
            color: #800020;
        }
        
        .tab-content {
            display: none;
            padding: 30px;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .post {
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 3px double #d2b48c;
        }
        
        .post:last-child {
            border-bottom: none;
        }
        
        .post-header {
            background: #f5deb3;
            padding: 15px;
            border-left: 8px solid #800020;
            margin-bottom: 15px;
        }
        
        .post-title {
            font-size: 24px;
            font-weight: bold;
            color: #800020;
            margin-bottom: 8px;
        }
        
        .post-meta {
            font-size: 13px;
            color: #666;
            font-family: Verdana, sans-serif;
        }
        
        .post-content {
            padding: 15px 0;
            line-height: 1.8;
            font-size: 15px;
        }
        
        .post-content p {
            margin-bottom: 12px;
        }
        
        .post-summary {
            background: #fff8dc;
            padding: 15px;
            border-left: 5px solid #800020;
            margin: 15px 0;
            font-style: italic;
            font-size: 15px;
        }
        
        .post-link {
            display: inline-block;
            background: #800020;
            color: #f5deb3;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 10px;
            font-weight: bold;
        }
        
        .post-link:hover {
            background: #600010;
        }
        
        .message {
            background: #fff8dc;
            padding: 15px;
            margin-bottom: 20px;
            border-left: 5px solid #800020;
            font-size: 15px;
            line-height: 1.6;
        }
        
        .message-date {
            font-size: 12px;
            color: #666;
            margin-top: 8px;
            font-family: Verdana, sans-serif;
        }
        
        .dvd-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 20px;
        }
        
        .dvd-item {
            background: #f5deb3;
            padding: 15px;
            border-left: 5px solid #800020;
        }
        
        .dvd-title {
            font-size: 16px;
            font-weight: bold;
            color: #800020;
            margin-bottom: 8px;
        }
        
        .dvd-detail {
            font-size: 13px;
            color: #666;
            margin: 5px 0;
        }
        
        .review {
            margin-bottom: 40px;
            padding: 20px;
            background: #f5deb3;
            border-left: 8px solid #800020;
        }
        
        .review-title {
            font-size: 22px;
            font-weight: bold;
            color: #800020;
            margin-bottom: 5px;
        }
        
        .review-meta {
            font-size: 13px;
            color: #666;
            margin-bottom: 15px;
        }
        
        .stars {
            color: #ffd700;
            font-size: 18px;
            margin: 10px 0;
        }
        
        .quote {
            background: #fff;
            padding: 20px;
            margin-bottom: 15px;
            border-left: 5px solid #800020;
            font-size: 16px;
            font-style: italic;
            line-height: 1.6;
        }
        
        footer {
            background: #800020;
            color: #f5deb3;
            text-align: center;
            padding: 20px;
            font-size: 13px;
        }
        
        .stats {
            background: #f5deb3;
            padding: 20px;
            margin-bottom: 30px;
            text-align: center;
            border: 3px solid #800020;
        }
        
        .stats strong {
            color: #800020;
            font-size: 24px;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Thunt.net</h1>
            <div class="tagline">Inform the masses</div>
        </header>
        
        <div class="tabs">
            <div class="tab active" onclick="showTab('blog')">Blog Posts</div>
            <div class="tab" onclick="showTab('links')">Net Interest</div>
            <div class="tab" onclick="showTab('messages')">Messages</div>
            <div class="tab" onclick="showTab('dvds')">DVD Collection</div>
            <div class="tab" onclick="showTab('reviews')">Reviews</div>
            <div class="tab" onclick="showTab('quotes')">Random</div>
        </div>
"""

# Blog Posts Tab
html += f"""
        <div id="blog" class="tab-content active">
            <div class="stats">
                <strong>{len(blog_posts)}</strong> blog posts from the Thunt.net archives
            </div>
"""

for post in blog_posts:
    formatted_date = format_timestamp(post['date'])
    story_html = post['story'].replace('\n', '<br>\n') if post['story'] else ""
    
    html += f"""
            <div class="post">
                <div class="post-header">
                    <div class="post-title">{post['headline']}</div>
                    <div class="post-meta">
                        Posted by <strong>{post['author']}</strong> on {formatted_date}
                    </div>
                </div>
"""
    
    if post['summary']:
        html += f"""
                <div class="post-summary">
                    {post['summary']}
                </div>
"""
    
    if story_html:
        html += f"""
                <div class="post-content">
                    {story_html}
                </div>
"""
    
    html += """
            </div>
"""

html += """
        </div>
"""

# Net Interest Tab
html += f"""
        <div id="links" class="tab-content">
            <div class="stats">
                <strong>{len(net_interest)}</strong> links from around the web
            </div>
"""

for post in net_interest:
    formatted_date = format_timestamp(post['date'])
    link_url = f"http://{post['link']}" if post['link'] and not post['link'].startswith('http') else post['link']
    
    html += f"""
            <div class="post">
                <div class="post-header">
                    <div class="post-title">{post['headline']}</div>
                    <div class="post-meta">
                        Posted by <strong>{post['author']}</strong> on {formatted_date}
                    </div>
                </div>
"""
    
    if post['summary']:
        html += f"""
                <div class="post-summary">
                    {post['summary']}
                </div>
"""
    
    if post['link']:
        html += f"""
                <a href="{link_url}" class="post-link" target="_blank">🔗 Visit Site: {post['link']}</a>
"""
    
    html += """
            </div>
"""

html += """
        </div>
"""

# Messages Tab
html += f"""
        <div id="messages" class="tab-content">
            <div class="stats">
                <strong>{len(messages)}</strong> quick thoughts and messages
            </div>
"""

for msg in messages:
    formatted_date = format_timestamp(msg['date'])
    html += f"""
            <div class="message">
                {msg['message']}
                <div class="message-date">{formatted_date}</div>
            </div>
"""

html += """
        </div>
"""

# DVDs Tab
html += f"""
        <div id="dvds" class="tab-content">
            <div class="stats">
                <strong>{len(dvds)}</strong> DVDs in the collection
            </div>
            <div class="dvd-grid">
"""

for dvd in dvds:
    html += f"""
                <div class="dvd-item">
                    <div class="dvd-title">{dvd['name']}</div>
                    <div class="dvd-detail">Director: {dvd['director']}</div>
                    <div class="dvd-detail">Writer: {dvd['writer']}</div>
                </div>
"""

html += """
            </div>
        </div>
"""

# Reviews Tab
html += f"""
        <div id="reviews" class="tab-content">
            <div class="stats">
                <strong>{len(reviews)}</strong> movie reviews
            </div>
"""

for review in reviews:
    formatted_date = format_timestamp(review['date'])
    stars_html = "★" * int(review['stars']) if review['stars'].isdigit() else review['stars']
    
    plot_html = review['plot'].replace('\n', '<br>\n') if review['plot'] else ""
    opinion_html = review['opinion'].replace('\n', '<br>\n') if review['opinion'] else ""
    
    html += f"""
            <div class="review">
                <div class="review-title">{review['title']} ({review['year']})</div>
                <div class="review-meta">{review['genre']} - Reviewed {formatted_date}</div>
                <div class="stars">{stars_html}</div>
"""
    
    if plot_html:
        html += f"""
                <div style="margin: 15px 0;">
                    <strong>Plot:</strong><br>
                    {plot_html}
                </div>
"""
    
    if opinion_html:
        html += f"""
                <div style="margin: 15px 0;">
                    <strong>Opinion:</strong><br>
                    {opinion_html}
                </div>
"""
    
    html += """
            </div>
"""

html += """
        </div>
"""

# Random Quotes Tab
html += f"""
        <div id="quotes" class="tab-content">
            <div class="stats">
                <strong>{len(quotes)}</strong> random quotes
            </div>
"""

for quote in quotes:
    html += f"""
            <div class="quote">
                {quote['quote']}
            </div>
"""

html += """
        </div>
"""

# Footer and JavaScript
html += f"""
        <footer>
            <p>Thunt.net - Originally created by Thomas Hunt (2000-2001)</p>
            <p style="margin-top: 8px;">
                {len(blog_posts)} posts • {len(net_interest)} links • {len(messages)} messages • {len(dvds)} DVDs • {len(reviews)} reviews
            </p>
            <p style="margin-top: 8px;">
                Reconstructed from SQL database - {datetime.now().strftime("%Y")}
            </p>
        </footer>
    </div>
    
    <script>
        function showTab(tabName) {{
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(content => {{
                content.classList.remove('active');
            }});
            document.querySelectorAll('.tab').forEach(tab => {{
                tab.classList.remove('active');
            }});
            
            // Show selected tab
            document.getElementById(tabName).classList.add('active');
            event.target.classList.add('active');
            
            // Scroll to top
            window.scrollTo({{ top: 0, behavior: 'smooth' }});
        }}
    </script>
</body>
</html>
"""

# Write HTML file
output_path = Path(__file__).parent / "index.html"
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\n✅ Complete Thunt.net generated!")
print(f"📁 {output_path}")
print(f"\n📊 Content breakdown:")
print(f"   - Blog Posts: {len(blog_posts)}")
print(f"   - Net Interest: {len(net_interest)}")
print(f"   - Messages: {len(messages)}")
print(f"   - DVDs: {len(dvds)}")
print(f"   - Reviews: {len(reviews)}")
print(f"   - Quotes: {len(quotes)}")
