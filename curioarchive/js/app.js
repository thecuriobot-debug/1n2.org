// CURIO ARCHIVE — Main Application
// Powers the Wikipedia-style encyclopedic interface

class CurioArchive {
  constructor() {
    this.currentPage = 'home';
    this.currentDetail = null;
    this.searchIndex = this.buildSearchIndex();
    this.init();
  }

  init() {
    this.setupNavigation();
    this.setupSearch();
    this.setupMobileMenu();
    this.setupLightbox();
    this.handleHashChange();
  }

  setupNavigation() {
    document.querySelectorAll('[data-page]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = e.currentTarget.dataset.page;
      });
    });
    window.addEventListener('hashchange', () => this.handleHashChange());
  }

  handleHashChange() {
    const hash = window.location.hash.slice(1) || 'home';
    const parts = hash.split('/');
    this.currentPage = parts[0];
    this.currentDetail = parts[1] || null;
    document.querySelectorAll('.header-nav a').forEach(a => {
      a.classList.toggle('active', a.dataset.page === this.currentPage);
    });
    this.renderPage();
    this.renderSidebar();
    this.renderBreadcrumb();
    this.closeMobileMenu();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  buildSearchIndex() {
    const index = [];
    CURIO_DATA.cards.forEach(c => {
      index.push({ type:'card', title:`Card #${c.number} — ${c.title}`, subtitle:`by ${c.artist} · Supply: ${c.supply.toLocaleString()}`, image:c.imageUrl, hash:`cards/${c.number}`, keywords:`${c.title} ${c.artist} ${c.set} ${c.number} card ${c.description}`.toLowerCase() });
    });
    CURIO_DATA.artists.forEach(a => {
      index.push({ type:'artist', title:a.name, subtitle:`Artist · ${a.cards.length} cards`, image:null, hash:`artists/${a.slug}`, keywords:`${a.name} ${a.realName||''} artist ${a.bio}`.toLowerCase() });
    });
    CURIO_DATA.founders.forEach(f => {
      index.push({ type:'founder', title:f.name, subtitle:f.role, image:null, hash:`founders`, keywords:`${f.name} ${f.alias||''} founder ${f.bio}`.toLowerCase() });
    });
    CURIO_DATA.articles.forEach(a => {
      index.push({ type:'article', title:a.title, subtitle:a.category, image:null, hash:`articles/${a.id}`, keywords:`${a.title} ${a.category} ${a.excerpt} ${a.content}`.toLowerCase() });
    });
    return index;
  }

  setupSearch() {
    const input = document.getElementById('site-search');
    const results = document.getElementById('search-results');
    if (!input) return;
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (q.length < 2) { results.classList.remove('visible'); return; }
      const matches = this.searchIndex.filter(item => item.keywords.includes(q)).slice(0, 10);
      if (!matches.length) { results.classList.remove('visible'); return; }
      results.innerHTML = matches.map(m => `
        <div class="search-result-item" data-hash="${m.hash}">
          ${m.image ? `<img class="search-result-thumb" src="${m.image}" alt="" loading="lazy">` : `<div class="search-result-thumb" style="display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:var(--text-light);">${m.type[0].toUpperCase()}</div>`}
          <div class="search-result-info">
            <div class="search-result-title">${m.title}</div>
            <div class="search-result-meta">${m.subtitle}</div>
          </div>
          <span class="search-result-category">${m.type}</span>
        </div>
      `).join('');
      results.querySelectorAll('.search-result-item').forEach(el => {
        el.addEventListener('click', () => { window.location.hash = el.dataset.hash; input.value = ''; results.classList.remove('visible'); });
      });
      results.classList.add('visible');
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.header-search')) results.classList.remove('visible'); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { input.value = ''; results.classList.remove('visible'); } });
  }

  setupMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    if (!btn) return;
    btn.addEventListener('click', () => { btn.classList.toggle('open'); document.getElementById('main-nav').classList.toggle('mobile-open'); });
  }
  closeMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    if (btn) btn.classList.remove('open');
    const nav = document.getElementById('main-nav');
    if (nav) nav.classList.remove('mobile-open');
  }

  setupLightbox() {
    const lb = document.createElement('div');
    lb.className = 'lightbox'; lb.id = 'lightbox';
    lb.innerHTML = '<span class="lightbox-close">&times;</span><img src="" alt="">';
    document.body.appendChild(lb);
    lb.addEventListener('click', () => lb.classList.remove('visible'));
  }
  openLightbox(src) {
    const lb = document.getElementById('lightbox');
    lb.querySelector('img').src = src;
    lb.classList.add('visible');
  }

  renderBreadcrumb() {
    const bc = document.getElementById('breadcrumb');
    if (!bc) return;
    const crumbs = [{ label: 'Main Page', hash: 'home' }];
    const pageNames = { cards:'Cards', artists:'Artists', founders:'Founders', timeline:'Timeline', articles:'Articles', gallery:'Gallery' };
    if (this.currentPage !== 'home') crumbs.push({ label: pageNames[this.currentPage] || this.currentPage, hash: this.currentPage });
    if (this.currentDetail) {
      let n = this.currentDetail;
      if (this.currentPage === 'cards') { const c = CURIO_DATA.cards.find(c => String(c.number) === this.currentDetail); if (c) n = `#${c.number} ${c.title}`; }
      else if (this.currentPage === 'artists') { const a = CURIO_DATA.artists.find(a => a.slug === this.currentDetail); if (a) n = a.name; }
      else if (this.currentPage === 'articles') { const a = CURIO_DATA.articles.find(a => a.id === this.currentDetail); if (a) n = a.title; }
      crumbs.push({ label: n, hash: null });
    }
    bc.innerHTML = crumbs.map((c, i) => i === crumbs.length - 1 && crumbs.length > 1 ? `<span class="current">${c.label}</span>` : `<a href="#${c.hash}">${c.label}</a>`).join('<span class="sep">›</span>');
  }

  renderPage() {
    const main = document.getElementById('main-content');
    if (!main) return;
    main.style.animation = 'none'; main.offsetHeight; main.style.animation = '';
    switch (this.currentPage) {
      case 'home': main.innerHTML = this.renderHome(); break;
      case 'cards': main.innerHTML = this.currentDetail ? this.renderCardDetail(this.currentDetail) : this.renderCardsIndex(); break;
      case 'artists': main.innerHTML = this.currentDetail ? this.renderArtistDetail(this.currentDetail) : this.renderArtistsIndex(); break;
      case 'founders': main.innerHTML = this.renderFoundersIndex(); break;
      case 'timeline': main.innerHTML = this.renderTimeline(); break;
      case 'articles': main.innerHTML = this.currentDetail ? this.renderArticleDetail(this.currentDetail) : this.renderArticlesIndex(); break;
      case 'gallery': main.innerHTML = this.renderGallery(); break;
      default: main.innerHTML = this.renderHome();
    }
    main.querySelectorAll('[data-goto]').forEach(el => { el.addEventListener('click', () => { window.location.hash = el.dataset.goto; }); });
    main.querySelectorAll('[data-lightbox]').forEach(el => { el.addEventListener('click', (e) => { e.stopPropagation(); this.openLightbox(el.dataset.lightbox); }); });
    this.setupFilters();
  }

  renderHome() {
    const todayCard = this.getCardOfTheDay();
    const featuredArticles = CURIO_DATA.articles.filter(a => a.featured).slice(0, 4);
    const randomFacts = this.getRandomFacts(5);
    return `
      <h1 class="page-title">Welcome to the Curio Archive</h1>
      <p class="page-subtitle">The encyclopedic history of Curio Cards — the first art NFT collection on Ethereum</p>
      <div class="content-text"><strong>Curio Cards</strong> is the first art NFT collection on the Ethereum blockchain, launched on <a href="#timeline">May 9, 2017</a> — six weeks before CryptoPunks. Created by <a href="#founders">Thomas Hunt</a>, <a href="#founders">Travis Uhrig</a>, and <a href="#founders">Rhett Creighton</a>, the collection features <a href="#cards">31 unique digital artworks</a> (including the legendary <a href="#cards/17b">17b misprint</a>) by <a href="#artists">seven artists</a>. Referenced in the ERC-721 NFT Standard, the collection is preserved in The Arctic World Archive alongside GitHub's open source code, designed to last 1,000 years.</div>
      <div class="stats-row">
        <div class="stat-box"><div class="stat-value">31</div><div class="stat-label">Cards</div></div>
        <div class="stat-box"><div class="stat-value">7</div><div class="stat-label">Artists</div></div>
        <div class="stat-box"><div class="stat-value">29,700</div><div class="stat-label">Total Supply</div></div>
        <div class="stat-box"><div class="stat-value">111</div><div class="stat-label">Max Complete Sets</div></div>
        <div class="stat-box"><div class="stat-value">$1.27M</div><div class="stat-label">Christie's Sale</div></div>
      </div>
      <h2 class="section-heading">Card of the Day</h2>
      <div class="clearfix" style="margin-bottom:20px;">
        <div class="infobox" style="width:220px;">
          <div class="infobox-title">#${todayCard.number} ${todayCard.title}</div>
          <img class="infobox-image" src="${todayCard.imageUrl}" alt="${todayCard.title}" data-lightbox="${todayCard.imageUrl}" style="cursor:pointer;">
          <div class="infobox-caption">${todayCard.set} · by ${todayCard.artist}</div>
          <div class="infobox-row"><span class="infobox-label">Supply</span><span class="infobox-value">${todayCard.supply.toLocaleString()}</span></div>
          <div class="infobox-row"><span class="infobox-label">Minted</span><span class="infobox-value">${this.formatDate(todayCard.mintDate)}</span></div>
        </div>
        <p class="content-text">${todayCard.description}</p>
        ${todayCard.significance ? `<p class="content-text"><strong>Significance:</strong> ${todayCard.significance}</p>` : ''}
        <p class="content-text"><a href="#cards/${todayCard.number}">Read full article →</a></p>
      </div>
      <h2 class="section-heading">Featured Articles</h2>
      <div class="home-featured">
        ${featuredArticles.map(a => `<div class="home-feature-card" data-goto="articles/${a.id}"><div class="home-feature-label">${a.category}</div><div class="home-feature-title">${a.title}</div><div class="home-feature-excerpt">${a.excerpt}</div></div>`).join('')}
      </div>
      <h2 class="section-heading">Did you know…</h2>
      <ul class="dyk-list">${randomFacts.map(f => `<li>${f}</li>`).join('')}</ul>
      <h2 class="section-heading">The Sets</h2>
      <table class="wiki-table"><thead><tr><th>Set</th><th>Artist</th><th>Cards</th><th>Description</th></tr></thead><tbody>
        ${CURIO_DATA.sets.map(s => `<tr><td><strong>${s.name}</strong></td><td><a href="#artists/${CURIO_DATA.artists.find(a => a.name === s.artist)?.slug || ''}">${s.artist}</a></td><td style="font-family:var(--font-mono);font-size:0.8rem;">${s.cards.join(', ')}</td><td style="font-size:0.82rem;color:var(--text-secondary)">${s.description}</td></tr>`).join('')}
      </tbody></table>`;
  }

  renderCardsIndex() {
    const cards = CURIO_DATA.cards;
    const sets = [...new Set(cards.map(c => c.set))];
    return `
      <h1 class="page-title">Cards</h1>
      <p class="content-text">The complete Curio Cards collection contains 31 unique digital artworks (cards #1–30 plus the legendary <a href="#cards/17b">17b misprint</a>), created by seven artists between May and August 2017.</p>
      <div class="filter-bar" id="card-filters"><label>Filter:</label><button class="filter-btn active" data-filter="all">All Cards</button>${sets.map(s => `<button class="filter-btn" data-filter="${s}">${s}</button>`).join('')}</div>
      <div class="card-grid" id="card-grid">
        ${cards.map(c => `<div class="card-tile" data-goto="cards/${c.number}" data-set="${c.set}"><img class="card-tile-image" src="${c.imageUrl}" alt="${c.title}" loading="lazy"><div class="card-tile-info"><div class="card-tile-number">#${c.number}</div><div class="card-tile-title">${c.title}</div><div class="card-tile-artist">${c.artist}</div><div class="card-tile-supply">Supply: ${c.supply.toLocaleString()}</div></div></div>`).join('')}
      </div>
      <h2 class="section-heading">Supply Overview</h2>
      <table class="wiki-table"><thead><tr><th class="num">#</th><th>Title</th><th>Artist</th><th>Set</th><th>Supply</th><th>Burned</th><th>Active</th><th>Minted</th></tr></thead><tbody>
        ${cards.map(c => `<tr style="cursor:pointer" data-goto="cards/${c.number}"><td class="num">${c.number}</td><td><a href="#cards/${c.number}">${c.title}</a></td><td><a href="#artists/${c.artistSlug}">${c.artist}</a></td><td><span class="set-badge">${c.set}</span></td><td>${c.supply.toLocaleString()}</td><td>${c.burned.toLocaleString()}</td><td>${c.issued.toLocaleString()}</td><td style="font-size:0.8rem;color:var(--text-muted)">${this.formatDate(c.mintDate)}</td></tr>`).join('')}
      </tbody></table>`;
  }

  renderCardDetail(num) {
    const card = CURIO_DATA.cards.find(c => String(c.number) === String(num));
    if (!card) return '<p>Card not found.</p>';
    const artist = CURIO_DATA.artists.find(a => a.slug === card.artistSlug);
    const set = CURIO_DATA.sets.find(s => s.cards.map(String).includes(String(card.number)));
    const otherInSet = set ? set.cards.filter(n => String(n) !== String(card.number)) : [];
    const idx = CURIO_DATA.cards.indexOf(card);
    const prev = CURIO_DATA.cards[idx - 1];
    const next = CURIO_DATA.cards[idx + 1];
    return `
      <a href="#cards" class="back-link">All Cards</a>
      <h1 class="page-title">Card #${card.number} — ${card.title}</h1>
      <div class="clearfix">
        <div class="infobox">
          <div class="infobox-title">${card.title}</div>
          <img class="infobox-image" src="${card.imageUrl}" alt="${card.title}" data-lightbox="${card.imageUrl}" style="cursor:pointer;">
          <div class="infobox-caption">Card #${card.number} in the Curio Cards collection</div>
          <div class="infobox-section">Card Details</div>
          <div class="infobox-row"><span class="infobox-label">Number</span><span class="infobox-value">#${card.number}</span></div>
          <div class="infobox-row"><span class="infobox-label">Title</span><span class="infobox-value">${card.title}</span></div>
          <div class="infobox-row"><span class="infobox-label">Artist</span><span class="infobox-value"><a href="#artists/${card.artistSlug}">${card.artist}</a></span></div>
          <div class="infobox-row"><span class="infobox-label">Set</span><span class="infobox-value">${card.set}</span></div>
          <div class="infobox-section">Supply</div>
          <div class="infobox-row"><span class="infobox-label">Total</span><span class="infobox-value">${card.supply.toLocaleString()}</span></div>
          <div class="infobox-row"><span class="infobox-label">Burned</span><span class="infobox-value">${card.burned.toLocaleString()}</span></div>
          <div class="infobox-row"><span class="infobox-label">Active</span><span class="infobox-value">${card.issued.toLocaleString()}</span></div>
          ${card.locked ? `<div class="infobox-row"><span class="infobox-label">Locked</span><span class="infobox-value">${card.locked.toLocaleString()}</span></div>` : ''}
          <div class="infobox-section">Blockchain</div>
          <div class="infobox-row"><span class="infobox-label">Minted</span><span class="infobox-value">${this.formatDate(card.mintDate)}</span></div>
          <div class="infobox-row"><span class="infobox-label">Week</span><span class="infobox-value">${card.releaseWeek}</span></div>
          <div class="infobox-row"><span class="infobox-label">IPFS</span><span class="infobox-value" style="font-size:0.72rem;word-break:break-all;font-family:var(--font-mono)">${card.ipfsHash ? card.ipfsHash.slice(0,16)+'…' : 'N/A'}</span></div>
        </div>
        <p class="content-text"><strong>${card.title}</strong> is card #${card.number} in the <a href="#cards">Curio Cards</a> collection, created by <a href="#artists/${card.artistSlug}">${card.artist}</a>. It is part of the <strong>${card.set}</strong> and was minted on ${this.formatDate(card.mintDate)} during week ${card.releaseWeek} of the collection's release.</p>
        <p class="content-text">${card.description}</p>
        ${card.significance ? `<h2 class="section-heading">Significance</h2><p class="content-text">${card.significance}</p>` : ''}
        <h2 class="section-heading">Supply Details</h2>
        <p class="content-text">Card #${card.number} has a total minted supply of ${card.supply.toLocaleString()} tokens. Of these, ${card.burned.toLocaleString()} have been burned, leaving ${card.issued.toLocaleString()} in active circulation${card.locked ? `, of which ${card.locked.toLocaleString()} are locked in the wrapper contract` : ''}.</p>
        ${otherInSet.length ? `<h2 class="section-heading">Other Cards in ${set.name}</h2><div class="card-grid" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr));">${otherInSet.map(n => { const c = CURIO_DATA.cards.find(x => String(x.number) === String(n)); return c ? `<div class="card-tile" data-goto="cards/${c.number}"><img class="card-tile-image" src="${c.imageUrl}" alt="${c.title}" loading="lazy"><div class="card-tile-info"><div class="card-tile-number">#${c.number}</div><div class="card-tile-title">${c.title}</div></div></div>` : ''; }).join('')}</div>` : ''}
        <h2 class="section-heading">About the Artist</h2>
        <p class="content-text">${artist ? `<a href="#artists/${artist.slug}">${artist.name}</a> — ${artist.bio.split('.').slice(0,2).join('.')}. <a href="#artists/${artist.slug}">Read more →</a>` : card.artist}</p>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:24px;padding-top:16px;border-top:1px solid var(--border-light);font-size:0.85rem;">
        ${prev ? `<a href="#cards/${prev.number}">← #${prev.number} ${prev.title}</a>` : '<span></span>'}
        ${next ? `<a href="#cards/${next.number}">#${next.number} ${next.title} →</a>` : '<span></span>'}
      </div>`;
  }

  renderArtistsIndex() {
    return `
      <h1 class="page-title">Artists</h1>
      <p class="content-text">Seven artists contributed to the Curio Cards collection between May and August 2017. Each brought a unique vision to the first art NFTs on Ethereum.</p>
      <div class="artist-grid">
        ${CURIO_DATA.artists.map(a => `<div class="artist-card" data-goto="artists/${a.slug}"><div class="artist-card-name">${a.name}</div>${a.realName && a.realName !== 'Unknown' && a.realName !== a.name ? `<div class="artist-card-real">${a.realName}</div>` : ''}<div class="artist-card-bio">${a.bio}</div><div class="artist-card-cards">${a.cards.map(n => `<span class="card-badge">#${n}</span>`).join('')}</div></div>`).join('')}
      </div>
      <h2 class="section-heading">Cards by Artist</h2>
      <table class="wiki-table"><thead><tr><th>Artist</th><th>Cards</th><th>Total</th><th>Contribution</th></tr></thead><tbody>
        ${CURIO_DATA.artists.map(a => `<tr><td><a href="#artists/${a.slug}">${a.name}</a></td><td style="font-family:var(--font-mono);font-size:0.8rem;">${a.cards.join(', ')}</td><td>${a.cards.length}</td><td style="font-size:0.82rem;color:var(--text-secondary)">${a.contribution}</td></tr>`).join('')}
      </tbody></table>`;
  }

  renderArtistDetail(slug) {
    const artist = CURIO_DATA.artists.find(a => a.slug === slug);
    if (!artist) return '<p>Artist not found.</p>';
    const artistCards = artist.cards.map(n => CURIO_DATA.cards.find(c => String(c.number) === String(n))).filter(Boolean);
    return `
      <a href="#artists" class="back-link">All Artists</a>
      <h1 class="page-title">${artist.name}</h1>
      <div class="clearfix">
        <div class="infobox" style="width:260px;">
          <div class="infobox-title">${artist.name}</div>
          ${artistCards[0] ? `<img class="infobox-image" src="${artistCards[0].imageUrl}" alt="${artistCards[0].title}" data-lightbox="${artistCards[0].imageUrl}" style="cursor:pointer;">` : ''}
          <div class="infobox-caption">Featured: ${artistCards[0] ? `Card #${artistCards[0].number} ${artistCards[0].title}` : ''}</div>
          <div class="infobox-section">Artist Info</div>
          ${artist.realName && artist.realName !== 'Unknown' ? `<div class="infobox-row"><span class="infobox-label">Real Name</span><span class="infobox-value">${artist.realName}</span></div>` : ''}
          <div class="infobox-row"><span class="infobox-label">Cards</span><span class="infobox-value">${artist.cards.map(n => `<a href="#cards/${n}">#${n}</a>`).join(', ')}</span></div>
          ${artist.twitter ? `<div class="infobox-row"><span class="infobox-label">Twitter</span><span class="infobox-value">${artist.twitter}</span></div>` : ''}
          ${artist.website ? `<div class="infobox-row"><span class="infobox-label">Website</span><span class="infobox-value"><a href="${artist.website}" target="_blank">${new URL(artist.website).hostname}</a></span></div>` : ''}
          ${artist.notableWorks ? `<div class="infobox-row"><span class="infobox-label">Known For</span><span class="infobox-value">${artist.notableWorks}</span></div>` : ''}
        </div>
        <p class="content-text">${artist.bio}</p>
        <h2 class="section-heading">Cards by ${artist.name}</h2>
        <div class="card-grid" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr));">
          ${artistCards.map(c => `<div class="card-tile" data-goto="cards/${c.number}"><img class="card-tile-image" src="${c.imageUrl}" alt="${c.title}" loading="lazy"><div class="card-tile-info"><div class="card-tile-number">#${c.number}</div><div class="card-tile-title">${c.title}</div><div class="card-tile-supply">Supply: ${c.supply.toLocaleString()}</div></div></div>`).join('')}
        </div>
        <h2 class="section-heading">Supply Data</h2>
        <table class="wiki-table"><thead><tr><th class="num">#</th><th>Title</th><th>Set</th><th>Supply</th><th>Burned</th><th>Active</th></tr></thead><tbody>
          ${artistCards.map(c => `<tr><td class="num">${c.number}</td><td><a href="#cards/${c.number}">${c.title}</a></td><td><span class="set-badge">${c.set}</span></td><td>${c.supply.toLocaleString()}</td><td>${c.burned.toLocaleString()}</td><td>${c.issued.toLocaleString()}</td></tr>`).join('')}
        </tbody></table>
      </div>`;
  }

  renderFoundersIndex() {
    return `
      <h1 class="page-title">Founders</h1>
      <p class="content-text">Curio Cards was created by three individuals who met through the cryptocurrency community in San Francisco.</p>
      <div class="founder-grid">
        ${CURIO_DATA.founders.map(f => `<div class="founder-card"><div class="founder-card-name">${f.name}</div>${f.alias ? `<div class="founder-card-alias">${f.alias}</div>` : ''}<div class="founder-card-role">${f.role}</div><div class="founder-card-bio">${f.bio}</div><div class="founder-card-cards">Card appearances: ${f.cardAppearances.map(n => `<a href="#cards/${n}">#${n}</a>`).join(', ')}</div></div>`).join('')}
      </div>
      <h2 class="section-heading">Founders Table</h2>
      <table class="wiki-table"><thead><tr><th>Name</th><th>Alias</th><th>Role</th><th>Contribution</th><th>Cards</th></tr></thead><tbody>
        ${CURIO_DATA.founders.map(f => `<tr><td><strong>${f.name}</strong></td><td style="font-style:italic;color:var(--text-muted)">${f.alias || '—'}</td><td>${f.role}</td><td style="font-size:0.82rem;color:var(--text-secondary)">${f.contribution}</td><td>${f.cardAppearances.map(n => `<a href="#cards/${n}">#${n}</a>`).join(', ')}</td></tr>`).join('')}
      </tbody></table>`;
  }

  renderTimeline() {
    return `
      <h1 class="page-title">Timeline</h1>
      <p class="content-text">A chronological history of the Curio Cards project, from its origins in 2016 to its recognition as a foundational NFT collection.</p>
      <div class="toc"><div class="toc-title">Contents</div><ul class="toc-list"><li><a href="#" onclick="return false;">Origins (2016–Early 2017)</a></li><li><a href="#" onclick="return false;">Launch & Releases (May–Aug 2017)</a></li><li><a href="#" onclick="return false;">The Quiet Years (2017–2020)</a></li><li><a href="#" onclick="return false;">Rediscovery & Recognition (2021–Present)</a></li></ul></div>
      <div class="timeline">
        ${CURIO_DATA.timeline.map(t => `<div class="timeline-item ${t.importance}"><div class="timeline-dot"></div><div class="timeline-date">${t.date}${t.importance === 'critical' ? ' <span class="timeline-badge badge-critical">Key Moment</span>' : ''}${t.type === 'milestone' && t.importance !== 'critical' ? ' <span class="timeline-badge badge-milestone">Milestone</span>' : ''}${t.type === 'launch' ? ' <span class="timeline-badge badge-launch">Launch</span>' : ''}${t.type === 'sale' ? ' <span class="timeline-badge badge-sale">Sale</span>' : ''}</div><div class="timeline-title">${t.title}</div><div class="timeline-text">${t.text}</div></div>`).join('')}
      </div>`;
  }

  renderArticlesIndex() {
    const categories = [...new Set(CURIO_DATA.articles.map(a => a.category))];
    return `
      <h1 class="page-title">Articles</h1>
      <p class="content-text">In-depth articles exploring the history, lore, and cultural significance of the Curio Cards collection.</p>
      <div class="filter-bar" id="article-filters"><label>Category:</label><button class="filter-btn active" data-filter="all">All</button>${categories.map(c => `<button class="filter-btn" data-filter="${c}">${c}</button>`).join('')}</div>
      <div class="article-list" id="article-list">
        ${CURIO_DATA.articles.map(a => `<div class="article-item" data-goto="articles/${a.id}" data-category="${a.category}"><div class="article-item-category">${a.category}${a.featured ? ' · Featured' : ''}</div><div class="article-item-title">${a.title}</div><div class="article-item-excerpt">${a.excerpt}</div></div>`).join('')}
      </div>`;
  }

  renderArticleDetail(id) {
    const article = CURIO_DATA.articles.find(a => a.id === id);
    if (!article) return '<p>Article not found.</p>';
    const paragraphs = article.content.split('\n\n').filter(p => p.trim());
    return `
      <a href="#articles" class="back-link">All Articles</a>
      <h1 class="page-title">${article.title}</h1>
      <div class="article-meta"><span class="tag">${article.category}</span>${article.featured ? '<span class="tag">Featured</span>' : ''} <span>${article.date}</span></div>
      <div class="article-body">${paragraphs.map(p => `<p>${this.linkifyText(p.trim())}</p>`).join('')}</div>
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid var(--border-light);"><h3 class="subsection-heading">Related</h3><div style="display:flex;gap:12px;flex-wrap:wrap;">${CURIO_DATA.articles.filter(a => a.id !== id).slice(0, 3).map(a => `<a href="#articles/${a.id}" style="font-size:0.85rem;">→ ${a.title}</a>`).join('')}</div></div>`;
  }

  renderGallery() {
    return `
      <h1 class="page-title">Gallery</h1>
      <p class="content-text">Browse all 31 artworks in the Curio Cards collection. Click any card to view it full-size.</p>
      <div class="filter-bar" id="gallery-filters"><label>Set:</label><button class="filter-btn active" data-filter="all">All</button>${CURIO_DATA.sets.map(s => `<button class="filter-btn" data-filter="${s.name}">${s.name}</button>`).join('')}</div>
      <div class="gallery-grid" id="gallery-grid">
        ${CURIO_DATA.cards.map(c => `<div class="gallery-item" data-set="${c.set}" data-lightbox="${c.imageUrl}"><img src="${c.imageUrl}" alt="${c.title}" loading="lazy"><div class="gallery-item-overlay"><span>#${c.number} ${c.title}</span></div></div>`).join('')}
      </div>`;
  }

  renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    let html = `
      <div class="sidebar-box">
        <div class="sidebar-box-header"><span class="icon">📋</span> Quick Facts</div>
        <div class="sidebar-box-body"><ul class="sidebar-list">
          <li><span class="label">Launch</span><br><span class="value">May 9, 2017</span></li>
          <li><span class="label">Completed</span><br><span class="value">August 21, 2017</span></li>
          <li><span class="label">Total Cards</span><br><span class="value">31 (incl. 17b)</span></li>
          <li><span class="label">Total Supply</span><br><span class="value">29,700</span></li>
          <li><span class="label">Artists</span><br><span class="value">7</span></li>
          <li><span class="label">Max Sets</span><br><span class="value">111</span></li>
          <li><span class="label">Blockchain</span><br><span class="value">Ethereum (Pre-ERC-721)</span></li>
          <li><span class="label">Storage</span><br><span class="value">IPFS (first to use)</span></li>
        </ul></div>
      </div>`;
    if (this.currentPage !== 'articles') {
      html += `<div class="sidebar-box"><div class="sidebar-box-header"><span class="icon">📰</span> Featured Articles</div>${CURIO_DATA.articles.filter(a => a.featured).slice(0, 3).map(a => `<div class="sidebar-featured"><h4><a href="#articles/${a.id}">${a.title}</a></h4><p>${a.excerpt.slice(0, 100)}…</p></div>`).join('')}</div>`;
    }
    html += `<div class="sidebar-box"><div class="sidebar-box-header"><span class="icon">⭐</span> Key Milestones</div><div class="sidebar-box-body"><ul class="sidebar-list">
      <li><a href="#cards/1">First Art NFT on Ethereum</a><br><span class="label">Card #1 Apples</span></li>
      <li><a href="#cards/23">First Animated NFT</a><br><span class="label">Card #23 The Barbarian</span></li>
      <li><a href="#cards/20">First Portrait on Ethereum</a><br><span class="label">Card #20 Mad Bitcoins</span></li>
      <li><a href="#cards/17b">Legendary Misprint</a><br><span class="label">Card #17b</span></li>
      <li><a href="#articles/christies">Christie's $1.27M Sale</a><br><span class="label">October 1, 2021</span></li>
    </ul></div></div>`;
    html += `<div class="sidebar-box"><div class="sidebar-box-header"><span class="icon">🔗</span> External Links</div><div class="sidebar-box-body"><ul class="sidebar-list">
      <li><a href="https://curio.cards" target="_blank">Official Website</a></li>
      <li><a href="https://docs.curio.cards" target="_blank">Documentation</a></li>
      <li><a href="https://opensea.io/collection/curiocardswrapper" target="_blank">OpenSea Collection</a></li>
      <li><a href="https://discord.curio.cards" target="_blank">Discord Community</a></li>
      <li><a href="https://en.wikipedia.org/wiki/Curio_Cards" target="_blank">Wikipedia</a></li>
    </ul></div></div>`;
    sidebar.innerHTML = html;
  }

  setupFilters() {
    document.querySelectorAll('.filter-bar').forEach(bar => {
      bar.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.applyFilter(bar.id, btn.dataset.filter);
        });
      });
    });
  }
  applyFilter(barId, filter) {
    const selMap = { 'card-filters':'#card-grid .card-tile', 'article-filters':'#article-list .article-item', 'gallery-filters':'#gallery-grid .gallery-item' };
    const attrMap = { 'card-filters':'set', 'article-filters':'category', 'gallery-filters':'set' };
    const items = document.querySelectorAll(selMap[barId] || '');
    items.forEach(item => { item.style.display = (filter === 'all' || item.dataset[attrMap[barId]] === filter) ? '' : 'none'; });
  }

  getCardOfTheDay() {
    const d = new Date(); const doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    return CURIO_DATA.cards[doy % CURIO_DATA.cards.length];
  }
  getRandomFacts(n) {
    const f = [...CURIO_DATA.keyFacts]; const r = [];
    for (let i = 0; i < n && f.length; i++) { const idx = Math.floor(Math.random() * f.length); r.push(f.splice(idx, 1)[0]); }
    return r;
  }
  formatDate(s) { if (!s) return '—'; return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }); }
  linkifyText(t) { return t.replace(/Card #(\d+b?)/g, '<a href="#cards/$1">Card #$1</a>'); }
}

document.addEventListener('DOMContentLoaded', () => { window.curioArchive = new CurioArchive(); });
