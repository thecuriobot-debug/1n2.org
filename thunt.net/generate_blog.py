#!/usr/bin/env python3
"""
Generate HTML blog from thuntnet database
"""

import sqlite3
from pathlib import Path
from datetime import datetime

db_path = Path(__file__).parent / "thuntnet.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all posts
cursor.execute("""
    SELECT ID, headline, author, story_text, summary, date_posted, section, link
    FROM thuntnet_archive
    ORDER BY date_posted DESC
""")
posts = cursor.fetchall()

cursor.execute("""
    SELECT ID, message, date_posted
    FROM thuntmessage  
    ORDER BY date_posted DESC
""")
messages = cursor.fetchall()

conn.close()

def format_timestamp(ts):
    """Convert MySQL timestamp to readable date"""
    if not ts or len(str(ts)) < 8:
        return "Unknown Date"
    ts_str = str(ts)
    try:
        year = ts_str[0:4]
        month = ts_str[4:6]
        day = ts_str[6:8]
        hour = ts_str[8:10] if len(ts_str) >= 10 else "00"
        minute = ts_str[10:12] if len(ts_str) >= 12 else "00"
        
        dt = datetime(int(year), int(month), int(day), int(hour), int(minute))
        return dt.strftime("%B %d, %Y at %I:%M %p")
    except:
        return ts_str

# Generate HTML
html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thunt.net - Archive</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: Verdana, Arial, sans-serif;
            font-size: 11px;
            background: #003366;
            color: #000;
        }}
        
        .container {{
            max-width: 800px;
            margin: 0 auto;
            background: #fff;
        }}
        
        header {{
            background: linear-gradient(180deg, #6699cc 0%, #003366 100%);
            color: #fff;
            padding: 20px;
            text-align: center;
            border-bottom: 3px solid #000;
        }}
        
        header h1 {{
            font-size: 32px;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            margin-bottom: 5px;
        }}
        
        header .tagline {{
            font-size: 12px;
            font-style: italic;
            opacity: 0.9;
        }}
        
        nav {{
            background: #336699;
            padding: 8px 20px;
            border-bottom: 2px solid #000;
        }}
        
        nav a {{
            color: #fff;
            text-decoration: none;
            margin-right: 15px;
            font-size: 11px;
            font-weight: bold;
        }}
        
        nav a:hover {{
            text-decoration: underline;
        }}
        
        .main-content {{
            padding: 20px;
        }}
        
        .post {{
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px dashed #ccc;
        }}
        
        .post:last-child {{
            border-bottom: none;
        }}
        
        .post-header {{
            background: #f0f0f0;
            padding: 10px;
            border-left: 5px solid #336699;
            margin-bottom: 10px;
        }}
        
        .post-title {{
            font-size: 16px;
            font-weight: bold;
            color: #003366;
            margin-bottom: 5px;
        }}
        
        .post-meta {{
            font-size: 10px;
            color: #666;
        }}
        
        .post-content {{
            padding: 10px 0;
            line-height: 1.6;
        }}
        
        .post-content p {{
            margin-bottom: 10px;
        }}
        
        .post-summary {{
            background: #ffffcc;
            padding: 10px;
            border-left: 4px solid #ffcc00;
            margin: 10px 0;
            font-style: italic;
        }}
        
        .post-link {{
            color: #003366;
            font-weight: bold;
        }}
        
        .section-badge {{
            display: inline-block;
            background: #336699;
            color: #fff;
            padding: 2px 8px;
            font-size: 9px;
            border-radius: 3px;
            margin-left: 10px;
        }}
        
        .message {{
            background: #e6f2ff;
            padding: 12px;
            margin-bottom: 15px;
            border-left: 4px solid #003366;
            font-size: 12px;
        }}
        
        .message-date {{
            font-size: 9px;
            color: #666;
            margin-top: 5px;
        }}
        
        footer {{
            background: #003366;
            color: #fff;
            text-align: center;
            padding: 15px;
            font-size: 10px;
        }}
        
        footer a {{
            color: #99ccff;
        }}
        
        .stats {{
            background: #f9f9f9;
            padding: 15px;
            margin-bottom: 20px;
            border: 1px solid #ccc;
            text-align: center;
        }}
        
        .stats strong {{
            color: #003366;
            font-size: 18px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Thunt.net</h1>
            <div class="tagline">Thomas Hunt's Personal Website - Archive from 2000-2001</div>
        </header>
        
        <nav>
            <a href="#posts">Posts</a>
            <a href="#messages">Messages</a>
            <a href="#about">About</a>
        </nav>
        
        <div class="main-content">
            <div class="stats">
                <strong>{len(posts)}</strong> archived posts &nbsp;|&nbsp; <strong>{len(messages)}</strong> messages
            </div>
            
            <h2 id="posts" style="color: #003366; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 3px solid #336699;">
                📰 Blog Posts
            </h2>
"""

# Add posts
for post in posts:
    post_id, headline, author, story, summary, date_posted, section, link = post
    
    formatted_date = format_timestamp(date_posted)
    
    # Format story text
    story_html = story.replace('\n', '<br>\n') if story else ""
    
    # Check if there's a link
    link_html = ""
    if link and link.strip():
        link_html = f'<p><a href="http://{link}" class="post-link" target="_blank">🔗 {link}</a></p>'
    
    # Section badge
    section_badge = ""
    if section and section != 'normal':
        section_badge = f'<span class="section-badge">{section}</span>'
    
    html += f"""
            <div class="post">
                <div class="post-header">
                    <div class="post-title">{headline}{section_badge}</div>
                    <div class="post-meta">
                        Posted by <strong>{author}</strong> on {formatted_date}
                    </div>
                </div>
"""
    
    if summary:
        html += f"""
                <div class="post-summary">
                    {summary}
                </div>
"""
    
    if story_html:
        html += f"""
                <div class="post-content">
                    {story_html}
                </div>
"""
    
    if link_html:
        html += link_html
    
    html += """
            </div>
"""

# Add messages section
html += f"""
            <h2 id="messages" style="color: #003366; margin: 40px 0 20px 0; padding-bottom: 10px; border-bottom: 3px solid #336699;">
                💬 Quick Messages
            </h2>
"""

for msg in messages:
    msg_id, message, date_posted = msg
    formatted_date = format_timestamp(date_posted)
    
    html += f"""
            <div class="message">
                {message}
                <div class="message-date">{formatted_date}</div>
            </div>
"""

# Close HTML
html += f"""
            <div id="about" style="margin-top: 40px; padding: 20px; background: #f0f0f0; border-left: 5px solid #336699;">
                <h3 style="color: #003366; margin-bottom: 10px;">About This Archive</h3>
                <p style="line-height: 1.6;">
                    This is an archive of <strong>Thunt.net</strong>, Thomas Hunt's personal website from 2000-2001.
                    The site was built using PHP and MySQL, and featured blog posts, quick messages, a DVD collection tracker,
                    and various web experiments from the early days of the internet.
                </p>
                <p style="line-height: 1.6; margin-top: 10px;">
                    This archive was reconstructed from the original MySQL database dump, preserving {len(posts)} blog posts
                    and {len(messages)} quick messages. The original site ran from 2000 to 2001.
                </p>
            </div>
        </div>
        
        <footer>
            <p>Thunt.net Archive - Originally created by Thomas Hunt (2000-2001)</p>
            <p style="margin-top: 5px;">
                Reconstructed from SQL database - {datetime.now().strftime("%Y")}
            </p>
        </footer>
    </div>
</body>
</html>
"""

# Write HTML file
output_path = Path(__file__).parent / "index.html"
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"✅ Blog generated: {output_path}")
print(f"📊 {len(posts)} posts")
print(f"💬 {len(messages)} messages")
print(f"\n🌐 Open in browser: file://{output_path}")
