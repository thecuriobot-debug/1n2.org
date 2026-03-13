#!/usr/bin/env python3.12
"""
Data Labs — export_apps.py
Generates fresh data-driven content for Curio Archive, Curio Atlas,
Curio Oracle, Curio Hub, and MadWikipedia from the central DB.
Run after collect_all.py in the cron pipeline.
"""
import sys, os, json, time
from datetime import datetime
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'db'))
from database import get_conn

HOME = Path.home()
SITES = HOME / "Sites" / "1n2.org"
TODAY = datetime.now().strftime("%Y-%m-%d")

# ═══════════════════════════════════════
# CURIO ARCHIVE — inject live holder/sales data into each card page
# ═══════════════════════════════════════
def export_curio_archive():
    print("  📚 Curio Archive...")
    conn = get_conn()
    cards = []
    for card in conn.execute("SELECT * FROM curio_cards ORDER BY card_id"):
        cid = card["card_id"]
        holders = conn.execute("SELECT COUNT(DISTINCT owner_address) FROM curio_owners WHERE card_id=? AND quantity>0", (cid,)).fetchone()[0]
        total_qty = conn.execute("SELECT COALESCE(SUM(quantity),0) FROM curio_owners WHERE card_id=?", (cid,)).fetchone()[0]
        sales = conn.execute("SELECT COUNT(*) FROM curio_sales WHERE card_id=?", (cid,)).fetchone()[0]
        last_sale = conn.execute("SELECT price_eth, sale_date FROM curio_sales WHERE card_id=? ORDER BY sale_date DESC LIMIT 1", (cid,)).fetchone()
        top_holders = [{"addr":r[0][:8]+"...","qty":r[1]} for r in conn.execute("SELECT owner_address, quantity FROM curio_owners WHERE card_id=? AND quantity>0 ORDER BY quantity DESC LIMIT 5", (cid,))]
        cards.append({
            "id": cid, "name": card["name"], "image": card["image_url"],
            "holders": holders, "total_supply": total_qty, "sales": sales,
            "last_sale_eth": last_sale["price_eth"] if last_sale else None,
            "last_sale_date": last_sale["sale_date"] if last_sale else None,
            "top_holders": top_holders,
        })
    # Floor price
    price = conn.execute("SELECT floor_price_eth FROM curio_prices ORDER BY date DESC LIMIT 1").fetchone()
    total_holders = conn.execute("SELECT COUNT(DISTINCT owner_address) FROM curio_owners WHERE quantity>0").fetchone()[0]
    total_transfers = conn.execute("SELECT COUNT(*) FROM curio_transfers").fetchone()[0]
    
    out = {
        "updated": TODAY, "floor_eth": price["floor_price_eth"] if price else 0,
        "total_holders": total_holders, "total_transfers": total_transfers,
        "total_sales": conn.execute("SELECT COUNT(*) FROM curio_sales").fetchone()[0],
        "cards": cards,
    }
    conn.close()
    dest = SITES / "curioarchive" / "data"
    dest.mkdir(exist_ok=True)
    (dest / "live-data.json").write_text(json.dumps(out, indent=2, default=str))
    print(f"    {len(cards)} cards, {total_holders} holders → live-data.json")
    return len(cards)

# ═══════════════════════════════════════
# CURIO ATLAS — ownership network data for visualization
# ═══════════════════════════════════════
def export_curio_atlas():
    print("  🗺 Curio Atlas...")
    conn = get_conn()
    # Top wallets (whales)
    whales = [{"addr":r[0],"cards":r[1],"total_qty":r[2]} for r in conn.execute("""
        SELECT owner_address, COUNT(DISTINCT card_id), SUM(quantity)
        FROM curio_owners WHERE quantity>0
        GROUP BY owner_address ORDER BY COUNT(DISTINCT card_id) DESC LIMIT 50""")]
    # Card distribution
    distribution = []
    for card in conn.execute("SELECT card_id, name FROM curio_cards ORDER BY card_id"):
        holders = conn.execute("SELECT COUNT(DISTINCT owner_address) FROM curio_owners WHERE card_id=? AND quantity>0", (card["card_id"],)).fetchone()[0]
        distribution.append({"id":card["card_id"],"name":card["name"],"holders":holders})
    # Recent transfers
    transfers = [{"tx":r["tx_hash"][:12],"from":r["from_addr"][:10],"to":r["to_addr"][:10],"card":r["card_id"],"date":r["transfer_date"]}
        for r in conn.execute("SELECT * FROM curio_transfers ORDER BY transfer_date DESC LIMIT 100")]
    out = {"updated":TODAY,"whales":whales,"distribution":distribution,"transfers":transfers,
           "total_wallets":conn.execute("SELECT COUNT(DISTINCT owner_address) FROM curio_owners WHERE quantity>0").fetchone()[0]}
    conn.close()
    dest = SITES / "curio-atlas" / "data"
    dest.mkdir(exist_ok=True)
    (dest / "network.json").write_text(json.dumps(out, indent=2, default=str))
    print(f"    {len(whales)} whales, {len(transfers)} transfers → network.json")
    return len(whales)

# ═══════════════════════════════════════
# CURIO HUB — unified dashboard data
# ═══════════════════════════════════════
def export_curio_hub():
    print("  🎯 Curio Hub...")
    conn = get_conn()
    out = {
        "updated": TODAY,
        "market": {
            "floor": conn.execute("SELECT floor_price_eth FROM curio_prices ORDER BY date DESC LIMIT 1").fetchone()[0] or 0,
            "holders": conn.execute("SELECT COUNT(DISTINCT owner_address) FROM curio_owners WHERE quantity>0").fetchone()[0],
            "total_sales": conn.execute("SELECT COUNT(*) FROM curio_sales").fetchone()[0],
            "total_transfers": conn.execute("SELECT COUNT(*) FROM curio_transfers").fetchone()[0],
        },
        "youtube": {
            "total_videos": conn.execute("SELECT COUNT(*) FROM yt_videos").fetchone()[0],
            "total_comments": conn.execute("SELECT COUNT(*) FROM yt_comments").fetchone()[0],
            "channels": [{"name":r["name"],"vids":conn.execute("SELECT COUNT(*) FROM yt_videos WHERE channel_id=?", (r["channel_id"],)).fetchone()[0]} for r in conn.execute("SELECT * FROM yt_channels")],
        },
        "content": {
            "articles": conn.execute("SELECT COUNT(*) FROM articles").fetchone()[0],
            "tweets": conn.execute("SELECT COUNT(*) FROM tweets").fetchone()[0],
            "wiki_articles": 27,
        },
        "price_history": [{"date":r["date"],"floor":r["floor_price_eth"]} for r in conn.execute("SELECT * FROM curio_prices ORDER BY date DESC LIMIT 30")],
    }
    conn.close()
    dest = SITES / "curiohub" / "data"
    dest.mkdir(exist_ok=True)
    (dest / "hub-data.json").write_text(json.dumps(out, indent=2, default=str))
    print(f"    Hub data exported")
    return 1

# ═══════════════════════════════════════
# MADWIKIPEDIA — inject recent activity into articles
# ═══════════════════════════════════════
def export_madwikipedia():
    print("  📖 MadWikipedia...")
    conn = get_conn()
    channels = {}
    for ch in conn.execute("SELECT * FROM yt_channels"):
        cid = ch["channel_id"]
        recent_vids = [{"title":r["title"],"id":r["video_id"],"views":r["view_count"],"comments":r["comment_count"],"date":r["published_at"][:10] if r["published_at"] else ""}
            for r in conn.execute("SELECT * FROM yt_videos WHERE channel_id=? ORDER BY published_at DESC LIMIT 10", (cid,))]
        top_commented = [{"title":r["title"],"id":r["video_id"],"comments":r["comment_count"],"views":r["view_count"]}
            for r in conn.execute("SELECT * FROM yt_videos WHERE channel_id=? ORDER BY comment_count DESC LIMIT 5", (cid,))]
        top_commenters = [{"name":r[0],"count":r[1]}
            for r in conn.execute("SELECT author_name, COUNT(*) as c FROM yt_comments WHERE channel_id=? GROUP BY author_name ORDER BY c DESC LIMIT 10", (cid,))]
        channels[ch["name"]] = {
            "id":cid, "subscribers":ch["subscribers"], "video_count":ch["video_count"],
            "total_comments_db": conn.execute("SELECT COUNT(*) FROM yt_comments WHERE channel_id=?", (cid,)).fetchone()[0],
            "recent_videos": recent_vids, "top_commented": top_commented, "top_commenters": top_commenters,
        }
    # Curio data for the wiki
    curio = {
        "floor": conn.execute("SELECT floor_price_eth FROM curio_prices ORDER BY date DESC LIMIT 1").fetchone()[0] or 0,
        "holders": conn.execute("SELECT COUNT(DISTINCT owner_address) FROM curio_owners WHERE quantity>0").fetchone()[0],
        "total_sales": conn.execute("SELECT COUNT(*) FROM curio_sales").fetchone()[0],
    }
    out = {"updated":TODAY, "channels":channels, "curio":curio}
    conn.close()
    dest = SITES / "thunt-wiki" / "data"
    dest.mkdir(exist_ok=True)
    (dest / "live-data.json").write_text(json.dumps(out, indent=2, default=str))
    print(f"    {len(channels)} channels → live-data.json")
    return len(channels)

# ═══════════════════════════════════════
# CURIO ORACLE — fresh briefing data for predictions
# ═══════════════════════════════════════
def export_curio_oracle():
    print("  🔮 Curio Oracle...")
    conn = get_conn()
    prices = [{"date":r["date"],"floor":r["floor_price_eth"]} for r in conn.execute("SELECT * FROM curio_prices ORDER BY date")]
    recent_sales = [{"tx":r["tx_hash"][:12],"card":r["card_id"],"eth":r["price_eth"],"date":r["sale_date"],"marketplace":r["marketplace"]}
        for r in conn.execute("SELECT * FROM curio_sales ORDER BY sale_date DESC LIMIT 20")]
    holder_trend = conn.execute("SELECT COUNT(DISTINCT owner_address) FROM curio_owners WHERE quantity>0").fetchone()[0]
    transfer_velocity = conn.execute("SELECT COUNT(*) FROM curio_transfers WHERE transfer_date>=date('now','-7 days')").fetchone()[0]
    out = {
        "updated": TODAY,
        "prices": prices,
        "recent_sales": recent_sales,
        "holder_count": holder_trend,
        "weekly_transfers": transfer_velocity,
        "total_transfers": conn.execute("SELECT COUNT(*) FROM curio_transfers").fetchone()[0],
        "total_sales": conn.execute("SELECT COUNT(*) FROM curio_sales").fetchone()[0],
    }
    conn.close()
    dest = SITES / "curio-oracle" / "data"
    dest.mkdir(exist_ok=True)
    (dest / "oracle-data.json").write_text(json.dumps(out, indent=2, default=str))
    print(f"    {len(prices)} price points, {len(recent_sales)} recent sales → oracle-data.json")
    return len(prices)

# ═══════════════════════════════════════
# MAIN
# ═══════════════════════════════════════
def run_all():
    print(f"\n📤 EXPORT APPS — {TODAY}")
    export_curio_archive()
    export_curio_atlas()
    export_curio_hub()
    export_madwikipedia()
    export_curio_oracle()
    print("  ✅ All app exports done")

if __name__ == "__main__":
    run_all()
