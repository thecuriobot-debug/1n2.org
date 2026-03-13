#!/usr/bin/env python3.12
"""Resolve Google News URLs via StealthyFetcher and extract article text."""
import sqlite3, json, time, sys
import trafilatura

DB = '/Users/curiobot/Sites/1n2.org/thunt-data-labs/db/thunt-data-labs.db'

conn = sqlite3.connect(DB, timeout=30)
cols = [r[1] for r in conn.execute("PRAGMA table_info(articles)")]
if 'resolved_url' not in cols:
    conn.execute("ALTER TABLE articles ADD COLUMN resolved_url TEXT")
    conn.commit()

rows = conn.execute("""SELECT id, url, title, source FROM articles 
    WHERE text_content IS NULL AND url LIKE '%news.google.com%'
    ORDER BY date DESC LIMIT 500""").fetchall()
conn.close()

print(f"Resolving {len(rows)} URLs...", flush=True)

from scrapling.fetchers import StealthyFetcher
fetched = 0

for i, (aid, url, title, source) in enumerate(rows):
    try:
        page = StealthyFetcher.fetch(url, headless=True, timeout=12000, network_idle=True)
        if not page: continue
        final_url = str(page.url) if hasattr(page, 'url') else ''
        if not final_url or 'google' in final_url: continue
        
        html = trafilatura.fetch_url(final_url)
        if not html: continue
        result = trafilatura.extract(html, include_images=True, output_format='json', favor_precision=True)
        if not result: continue
        data = json.loads(result)
        text = data.get('text', '')
        if len(text) < 100: continue
        
        c = sqlite3.connect(DB, timeout=30)
        c.execute("""UPDATE articles SET text_content=?, summary=?, author=?, 
            image_url=?, word_count=?, resolved_url=?, fetched_at=datetime('now') WHERE id=?""",
            (text[:10000], (data.get('description') or text[:250])[:300],
             (data.get('author') or '')[:200], data.get('image') or '', len(text.split()), final_url, aid))
        c.commit()
        c.close()
        fetched += 1
        
        if (i+1) % 10 == 0:
            c2 = sqlite3.connect(DB, timeout=30)
            tw = c2.execute("SELECT COUNT(*) FROM articles WHERE word_count > 0").fetchone()[0]
            c2.close()
            print(f"  [{i+1}/{len(rows)}] +{fetched} total_with_text={tw}", flush=True)
    except Exception as e:
        pass

c3 = sqlite3.connect(DB, timeout=30)
tw = c3.execute("SELECT COUNT(*) FROM articles WHERE word_count > 0").fetchone()[0]
wd = c3.execute("SELECT COALESCE(SUM(word_count),0) FROM articles WHERE word_count > 0").fetchone()[0]
c3.close()
print(f"\nDone! +{fetched} articles. Total with text: {tw} ({wd:,} words)", flush=True)
