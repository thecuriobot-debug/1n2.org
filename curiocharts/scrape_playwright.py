#!/usr/bin/env python3
"""
OPENSEA SCRAPER USING PLAYWRIGHT
Automated browser scraping to get real floor prices

Installation:
    pip3 install playwright --break-system-packages
    playwright install chromium

Usage:
    python3 scrape_opensea_playwright.py

This runs a real browser on YOUR machine and scrapes OpenSea.
Takes about 2-3 minutes to scrape all 31 cards.
"""

import json
import re
import time
from datetime import datetime

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("❌ Playwright not installed!")
    print("Run: pip3 install playwright --break-system-packages")
    print("Then: playwright install chromium")
    exit(1)

CONTRACT = "0x73da73ef3a6982109c4d5bdb0db9dd3e3783f313"
OUTPUT = "/Users/curiobot/Sites/1n2.org/curiocharts/data.json"

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


def scrape_opensea():
    """Scrape OpenSea using Playwright"""
    print("=" * 60)
    print("OPENSEA PLAYWRIGHT SCRAPER")
    print("=" * 60)
    print()
    
    with sync_playwright() as p:
        # Launch browser (headless=False to see what's happening)
        print("Launching browser...")
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        collection_floor = None
        cards_data = []
        
        for i, card in enumerate(CARDS):
            token_id = card["token_id"]
            url = f"https://opensea.io/assets/ethereum/{CONTRACT}/{token_id}"
            
            print(f"\n[{i+1}/{len(CARDS)}] Scraping {card['name']} (#{token_id})...")
            print(f"    URL: {url}")
            
            try:
                # Navigate to page
                page.goto(url, wait_until="networkidle", timeout=30000)
                time.sleep(2)  # Let page fully render
                
                # Get page text
                text = page.inner_text("body")
                
                # Extract Collection Floor (from any page)
                if not collection_floor:
                    match = re.search(r'Collection Floor[\s\S]{0,100}?([0-9.]+)\s*ETH', text, re.I)
                    if match:
                        collection_floor = float(match.group(1))
                        print(f"    ✅ Collection Floor: {collection_floor} ETH")
                
                # Extract Item Floor
                floor_match = re.search(r'Item Floor[\s\S]{0,100}?([0-9.]+)\s*ETH', text, re.I)
                item_floor = float(floor_match.group(1)) if floor_match else None
                
                # Extract Last Sale
                sale_match = re.search(r'Last Sale[\s\S]{0,100}?([0-9.]+)\s*(?:ETH|WETH)', text, re.I)
                last_sale = float(sale_match.group(1)) if sale_match else None
                
                print(f"    Floor: {item_floor} ETH" if item_floor else "    Floor: Not found")
                print(f"    Last Sale: {last_sale} ETH" if last_sale else "    Last Sale: Not found")
                
                cards_data.append({
                    **card,
                    "floor": item_floor,
                    "last_sale": last_sale,
                    "img": f"https://curio.cards/img/{card['id']}.jpeg",
                    "opensea_url": url
                })
                
                # Rate limit
                if i < len(CARDS) - 1:
                    time.sleep(2)
                    
            except Exception as e:
                print(f"    ❌ Error: {e}")
                cards_data.append({
                    **card,
                    "floor": None,
                    "last_sale": None,
                    "img": f"https://curio.cards/img/{card['id']}.jpeg",
                    "opensea_url": url
                })
        
        browser.close()
        
        # Build final output
        output = {
            "fetched_at": datetime.utcnow().isoformat() + "Z",
            "source": "opensea.io (playwright)",
            "collection": {
                "name": "My Curio Cards",
                "contract": CONTRACT,
                "floor": collection_floor or 0.093,
                "total_volume": 0,
                "total_supply": 20773,
                "num_owners": 4904,
                "unique_items": len(CARDS)
            },
            "cards": cards_data
        }
        
        # Save
        with open(OUTPUT, 'w') as f:
            json.dump(output, f, indent=2)
        
        print("\n" + "=" * 60)
        print("✅ SCRAPING COMPLETE!")
        print("=" * 60)
        print(f"Collection Floor: {collection_floor} ETH")
        print(f"Cards Scraped: {len(cards_data)}")
        print(f"Output: {OUTPUT}")
        print()
        
        # Stats
        floors_found = sum(1 for c in cards_data if c["floor"] is not None)
        print(f"Floor prices found: {floors_found}/{len(cards_data)}")
        print("=" * 60)


if __name__ == "__main__":
    scrape_opensea()
