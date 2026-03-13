#!/usr/bin/env python3
"""
Create IG-88 article page matching Thomas Hunt Films style
"""
from pathlib import Path

base = Path("/Users/curiobot/Sites/1n2.org/thomashuntfilms")

# Read the style from an existing Star Trek page to match
sample_page = open(base / 'videos/star-trek-tmp.html').read()

# Extract the style section
style_start = sample_page.find('<style>')
style_end = sample_page.find('</style>') + 8
styles = sample_page[style_start:style_end]

article_html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IG-88 Music Video - The Stolen Channel Story</title>
    {styles}
</head>
<body>
    <header>
        <h1>THOMAS HUNT FILMS</h1>
        <div class="tagline">The IG-88 Story</div>
    </header>
    
    <nav>
        <a href="index.html">Home</a>
        <a href="press.html">Press</a>
        <a href="javascript:history.back()">← Back</a>
    </nav>
    
    <div class="container">
        <div class="content">
            <div style="max-width: 1200px; margin: 0 auto;">
                <div style="margin-bottom: 20px;">
                    <span style="background: #e94560; color: #fff; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: uppercase;">
                        ⚠️ Stolen Channel
                    </span>
                </div>
                
                <h1 style="color: #e94560; margin-bottom: 30px; font-size: 42px;">
                    MC Chris - IG-88 (music video)
                </h1>
                
                <div style="max-width: 900px; margin: 0 auto 40px;">
                    <div style="position: relative; padding-bottom: 56.25%; height: 0; background: #000; border-radius: 12px; overflow: hidden;">
                        <iframe 
                            src="https://www.youtube.com/embed/Ut-KyLQujQA" 
                            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" 
                            frameborder="0" 
                            allowfullscreen
                        ></iframe>
                    </div>
                </div>
                
                <div style="max-width: 900px; margin: 0 auto;">
                    <div style="background: #1a1a2e; padding: 35px; border-radius: 12px; margin-bottom: 40px; border: 2px solid #16213e;">
                        <h3 style="color: #e94560; margin-bottom: 20px; font-size: 24px;">About This Video</h3>
                        <p style="line-height: 1.8; margin-bottom: 20px; font-size: 16px; color: #ccc;">
                            A Star Wars music video celebrating the legendary bounty hunter droid IG-88, created by MC Chris. 
                            This video accumulated 893,000 views and built a community of fans over 16 years.
                        </p>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 25px; margin-top: 25px; padding-top: 25px; border-top: 1px solid #16213e;">
                            <div>
                                <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Year</div>
                                <div style="font-size: 18px; font-weight: 600; color: #fff;">2008</div>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Runtime</div>
                                <div style="font-size: 18px; font-weight: 600; color: #fff;">2:42</div>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Views</div>
                                <div style="font-size: 18px; font-weight: 600; color: #fff;">893K</div>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Comments</div>
                                <div style="font-size: 18px; font-weight: 600; color: #fff;">478</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background: #16213e; padding: 35px; border-radius: 12px; margin-bottom: 40px; border: 2px solid #e94560;">
                        <h3 style="color: #e94560; margin-bottom: 25px; font-size: 24px;">⚠️ Stolen Channel Alert</h3>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 30px;">
                            <div>
                                <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Original Channel</div>
                                <div style="font-size: 24px; font-weight: 700; color: #fff;">MC Fanb0y</div>
                                <div style="font-size: 14px; color: #aaa; margin-top: 5px;">Thomas Hunt</div>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Current (Hacker)</div>
                                <div style="font-size: 24px; font-weight: 700; color: #e94560;">Hoàng Quân SC XSMB</div>
                                <div style="font-size: 14px; color: #aaa; margin-top: 5px;">Unauthorized Control</div>
                            </div>
                        </div>
                    </div>

                    <div style="background: #1a1a2e; padding: 35px; border-radius: 12px; margin-bottom: 40px; border: 2px solid #16213e;">
                        <h2 style="color: #e94560; margin-bottom: 25px; font-size: 28px;">The Stolen YouTube Channel</h2>
                        
                        <h3 style="color: #fff; margin: 30px 0 15px 0; font-size: 22px;">How "Hoàng" Hacked MC Fanb0y</h3>
                        <p style="line-height: 1.8; margin-bottom: 20px; font-size: 16px; color: #ccc;">
                            In the early days of YouTube, Thomas Hunt operated a channel called <strong style="color: #fff;">MC Fanb0y</strong>. 
                            Among the content was this beloved music video: MC Chris's "IG-88," a Star Wars-themed track 
                            celebrating the legendary bounty hunter droid.
                        </p>
                        
                        <p style="line-height: 1.8; margin-bottom: 20px; font-size: 16px; color: #ccc;">
                            The video found its audience. Over 16 years, it accumulated <strong style="color: #e94560;">893,000 views</strong>, 
                            <strong style="color: #e94560;">4,900 likes</strong>, and <strong style="color: #e94560;">478 comments</strong> 
                            from fans who appreciated the niche intersection of hip-hop and Star Wars lore.
                        </p>

                        <h3 style="color: #fff; margin: 30px 0 15px 0; font-size: 22px;">Then the Channel Disappeared</h3>
                        <p style="line-height: 1.8; margin-bottom: 20px; font-size: 16px; color: #ccc;">
                            At some point, a user operating under the name <strong style="color: #e94560;">"Hoàng Quân SC XSMB"</strong> 
                            gained unauthorized access to the MC Fanb0y channel. Through methods unknown—possibly phishing, 
                            credential stuffing, or exploiting a security vulnerability—this individual took control of the account.
                        </p>
                        
                        <p style="line-height: 1.8; margin-bottom: 20px; font-size: 16px; color: #ccc;">
                            The channel name was changed. The branding was altered. The original creator was locked out. 
                            And YouTube, despite being notified, has not returned the channel to its rightful owner.
                        </p>

                        <h3 style="color: #fff; margin: 30px 0 15px 0; font-size: 22px;">YouTube's Response: Nothing</h3>
                        <p style="line-height: 1.8; margin-bottom: 20px; font-size: 16px; color: #ccc;">
                            Multiple appeals have been filed. Evidence of ownership has been provided. The original 
                            creator has documented their case. Yet YouTube has not acted to restore the channel.
                        </p>
                        
                        <p style="line-height: 1.8; margin-bottom: 20px; font-size: 16px; color: #ccc;">
                            This is not an isolated incident. Across YouTube's platform, creators have lost channels 
                            to hackers, only to find that the company's recovery process is opaque, slow, or entirely 
                            unresponsive. For small creators without legal teams or media attention, the recourse is often nothing.
                        </p>

                        <h3 style="color: #fff; margin: 30px 0 15px 0; font-size: 22px;">The Video Lives On—Under Someone Else's Name</h3>
                        <p style="line-height: 1.8; margin-bottom: 20px; font-size: 16px; color: #ccc;">
                            Today, if you search for "MC Chris IG-88," you'll find the video embedded above. It still has those 
                            893,000 views. The comments are still there, praising the editing and celebrating the 
                            bounty hunter. But the channel attribution reads "Hoàng Quân SC XSMB"—a name that has 
                            nothing to do with the video's creation or curation.
                        </p>
                        
                        <div style="background: rgba(233, 69, 96, 0.1); border-left: 4px solid #e94560; padding: 20px; margin: 30px 0;">
                            <p style="font-size: 18px; font-weight: 600; color: #e94560; margin: 0;">
                                The IG-88 music video should say MC Fanb0y.<br>
                                Instead, it says Hoàng.<br>
                                YouTube won't give it back.
                            </p>
                        </div>

                        <h3 style="color: #fff; margin: 30px 0 15px 0; font-size: 22px;">What Can Be Done?</h3>
                        <p style="line-height: 1.8; margin-bottom: 15px; font-size: 16px; color: #ccc;">
                            For creators facing similar situations:
                        </p>
                        <ul style="line-height: 1.8; margin-bottom: 20px; font-size: 16px; color: #ccc; margin-left: 20px;">
                            <li style="margin-bottom: 10px;"><strong style="color: #fff;">Enable two-factor authentication</strong> on all accounts</li>
                            <li style="margin-bottom: 10px;"><strong style="color: #fff;">Use unique passwords</strong> for each platform</li>
                            <li style="margin-bottom: 10px;"><strong style="color: #fff;">Document your ownership</strong> with screenshots, emails, and original files</li>
                            <li style="margin-bottom: 10px;"><strong style="color: #fff;">Back up your content</strong> independently of the platform</li>
                            <li style="margin-bottom: 10px;"><strong style="color: #fff;">Escalate through social media</strong> if official channels fail</li>
                        </ul>
                        
                        <p style="line-height: 1.8; margin-bottom: 20px; font-size: 16px; color: #ccc;">
                            But perhaps most importantly: recognize that platforms are not permanent homes for your 
                            work. They are landlords, not partners. And when something goes wrong, you may be on your own.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <footer>
        <p>Thomas Hunt Films © 2015-2026</p>
        <p style="margin-top: 10px;">
            <a href="https://www.youtube.com/@ThomasHuntFilms" target="_blank" style="color: #e94560; text-decoration: none;">YouTube Channel</a>
        </p>
    </footer>
</body>
</html>
'''

# Save the new article page
with open(base / 'stolen-channel-story.html', 'w') as f:
    f.write(article_html)

print("✅ Created new IG-88 article page!")
print("   - Matches Thomas Hunt Films style")
print("   - Embedded YouTube video")
print("   - Stolen channel stats displayed")
print("   - Complete story included")
