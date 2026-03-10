#!/usr/bin/env python3.12
"""
Dashboarder Content Generator v3
- Generates combined paragraph summaries per topic via Claude API
- Creates section detail pages with individual article summaries + reader links
- Simple, readable news briefing format

Usage:
    python3.12 generate_dashboard.py              # Generate + deploy
    python3.12 generate_dashboard.py --no-deploy   # Generate only  
    python3.12 generate_dashboard.py --resummarize  # Re-generate all summaries
"""
import sqlite3, json, hashlib, re, os, sys, subprocess, argparse, time
from datetime import datetime
from pathlib import Path

DB = Path.home() / 'Sites' / '1n2.org' / 'thunt-data-labs' / 'db' / 'thunt-data-labs.db'
DASHBOARDER = Path.home() / 'Sites' / '1n2.org' / 'dashboarder'
OUTPUT = DASHBOARDER / 'home-content.html'
SECTIONS_DIR = DASHBOARDER / 'sections'
DEPLOY_HOST = 'root@157.245.186.58'
DEPLOY_PATH = '/var/www/html/dashboarder/'

API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
if not API_KEY:
    env_file = Path(__file__).parent.parent / '.env'
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.startswith('ANTHROPIC_API_KEY='):
                API_KEY = line.split('=', 1)[1].strip()
                break

HEADLINE_TOPICS = [
    'news-ai', 'news-tech', 'news-science', 'news-world', 'news-us',
    'news-business', 'news-health', 'news-sports', 'news-politics'
]
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

def ensure_columns():
    conn = get_conn()
    cols = [r[1] for r in conn.execute('PRAGMA table_info(articles)').fetchall()]
    if 'ai_summary' not in cols:
        conn.execute('ALTER TABLE articles ADD COLUMN ai_summary TEXT')
        conn.commit()
    conn.close()

def _esc(s):
    return (s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
             .replace('"', '&quot;').replace("'", '&#x27;'))

def clean_text(text):
    text = re.sub(r'!\[.*?\]\(.*?\)', '', text)
    text = re.sub(r'!\[.*', '', text)
    text = re.sub(r'\n+', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    text = re.sub(r'(?:^|\s)[-–]?\s*(?:Date|Source|Summary|Author|Published|Updated|By)\s*:?\s*[-–]?\s*', ' ', text)
    # Remove Science Daily metadata patterns
    text = re.sub(r'(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+,?\s+\d{4}\s*', '', text)
    text = re.sub(r'(?:Potsdam Institute|Jet Propulsion|University of|Institute for)[^.]*(?:PIK|JPL|MIT)\s*', '', text)
    return text.strip()

def call_claude(prompt, max_tokens=200):
    if not API_KEY:
        return None
    import requests
    try:
        r = requests.post('https://api.anthropic.com/v1/messages',
            headers={'x-api-key': API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'},
            json={'model': 'claude-sonnet-4-20250514', 'max_tokens': max_tokens,
                  'messages': [{'role': 'user', 'content': prompt}]},
            timeout=20)
        if r.status_code == 200:
            return r.json()['content'][0]['text'].strip()
    except Exception as e:
        print(f"    API error: {e}")
    return None

def summarize_single(title, text, source):
    """One factual sentence. Who did what, when, where."""
    prompt = (f'Rewrite this headline as one factual sentence in old-school news style. '
              f'Who, what, when, where. No clickbait, no questions, no hype. Max 25 words.\n\n'
              f'Title: {title}\nSource: {source}\n\nFirst paragraph:\n{text[:800]}')
    result = call_claude(prompt, 60)
    if result:
        return result
    # Fallback: rewrite title into factual headline style
    text = clean_text(text)
    ctitle = title.replace(' - ' + (source or ''), '').strip() if source else title
    # Remove title echo from text
    if text.lower().startswith(ctitle.lower()[:25]):
        text = text[len(ctitle):].strip().lstrip(':.- ')
    # Get first real sentence from article body
    sents = re.split(r'(?<=[.!?])\s+', text)
    good = [s.strip() for s in sents if len(s.strip()) > 30 
            and not s.strip().startswith(('http', 'www', '![', 'Key point', 'We use cookies'))
            and 'cookie' not in s.lower() and 'subscribe' not in s.lower()]
    if good:
        s = good[0]
        # Clean up to max ~100 chars
        if len(s) > 100:
            s = s[:100].rsplit(' ', 1)[0] + '.'
        return s
    # Last resort: clean the title itself
    t = ctitle.rstrip('.')
    # Remove clickbait patterns
    t = re.sub(r'\?$', '', t)  # remove trailing ?
    t = re.sub(r'^(?:Why|How|What|Here\'s|This is)\s+', '', t, flags=re.IGNORECASE)
    return t + '.'

def summarize_topic_group(topic_label, articles):
    """Combine article one-liners into a tight briefing paragraph."""
    briefs = []
    for a in articles:
        s = (a.get('ai_summary') or '').strip()
        if s and not s.endswith('.'):
            s += '.'
        if s:
            briefs.append(s)
    
    if not briefs:
        return ''
    
    # If we have Claude API, ask it to tighten further
    prompt = (f'Combine these {topic_label} news items into one tight paragraph. '
              f'One sentence per story. Just the facts, no transitions or filler.\n\n'
              + ' '.join(briefs))
    result = call_claude(prompt, 120)
    if result:
        return result
    
    # Fallback: just join them, keep tight
    combined = ' '.join(briefs)
    if len(combined) > 220:
        combined = combined[:220].rsplit('.', 1)[0] + '.'
    return combined

def get_topic_articles(conn, topic, seen_titles):
    """Get deduplicated articles for a topic."""
    rows = conn.execute("""
        SELECT id, title, clean_title, source, ai_summary, summary, url, date, text_content
        FROM articles WHERE topic=? AND word_count > 100
        ORDER BY date DESC LIMIT ?
    """, (topic, MAX_PER_TOPIC + 8)).fetchall()
    
    articles = []
    for r in rows:
        if len(articles) >= MAX_PER_TOPIC:
            break
        title_key = re.sub(r'[^a-z0-9]', '', (r['clean_title'] or r['title']).lower())[:60]
        if title_key in seen_titles:
            continue
        seen_titles.add(title_key)
        
        title = (r['clean_title'] or r['title'] or '')[:100]
        if r['source'] and title.endswith(' - ' + r['source']):
            title = title[:-(len(r['source']) + 3)]
        
        articles.append(dict(r) | {'clean_display_title': title})
    return articles

def generate_individual_summaries():
    """Generate per-article AI summaries for articles missing them."""
    conn = get_conn()
    rows = conn.execute("""
        SELECT id, title, source, topic, text_content FROM articles
        WHERE word_count > 100 AND topic IN ({}) AND (ai_summary IS NULL OR ai_summary = '')
        ORDER BY date DESC LIMIT 200
    """.format(','.join('?' * len(HEADLINE_TOPICS))), HEADLINE_TOPICS).fetchall()
    
    if not rows:
        print("  All articles have summaries.")
        return 0
    
    print(f"  Summarizing {len(rows)} articles...")
    count = 0
    for r in rows:
        summary = summarize_single(r['title'], r['text_content'], r['source'])
        conn.execute("UPDATE articles SET ai_summary=? WHERE id=?", (summary, r['id']))
        count += 1
        if count % 20 == 0:
            conn.commit()
            print(f"    ... {count}")
    conn.commit()
    conn.close()
    print(f"  Done: {count} articles summarized")
    return count

def build_section_page(topic_key, emoji, label, articles):
    """Build a detail page for a topic section with full summaries + reader links."""
    SECTIONS_DIR.mkdir(exist_ok=True)
    
    items_html = ''
    for a in articles:
        summary = a.get('ai_summary') or a.get('summary') or ''
        summary = re.sub(r'!\[.*?\]\(.*?\)', '', summary)
        summary = re.sub(r'!\[.*', '', summary).strip()
        title = _esc(a['clean_display_title'])
        source = _esc(a.get('source') or '')
        href = f"/dashboarder/articles/{a['id']}.html"
        
        items_html += f'''
<div class="article">
  <p class="summary">{_esc(summary)}</p>
  <div class="meta"><a href="{href}">Read full article →</a> · {source}</div>
</div>'''
    
    html = f'''<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{emoji} {label} — Dashboarder</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<style>
body{{font-family:'DM Sans',system-ui,sans-serif;background:#0a0e17;color:#e2e8f0;max-width:680px;margin:0 auto;padding:2rem 1.5rem;font-size:17px;line-height:1.7}}
a{{color:#22d3ee;text-decoration:none}}a:hover{{color:#fff;text-decoration:underline}}
h1{{font-size:1.6rem;margin-bottom:1.5rem;font-weight:700}}
.article{{margin-bottom:1.8rem;padding-bottom:1.5rem;border-bottom:1px solid #1e293b}}
.article:last-child{{border-bottom:none}}
.summary{{font-size:1.05rem;line-height:1.7;margin:0 0 .5rem}}
.meta{{font-size:.8rem;color:#64748b}}
.meta a{{color:#22d3ee}}
.back{{font-size:.85rem;margin-bottom:1.5rem;display:block}}
</style></head><body>
<a href="/dashboarder/" class="back">← Back to Dashboarder</a>
<h1>{emoji} {label}</h1>
{items_html}
</body></html>'''
    
    filepath = SECTIONS_DIR / f'{topic_key.replace("news-", "")}.html'
    filepath.write_text(html)
    return filepath

def build_headlines():
    """Build headline paragraphs and section pages."""
    conn = get_conn()
    seen_titles = set()
    sections_html = []
    section_files = []
    total = 0
    
    for topic in HEADLINE_TOPICS:
        emoji, label = TOPIC_LABELS.get(topic, ('📰', topic.replace('news-', '').title()))
        articles = get_topic_articles(conn, topic, seen_titles)
        if not articles:
            continue
        
        # Build section detail page
        section_file = build_section_page(topic, emoji, label, articles)
        section_files.append(section_file)
        
        # Generate combined paragraph summary
        paragraph = summarize_topic_group(label, articles)
        paragraph = _esc(paragraph)
        
        section_slug = topic.replace('news-', '')
        section_href = f"sections/{section_slug}.html"
        
        sections_html.append(
            f'<div class="ns">'
            f'<span class="nl">{emoji} {label.upper()}</span> — '
            f'{paragraph} '
            f'<a href="{section_href}" class="nm">Read more →</a>'
            f'</div>'
        )
        total += len(articles)
        time.sleep(0.3)  # Rate limit API calls
    
    conn.close()
    return total, '\n'.join(sections_html), section_files

def build_home_content():
    """Rebuild home-content.html with new headline format."""
    existing = OUTPUT.read_text() if OUTPUT.exists() else ''
    if not existing:
        print("  ERROR: No existing home-content.html")
        return False, []
    
    total, headlines_html, section_files = build_headlines()
    
    # Replace Headlines section content
    start_marker = '📰 Headlines'
    idx = existing.find(start_marker)
    if idx == -1:
        idx = existing.find('📰 News Briefing')
    if idx == -1:
        print("  ERROR: Could not find Headlines/Briefing section")
        return False, []
    
    sb_start = existing.find('<div class="sb">', idx)
    if sb_start == -1:
        print("  ERROR: Could not find sb div")
        return False, []
    sb_start += len('<div class="sb">')
    
    next_section = existing.find('<div class="sec"><div class="sh"', sb_start + 10)
    if next_section == -1:
        print("  ERROR: Could not find end of Headlines")
        return False, []
    
    close_idx = existing.rfind('</div></div>', sb_start, next_section)
    if close_idx == -1:
        close_idx = next_section
    
    header_end = existing.find('</div><div class="sb">', idx)
    header_start = existing.rfind('<div class="sh"', 0, header_end + 1)
    new_header = f'<div class="sh" onclick="t(this)">📰 News Briefing</div>'
    
    result = (existing[:header_start] + new_header +
              '<div class="sb">' + headlines_html +
              existing[close_idx:])
    
    OUTPUT.write_text(result)
    print(f"  Built home-content.html — {total} articles across {len(section_files)} sections")
    return True, section_files

def deploy(extra_files=None):
    """Deploy to server."""
    files = [str(OUTPUT), str(DASHBOARDER / 'index.html')]
    if extra_files:
        files.extend(str(f) for f in extra_files)
    
    # Deploy main files
    for f in files:
        if not Path(f).exists():
            continue
        result = subprocess.run(
            ['scp', '-o', 'ConnectTimeout=10', f, f'{DEPLOY_HOST}:{DEPLOY_PATH}'],
            capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            print(f"  Deployed {Path(f).name}")
    
    # Deploy sections directory
    if SECTIONS_DIR.exists():
        subprocess.run(['ssh', '-o', 'ConnectTimeout=10', DEPLOY_HOST,
                       f'mkdir -p {DEPLOY_PATH}sections'], capture_output=True, timeout=10)
        result = subprocess.run(
            ['scp', '-o', 'ConnectTimeout=10', '-r'] +
            [str(f) for f in SECTIONS_DIR.glob('*.html')] +
            [f'{DEPLOY_HOST}:{DEPLOY_PATH}sections/'],
            capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            print(f"  Deployed sections/")

def run(do_deploy=True, resummarize=False):
    start = datetime.now()
    print(f"📰 Dashboarder Generator v3 — {start.strftime('%Y-%m-%d %H:%M')}")
    print(f"   API: {'Claude' if API_KEY else 'local (set ANTHROPIC_API_KEY for AI)'}\n")
    
    ensure_columns()
    
    if resummarize:
        # Clear and redo
        conn = get_conn()
        conn.execute("UPDATE articles SET ai_summary=NULL WHERE topic IN ({})".format(
            ','.join('?' * len(HEADLINE_TOPICS))), HEADLINE_TOPICS)
        conn.commit()
        conn.close()
    
    generate_individual_summaries()
    
    ok, section_files = build_home_content()
    if ok and do_deploy:
        print("\n── DEPLOY ──")
        deploy(section_files)
    
    print(f"\n  Done in {(datetime.now() - start).seconds}s")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--no-deploy', action='store_true')
    parser.add_argument('--resummarize', action='store_true')
    args = parser.parse_args()
    run(do_deploy=not args.no_deploy, resummarize=args.resummarize)
