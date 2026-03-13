function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function navLink(base, href, label) {
  return `<a href="${base}${href}">${label}</a>`;
}

export function renderLayout({
  title,
  description,
  content,
  siteBase,
  buildTimestamp,
  pageUpdated,
  pageTitle
}) {
  const fullTitle = `${title} | Curio Archive`;
  const metaDescription = description || `${title} record in Curio Archive.`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(fullTitle)}</title>
  <meta name="description" content="${esc(metaDescription)}" />
  <meta property="og:title" content="${esc(fullTitle)}" />
  <meta property="og:description" content="${esc(metaDescription)}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${esc(fullTitle)}" />
  <meta name="twitter:description" content="${esc(metaDescription)}" />
  <link rel="stylesheet" href="${siteBase}/assets/main.css" />
</head>
<body data-site-base="${siteBase}">
  <div class="site-wrap">
    <header class="site-header">
      <h1><a href="${siteBase}/">Curio Archive</a></h1>
      <p class="tagline">Structured historical encyclopedia for Curio Cards (2017 Ethereum NFT series).</p>
      <nav class="main-nav">
        ${navLink(siteBase, '/', 'Home')}
        ${navLink(siteBase, '/cards/', 'Cards')}
        ${navLink(siteBase, '/artists/', 'Artists')}
        ${navLink(siteBase, '/timeline/', 'Timeline')}
        ${navLink(siteBase, '/provenance/', 'Provenance Index')}
        ${navLink(siteBase, '/on-this-day/', 'On This Day Archive')}
        ${navLink(siteBase, '/about/', 'About / Methodology')}
        ${navLink(siteBase, '/search/', 'Search')}
      </nav>
      <form class="search-inline" action="${siteBase}/search/" method="get">
        <label for="site-search-input">Search</label>
        <input id="site-search-input" name="q" type="search" placeholder="Search archive" />
        <button type="submit">Go</button>
      </form>
    </header>

    <main>
      ${pageTitle ? `<h2 class="page-title">${esc(pageTitle)}</h2>` : ''}
      ${content}
    </main>

    <footer class="site-footer">
      <p>Generated: <time datetime="${esc(buildTimestamp)}">${esc(buildTimestamp)}</time></p>
      <p>Page Updated: ${esc(pageUpdated || 'Data not available at time of publication.')}</p>
      <p>Publication standard: factual summary, no speculative inference.</p>
    </footer>
  </div>
  <script src="${siteBase}/assets/search.js"></script>
</body>
</html>`;
}
