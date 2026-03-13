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
  return `<pre>${esc(JSON.stringify(value, null, 2))}</pre>`;
}

export function renderArtistContent(artist) {
  const list = Array.isArray(artist.known_curio_cards) && artist.known_curio_cards.length
    ? artist.known_curio_cards.join(', ')
    : MISSING;

  return `
<section>
  <h3>1. Background</h3>
  <p><strong>Artist:</strong> ${esc(show(artist.name))}</p>
  <p><strong>Biographical information:</strong> ${esc(artist.biography || 'Biographical information is limited to provided records.')}</p>
</section>
<section>
  <h3>2. Contribution to Curio Cards</h3>
  <p><strong>Known Curio Cards:</strong> ${esc(list)}</p>
  <p><strong>Active period in Curio:</strong> ${esc(show(artist.active_period_in_curio))}</p>
</section>
<section>
  <h3>3. Artistic Style Analysis</h3>
  <p>${esc(MISSING)}</p>
</section>
<section>
  <h3>4. Market Performance Overview</h3>
  <p><strong>Sales stats aggregate:</strong> ${showJson(artist.sales_stats_aggregate)}</p>
</section>
<section>
  <h3>5. Historical Significance</h3>
  <p>${esc(MISSING)}</p>
</section>
<section>
  <h3>6. Relationship to Early NFT Culture</h3>
  <p>${esc(MISSING)}</p>
</section>`;
}
