#!/usr/bin/env python3
"""
Robust OpenSea scraper using browser automation via Claude in Chrome.
Bypasses API blocks by scraping actual pages like a real user.
"""

import json
from datetime import datetime

CONTRACT = "0x73da73ef3a6982109c4d5bdb0db9dd3e3783f313"
COLLECTION_SLUG = "curiocardswrapper"

# All 31 Curio Cards
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

print("OPENSEA BROWSER SCRAPER")
print("Collection:", COLLECTION_SLUG)
print("Cards to scrape:", len(CARDS))
