#!/bin/bash
# update-terminal-data.sh - Update Curio Terminal with live data from Data Hub

# Paths
DATA_HUB="$HOME/.curio-data-hub/latest.json"
TERMINAL_DATA="$HOME/Sites/1n2.org/curio-terminal/data"
SERVER_DATA="/var/www/html/curio-terminal/data"

# Update local terminal data
if [ -f "$DATA_HUB" ]; then
    # Extract data using grep (works on Mac)
    floor_price=$(grep -o '"floor_price":[^,]*' "$DATA_HUB" | head -1 | cut -d':' -f2 | tr -d ' ')
    volume_24h=$(grep -o '"volume_24h":[^,]*' "$DATA_HUB" | cut -d':' -f2 | tr -d ' ')
    sales_24h=$(grep -o '"sales_24h":[^,]*' "$DATA_HUB" | cut -d':' -f2 | tr -d ' ')
    holders=$(grep -o '"holders":[^,]*' "$DATA_HUB" | cut -d':' -f2 | tr -d ' ')
    
    # Create summary
    cat > "$TERMINAL_DATA/summary.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "floor_price": $floor_price,
  "volume_24h": $volume_24h,
  "sales_24h": $sales_24h,
  "holders": $holders,
  "status": "live"
}
EOF
    
    echo "[$(date)] ✅ Terminal data updated"
    
    # Deploy to server
    scp "$TERMINAL_DATA/summary.json" root@1n2.org:"$SERVER_DATA/" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "[$(date)] ✅ Data deployed to server"
    else
        echo "[$(date)] ⚠️  Server deployment skipped (no connection)"
    fi
else
    echo "[$(date)] ❌ Data Hub not found at $DATA_HUB"
fi
