#!/usr/bin/env python3
"""
ROBUST MULTI-SOURCE NFT SCRAPER
Tries multiple APIs and fallbacks to ensure we get data

Priority order:
1. CoinGecko NFT API (free tier, no key required initially)
2. NFT Price Floor (web scraping)
3. Manual fallback with best-effort data

Designed to work despite API blocks and network restrictions.
"""

import urllib.request
import urllib.error
import json
import re
from datetime import datetime

CONTRACT = "0x73da73ef3a6982109c4d5bdb0db9dd3e3783f313"
OUTPUT = "/Users/curiobot/Sites/1n2.org/curiocharts/data.json"

# Card metadata
CARDS = [
    {"id": "1", "name": "Apples", "artist": "Cryptograffiti", "token_id": 1},
    {"id": "2", "name": "Nuts", "artist": "Cryptograffiti", "token_id": 2},
    {"id": "3", "name": "Berries", "artist": "Cryptograffiti", "token_id": 3},
    {"id": "4", "name": "Clay", "artist": "Cryptograffiti", "token_id": 4},
    {"id": "5", "name": "Paint", "artist": "Cryptograffiti", "token_id": 5},
    {"id": "6", "name": "Ink", "artist": "Cryptograffiti", "token_id": 6},
    {"id": "7", "name": "Sculpture", "artist": "Cryptograffiti", "token_id": 7},
    {"id": "8", "name": "Painting", "artist": "Cryptograffiti", "token_id": 8},
    {"id": "9", "name": "Book", "artist": "Cryptograffiti", "token_id": 9},
    {"id": "10", "name": "Future", "artist": "Robek World", "token_id": 10},
    {"id": "11", "name": "BTC Keys", "artist": "Robek World", "token_id": 11},
    {"id": "12", "name": "Mine Bitcoin", "artist": "Robek World", "token_id": 12},
    {"id": "13", "name": "BTC", "artist": "Phneep", "token_id": 13},
    {"id": "14", "name": "CryptoCurrency", "artist": "Phneep", "token_id": 14},
    {"id": "15", "name": "DigitalCash", "artist": "Phneep", "token_id": 15},
    {"id": "16", "name": "OriginalCoin", "artist": "Phneep", "token_id": 16},
    {"id": "17", "name": "UASF", "artist": "Phneep", "token_id": 17},
    {"id": "17b", "name": "UASF (Misprint)", "artist": "Phneep", "token_id": 172},
    {"id": "18", "name": "To The Moon", "artist": "Marisol Vengas", "token_id": 18},
    {"id": "19", "name": "Dogs Trading", "artist": "Marisol Vengas", "token_id": 19},
    {"id": "20", "name": "MadBitcoins", "artist": "Marisol Vengas", "token_id": 20},
    {"id": "21", "name": "The Wizard", "artist": "Rui Coehlo", "token_id": 21},
    {"id": "22", "name": "The Bard", "artist": "Rui Coehlo", "token_id": 22},
    {"id": "23", "name": "The Barbarian", "artist": "Rui Coehlo", "token_id": 23},
    {"id": "24", "name": "Complexity", "artist": "Jonathan Mann", "token_id": 24},
    {"id": "25", "name": "Passion", "artist": "Jonathan Mann", "token_id": 25},
    {"id": "26", "name": "Education", "artist": "Jonathan Mann", "token_id": 26},
    {"id": "27", "name": "Blue", "artist": "Rhett Creighton", "token_id": 27},
    {"id": "28", "name": "Pink", "artist": "Rhett Creighton", "token_id": 28},
    {"id": "29", "name": "Yellow", "artist": "Rhett Creighton", "token_id": 29},
    {"id": "30", "name": "Eclipse", "artist": "Rhett Creighton", "token_id": 30},
]


def try_coingecko():
    """Try CoinGecko NFT API - free tier"""
    print("Attempting CoinGecko API...")
    
    # Try searching by contract
    url = f"https://api.coingecko.com/api/v3/nfts/ethereum/contract/{CONTRACT}"
    headers = {"Accept": "application/json"}
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            print(f"  ✅ CoinGecko Success!")
            
            floor = data.get("floor_price", {}).get("native_currency")
            volume = data.get("volume_24h", {}).get("native_currency")
            
            return {
                "source": "coingecko",
                "floor": floor,
                "volume": volume,
                "data": data
            }
    except urllib.error.HTTPError as e:
        print(f"  ❌ HTTP {e.code}: {e.reason}")
    except Exception as e:
        print(f"  ❌ Failed: {e}")
    
    return None


def try_nft_price_floor():
    """Try NFT Price Floor website scraping"""
    print("Attempting NFT Price Floor scraping...")
    
    try:
        url = "https://nftpricefloor.com/curio-cards"
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
        
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode()
            
            # Try to extract floor price from HTML
            floor_match = re.search(r'floor["\s:]+([0-9.]+)\s*ETH', html, re.IGNORECASE)
            if floor_match:
                floor = float(floor_match.group(1))
                print(f"  ✅ NFT Price Floor: {floor} ETH")
                return {
                    "source": "nftpricefloor.com",
                    "floor": floor
                }
    except Exception as e:
        print(f"  ❌ Failed: {e}")
    
    return None


def create_output(collection_data=None):
    """Create final JSON output"""
    
    # Build cards with metadata
    cards_output = []
    for card in CARDS:
        cards_output.append({
            "id": card["id"],
            "name": card["name"],
            "artist": card["artist"],
            "token_id": card["token_id"],
            "supply": None,  # Would need per-token lookup
            "floor": None,   # Individual token floors
            "last_sale": None,
            "img": f"https://curio.cards/img/{card['id']}.jpeg",
            "opensea_url": f"https://opensea.io/assets/ethereum/{CONTRACT}/{card['token_id']}"
        })
    
    # Collection stats
    if collection_data:
        floor = collection_data.get("floor", 0.093)
        volume = collection_data.get("volume", 0)
        source = collection_data.get("source", "manual")
    else:
        floor = 0.093  # Known collection floor
        volume = 0
        source = "manual"
    
    result = {
        "fetched_at": datetime.utcnow().isoformat() + "Z",
        "source": source,
        "collection": {
            "name": "My Curio Cards",
            "contract": CONTRACT,
            "floor": floor,
            "total_volume": volume,
            "total_supply": 20773,
            "num_owners": 4904,
            "unique_items": len(CARDS)
        },
        "cards": cards_output
    }
    
    return result


def main():
    print("=" * 60)
    print("MULTI-SOURCE NFT DATA FETCHER")
    print("=" * 60)
    print()
    
    collection_data = None
    
    # Try each source in order
    sources = [
        try_coingecko,
        try_nft_price_floor,
    ]
    
    for source_func in sources:
        result = source_func()
        if result:
            collection_data = result
            break
        print()
    
    if not collection_data:
        print("⚠️  All sources failed - using manual data")
        print()
    
    # Create final output
    output = create_output(collection_data)
    
    # Write to file
    with open(OUTPUT, 'w') as f:
        json.dump(output, f, indent=2)
    
    print("=" * 60)
    print(f"✅ Output saved to {OUTPUT}")
    print(f"   Source: {output['source']}")
    print(f"   Floor: {output['collection']['floor']} ETH")
    print(f"   Cards: {len(output['cards'])}")
    print("=" * 60)


if __name__ == "__main__":
    main()
