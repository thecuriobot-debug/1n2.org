const MISSING = 'Data not available at time of publication.';

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function show(value) {
  if (value == null || value === '') return MISSING;
  return String(value);
}

function showJson(value) {
  if (value == null) return MISSING;
  if (typeof value === 'object' && !Object.keys(value).length) return MISSING;
  if (Array.isArray(value) && value.length === 0) return MISSING;
  try {
    return `<pre>${esc(JSON.stringify(value, null, 2))}</pre>`;
  } catch {
    return MISSING;
  }
}

export function renderCardContent(card) {
  const number = show(card.number);
  const title = show(card.title || (card.number != null ? `Curio Card #${card.number}` : null));
  const notableSales = Array.isArray(card.notable_sales) && card.notable_sales.length
    ? `<ul>${card.notable_sales.map((s) => `<li>${esc(JSON.stringify(s))}</li>`).join('')}</ul>`
    : MISSING;

  return `
<section>
  <h3>Overview</h3>
  <p><strong>Short factual description:</strong> ${esc(title)}</p>
  <p><strong>Artist attribution:</strong> ${esc(show(card.artist))}</p>
  <p><strong>Mint context:</strong> Mint date recorded as ${esc(show(card.mint_date))}.</p>
</section>
<section>
  <h3>Artistic Characteristics</h3>
  <p><strong>Visual style description:</strong> ${esc(MISSING)}</p>
  <p><strong>Thematic elements:</strong> ${esc(MISSING)}</p>
</section>
<section>
  <h3>On-Chain Data Summary</h3>
  <table>
    <thead><tr><th>Field</th><th>Value</th></tr></thead>
    <tbody>
      <tr><td>Card number</td><td>${esc(number)}</td></tr>
      <tr><td>Supply</td><td>${esc(show(card.supply))}</td></tr>
      <tr><td>Total volume</td><td>${esc(show(card.sales_stats?.total_volume_eth))}</td></tr>
      <tr><td>Average sale price</td><td>${esc(show(card.sales_stats?.average_sale_eth))}</td></tr>
      <tr><td>Holder distribution</td><td>${showJson(card.holder_distribution)}</td></tr>
    </tbody>
  </table>
</section>
<section>
  <h3>Market History</h3>
  <p><strong>Major sale milestones:</strong> ${notableSales}</p>
  <p><strong>Periods of activity or dormancy:</strong> ${esc(MISSING)}</p>
</section>
<section>
  <h3>Provenance Notes</h3>
  <p><strong>Notable wallets:</strong> ${esc(MISSING)}</p>
  <p><strong>Transfers of significance:</strong> ${esc(MISSING)}</p>
</section>
<section>
  <h3>Historical Context Within Curio</h3>
  <p><strong>How this card compares to others:</strong> ${esc(MISSING)}</p>
  <p><strong>Rarity positioning:</strong> Based on available supply and holder distribution records.</p>
</section>
<section>
  <h3>Data Sources</h3>
  <ul>
    <li>Metadata</li>
    <li>Artist</li>
    <li>Mint date</li>
    <li>Supply</li>
    <li>All-time sales stats</li>
    <li>Notable sales</li>
    <li>Holder distribution</li>
  </ul>
</section>`;
}
