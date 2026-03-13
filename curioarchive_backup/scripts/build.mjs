import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseFrontmatter, markdownToHtml, stripMarkdown } from '../lib/markdown.mjs';
import { renderLayout } from '../templates/layout.mjs';
import { renderCardContent } from '../templates/card-page.mjs';
import { renderArtistContent } from '../templates/artist-page.mjs';

const MISSING = 'Data not available at time of publication.';
const MONTHS = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const DATA_DIR = path.join(ROOT, 'data');
const ASSETS_DIR = path.join(ROOT, 'assets');
const DIST_DIR = path.join(ROOT, 'dist');

const SITE_BASE = '/curioarchive/dist';
const buildTimestamp = new Date().toISOString();
const searchEntries = [];

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
  if (Array.isArray(value) && value.length === 0) return MISSING;
  if (!Array.isArray(value) && typeof value === 'object' && Object.keys(value).length === 0) return MISSING;
  return `<pre>${esc(JSON.stringify(value, null, 2))}</pre>`;
}

function toRoute(route) {
  return String(route || '').replace(/^\/+|\/+$/g, '');
}

function routeToFile(route) {
  const r = toRoute(route);
  if (!r) return path.join(DIST_DIR, 'index.html');
  return path.join(DIST_DIR, r, 'index.html');
}

function routeToUrl(route) {
  const r = toRoute(route);
  if (!r) return `${SITE_BASE}/`;
  return `${SITE_BASE}/${r}/`;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readFileSafe(filePath) {
  return fs.readFile(filePath, 'utf8');
}

async function readMarkdown(relPath) {
  const text = await readFileSafe(path.join(ROOT, relPath));
  const { data, content } = parseFrontmatter(text);
  return {
    data,
    markdown: content,
    html: markdownToHtml(content),
    plain: stripMarkdown(content)
  };
}

async function readJson(relPath) {
  const raw = await readFileSafe(path.join(ROOT, relPath));
  return JSON.parse(raw);
}

async function writeRoute(route, html) {
  const filePath = routeToFile(route);
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, html, 'utf8');
}

async function addPage({ route, title, description, pageUpdated, pageTitle, bodyHtml, searchText }) {
  const html = renderLayout({
    title,
    description,
    content: bodyHtml,
    siteBase: SITE_BASE,
    buildTimestamp,
    pageUpdated,
    pageTitle
  });

  await writeRoute(route, html);

  searchEntries.push({
    title,
    url: routeToUrl(route),
    description: description || `${title} | Curio Archive`,
    text: searchText || ''
  });
}

function eventSortKey(event) {
  const year = Number.parseInt(event.year, 10);
  const month = Number.parseInt(event.month, 10);
  const day = Number.parseInt(event.day, 10);
  return {
    year: Number.isFinite(year) ? year : Number.MAX_SAFE_INTEGER,
    month: Number.isFinite(month) ? month : 13,
    day: Number.isFinite(day) ? day : 32
  };
}

function sortEventsAsc(events) {
  return [...events].sort((a, b) => {
    const ka = eventSortKey(a);
    const kb = eventSortKey(b);
    if (ka.year !== kb.year) return ka.year - kb.year;
    if (ka.month !== kb.month) return ka.month - kb.month;
    return ka.day - kb.day;
  });
}

async function build() {
  await fs.rm(DIST_DIR, { recursive: true, force: true });
  await ensureDir(path.join(DIST_DIR, 'assets'));

  await fs.copyFile(path.join(ASSETS_DIR, 'main.css'), path.join(DIST_DIR, 'assets', 'main.css'));
  await fs.copyFile(path.join(ASSETS_DIR, 'search.js'), path.join(DIST_DIR, 'assets', 'search.js'));

  const [
    homeMd,
    cardsMd,
    cardTemplateMd,
    artistsMd,
    artistTemplateMd,
    timelineMd,
    provenanceMd,
    onThisDayMd,
    aboutMd,
    cards,
    artists,
    events,
    provenance
  ] = await Promise.all([
    readMarkdown('content/pages/home.md'),
    readMarkdown('content/pages/cards.md'),
    readMarkdown('content/pages/card-template.md'),
    readMarkdown('content/pages/artists.md'),
    readMarkdown('content/pages/artist-template.md'),
    readMarkdown('content/pages/timeline.md'),
    readMarkdown('content/pages/provenance.md'),
    readMarkdown('content/pages/on-this-day.md'),
    readMarkdown('content/pages/about.md'),
    readJson('data/cards.json'),
    readJson('data/artists.json'),
    readJson('data/events.json'),
    readJson('data/provenance.json')
  ]);

  const updateFiles = (await fs.readdir(path.join(CONTENT_DIR, 'updates')))
    .filter((name) => name.endsWith('.md'));

  const updates = await Promise.all(
    updateFiles.map(async (name) => {
      const doc = await readMarkdown(path.join('content', 'updates', name));
      return {
        title: doc.data.title || name,
        date: doc.data.date || '',
        summary: doc.data.summary || MISSING,
        plain: doc.plain
      };
    })
  );

  updates.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const recentUpdatesHtml = updates.length
    ? `<section><h3>Recent Updates</h3><ul>${updates
        .map((u) => `<li><strong>${esc(u.date || MISSING)}</strong> - ${esc(u.title)}. ${esc(u.summary)}</li>`)
        .join('')}</ul></section>`
    : `<section><h3>Recent Updates</h3><p>${MISSING}</p></section>`;

  await addPage({
    route: '',
    title: homeMd.data.title || 'Home',
    description: homeMd.data.description,
    pageUpdated: homeMd.data.updated,
    pageTitle: 'Home',
    bodyHtml: homeMd.html + recentUpdatesHtml,
    searchText: `${homeMd.plain} ${updates.map((u) => `${u.title} ${u.summary}`).join(' ')}`
  });

  const sortedCards = [...cards].sort((a, b) => Number(a.number || 0) - Number(b.number || 0));

  const cardRows = sortedCards
    .map((card) => {
      const slug = show(card.slug);
      const number = show(card.number);
      const title = show(card.title || `Curio Card #${number}`);
      return `<tr>
        <td>${esc(number)}</td>
        <td><a href="${SITE_BASE}/cards/${esc(slug)}/">${esc(title)}</a></td>
        <td>${esc(show(card.artist))}</td>
        <td>${esc(show(card.mint_date))}</td>
        <td>${esc(show(card.supply))}</td>
      </tr>`;
    })
    .join('');

  await addPage({
    route: 'cards',
    title: cardsMd.data.title || 'Cards',
    description: cardsMd.data.description,
    pageUpdated: cardsMd.data.updated,
    pageTitle: 'Cards',
    bodyHtml:
      cardsMd.html +
      `<table>
        <thead><tr><th>Card #</th><th>Title</th><th>Artist</th><th>Mint Date</th><th>Supply</th></tr></thead>
        <tbody>${cardRows || `<tr><td colspan="5">${MISSING}</td></tr>`}</tbody>
      </table>`,
    searchText: `${cardsMd.plain} ${sortedCards.map((c) => `${c.title || ''} ${c.artist || ''}`).join(' ')}`
  });

  await addPage({
    route: 'cards/template',
    title: cardTemplateMd.data.title || 'Individual Card Template',
    description: cardTemplateMd.data.description,
    pageUpdated: cardTemplateMd.data.updated,
    pageTitle: 'Individual Card Template',
    bodyHtml:
      cardTemplateMd.html +
      renderCardContent({
        number: '{NUMBER}',
        title: 'Curio Card #{NUMBER}',
        artist: '{NAME}',
        mint_date: '{DATE}',
        supply: '{NUMBER}',
        sales_stats: '{JSON}',
        notable_sales: '{JSON}',
        holder_distribution: '{JSON}'
      }),
    searchText: cardTemplateMd.plain
  });

  for (const card of sortedCards) {
    const slug = String(card.slug || `card-${card.number}`);
    const title = card.title || `Curio Card #${show(card.number)}`;
    const body = renderCardContent(card);

    await addPage({
      route: `cards/${slug}`,
      title,
      description: `${title} historical record in Curio Archive.`,
      pageUpdated: buildTimestamp.slice(0, 10),
      pageTitle: title,
      bodyHtml: body,
      searchText: `${title} ${show(card.artist)} ${show(card.mint_date)}`
    });
  }

  const sortedArtists = [...artists].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

  const artistRows = sortedArtists
    .map((artist) => {
      const slug = show(artist.slug);
      const cardsList = Array.isArray(artist.known_curio_cards) && artist.known_curio_cards.length
        ? artist.known_curio_cards.join(', ')
        : MISSING;
      return `<tr>
        <td><a href="${SITE_BASE}/artists/${esc(slug)}/">${esc(show(artist.name))}</a></td>
        <td>${esc(cardsList)}</td>
        <td>${esc(show(artist.active_period_in_curio))}</td>
      </tr>`;
    })
    .join('');

  await addPage({
    route: 'artists',
    title: artistsMd.data.title || 'Artists',
    description: artistsMd.data.description,
    pageUpdated: artistsMd.data.updated,
    pageTitle: 'Artists',
    bodyHtml:
      artistsMd.html +
      `<table>
        <thead><tr><th>Name</th><th>Known Curio Cards</th><th>Active Period in Curio</th></tr></thead>
        <tbody>${artistRows || `<tr><td colspan="3">${MISSING}</td></tr>`}</tbody>
      </table>`,
    searchText: `${artistsMd.plain} ${sortedArtists.map((a) => `${a.name || ''}`).join(' ')}`
  });

  await addPage({
    route: 'artists/template',
    title: artistTemplateMd.data.title || 'Artist Profile Template',
    description: artistTemplateMd.data.description,
    pageUpdated: artistTemplateMd.data.updated,
    pageTitle: 'Artist Profile Template',
    bodyHtml:
      artistTemplateMd.html +
      renderArtistContent({
        name: '{NAME}',
        known_curio_cards: '{LIST}',
        active_period_in_curio: '{DATES}',
        sales_stats_aggregate: '{JSON}',
        biography: null
      }),
    searchText: artistTemplateMd.plain
  });

  for (const artist of sortedArtists) {
    const slug = String(artist.slug || String(artist.name || '').toLowerCase().replace(/\s+/g, '-'));
    const title = `Artist: ${show(artist.name)}`;

    await addPage({
      route: `artists/${slug}`,
      title,
      description: `Artist profile record for ${show(artist.name)} in Curio Archive.`,
      pageUpdated: buildTimestamp.slice(0, 10),
      pageTitle: title,
      bodyHtml: renderArtistContent(artist),
      searchText: `${show(artist.name)} ${show(artist.active_period_in_curio)}`
    });
  }

  const sortedEvents = sortEventsAsc(events);
  const timelineRows = sortedEvents
    .map((event) => {
      const year = show(event.year);
      const monthN = Number.parseInt(event.month, 10);
      const month = Number.isFinite(monthN) && monthN >= 1 && monthN <= 12 ? MONTHS[monthN] : MISSING;
      const title = show(event.event_title || event.title);
      const description = show(event.description);
      const impact = show(event.impact_assessment);

      return `<tr>
        <td>${esc(year)}</td>
        <td>${esc(month)}</td>
        <td>${esc(title)}</td>
        <td>${esc(description)}</td>
        <td>${esc(impact)}</td>
      </tr>`;
    })
    .join('');

  await addPage({
    route: 'timeline',
    title: timelineMd.data.title || 'Timeline',
    description: timelineMd.data.description,
    pageUpdated: timelineMd.data.updated,
    pageTitle: 'Timeline',
    bodyHtml:
      timelineMd.html +
      `<table>
        <thead><tr><th>Year</th><th>Month</th><th>Event Title</th><th>Description</th><th>Impact Assessment</th></tr></thead>
        <tbody>${timelineRows || `<tr><td colspan="5">${MISSING}</td></tr>`}</tbody>
      </table>`,
    searchText: `${timelineMd.plain} ${sortedEvents.map((e) => `${e.event_title || ''} ${e.description || ''}`).join(' ')}`
  });

  const provenanceRows = provenance
    .map((entry) => {
      const cardNumber = show(entry.card_number);
      const slug = show(entry.card_slug);
      const link = `<a href="${SITE_BASE}/cards/${esc(slug)}/">Curio Card #${esc(cardNumber)}</a>`;
      return `<tr>
        <td>${link}</td>
        <td>${esc(show(entry.wallet_transfers))}</td>
        <td>${esc(show(entry.longest_holding_period))}</td>
        <td>${esc(show(entry.latest_observed_holder))}</td>
        <td>${esc(show(entry.last_observed_transfer_date))}</td>
      </tr>`;
    })
    .join('');

  await addPage({
    route: 'provenance',
    title: provenanceMd.data.title || 'Provenance Index',
    description: provenanceMd.data.description,
    pageUpdated: provenanceMd.data.updated,
    pageTitle: 'Provenance Index',
    bodyHtml:
      provenanceMd.html +
      `<table>
        <thead><tr><th>Card</th><th>Wallet Transfers</th><th>Longest Holding Period</th><th>Latest Observed Holder</th><th>Last Observed Transfer Date</th></tr></thead>
        <tbody>${provenanceRows || `<tr><td colspan="5">${MISSING}</td></tr>`}</tbody>
      </table>`,
    searchText: `${provenanceMd.plain} ${provenance.map((p) => `card ${p.card_number || ''}`).join(' ')}`
  });

  const datedEvents = sortedEvents.filter((e) => Number.isFinite(Number.parseInt(e.month, 10)) && Number.isFinite(Number.parseInt(e.day, 10)));
  const grouped = new Map();
  for (const event of datedEvents) {
    const m = Number.parseInt(event.month, 10);
    const d = Number.parseInt(event.day, 10);
    if (!m || !d || m < 1 || m > 12 || d < 1 || d > 31) continue;
    const key = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(event);
  }

  const onThisDaySections = [...grouped.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, list]) => {
      const [m, d] = key.split('-').map((n) => Number.parseInt(n, 10));
      const label = `${MONTHS[m]} ${d}`;
      const eventsHtml = list
        .map((e) => `<li><strong>${esc(show(e.year))}:</strong> ${esc(show(e.event_title || e.title))}. ${esc(show(e.impact_assessment))}</li>`)
        .join('');
      return `<section><h3>${esc(label)}</h3><ul>${eventsHtml}</ul></section>`;
    })
    .join('');

  await addPage({
    route: 'on-this-day',
    title: onThisDayMd.data.title || 'On This Day Archive',
    description: onThisDayMd.data.description,
    pageUpdated: onThisDayMd.data.updated,
    pageTitle: 'On This Day Archive',
    bodyHtml: onThisDayMd.html + (onThisDaySections || `<p>${MISSING}</p>`),
    searchText: `${onThisDayMd.plain} ${datedEvents.map((e) => `${e.event_title || ''}`).join(' ')}`
  });

  await addPage({
    route: 'about',
    title: aboutMd.data.title || 'About / Methodology',
    description: aboutMd.data.description,
    pageUpdated: aboutMd.data.updated,
    pageTitle: 'About / Methodology',
    bodyHtml: aboutMd.html,
    searchText: aboutMd.plain
  });

  await addPage({
    route: 'search',
    title: 'Search',
    description: 'Search across Curio Archive pages.',
    pageUpdated: buildTimestamp.slice(0, 10),
    pageTitle: 'Search',
    bodyHtml: `
<section>
  <p>Search indexed pages by title, description, and page content.</p>
  <label for="search-page-query">Query</label>
  <input id="search-page-query" type="search" value="" placeholder="Search archive" />
  <p id="search-status">Loading search index...</p>
  <div id="search-results" class="search-results"></div>
</section>`,
    searchText: 'Search page'
  });

  await fs.writeFile(path.join(DIST_DIR, 'search-index.json'), JSON.stringify(searchEntries, null, 2), 'utf8');

  console.log(`Generated ${searchEntries.length} pages into ${DIST_DIR}`);
}

build().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
