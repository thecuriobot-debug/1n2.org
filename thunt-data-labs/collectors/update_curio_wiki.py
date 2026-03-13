#!/usr/bin/env python3.12
"""
Curio Wiki Auto-Updater
1. Checks for new Curio Cards sales/events from DB
2. Does web searches for recent Curio Cards news
3. Updates existing article data sections
4. Rebuilds wiki index
"""
import sys, os, json, requests, re, sqlite3
from datetime import datetime, date
from pathlib import Path

WIKI_DIR  = Path("/Users/curiobot/Sites/1n2.org/curio-wiki")
DATA_DIR  = WIKI_DIR / "data"
ART_DIR   = WIKI_DIR / "articles"
DB_PATH   = Path("/Users/curiobot/Sites/1n2.org/thunt-data-labs/db/thunt-data-labs.db")
TODAY     = date.today().isoformat()

def get_live_data():
    """Pull latest Curio stats from DB"""
    if not DB_PATH.exists(): return {}
    try:
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        floor = conn.execute("SELECT floor_price_eth FROM curio_prices ORDER BY date DESC LIMIT 1").fetchone()
        sales = conn.execute("SELECT COUNT(*) FROM curio_sales WHERE date(sale_date)>=date('now','-7 days')").fetchone()[0]
        cards = conn.execute("SELECT card_id,name FROM curio_cards ORDER BY card_id").fetchall()
        owners= conn.execute("SELECT COUNT(DISTINCT owner_address) FROM curio_owners").fetchone()[0]
        conn.close()
        return {
            "floor_eth": round(floor[0],4) if floor else None,
            "weekly_sales": sales,
            "total_cards": len(cards),
            "unique_owners": owners,
            "cards": [{"id": c["card_id"], "name": c["name"]} for c in cards],
            "last_updated": TODAY,
        }
    except Exception as e:
        print(f"  ⚠️  DB read: {e}")
        return {}

def search_curio_news():
    """Simple DuckDuckGo search for recent Curio Cards news"""
    results = []
    try:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; 1n2bot/1.0)"}
        r = requests.get(
            "https://html.duckduckgo.com/html/",
            params={"q": f"Curio Cards NFT {date.today().year}", "df": "m"},
            headers=headers, timeout=10
        )
        # Extract result snippets
        links = re.findall(r'class="result__snippet">(.*?)</a>', r.text)
        urls  = re.findall(r'class="result__url".*?>(.*?)</a>', r.text)
        for i, (snippet, url) in enumerate(zip(links[:5], urls[:5])):
            clean = re.sub(r'<[^>]+>', '', snippet).strip()
            if clean and len(clean) > 30:
                results.append({"snippet": clean, "url": url.strip(), "rank": i+1})
        print(f"  Found {len(results)} search results")
    except Exception as e:
        print(f"  ⚠️  Search: {e}")
    return results

def update_live_data_json(live):
    """Update wiki/data/live-data.json"""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    existing = {}
    ldf = DATA_DIR / "live-data.json"
    if ldf.exists():
        try: existing = json.loads(ldf.read_text())
        except: pass
    existing.update(live)
    existing["last_updated"] = TODAY
    ldf.write_text(json.dumps(existing, indent=2))
    print(f"  ✅ wiki/data/live-data.json updated")

def create_news_article(news_items):
    """Create a 'recent news' article if we have search results"""
    if not news_items: return
    today_fmt = datetime.now().strftime("%B %-d, %Y")
    items_html = "\n".join(
        f'<li><a href="https://{n["url"]}" target="_blank">{n["snippet"][:150]}</a></li>'
        for n in news_items
    )
    art_file = ART_DIR / f"news-{TODAY}.html"
    art_file.parent.mkdir(parents=True, exist_ok=True)
    art_file.write_text(f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>Curio Cards News — {today_fmt}</title>
<link rel="stylesheet" href="../style.css">
</head><body>
<p><a href="../index.html">← Curio Wiki</a></p>
<h1>Curio Cards — News Roundup</h1>
<p class="meta">Auto-generated {today_fmt}</p>
<h2>Recent Web Coverage</h2>
<ul>{items_html}</ul>
<p style="color:#666;font-size:.8em">Auto-collected via web search. Links open external sites.</p>
</body></html>""")
    print(f"  ✅ News article: {art_file.name}")

def rebuild_wiki_index(live):
    """Update the wiki landing page stats"""
    index = WIKI_DIR / "index.html"
    if not index.exists(): return
    content = index.read_text()
    # Replace floor price if present
    if live.get("floor_eth"):
        content = re.sub(
            r'Floor:.*?ETH',
            f'Floor: {live["floor_eth"]} ETH',
            content
        )
    # Replace last-updated
    content = re.sub(
        r'last-updated["\s]*>.*?<',
        f'last-updated">{TODAY}<',
        content
    )
    index.write_text(content)
    print(f"  ✅ Wiki index updated")

def run():
    print(f"\n🃏 Curio Wiki Update — {TODAY}")
    live = get_live_data()
    if live:
        print(f"  Floor: {live.get('floor_eth')} ETH | Sales/week: {live.get('weekly_sales')} | Owners: {live.get('unique_owners')}")
        update_live_data_json(live)
        rebuild_wiki_index(live)
    news = search_curio_news()
    create_news_article(news)
    print("  ✅ Curio Wiki update complete")

if __name__ == "__main__":
    run()
