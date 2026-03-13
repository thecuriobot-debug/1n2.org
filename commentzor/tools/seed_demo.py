#!/usr/bin/env python3
"""
Seed the Commentzor DB with demo data for testing the web UI.
Run: python3 tools/seed_demo.py
"""

import os, sys, random, string
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db import get_connection, init_db

DEMO_CHANNELS = [
    {"channel_id": "UCdemo1111111111111111", "channel_name": "TechVault", "channel_url": "https://youtube.com/@TechVault", "subscriber_count": 245000, "video_count": 312, "thumbnail_url": ""},
    {"channel_id": "UCdemo2222222222222222", "channel_name": "GameCrafter", "channel_url": "https://youtube.com/@GameCrafter", "subscriber_count": 89000, "video_count": 187, "thumbnail_url": ""},
    {"channel_id": "UCdemo3333333333333333", "channel_name": "CookWithJoy", "channel_url": "https://youtube.com/@CookWithJoy", "subscriber_count": 520000, "video_count": 445, "thumbnail_url": ""},
]

SERIES_TAGS = ["Tutorials", "Reviews", "Vlogs", "Let's Play", "Recipes", "Deep Dives", "Q&A", "Shorts", None, None, None]

COMMENT_TEMPLATES = [
    "This is exactly what I needed to hear today. Thank you!",
    "I've been watching since day one and the quality keeps improving",
    "Can someone explain what happens at {time}? I'm confused",
    "Love this content! Keep it up!",
    "This changed my perspective completely. Subscribed!",
    "I wish I found this channel sooner. Amazing stuff",
    "The editing in this video is next level",
    "Who else is watching this at 3am? Just me? Ok...",
    "I tried this myself and it actually works!",
    "This deserves way more views than it has",
    "First time watching and I'm already hooked",
    "The way you explain things makes it so easy to understand",
    "I've watched this three times already and notice something new each time",
    "This video should be required viewing for everyone",
    "Not gonna lie, I got emotional watching this",
    "Binge watching the entire playlist right now",
    "My teacher showed this in class today!",
    "The production value is insane for a YouTube channel",
    "Can't believe this is free content. Better than most paid courses",
    "I disagree with your take on this but respect the effort",
    "This is gold. Pure gold.",
    "Finally someone who gets it. Thank you for making this",
    "I shared this with everyone I know",
    "The background music is perfect for this video",
    "Who else clicked because of the thumbnail? No regrets!",
    "This popped up in my recommended and I'm so glad it did",
    "Watching this during my lunch break. Best decision today",
    "I come back to this video whenever I need motivation",
    "The fact that this only has {views} views is criminal",
    "Would love to see a follow up to this topic",
    "Is it just me or does the audio sound different in this one?",
    "Plot twist: I was actually entertained and learned something",
    "Adding this to my favorites playlist immediately",
    "This is the kind of content that makes YouTube worth it",
    "Incredible breakdown. You should write a book about this",
    "I've been thinking about this all day since I watched it",
    "Every time I see a notification from this channel, I click instantly",
    "The intro alone was worth the click",
    "I paused the video just to write this comment. That's how good it is",
    "OK but can we talk about how underrated this channel is?",
]

REPLY_TEMPLATES = [
    "Totally agree with you!",
    "I had the same thought!",
    "Great point, hadn't considered that",
    "Thanks for sharing your experience",
    "Haha same here!",
    "This!!! 100%",
    "Could you elaborate on that? Sounds interesting",
    "I respectfully disagree but I see where you're coming from",
    "You explained it better than I could have",
    "Exactly my thoughts too",
]

AUTHOR_NAMES = [
    "AlexGaming", "SarahTech", "MikeReviews", "EmmaCreates", "JakeWonders",
    "LilyVlogs", "SamBuilds", "ZoeExplores", "MaxCodes", "RubyReads",
    "TomCooks", "AnnaDraws", "BenPlays", "KateDesigns", "DanTravels",
    "JessMusic", "ChrisDebates", "MiaPhotos", "RyanFitness", "OliviaWrites",
    "NoahGardens", "ChloeFilms", "EthanScience", "AvaDances", "MasonDIY",
    "HarperReads42", "LoganGames99", "AriaMusic_", "LucasExplores", "EllaTeaches",
    "JacksonCooks", "PenelopeArt", "AidenReviews", "LauraVlogs", "CarterBuilds",
    "SofiaStudies", "OwenWatches", "ScarlettSings", "LiamCodes77", "GraceTravels",
    "JulianDebates", "ZoeyPhotos", "HenryFitness", "NathanWritesStuff", "LillyCrafts",
    "DylanGamer", "AubreyReads", "GavinScience", "BellaAdventures", "IsaacMakes",
]

def seed():
    init_db()
    conn = get_connection()
    c = conn.cursor()

    print("Seeding demo data...")

    # Insert channels
    for ch in DEMO_CHANNELS:
        c.execute("""
            INSERT OR REPLACE INTO channels (channel_id, channel_name, channel_url, subscriber_count, video_count, thumbnail_url, last_scraped)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        """, (ch["channel_id"], ch["channel_name"], ch["channel_url"], ch["subscriber_count"], ch["video_count"], ch["thumbnail_url"]))

    # Create authors
    authors = []
    for i, name in enumerate(AUTHOR_NAMES):
        author_id = f"UCauthor{i:04d}{''.join(random.choices(string.ascii_lowercase, k=8))}"
        authors.append(author_id)
        c.execute("""
            INSERT OR REPLACE INTO authors (author_id, author_name, author_url, author_avatar, total_comments)
            VALUES (?, ?, ?, ?, 0)
        """, (author_id, name, f"https://youtube.com/channel/{author_id}", ""))

    # Create videos and comments per channel
    vid_num = 0
    cmt_num = 0
    for ch in DEMO_CHANNELS:
        num_videos = random.randint(30, 60)
        for v in range(num_videos):
            vid_num += 1
            vid_id = f"demo_vid_{vid_num:04d}"
            pub_date = datetime.now() - timedelta(days=random.randint(1, 1200))
            views = random.randint(100, 500000)
            likes = int(views * random.uniform(0.02, 0.15))
            series = random.choice(SERIES_TAGS)
            title_prefixes = ["How to", "Why", "The Ultimate Guide to", "10 Things About", "Everything Wrong With", "My Experience With", "Let's Talk About", "Deep Dive:", "Reviewing", "Is This The Best"]
            title_topics = ["Python Coding", "Game Design", "Italian Pasta", "Machine Learning", "Indie Games", "Sourdough Bread", "Web Dev", "Retro Gaming", "Thai Curry", "React vs Vue", "Pixel Art", "Baking Croissants", "Rust Language", "Minecraft Mods", "Sushi Making"]
            title = f"{random.choice(title_prefixes)} {random.choice(title_topics)}"

            c.execute("""
                INSERT OR REPLACE INTO videos
                (video_id, channel_id, title, description, published_at, view_count, like_count, comment_count, duration, thumbnail_url, series_tag, last_scraped)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """, (vid_id, ch["channel_id"], title, f"Demo video about {title}", pub_date.isoformat() + "Z", views, likes, 0, "PT10M30S", "", series))

            # Add comments to this video
            num_comments = random.randint(3, 40)
            for _ in range(num_comments):
                cmt_num += 1
                cmt_id = f"demo_cmt_{cmt_num:06d}"
                author_id = random.choice(authors)
                text = random.choice(COMMENT_TEMPLATES).replace("{time}", f"{random.randint(1,15)}:{random.randint(10,59)}").replace("{views}", str(views))
                cmt_likes = random.choices([0,0,0,0,0,1,1,2,3,5,10,25,50,100,500], k=1)[0]
                cmt_date = pub_date + timedelta(hours=random.randint(1, 720))

                c.execute("""
                    INSERT OR REPLACE INTO comments
                    (comment_id, video_id, channel_id, author_id, parent_id, text_original, text_display, like_count, published_at, updated_at, is_reply)
                    VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 0)
                """, (cmt_id, vid_id, ch["channel_id"], author_id, text, text, cmt_likes, cmt_date.isoformat() + "Z", cmt_date.isoformat() + "Z"))

                # Some comments get replies
                if random.random() < 0.3:
                    num_replies = random.randint(1, 4)
                    for r in range(num_replies):
                        cmt_num += 1
                        reply_id = f"demo_cmt_{cmt_num:06d}"
                        reply_author = random.choice(authors)
                        reply_text = random.choice(REPLY_TEMPLATES)
                        reply_date = cmt_date + timedelta(hours=random.randint(1, 48))

                        c.execute("""
                            INSERT OR REPLACE INTO comments
                            (comment_id, video_id, channel_id, author_id, parent_id, text_original, text_display, like_count, published_at, updated_at, is_reply)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                        """, (reply_id, vid_id, ch["channel_id"], reply_author, cmt_id, reply_text, reply_text, random.randint(0, 10), reply_date.isoformat() + "Z", reply_date.isoformat() + "Z"))

    # Update comment counts
    c.execute("""
        UPDATE videos SET comment_count = (
            SELECT COUNT(*) FROM comments WHERE comments.video_id = videos.video_id
        )
    """)
    c.execute("""
        UPDATE authors SET total_comments = (
            SELECT COUNT(*) FROM comments WHERE comments.author_id = authors.author_id
        )
    """)

    conn.commit()
    conn.close()

    print(f"Seeded: {len(DEMO_CHANNELS)} channels, {vid_num} videos, {cmt_num} comments")


if __name__ == "__main__":
    seed()
