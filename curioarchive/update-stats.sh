#!/bin/bash

# CurioArchive - Update Market Stats from Data Hub
# Updates the market statistics display with live data

set -e

echo "📚 ====================================="
echo "📚 CurioArchive - Updating Market Stats"
echo "📚 ====================================="
echo ""

DATA_HUB="$HOME/.curio-data-hub/latest.json"
ARCHIVE_DIR="$HOME/Sites/1n2.org/curioarchive"
STATS_FILE="$ARCHIVE_DIR/js/market-stats.js"

# Check if data hub exists
if [ ! -f "$DATA_HUB" ]; then
    echo "⚠️  Data hub not found - fetching..."
    bash ~/.curio-data-hub/fetch-curio-data.sh
fi

# Read from data hub
echo "📊 Reading from Curio Data Hub..."
FLOOR=$(jq -r '.market.floor_price' "$DATA_HUB")
VOLUME=$(jq -r '.market.volume_24h' "$DATA_HUB")
SALES=$(jq -r '.market.sales_24h' "$DATA_HUB")
HOLDERS=$(jq -r '.market.holders' "$DATA_HUB")
TIMESTAMP=$(jq -r '.timestamp' "$DATA_HUB")

echo "✅ Data loaded:"
echo "   Floor: $FLOOR ETH"
echo "   Volume: $VOLUME ETH"
echo "   Sales: $SALES"
echo "   Holders: $HOLDERS"

# Create market stats JavaScript file
echo ""
echo "💾 Creating market stats file..."

cat > "$STATS_FILE" << EOF
// CurioArchive - Live Market Statistics
// Updated from Curio Data Hub
// Last update: $TIMESTAMP

const MARKET_STATS = {
  floor_price: $FLOOR,
  volume_24h: $VOLUME,
  sales_24h: $SALES,
  holders: $HOLDERS,
  total_supply: 30,
  updated_at: "$TIMESTAMP"
};

// Display stats in header
function updateMarketStats() {
  const statsEl = document.getElementById('market-stats');
  if (statsEl) {
    statsEl.innerHTML = \`
      <div class="stat">
        <span class="label">Floor:</span>
        <span class="value">\${MARKET_STATS.floor_price.toFixed(4)} ETH</span>
      </div>
      <div class="stat">
        <span class="label">24h Vol:</span>
        <span class="value">\${MARKET_STATS.volume_24h.toFixed(4)} ETH</span>
      </div>
      <div class="stat">
        <span class="label">24h Sales:</span>
        <span class="value">\${MARKET_STATS.sales_24h}</span>
      </div>
      <div class="stat">
        <span class="label">Holders:</span>
        <span class="value">\${MARKET_STATS.holders}</span>
      </div>
    \`;
  }
}

// Auto-update on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateMarketStats);
} else {
  updateMarketStats();
}
EOF

echo "✅ Created: $STATS_FILE"

# Deploy to remote
echo ""
echo "☁️  Deploying to 1n2.org..."
scp "$STATS_FILE" root@1n2.org:/var/www/html/curioarchive/js/market-stats.js

echo "✅ Deployed!"

# Summary
echo ""
echo "📚 ====================================="
echo "✅ CurioArchive Stats Updated!"
echo "📚 ====================================="
echo ""
echo "📊 Market Data:"
echo "   Floor: $FLOOR ETH"
echo "   Volume: $VOLUME ETH"
echo "   Sales: $SALES"
echo ""
echo "🌐 Live at: http://1n2.org/curioarchive/"
echo "📦 Source: Curio Data Hub"
echo ""
