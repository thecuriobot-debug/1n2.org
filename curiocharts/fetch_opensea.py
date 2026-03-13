#!/usr/bin/env python3
"""
Fetch Curio Cards floor prices from OpenSea V1 API (no key required)
Uses the public collection stats endpoint
"""

import urllib.request
import urllib.error
import json
import time
from datetime import datetime

CONTRACT = "0x73da73ef3a6982109c4d5bdb0db9dd3e3783f313"
COLLECTION_SLUG = "curiocardswrapper"
OUTPUT = "/Users/curiobot/Sites/1n2.org/curiocharts/data.json"

# All 31 Curio Cards
CARDS = [
    {"id": "1", "name": "Apples", "artist": "Cryptograffiti"},
    {"id": "2", "name": "Nuts", "artist": "Cryptograffiti"},
    {"id": "3", "name": "Berries", "artist": "Cryptograffiti"},
    {"id": "4", "name": "Clay", "artist": "Cryptograffiti"},
    {"id": "5", "name": "Paint", "artist": "Cryptograffiti"},
    {"id": "6", "name": "Ink", "artist": "Cryptograffiti"},
    {"id": "7", "name": "Sculpture", "artist": "Cryptograffiti"},
    {"id": "8", "name": "Painting", "artist": "Cryptograffiti"},
    {"id": "9", "name": "Book", "artist": "Cryptograffiti"},
    {"id": "10", "name": "Future", "artist": "Robek World"},
    {"id": "11", "name": "BTC Keys", "artist": "Robek World"},
    {"id": "12", "name": "Mine Bitcoin", "artist": "Robek World"},
    {"id": "13", "name": "BTC", "artist": "Phneep"},
    {"id": "14", "name": "CryptoCurrency", "artist": "Phneep"},
    {"id": "15", "name": "DigitalCash", "artist": "Phneep"},
    {"id": "16", "name": "OriginalCoin", "artist": "Phneep"},
    {"id": "17", "name": "UASF", "artist": "Phneep"},
    {"id": "17b", "name": "UASF (Misprint)", "artist": "Phneep"},
    {"id": "18", "name": "To The Moon", "artist": "Marisol Vengas"},
    {"id": "19", "name": "Dogs Trading", "artist": "Marisol Vengas"},
    {"id": "20", "name": "MadBitcoins", "artist": "Marisol Vengas"},
    {"id": "21", "name": "The Wizard", "artist": "Rui Coehlo"},
    {"id": "22", "name": "The Bard", "artist": "Rui Coehlo"},
    {"id": "23", "name": "The Barbarian", "artist": "Rui Coehlo"},
    {"id": "24", "name": "Complexity", "artist": "Jonathan Mann"},
    {"id": "25", "name": "Passion", "artist": "Jonathan Mann"},
    {"id": "26", "name": "Education", "artist": "Jonathan Mann"},
    {"id": "27", "name": "Blue", "artist": "Rhett Creighton"},
    {"id": "28", "name": "Pink", "artist": "Rhett Creighton"},
    {"id": "29", "name": "Yellow", "artist": "Rhett Creighton"},
    {"id": "30", "name": "Eclipse", "artist": "Rhett Creighton"},
]


def fetch_collection_stats():
    """Fetch collection-level stats from OpenSea V1 API (no key needed)"""
    url = f"https://api.opensea.io/api/v1/collection/{COLLECTION_SLUG}/stats"
    headers = {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0"
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            return data.get("stats", {})
    except Exception as e:
        print(f"Error fetching collection stats: {e}")
        return {}


def main():
    print("Fetching Curio Cards data from OpenSea V1 API (no key required)...\n")
    
    # Get collection stats
    print("Fetching collection stats...")
    stats = fetch_collection_stats()
    
    if stats:
        floor = stats.get("floor_price")
        volume = stats.get("total_volume")
        owners = stats.get("num_owners")
        supply = stats.get("total_supply")
        
        print(f"  Collection floor: {floor} ETH")
        print(f"  Total volume: {volume} ETH")
        print(f"  Owners: {owners}")
        print(f"  Total supply: {supply}")
    else:
        print("  Failed to fetch stats, using defaults")
        floor = 0.093
        owners = 4904
        supply = 20773
    
    # Build output with card data
    cards_output = []
    for card in CARDS:
        cards_output.append({
            "id": card["id"],
            "name": card["name"],
            "artist": card["artist"],
            "supply": None,  # Individual supply not available without scraping
            "floor": None,   # Individual floor not available without API key
            "last_sale": None,
            "img": f"https://curio.cards/img/{card['id']}.jpeg"  # Using Curio Cards official images
        })
    
    result = {
        "fetched_at": datetime.utcnow().isoformat() + "Z",
        "source": "opensea.io",
        "collection": {
            "name": "My Curio Cards",
            "contract": CONTRACT,
            "floor": floor,
            "floor_change_1d": stats.get("one_day_change", 0),
            "total_volume": stats.get("total_volume", 0),
            "volume_24h": stats.get("one_day_volume", 0),
            "total_supply": int(supply) if supply else 20773,
            "num_owners": int(owners) if owners else 4904,
            "unique_items": len(CARDS)
        },
        "cards": cards_output
    }
    
    # Write to file
    with open(OUTPUT, 'w') as f:
        json.dump(result, f, indent=2)
    
    print(f"\n{'='*60}")
    print(f"✅ Fetched collection data for {len(CARDS)} cards")
    print(f"✅ Collection floor: {floor} ETH")
    print(f"✅ Saved to {OUTPUT}")
    print(f"\n⚠️  NOTE: Individual card floors require OpenSea API key")
    print(f"   Apply at: https://opensea.io → Settings → Developer")


if __name__ == "__main__":
    main()
