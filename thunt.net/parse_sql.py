#!/usr/bin/env python3
"""
Parse thuntnet SQL and create a blog display
"""

import re
import sqlite3
from datetime import datetime
from pathlib import Path

# Read SQL file
sql_file = Path(__file__).parent / "thuntnet.sql"
with open(sql_file, 'r', encoding='latin-1') as f:
    sql_content = f.read()

# Create SQLite database
db_path = Path(__file__).parent / "thuntnet.db"
db_path.unlink(missing_ok=True)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Create tables
cursor.execute("""
CREATE TABLE thuntnet_archive (
  ID INTEGER PRIMARY KEY,
  headline TEXT,
  author TEXT,
  author_email TEXT,
  story_text TEXT,
  summary TEXT,
  date_posted TEXT,
  section TEXT,
  link TEXT
)
""")

cursor.execute("""
CREATE TABLE thuntmessage (
  ID INTEGER PRIMARY KEY,
  message TEXT,
  date_posted TEXT
)
""")

# Parse and insert archive posts
archive_pattern = r"INSERT INTO thuntnet_archive VALUES \((\d+), '(.*?)', '(.*?)', '(.*?)', '(.*?)', '(.*?)', (\d+), '(.*?)', '(.*?)'\);"
for match in re.finditer(archive_pattern, sql_content, re.DOTALL):
    id_num, headline, author, email, story, summary, date_posted, section, link = match.groups()
    
    # Unescape SQL strings
    headline = headline.replace("\\'", "'").replace("\\r\\n", "\n")
    story = story.replace("\\'", "'").replace("\\r\\n", "\n").replace("\\n", "\n")
    summary = summary.replace("\\'", "'").replace("\\r\\n", "\n")
    
    cursor.execute("""
        INSERT INTO thuntnet_archive (ID, headline, author, author_email, story_text, summary, date_posted, section, link)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (id_num, headline, author, email, story, summary, date_posted, section, link))

# Parse and insert messages
message_pattern = r"INSERT INTO thuntmessage VALUES \((\d+), '(.*?)', (\d+)\);"
for match in re.finditer(message_pattern, sql_content):
    id_num, message, date_posted = match.groups()
    message = message.replace("\\'", "'")
    
    cursor.execute("""
        INSERT INTO thuntmessage (ID, message, date_posted)
        VALUES (?, ?, ?)
    """, (id_num, message, date_posted))

conn.commit()

# Get all posts
cursor.execute("SELECT COUNT(*) FROM thuntnet_archive")
archive_count = cursor.fetchone()[0]

cursor.execute("SELECT COUNT(*) FROM thuntmessage")  
message_count = cursor.fetchone()[0]

print(f"✅ Imported {archive_count} archive posts")
print(f"✅ Imported {message_count} messages")

# Get posts ordered by date
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

print(f"\n✅ Database created: {db_path}")
print(f"📊 Total posts: {len(posts)}")
print(f"💬 Total messages: {len(messages)}")
