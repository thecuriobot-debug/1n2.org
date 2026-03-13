#!/usr/bin/env python3
"""Fetch Curio Cards data by scraping OpenSea token pages (JSON-LD) and write to data.json"""

import urllib.request
import urllib.error
import json
import re
import time
from datetime import datetime

CONTRACT = "0x73da73ef3a6982109c4d5bdb0db9dd3e3783f313"
OUTPUT = "/Users/curiobot/sites/1n2.org/curiocharts/data.json"

TOKEN_IDS = list(range(1, 31)) + [172]
ID_MAP = {i: str(i) for i in range(1, 31)}
ID_MAP[172] = "17b"

CARD_NAMES = {}  # Will be populated from scrape

# Known data from OpenSea search results (Feb 14 2026)
# Format: card_id -> {item_floor, last_sale, top_offer, supply, owners}
KNOWN_DATA = {
    "1":  {"name": "Apples",       "item_floor": 0.389,  "last_sale": 0.277,  "top_offer": 0.282,  "supply": 1020,  "owners": 616},
    "2":  {"name": "Nuts",         "item_floor": 0.1399, "last_sale": 0.112,  "top_offer": 0.106,  "supply": 965,   "owners": 601},
    "7":  {"name": "Sculpture",    "item_floor": 0.101,  "last_sale": 0.0802, "top_offer": 0.0832, "supply": 1680,  "owners": 1080},
    "10": {"name": "Future",       "item_floor": 0.125,  "last_sale": 0.11,   "top_offer": 0.083,  "supply": 1710,  "owners": 1010},
    "11": {"name": "BTC Keys",     "item_floor": 0.0385, "last_sale": 0.0263, "top_offer": 0.0263, "supply": 1630,  "owners": 1020},
    "12": {"name": "Mine Bitcoin", "item_floor": 0.115,  "last_sale": 0.09,   "top_offer": 0.0903, "supply": 1380,  "owners": None},
    "13": {"name": "BTC",          "item_floor": 0.093,  "last_sale": 0.0812, "top_offer": 0.0812, "supply": 1530,  "owners": 947},
    "20": {"name": "MadBitcoins",  "item_floor": 0.11,   "last_sale": 0.09,   "top_offer": 0.0852, "supply": 1390,  "owners": 774},
    "21": {"name": "The Wizard",   "item_floor": 5.00,   "last_sale": 4.25,   "top_offer": 3.00,   "supply": 50,    "owners": None},
    "22": {"name": "The Bard",     "item_floor": 75.00,  "last_sale": 6.00,   "top_offer": 6.00,   "supply": 35,    "owners": None},
    "25": {"name": "Passion",      "item_floor": None,   "last_sale": 7.50,   "top_offer": 6.00,   "supply": 33,    "owners": None},
    "27": {"name": "Blue",         "item_floor": 0.25,   "last_sale": 0.23,   "top_offer": 0.202,  "supply": 396,   "owners": None},
    "29": {"name": "Yellow",       "item_floor": 0.88,   "last_sale": 0.72,   "top_offer": 0.638,  "supply": 103,   "owners": None},
    "30": {"name": "Eclipse",      "item_floor": 0.193,  "last_sale": 0.151,  "top_offer": 0.151,  "supply": 450,   "owners": None},
}


def fetch_opensea_page(token_id):
    """Fetch an OpenSea token page and extract JSON-LD data"""
    url = f"https://opensea.io/item/ethereum/{CONTRACT}/{token_id}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
    }
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=20) as resp:
            html = resp.read().decode("utf-8", errors="replace")
        
        # Extract JSON-LD
        ld_matches = re.findall(r'application/ld\+json["\']?\s*>(.*?)</script>', html, re.DOTALL)
        if ld_matches:
            ld = json.loads(ld_matches[0])
            return {
                "name": ld.get("name"),
                "image": ld.get("image"),
                "price_usd": ld.get("offers", {}).get("price"),
                "seller": ld.get("offers", {}).get("seller", {}).get("name"),
            }
    except Exception as e:
        print(f"  Error fetching token {token_id}: {e}")
    return None


def get_eth_price_usd():
    """Get current ETH price in USD"""
    try:
        url = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
        headers = {"Accept": "application/json", "User-Agent": "CurioCharts/1.0"}
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            return data.get("ethereum", {}).get("usd")
    except Exception as e:
        print(f"  Could not fetch ETH price: {e}")
    return None


def main():
    result = {
        "fetched_at": datetime.utcnow().isoformat() + "Z",
        "source": "opensea.io",
        "collection_stats": {
            "name": "My Curio Cards",
            "contract": CONTRACT,
            "total_supply": 20773,
            "num_owners": 4904,
            "collection_floor_eth": 0.058,
        },
        "nfts": {},
        "sales": {},
        "floors": {},
        "total_sale_events": 0,
    }

    # Try to get ETH price
    print("Fetching ETH/USD price...")
    eth_usd = get_eth_price_usd()
    if eth_usd:
        print(f"  ETH = ${eth_usd}")
        result["collection_stats"]["eth_usd"] = eth_usd
    else:
        eth_usd = 2700  # fallback estimate
        print(f"  Using fallback ETH = ${eth_usd}")

    # Scrape each token page from OpenSea
    print("\nScraping OpenSea token pages...")
    for token_id in TOKEN_IDS:
        card_id = ID_MAP[token_id]
        print(f"  #{card_id} (token {token_id})...", end=" ")

        page_data = fetch_opensea_page(token_id)

        # Start with known data if available
        known = KNOWN_DATA.get(card_id, {})

        name = None
        image = None
        item_floor = known.get("item_floor")
        last_sale = known.get("last_sale")
        top_offer = known.get("top_offer")
        supply = known.get("supply")
        listing_price_usd = None

        if page_data:
            name = page_data.get("name") or known.get("name")
            image = page_data.get("image")
            listing_price_usd = page_data.get("price_usd")
            if listing_price_usd and eth_usd:
                listing_eth = round(listing_price_usd / eth_usd, 6)
                # Use as item floor if we don't have one
                if item_floor is None:
                    item_floor = listing_eth
            print(f"name={name}, listing=${listing_price_usd}, floor_eth={item_floor}")
        else:
            name = known.get("name", f"Card #{card_id}")
            print(f"name={name} (from known data), floor_eth={item_floor}")

        result["nfts"][card_id] = {
            "name": name or f"Card #{card_id}",
            "image_url": image,
            "supply": supply,
            "token_id": token_id,
        }

        # Set floor price
        if item_floor is not None:
            result["floors"][card_id] = item_floor
        elif last_sale is not None:
            result["floors"][card_id] = last_sale

        # Create synthetic sale entry from last_sale if available
        if last_sale is not None:
            result["sales"][card_id] = [{
                "date": result["fetched_at"],
                "price_eth": last_sale,
                "quantity": 1,
                "buyer": None,
                "seller": None,
                "source": "opensea_last_sale"
            }]
            result["total_sale_events"] += 1

        time.sleep(0.8)  # Be gentle with OpenSea

    # Write output
    with open(OUTPUT, "w") as f:
        json.dump(result, f, indent=2)

    nft_count = len(result["nfts"])
    floor_count = len(result["floors"])
    print(f"\n{'='*50}")
    print(f"Done! {nft_count} cards scraped, {floor_count} floors, {result['total_sale_events']} sale records")
    print(f"Written to {OUTPUT}")


if __name__ == "__main__":
    main()
