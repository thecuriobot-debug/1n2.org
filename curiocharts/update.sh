#!/bin/bash
#
# UPDATE CURIOCHARTS DATA
# Simple script to fetch latest NFT data
#

cd "$(dirname "$0")"

echo "=================================="
echo "UPDATING CURIOCHARTS DATA"
echo "=================================="
echo ""

# Run the scraper
python3 fetch_multisource.py

echo ""
echo "=================================="
echo "✅ UPDATE COMPLETE"
echo "=================================="
echo ""
echo "View your site at:"
echo "http://localhost:8000/curiocharts/"
echo ""
