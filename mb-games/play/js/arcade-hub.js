import { getArcadeSnapshot, getRandomGamePath } from "./arcade-shell.js";

function formatNum(v) {
  return new Intl.NumberFormat().format(v);
}

function updateCardBadges(snapshot) {
  for (const card of document.querySelectorAll("[data-game-id]")) {
    const id = card.getAttribute("data-game-id");
    const game = snapshot.games[id];
    if (!game) continue;

    const bestEl = card.querySelector("[data-best]");
    const playsEl = card.querySelector("[data-plays]");
    if (bestEl) bestEl.textContent = `BEST ${formatNum(game.best)}`;
    if (playsEl) playsEl.textContent = `${formatNum(game.plays)} plays`;
  }
}

function getCardScore(snapshot, id, key) {
  const game = snapshot.games[id] || { best: 0, plays: 0 };
  if (key === "best") return game.best || 0;
  if (key === "plays") return game.plays || 0;
  return 0;
}

function applyHubControls(snapshot) {
  const searchEl = document.getElementById("game-search");
  const sortEl = document.getElementById("game-sort");
  const grid = document.querySelector(".game-grid");
  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll(".game-card[data-game-id]"));
  cards.forEach((card, i) => {
    if (!card.dataset.featuredIndex) card.dataset.featuredIndex = String(i);
  });

  const refresh = () => {
    const q = (searchEl?.value || "").trim().toLowerCase();
    const sort = sortEl?.value || "featured";

    for (const card of cards) {
      const text = card.textContent.toLowerCase();
      const visible = !q || text.includes(q);
      card.hidden = !visible;
    }

    const visibleCards = cards.filter((c) => !c.hidden);
    visibleCards.sort((a, b) => {
      const ida = a.getAttribute("data-game-id");
      const idb = b.getAttribute("data-game-id");
      if (sort === "title") {
        return a.querySelector("h4").textContent.localeCompare(b.querySelector("h4").textContent);
      }
      if (sort === "best" || sort === "plays") {
        const diff = getCardScore(snapshot, idb, sort) - getCardScore(snapshot, ida, sort);
        if (diff !== 0) return diff;
      }
      return Number(a.dataset.featuredIndex) - Number(b.dataset.featuredIndex);
    });

    for (const card of visibleCards) grid.appendChild(card);
  };

  searchEl?.addEventListener("input", refresh);
  sortEl?.addEventListener("change", refresh);
  refresh();
}

function renderStats(snapshot) {
  const wrap = document.getElementById("hub-stats");
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="hub-stat-card">
      <span>Total Plays</span>
      <strong>${formatNum(snapshot.totalPlays)}</strong>
    </div>
    <div class="hub-stat-card">
      <span>Total Score Banked</span>
      <strong>${formatNum(snapshot.totalScore)}</strong>
    </div>
    <div class="hub-stat-card">
      <span>Combined Best Sum</span>
      <strong>${formatNum(snapshot.totalBest)}</strong>
    </div>
  `;
}

function bindRandomButton() {
  const btn = document.getElementById("random-game");
  if (!btn) return;

  btn.addEventListener("click", () => {
    window.location.href = getRandomGamePath();
  });
}

function main() {
  const snapshot = getArcadeSnapshot();
  updateCardBadges(snapshot);
  renderStats(snapshot);
  applyHubControls(snapshot);
  bindRandomButton();
}

main();
