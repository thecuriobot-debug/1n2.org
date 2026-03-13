#!/usr/bin/env python3
"""Fetch Curio Cards data from OpenSea collection API (no key required for public data)"""

import urllib.request
import urllib.error
import json
import time
from datetime import datetime

CONTRACT = "0x73da73ef3a6982109c4d5bdb0db9dd3e3783f313"
OUTPUT = "/Users/curiobot/Sites/1n2.org/curiocharts/data.json"

# All 31 Curio Cards (including 17b)
CARDS = [
    {"id": "1", "name": "Apples", "token_id": 1},
    {"id": "2", "name": "Nuts", "token_id": 2},
    {"id": "3", "name": "Berries", "token_id": 3},
    {"id": "4", "name": "Clay", "token_id": 4},
    {"id": "5", "name": "Paint", "token_id": 5},
    {"id": "6", "name": "Ink", "token_id": 6},
    {"id": "7", "name": "Sculpture", "token_id": 7},
    {"id": "8", "name": "Painting", "token_id": 8},
    {"id": "9", "name": "Book", "token_id": 9},
    {"id": "10", "name": "Future", "token_id": 10},
    {"id": "11", "name": "BTC Keys", "token_id": 11},
    {"id": "12", "name": "Mine Bitcoin", "token_id": 12},
    {"id": "13", "name": "BTC", "token_id": 13},
    {"id": "14", "name": "CryptoCurrency", "token_id": 14},
    {"id": "15", "name": "DigitalCash", "token_id": 15},
    {"id": "16", "name": "OriginalCoin", "token_id": 16},
    {"id": "17", "name": "UASF", "token_id": 17},
    {"id": "17b", "name": "UASF (Misprint)", "token_id": 172},
    {"id": "18", "name": "To The Moon", "token_id": 18},
    {"id": "19", "name": "Dogs Trading", "token_id": 19},
    {"id": "20", "name": "MadBitcoins", "token_id": 20},
    {"id": "21", "name": "The Wizard", "token_id": 21},
    {"id": "22", "name": "The Bard", "token_id": 22},
    {"id": "23", "name": "The Barbarian", "token_id": 23},
    {"id": "24", "name": "Complexity", "token_id": 24},
    {"id": "25", "name": "Passion", "token_id": 25},
    {"id": "26", "name": "Education", "token_id": 26},
    {"id": "27", "name": "Blue", "token_id": 27},
    {"id": "28", "name": "Pink", "token_id": 28},
    {"id": "29", "name": "Yellow", "token_id": 29},
    {"id": "30", "name": "Eclipse", "token_id": 30},
]


def fetch_opensea_html(token_id):
    """Fetch OpenSea page HTML and parse Item Floor price"""
    url = f"https://opensea.io/item/ethereum/{CONTRACT}/{token_id}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html",
    }
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=20) as resp:
            html = resp.read().decode("utf-8", errors="replace")
        
        # Parse Item Floor from HTML (appears as "Item Floor0.25 ETH")
        import re
        floor_match = re.search(r'Item Floor([\d.]+)\s*ETH', html)
        last_sale_match = re.search(r'Last Sale([\d.]+)\s*(?:WETH|ETH)', html)
        supply_match = re.search(r'Total Supply([\d.]+K?)', html)
        
        floor = float(floor_match.group(1)) if floor_match else None
        last_sale = float(last_sale_match.group(1)) if last_sale_match else None
        
        supply = None
        if supply_match:
            supply_str = supply_match.group(1)
            if 'K' in supply_str:
                supply = int(float(supply_str.replace('K', '')) * 1000)
            else:
                supply = int(supply_str)
        
        return {
            "floor": floor,
            "last_sale": last_sale,
            "supply": supply
        }
    except Exception as e:
        print(f"  Error: {e}")
    return {}


def main():
    print("Fetching Curio Cards data from OpenSea...\n")
    
    cards_data = []
    collection_floor = None
    
    for card in CARDS:
        print(f"Card #{card['id']} ({card['name']})... ", end="", flush=True)
        
        data = fetch_opensea_html(card['token_id'])
        floor = data.get('floor')
        last_sale = data.get('last_sale')
        supply = data.get('supply')
        
        # Track collection floor (lowest of all item floors)
        if floor and (collection_floor is None or floor < collection_floor):
            collection_floor = floor
        
        cards_data.append({
            "id": card['id'],
            "name": card['name'],
            "token_id": card['token_id'],
            "floor": floor,
            "last_sale": last_sale,
            "supply": supply
        })
        
        print(f"Floor: {floor or 'None'} ETH, Last Sale: {last_sale or 'None'} ETH, Supply: {supply or 'Unknown'}")
        time.sleep(0.8)  # Be nice to OpenSea
    
    # Build output
    result = {
        "fetched_at": datetime.utcnow().isoformat() + "Z",
        "source": "opensea.io",
        "collection": {
            "name": "My Curio Cards",
            "contract": CONTRACT,
            "floor": collection_floor or 0.093,
            "total_supply": sum(c['supply'] for c in cards_data if c['supply']) or 20773,
            "num_owners": 4904  # Static for now
        },
        "cards": cards_data
    }
    
    # Write to file
    with open(OUTPUT, 'w') as f:
        json.dump(result, f, indent=2)
    
    print(f"\n{'='*60}")
    print(f"✅ Fetched {len(cards_data)} cards")
    print(f"✅ Collection floor: {collection_floor} ETH")
    print(f"✅ Saved to {OUTPUT}")


if __name__ == "__main__":
    main()
