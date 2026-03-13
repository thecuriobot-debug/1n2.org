#!/usr/bin/env python3
"""
Add IG-88 music video to database and create new category
Also create article about stolen YouTube channel
"""
import json
from pathlib import Path

base = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")

# Load current database
with open(base / 'all_videos_complete.json') as f:
    categories = json.load(f)

# Create new IG-88 category with the stolen channel video
ig88_video = {
    'id': 'ig88-music-video',
    'youtube_id': 'Ut-KyLQujQA',
    'title': 'MC Chris - IG-88 (music video)',
    'year': 2008,
    'runtime': '2:42',
    'views': '893K',
    'age': '16 years ago',
    'comments': '478',
    'likes': '4.9K',
    'description': 'Star Wars bounty hunter droid IG-88 music video by MC Chris. Originally uploaded to MC Fanb0y channel, which was hacked and stolen by "Hoàng Quân SC XSMB". YouTube has not returned the channel despite multiple appeals.',
    'category': 'Music Video',
    'stolen_channel': True,
    'original_channel': 'MC Fanb0y',
    'hacker_channel': 'Hoàng Quân SC XSMB'
}

# Add new category
categories['IG-88'] = [ig88_video]

# Save updated database
with open(base / 'all_videos_complete.json', 'w') as f:
    json.dump(categories, f, indent=2)

print("✅ Added IG-88 music video to database!")
print(f"\n📊 Video details:")
print(f"   Title: {ig88_video['title']}")
print(f"   Views: {ig88_video['views']}")
print(f"   Comments: {ig88_video['comments']}")
print(f"   Likes: {ig88_video['likes']}")
print(f"   Age: {ig88_video['age']}")
print(f"\n⚠️  STOLEN CHANNEL ALERT:")
print(f"   Original: {ig88_video['original_channel']}")
print(f"   Hacker: {ig88_video['hacker_channel']}")
print(f"\n✨ New category 'IG-88' created!")

# Create article about stolen channel
article_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Stolen YouTube Channel - MC Fanb0y Story</title>
    <style>
        body {
            font-family: Georgia, serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            line-height: 1.8;
            background: #f5f5f5;
        }
        article {
            background: white;
            padding: 60px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            color: #e94560;
        }
        .byline {
            color: #666;
            font-style: italic;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #eee;
        }
        p {
            margin-bottom: 20px;
            font-size: 1.1em;
        }
        .highlight {
            background: #fff3cd;
            padding: 20px;
            border-left: 4px solid #e94560;
            margin: 30px 0;
        }
        .channel-box {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .channel-box strong {
            color: #e94560;
        }
        a {
            color: #667eea;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <article>
        <h1>The Stolen YouTube Channel: How "Hoàng" Hacked MC Fanb0y</h1>
        <div class="byline">
            A cautionary tale of digital theft and YouTube's failure to act<br>
            February 17, 2026
        </div>

        <p>
            In the early days of YouTube, when creators were building communities and sharing their 
            passion projects with the world, Thomas Hunt operated a channel called <strong>MC Fanb0y</strong>. 
            Among the content was a beloved music video: MC Chris's "IG-88," a Star Wars-themed track 
            celebrating the legendary bounty hunter droid.
        </p>

        <p>
            The video found its audience. Over the years, it accumulated <strong>893,000 views</strong>, 
            <strong>4,900 likes</strong>, and <strong>478 comments</strong> from fans who appreciated 
            the niche intersection of hip-hop and Star Wars lore. It was a small but meaningful piece 
            of internet culture, preserved on a channel that bore its creator's name.
        </p>

        <div class="highlight">
            <strong>Then the channel disappeared.</strong>
        </div>

        <h2>The Hack</h2>

        <p>
            At some point, a user operating under the name <strong>"Hoàng Quân SC XSMB"</strong> 
            gained unauthorized access to the MC Fanb0y channel. Through methods unknown—possibly 
            phishing, credential stuffing, or exploiting a security vulnerability—this individual 
            took control of the account.
        </p>

        <p>
            The channel name was changed. The branding was altered. The original creator was locked out. 
            And YouTube, despite being notified, has not returned the channel to its rightful owner.
        </p>

        <div class="channel-box">
            <strong>Current Channel Status:</strong><br>
            Channel Name: Hoàng Quân SC XSMB<br>
            Subscribers: 484<br>
            Original Owner: Thomas Hunt (MC Fanb0y)<br>
            Status: <span style="color: #e94560;">STOLEN - Not Recovered</span>
        </div>

        <h2>YouTube's Response: Nothing</h2>

        <p>
            Multiple appeals have been filed. Evidence of ownership has been provided. The original 
            creator has documented their case. Yet YouTube has not acted to restore the channel to 
            Thomas Hunt.
        </p>

        <p>
            This is not an isolated incident. Across YouTube's platform, creators have lost channels 
            to hackers, only to find that the company's recovery process is opaque, slow, or entirely 
            unresponsive. For small creators without legal teams or media attention, the recourse is 
            often... nothing.
        </p>

        <h2>The Video Lives On—Under Someone Else's Name</h2>

        <p>
            Today, if you search for "MC Chris IG-88," you'll find the video. It still has those 
            893,000 views. The comments are still there, praising the editing and celebrating the 
            bounty hunter. But the channel attribution reads "Hoàng Quân SC XSMB"—a name that has 
            nothing to do with the video's creation or curation.
        </p>

        <p>
            The video is a ghost of its former self: the content remains, but the creator's identity 
            has been erased. For Thomas Hunt, it's a reminder that in the digital age, ownership is 
            fragile. What you build can be taken. And the platforms that host your work may not 
            protect you when it happens.
        </p>

        <div class="highlight">
            <strong>The IG-88 music video should say MC Fanb0y. Instead, it says Hoàng.</strong><br>
            YouTube won't give it back.
        </div>

        <h2>What Can Be Done?</h2>

        <p>
            For creators facing similar situations:
        </p>

        <ul>
            <li><strong>Enable two-factor authentication</strong> on all accounts</li>
            <li><strong>Use unique passwords</strong> for each platform</li>
            <li><strong>Document your ownership</strong> with screenshots, emails, and original files</li>
            <li><strong>Back up your content</strong> independently of the platform</li>
            <li><strong>Escalate through social media</strong> if official channels fail</li>
        </ul>

        <p>
            But perhaps most importantly: recognize that platforms are not permanent homes for your 
            work. They are landlords, not partners. And when something goes wrong, you may be on your own.
        </p>

        <p>
            The IG-88 video is still online. It's still getting views. But it doesn't belong to the 
            person who put it there. And that's a problem YouTube has chosen not to solve.
        </p>

        <hr style="margin: 40px 0; border: none; border-top: 2px solid #eee;">

        <p style="text-align: center; color: #666; font-style: italic;">
            Watch the video (now under the hacker's channel): 
            <a href="https://www.youtube.com/watch?v=Ut-KyLQujQA" target="_blank">
                MC Chris - IG-88 (music video)
            </a>
        </p>

        <p style="text-align: center; margin-top: 40px;">
            <a href="../index.html">← Back to Thomas Hunt Films</a>
        </p>
    </article>
</body>
</html>
"""

# Save article
article_path = base / 'stolen-channel-story.html'
with open(article_path, 'w') as f:
    f.write(article_content)

print(f"\n📝 Article created: stolen-channel-story.html")
print("\n✨ Article details:")
print("   - Documents the channel theft")
print("   - Explains the MC Fanb0y → Hoàng hack")
print("   - YouTube's failure to respond")
print("   - Security recommendations")
