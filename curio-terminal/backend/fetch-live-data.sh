#!/bin/bash
# fetch-live-data.sh - Fetch live data from Curio Data Hub

DATA_HUB="$HOME/.curio-data-hub/latest.json"
OUTPUT_DIR="$HOME/Sites/1n2.org/curio-terminal/data"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Check if data hub exists
if [ ! -f "$DATA_HUB" ]; then
    echo "Error: Curio Data Hub not found at $DATA_HUB"
    exit 1
fi

# Copy latest data for terminal
cp "$DATA_HUB" "$OUTPUT_DIR/latest.json"

# Extract key metrics
floor_price=$(grep -o '"floor_price":[^,]*' "$DATA_HUB" | head -1 | cut -d':' -f2 | tr -d ' ')
volume_24h=$(grep -o '"volume_24h":[^,]*' "$DATA_HUB" | cut -d':' -f2 | tr -d ' ')
sales_24h=$(grep -o '"sales_24h":[^,]*' "$DATA_HUB" | cut -d':' -f2 | tr -d ' ')
holders=$(grep -o '"holders":[^,]*' "$DATA_HUB" | cut -d':' -f2 | tr -d ' ')

# Create summary for terminal
cat > "$OUTPUT_DIR/summary.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "floor_price": $floor_price,
  "volume_24h": $volume_24h,
  "sales_24h": $sales_24h,
  "holders": $holders,
  "status": "live"
}
EOF

echo "✅ Live data fetched: $OUTPUT_DIR/summary.json"
