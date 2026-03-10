#!/usr/bin/env python3.12
"""
Dashboarder Content Generator
Reads articles from DB, generates AI summaries, builds home-content.html
Deploys to server automatically.

Usage:
    python3.12 generate_dashboard.py              # Generate + deploy
    python3.12 generate_dashboard.py --no-deploy   # Generate only
    python3.12 generate_dashboard.py --resummarize  # Re-generate all AI summaries
"""
import sqlite3, json, hashlib, re, os, sys, subprocess, argparse
from datetime import datetime
from pathlib import Path

DB = Path.home() / 'Sites' / '1n2.org' / 'thunt-data-labs' / 'db' / 'thunt-data-labs.db'
OUTPUT = Path.home() / 'Sites' / '1n2.org' / 'dashboarder' / 'home-content.html'
DEPLOY_HOST = 'root@157.245.186.58'
DEPLOY_PATH = '/var/www/html/dashboarder/'
API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')

# Topics to include in headlines (exclude crypto, culture)
HEADLINE_TOPICS = [
    'news-ai', 'news-tech', 'news-science', 'news-world', 'news-us',
    'news-business', 'news-health', 'news-sports', 'news-politics'
]

# Max articles per topic section
MAX_PER_TOPIC = 3

TOPIC_LABELS = {
    'news-ai': ('🤖', 'AI'),
    'news-tech': ('🔬', 'Tech'),
    'news-science': ('🚀', 'Science'),
    'news-world': ('🌍', 'World'),
    'news-us': ('🇺🇸', 'US'),
    'news-business': ('💼', 'Business'),
    'news-health': ('🏥', 'Health'),
    'news-sports': ('🏟', 'Sports'),
    'news-politics': ('🏛', 'Politics'),
}


def get_conn():
    conn = sqlite3.connect(str(DB), timeout=30)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_ai_summary_column():
    conn = get_conn()
    cols = [r[1] for r in conn.execute('PRAGMA table_info(articles)').fetchall()]
    if 'ai_summary' not in cols:
        conn.execute('ALTER TABLE articles ADD COLUMN ai_summary TEXT')
        conn.commit()
        print("  Added ai_summary column to articles table")
    conn.close()


def generate_summary_local(title, text, source):
    """Generate a concise news summary without API (rule-based fallback)."""
    # Clean the text
    text = re.sub(r'!\[.*?\]\(.*?\)', '', text)  # Remove markdown images
    text = re.sub(r'!\[.*', '', text)  # Remove broken image refs
    text = re.sub(r'^[-–]\s*', '', text)
    text = re.sub(r'\n+', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Remove title echo at start
    clean_title = title.replace(' - ' + source, '').strip() if source else title
    if text.lower().startswith(clean_title.lower()[:30]):
        text = text[len(clean_title):].strip()
        text = re.sub(r'^[\s:.\-–]+', '', text).strip()
    
    # Remove junk prefixes and metadata lines
    text = re.sub(r'(?:^|\s)[-–]?\s*(?:Date|Source|Summary|Author|Published|Updated|By)\s*:?\s*[-–]?\s*', ' ', text)
    for junk in ['Medical news', 'Press release', 'Medical news & Guidelines',
                 'Anesthesiology', 'Cardiology and CTVS', 'Critical Care', 'Dentistry']:
        text = text.replace(junk, '').strip()
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Extract first 2-3 meaningful sentences
    sentences = re.split(r'(?<=[.!?])\s+', text)
    summary_parts = []
    char_count = 0
    for s in sentences:
        s = s.strip()
        if len(s) < 15:
            continue
        if char_count + len(s) > 250:
            break
        summary_parts.append(s)
        char_count += len(s)
        if len(summary_parts) >= 2:
            break
    
    result = ' '.join(summary_parts).strip()
    if not result or len(result) < 30:
        result = text[:200].rsplit(' ', 1)[0] + '…'
    
    return result


def generate_summary_api(title, text, source):
    """Generate a concise news summary using Claude API."""
    if not API_KEY:
        return generate_summary_local(title, text, source)
    
    import requests
    try:
        r = requests.post('https://api.anthropic.com/v1/messages', 
            headers={
                'x-api-key': API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            json={
                'model': 'claude-sonnet-4-20250514',
                'max_tokens': 150,
                'messages': [{'role': 'user', 'content': 
                    f'Write a 1-2 sentence news summary of this article. Be concise, factual, no fluff. '
                    f'Start with the key news, not "This article discusses...".\n\n'
                    f'Title: {title}\nSource: {source}\n\nArticle:\n{text[:2000]}'
                }]
            },
            timeout=15
        )
        if r.status_code == 200:
            data = r.json()
            return data['content'][0]['text'].strip()
    except Exception as e:
        print(f"    API error: {e}")
    
    return generate_summary_local(title, text, source)


def summarize_articles(force=False):
    """Generate AI summaries for articles that don't have them."""
    conn = get_conn()
    
    if force:
        where = "word_count > 100 AND topic IN ({})".format(','.join('?' * len(HEADLINE_TOPICS)))
        params = HEADLINE_TOPICS
    else:
        where = "word_count > 100 AND topic IN ({}) AND (ai_summary IS NULL OR ai_summary = '')".format(
            ','.join('?' * len(HEADLINE_TOPICS)))
        params = HEADLINE_TOPICS
    
    rows = conn.execute(f"""
        SELECT id, title, source, topic, text_content 
        FROM articles WHERE {where}
        ORDER BY date DESC LIMIT 200
    """, params).fetchall()
    
    if not rows:
        print("  All articles already have summaries.")
        return 0
    
    print(f"  Summarizing {len(rows)} articles...")
    count = 0
    for r in rows:
        summary = generate_summary_api(r['title'], r['text_content'], r['source'])
        conn.execute("UPDATE articles SET ai_summary=? WHERE id=?", (summary, r['id']))
        count += 1
        if count % 20 == 0:
            conn.commit()
            print(f"    ... {count} done")
    
    conn.commit()
    conn.close()
    print(f"  Summarized {count} articles")
    return count


def build_headline_html():
    """Build the Headlines section HTML from DB articles with AI summaries."""
    conn = get_conn()
    
    sections = []
    total_articles = 0
    seen_titles = set()
    
    for topic in HEADLINE_TOPICS:
        emoji, label = TOPIC_LABELS.get(topic, ('📰', topic.replace('news-', '').title()))
        
        rows = conn.execute("""
            SELECT id, title, clean_title, source, ai_summary, summary, url, date
            FROM articles 
            WHERE topic=? AND word_count > 100
            ORDER BY date DESC LIMIT ?
        """, (topic, MAX_PER_TOPIC + 5)).fetchall()  # fetch extra for dedup
        
        items = []
        for r in rows:
            if len(items) >= MAX_PER_TOPIC:
                break
            
            # Dedup by title
            title_key = re.sub(r'[^a-z0-9]', '', (r['clean_title'] or r['title']).lower())[:60]
            if title_key in seen_titles:
                continue
            seen_titles.add(title_key)
            
            # Use AI summary, fall back to regular summary
            summary = r['ai_summary'] or r['summary'] or ''
            summary = re.sub(r'!\[.*?\]\(.*?\)', '', summary)
            summary = re.sub(r'!\[.*', '', summary)
            summary = re.sub(r'<[^>]+>', '', summary).strip()
            if len(summary) > 220:
                summary = summary[:220].rsplit(' ', 1)[0] + '…'
            
            title = (r['clean_title'] or r['title'] or '')[:80]
            if title.endswith(' - ' + (r['source'] or '')):
                title = title[:-(len(r['source']) + 3)]
            
            article_href = f"articles/{r['id']}.html"
            source = r['source'] or ''
            
            items.append(
                f'<div class="it art"><div>'
                f'<div class="art-sum">{_esc(summary)}</div>'
                f'<a href="{article_href}" class="il">{_esc(title)}</a>'
                f' <span class="sr">{_esc(source)}</span>'
                f'</div></div>'
            )
        
        if items:
            sections.append(f'<div class="tp">{emoji} {label}</div>' + ''.join(items))
            total_articles += len(items)
    
    conn.close()
    return total_articles, ''.join(sections)


def _esc(s):
    """HTML escape."""
    return (s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
             .replace('"', '&quot;').replace("'", '&#x27;'))


def build_home_content():
    """Build the full home-content.html file."""
    conn = get_conn()
    
    # Read the existing file to preserve non-headline sections
    existing = OUTPUT.read_text() if OUTPUT.exists() else ''
    
    # Parse existing file to extract non-headline sections
    # We'll rebuild headlines but keep everything else
    from html.parser import HTMLParser
    
    # For now, read the existing file and just replace the Headlines section
    # We need to preserve: Crypto, City News, About Me, Twitter, Reading, Entertainment
    
    # Build new headlines
    total, headlines_html = build_headline_html()
    
    # Read existing home-content.html and replace just the Headlines section
    if not existing:
        print("  ERROR: No existing home-content.html to update")
        return False
    
    # Find and replace the Headlines section
    # The headlines section starts with: <div class="sec"><div class="sh"...>📰 Headlines
    # and ends before the next </div></div> at the same nesting level
    
    pattern = r'(<div class="sec"><div class="sh"[^>]*>📰 Headlines[^<]*</div><div class="sb">)(.*?)(</div></div>\s*<div class="sec"><div class="sh"[^>]*>🔍)'
    
    new_headlines_section = f'\\1{headlines_html}\\3'
    
    result = re.sub(pattern, new_headlines_section, existing, flags=re.DOTALL)
    
    if result == existing:
        # Fallback: try simpler replacement
        start_marker = '📰 Headlines'
        idx = existing.find(start_marker)
        if idx == -1:
            print("  ERROR: Could not find Headlines section in home-content.html")
            return False
        
        # Find the <div class="sb"> after the header
        sb_start = existing.find('<div class="sb">', idx)
        if sb_start == -1:
            print("  ERROR: Could not find sb div")
            return False
        sb_start += len('<div class="sb">')
        
        # Find the matching closing - look for </div></div> followed by next section
        # The About Me section follows
        next_section = existing.find('<div class="sec"><div class="sh"', sb_start + 10)
        if next_section == -1:
            print("  ERROR: Could not find end of Headlines section")
            return False
        
        # Go back to find </div></div> before next section
        close_idx = existing.rfind('</div></div>', sb_start, next_section)
        if close_idx == -1:
            close_idx = next_section
        
        # Also update the story count in the header
        header_end = existing.find('</div><div class="sb">', idx)
        header_start = existing.rfind('<div class="sh"', 0, header_end + 1)
        
        new_header = f'<div class="sh" onclick="t(this)">📰 Headlines ({total} stories)</div>'
        
        result = (existing[:header_start] + new_header + 
                  '<div class="sb">' + headlines_html + 
                  existing[close_idx:])
    
    OUTPUT.write_text(result)
    print(f"  Built home-content.html with {total} articles")
    return True


def deploy():
    """Deploy updated files to server."""
    files_to_deploy = [
        str(OUTPUT),
    ]
    
    for f in files_to_deploy:
        result = subprocess.run(
            ['scp', '-o', 'ConnectTimeout=10', f, f'{DEPLOY_HOST}:{DEPLOY_PATH}'],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            print(f"  Deployed {Path(f).name}")
        else:
            print(f"  FAILED to deploy {Path(f).name}: {result.stderr}")
            return False
    
    # Also deploy index.html
    index_file = OUTPUT.parent / 'index.html'
    if index_file.exists():
        result = subprocess.run(
            ['scp', '-o', 'ConnectTimeout=10', str(index_file), f'{DEPLOY_HOST}:{DEPLOY_PATH}'],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            print(f"  Deployed index.html")
    
    return True


def run(do_deploy=True, resummarize=False):
    start = datetime.now()
    print(f"📰 Dashboarder Generator — {start.strftime('%Y-%m-%d %H:%M')}")
    print(f"   API: {'Claude API' if API_KEY else 'local summarizer (set ANTHROPIC_API_KEY for AI)'}\n")
    
    ensure_ai_summary_column()
    summarize_articles(force=resummarize)
    
    if build_home_content():
        if do_deploy:
            print("\n── DEPLOY ──")
            deploy()
    
    elapsed = (datetime.now() - start).seconds
    print(f"\n  Done in {elapsed}s")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--no-deploy', action='store_true')
    parser.add_argument('--resummarize', action='store_true')
    args = parser.parse_args()
    run(do_deploy=not args.no_deploy, resummarize=args.resummarize)
