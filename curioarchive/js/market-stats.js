// CurioArchive - Live Market Statistics
// Updated from Curio Data Hub
// Last update: 2026-03-13T08:12:04Z

const MARKET_STATS = {
  floor_price: 0.0486,
  volume_24h: 0,
  sales_24h: 1,
  holders: 387,
  total_supply: 30,
  updated_at: "2026-03-13T08:12:04Z"
};

// Display stats in header
function updateMarketStats() {
  const statsEl = document.getElementById('market-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat">
        <span class="label">Floor:</span>
        <span class="value">${MARKET_STATS.floor_price.toFixed(4)} ETH</span>
      </div>
      <div class="stat">
        <span class="label">24h Vol:</span>
        <span class="value">${MARKET_STATS.volume_24h.toFixed(4)} ETH</span>
      </div>
      <div class="stat">
        <span class="label">24h Sales:</span>
        <span class="value">${MARKET_STATS.sales_24h}</span>
      </div>
      <div class="stat">
        <span class="label">Holders:</span>
        <span class="value">${MARKET_STATS.holders}</span>
      </div>
    `;
  }
}

// Auto-update on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateMarketStats);
} else {
  updateMarketStats();
}
