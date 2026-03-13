import { ARCADE_GAMES, getArcadeSnapshot, getRandomGamePath } from "./arcade-shell.js";

const VIBES = {
  bear_breakout: "Atari brick-breaker",
  mempool_meltdown: "NES puzzle pressure",
  laser_eyes_lancer: "Genesis shooter",
  bull_signal_barrage: "Genesis vertical shooter",
  hashrate_highway: "Lane dodge rush",
  moon_miner_dash: "Endless runner",
  cold_storage_siege: "Vault defense",
  whale_watch_panic: "Open-water survival",
  wcn_signal_jam: "WCN signal defense",
  mad_meme_blaster: "Meme formation blaster",
  halving_havoc: "Arena survival",
  citadel_climb: "Vertical platform climb",
  node_hopper_drift: "River survival drift",
};

const ASSET_VERSION = "20260306a";
const IMAGE_EXTENSIONS = ["webp", "png", "jpg", "jpeg", "avif", "svg"];
const pathCache = new Map();

const gridEl = document.getElementById("cartridge-grid");
const previewImg = document.getElementById("preview-image");
const previewScene = document.getElementById("preview-scene");
const previewTitle = document.getElementById("preview-title");
const previewMeta = document.getElementById("preview-meta");
const previewBest = document.getElementById("preview-best");
const previewPlays = document.getElementById("preview-plays");
const playBtn = document.getElementById("play-selected");

const snapshot = getArcadeSnapshot();
const ids = Object.keys(ARCADE_GAMES);
let selectedId = ids[0];
let selectionStamp = 0;

function fmt(n) {
  return new Intl.NumberFormat().format(n || 0);
}

async function resolveAsset(basePath) {
  if (pathCache.has(basePath)) return pathCache.get(basePath);

  const probe = (async () => {
    for (const ext of IMAGE_EXTENSIONS) {
      const candidate = `${basePath}.${ext}?v=${ASSET_VERSION}`;
      try {
        const res = await fetch(candidate, { method: "HEAD", cache: "no-store" });
        if (res.ok) return candidate;
      } catch (_err) {
      }
    }
    return `${basePath}.svg?v=${ASSET_VERSION}`;
  })();

  pathCache.set(basePath, probe);
  return probe;
}

function buildCard(id) {
  const cfg = ARCADE_GAMES[id];
  const stats = snapshot.games[id] || { best: 0, plays: 0 };

  const card = document.createElement("button");
  card.type = "button";
  card.className = "cartridge-card";
  card.dataset.gameId = id;
  card.setAttribute("aria-label", `Select ${cfg.label} cartridge`);

  card.innerHTML = `
    <img src="../assets/cartridges/${id}.svg?v=${ASSET_VERSION}" alt="${cfg.label} Atari style cartridge" loading="lazy" decoding="async">
    <span class="cartridge-label">${cfg.label}</span>
    <span class="cartridge-stat">BEST ${fmt(stats.best)} • ${fmt(stats.plays)} plays</span>
  `;

  const cardImg = card.querySelector("img");
  if (cardImg) {
    resolveAsset(`../assets/cartridges/${id}`)
      .then((src) => {
        cardImg.src = src;
      })
      .catch(() => {
      });
  }

  card.addEventListener("click", () => selectGame(id));
  return card;
}

function renderGrid() {
  if (!gridEl) return;
  const frag = document.createDocumentFragment();
  for (const id of ids) frag.appendChild(buildCard(id));
  gridEl.innerHTML = "";
  gridEl.appendChild(frag);
}

function selectGame(id) {
  selectedId = id;
  const stamp = ++selectionStamp;
  const cfg = ARCADE_GAMES[id];
  const stats = snapshot.games[id] || { best: 0, plays: 0 };

  for (const el of document.querySelectorAll(".cartridge-card")) {
    el.classList.toggle("active", el.dataset.gameId === id);
  }

  if (previewImg) previewImg.alt = `${cfg.label} cartridge preview`;
  if (previewScene) previewScene.alt = `${cfg.label} label painting preview`;

  resolveAsset(`../assets/cartridges/${id}`)
    .then((src) => {
      if (stamp !== selectionStamp || !previewImg) return;
      previewImg.src = src;
    })
    .catch(() => {
    });

  resolveAsset(`../assets/cartridge_paintings/${id}`)
    .then((src) => {
      if (stamp !== selectionStamp || !previewScene) return;
      previewScene.src = src;
    })
    .catch(() => {
      if (stamp !== selectionStamp || !previewScene) return;
      previewScene.src = `../assets/cartridges/${id}.svg?v=${ASSET_VERSION}`;
    });

  if (previewTitle) previewTitle.textContent = cfg.label;
  if (previewMeta) previewMeta.textContent = VIBES[id] || "Arcade mode";
  if (previewBest) previewBest.textContent = fmt(stats.best);
  if (previewPlays) previewPlays.textContent = fmt(stats.plays);
  if (playBtn) playBtn.href = cfg.path;
}

function selectInitial() {
  const ranked = ids
    .map((id) => ({ id, best: snapshot.games[id]?.best || 0, plays: snapshot.games[id]?.plays || 0 }))
    .sort((a, b) => (b.best - a.best) || (b.plays - a.plays));

  selectGame((ranked[0] && ranked[0].id) || ids[0]);
}

function bindActions() {
  const randomBtn = document.getElementById("insert-random");
  if (randomBtn) {
    randomBtn.addEventListener("click", () => {
      window.location.href = getRandomGamePath();
    });
  }

  const nextBtn = document.getElementById("next-cart");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const idx = ids.indexOf(selectedId);
      const next = ids[(idx + 1) % ids.length];
      selectGame(next);
      const active = document.querySelector(`.cartridge-card[data-game-id="${next}"]`);
      if (active) active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    });
  }
}

function main() {
  renderGrid();
  selectInitial();
  bindActions();
}

main();
