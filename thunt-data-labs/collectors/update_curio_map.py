#!/usr/bin/env python3.12
"""
Curio Map Daily Updater
Refreshes holder geographic distribution data from Alchemy + ENS
"""
import os, json, requests, sqlite3
from datetime import datetime, date
from pathlib import Path

MAP_DIR  = Path("/Users/curiobot/Sites/1n2.org/curio-map")
DB_PATH  = Path("/Users/curiobot/Sites/1n2.org/thunt-data-labs/db/thunt-data-labs.db")
ALCHEMY  = os.environ.get("ALCHEMY_API_KEY","_rPKuMfB0FeN5MwCpSEHjb4wTm5WYjwB")
CONTRACT = "0x73DA73EF3a6982109c4d5BDb0dB9dd3E3783f313"
TODAY    = date.today().isoformat()

def get_owners_from_db():
    """Get all known owner addresses from DB"""
    if not DB_PATH.exists(): return []
    conn = sqlite3.connect(str(DB_PATH))
    rows = conn.execute("SELECT DISTINCT owner_address FROM curio_owners WHERE owner_address NOT LIKE '0x000%'").fetchall()
    conn.close()
    return [r[0] for r in rows]

def fetch_new_holders():
    """Fetch current holders from Alchemy"""
    holders = set()
    try:
        url = f"https://eth-mainnet.g.alchemy.com/nft/v3/{ALCHEMY}/getOwnersForContract"
        r = requests.get(url, params={"contractAddress": CONTRACT, "withTokenBalances": "false"}, timeout=20)
        data = r.json()
        for addr in data.get("owners", []):
            holders.add(addr.lower())
        print(f"  Fetched {len(holders)} holders from Alchemy")
    except Exception as e:
        print(f"  ⚠️  Alchemy: {e}")
    return list(holders)

def update_map_data(holders):
    """Update all-maps-data.json with fresh holder count"""
    map_file = MAP_DIR / "all-maps-data.json"
    data = {}
    if map_file.exists():
        try: data = json.loads(map_file.read_text())
        except: pass

    data["total_holders"]     = len(holders)
    data["last_updated"]      = TODAY
    data["holder_count"]      = len(holders)
    data["sample_addresses"]  = holders[:50]  # Store sample for map rendering

    map_file.write_text(json.dumps(data, indent=2))
    print(f"  ✅ all-maps-data.json: {len(holders)} holders")

    # Update apple-map-data.json too
    apple = MAP_DIR / "apple-map-data.json"
    apple_data = {}
    if apple.exists():
        try: apple_data = json.loads(apple.read_text())
        except: pass
    apple_data["holder_count"] = len(holders)
    apple_data["last_updated"] = TODAY
    apple.write_text(json.dumps(apple_data, indent=2))

def run():
    print(f"\n🗺️  Curio Map Update — {TODAY}")
    holders = fetch_new_holders()
    if not holders:
        holders = get_owners_from_db()
        print(f"  Using DB fallback: {len(holders)} holders")
    update_map_data(holders)
    print("  ✅ Curio Map update complete")

if __name__ == "__main__":
    run()
