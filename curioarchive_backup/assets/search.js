(function initSearch() {
  const body = document.body;
  if (!body) return;

  const siteBase = body.getAttribute('data-site-base') || '';
  const resultsRoot = document.getElementById('search-results');
  const queryInput = document.getElementById('search-page-query');
  if (!resultsRoot || !queryInput) return;

  const statusEl = document.getElementById('search-status');
  const params = new URLSearchParams(window.location.search);
  const q = (params.get('q') || '').trim();
  queryInput.value = q;

  function tokenize(value) {
    return value
      .toLowerCase()
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function renderResults(items, query) {
    if (!query) {
      statusEl.textContent = 'Enter a query to search indexed pages.';
      resultsRoot.innerHTML = '';
      return;
    }

    const terms = tokenize(query);
    const filtered = items
      .map((item) => {
        const haystack = `${item.title} ${item.description} ${item.text}`.toLowerCase();
        let score = 0;
        for (const term of terms) {
          if (haystack.includes(term)) score += 1;
        }
        return { item, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
      .slice(0, 50);

    statusEl.textContent = `${filtered.length} result(s) for "${query}".`;

    if (!filtered.length) {
      resultsRoot.innerHTML = '<p>Data not available at time of publication.</p>';
      return;
    }

    resultsRoot.innerHTML = filtered
      .map(({ item }) => {
        return `<article><h3><a href="${item.url}">${item.title}</a></h3><p>${item.description}</p></article>`;
      })
      .join('');
  }

  fetch(`${siteBase}/search-index.json`)
    .then((res) => {
      if (!res.ok) throw new Error('search index load failed');
      return res.json();
    })
    .then((items) => {
      renderResults(items, q);
      queryInput.addEventListener('input', () => {
        renderResults(items, queryInput.value.trim());
      });
    })
    .catch(() => {
      statusEl.textContent = 'Data not available at time of publication.';
      resultsRoot.innerHTML = '';
    });
})();
