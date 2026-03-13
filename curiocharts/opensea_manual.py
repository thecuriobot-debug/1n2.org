# Manual Curio Cards Floor Prices (Verified from OpenSea Feb 15, 2026)
# Update this file with real data from opensea.io/collection/my-curio-cards

OPENSEA_FLOORS = {
    # From opensea.io search results Feb 15, 2026
    "collection_floor": 0.093,  # ETH
    
    # Individual item floors (from OpenSea item pages)
    "items": {
        1: None,  # Apples - need to check
        7: 0.101,  # Sculpture
        13: 0.093,  # BTC
        20: 0.11,  # MadBitcoins
        27: 0.25,  # Blue
        29: 0.88,  # Yellow
        30: 0.193,  # Eclipse
        # Add more as you verify them
    },
    
    # Last updated
    "updated": "2026-02-15T18:30:00Z"
}

# Instructions:
# 1. Visit opensea.io/item/ethereum/0x73da73ef3a6982109c4d5bdb0db9dd3e3783f313/{TOKEN_ID}
# 2. Look for "Item Floor" price
# 3. Update the items dict above
# 4. Run ./update.sh to rebuild data.json
