#!/bin/bash
# run-blockchain-fetch.sh - Fetch live blockchain data with Alchemy API

export ALCHEMY_API_KEY="vfF4rHBY1zsGgI3kqEg9v"

echo "🗺️  CURIO ATLAS - LIVE BLOCKCHAIN FETCH"
echo "========================================"
echo ""

cd ~/Sites/1n2.org/curio-atlas/backend
python3 blockchain-fetcher.py

echo ""
echo "✅ Blockchain fetch complete!"
echo ""
echo "📊 Generated files:"
echo "   - database/curio_network.db"
echo "   - data/network.json"
echo ""
