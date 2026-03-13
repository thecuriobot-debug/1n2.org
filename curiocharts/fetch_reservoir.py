#!/usr/bin/env python3
"""
Fetch Curio Cards data from Reservoir API (free tier, no key required)
Base URL: https://api.reservoir.tools
"""

import urllib.request
import urllib.error
import json
import time
from datetime import datetime

CONTRACT = "0x73da73ef3a6982109c4d5bdb0db9dd3e3783f313"
OUTPUT = "/Users/curiobot/Sites/1n2.org/curiocharts/data.json"

# Curio Cards with artists
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

TOKEN_IDS = list(range(1, 31)) + [172]


def fetch_reservoir_collection():
    """Fetch collection data from Reservoir"""
    url = f"https://api.reservoir.tools/collections/v7?contract={CONTRACT}"
    headers = {"Accept": "application/json"}
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            if data.get("collections"):
                return data["collections"][0]
    except Exception as e:
        print(f"Error fetching collection: {e}")
    return None


def fetch_reservoir_tokens():
    """Fetch individual token data"""
    url = f"https://api.reservoir.tools/tokens/v7?contract={CONTRACT}&limit=100"
    headers = {"Accept": "application/json"}
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            return data.get("tokens", [])
    except Exception as e:
        print(f"Error fetching tokens: {e}")
    return []


def main():
    print("Fetching Curio Cards from Reservoir API...\n")
    
    # Fetch collection data
    print("Fetching collection...")
    collection = fetch_reservoir_collection()
    
    if collection:
        floor = collection.get("floorAsk", {}).get("price", {}).get("amount", {}).get("decimal")
        volume = collection.get("volume", {}).get("allTime")
        owners = collection.get("ownerCount")
        supply = collection.get("tokenCount")
        
        print(f"  Floor: {floor} ETH")
        print(f"  Volume: {volume} ETH")
        print(f"  Owners: {owners}")
        print(f"  Supply: {supply}")
    else:
        print("  ❌ Failed to fetch collection")
        floor, owners, supply = 0.093, 4904, 20773
    
    # Fetch tokens
    print("\nFetching tokens...")
    tokens = fetch_reservoir_tokens()
    print(f"  Found {len(tokens)} tokens")
    
    # Build token map
    token_map = {}
    for token in tokens:
        token_id = token.get("token", {}).get("tokenId")
        if token_id:
            floor_price = token.get("market", {}).get("floorAsk", {}).get("price", {}).get("amount", {}).get("decimal")
            last_sale = token.get("market", {}).get("lastSale", {}).get("price", {}).get("amount", {}).get("decimal")
            image = token.get("token", {}).get("image")
            
            token_map[int(token_id)] = {
                "floor": floor_price,
                "last_sale": last_sale,
                "image": image
            }
    
    # Build final output
    cards_output = []
    for i, card in enumerate(CARDS):
        token_id = TOKEN_IDS[i] if i < len(TOKEN_IDS) else None
        token_data = token_map.get(token_id, {})
        
        cards_output.append({
            "id": card["id"],
            "name": card["name"],
            "artist": card["artist"],
            "supply": None,
            "floor": token_data.get("floor"),
            "last_sale": token_data.get("last_sale"),
            "img": token_data.get("image")
        })
    
    result = {
        "fetched_at": datetime.utcnow().isoformat() + "Z",
        "source": "reservoir.tools",
        "collection": {
            "name": "My Curio Cards",
            "contract": CONTRACT,
            "floor": float(floor) if floor else 0.093,
            "total_volume": float(volume) if volume else 0,
            "total_supply": int(supply) if supply else 20773,
            "num_owners": int(owners) if owners else 4904,
            "unique_items": len(CARDS)
        },
        "cards": cards_output
    }
    
    # Write output
    with open(OUTPUT, 'w') as f:
        json.dump(result, f, indent=2)
    
    print(f"\n{'='*60}")
    print(f"✅ Fetched {len(cards_output)} cards")
    print(f"✅ Collection floor: {floor} ETH")
    print(f"✅ Saved to {OUTPUT}")


if __name__ == "__main__":
    main()
