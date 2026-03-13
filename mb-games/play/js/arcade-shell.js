const META_KEY = "mb_arcade_meta_v1";

export const ARCADE_GAMES = {
  bear_breakout: { label: "Bear Market Breakout", path: "bear-market-breakout.html" },
  mempool_meltdown: { label: "Mempool Meltdown", path: "mempool-meltdown.html" },
  laser_eyes_lancer: { label: "Laser Eyes Lancer", path: "laser-eyes-lancer.html" },
  bull_signal_barrage: { label: "Bull Signal Barrage", path: "bull-signal-barrage.html" },
  hashrate_highway: { label: "Hashrate Highway", path: "hashrate-highway.html" },
  moon_miner_dash: { label: "Moon Miner Dash", path: "moon-miner-dash.html" },
  cold_storage_siege: { label: "Cold Storage Siege", path: "cold-storage-siege.html" },
  whale_watch_panic: { label: "Whale Watch Panic", path: "whale-watch-panic.html" },
  wcn_signal_jam: { label: "WCN Signal Jam", path: "wcn-signal-jam.html" },
  mad_meme_blaster: { label: "Mad Bitcoins Meme Blaster", path: "mad-meme-blaster.html" },
  halving_havoc: { label: "Halving Havoc", path: "halving-havoc.html" },
  citadel_climb: { label: "Citadel Climb", path: "citadel-climb.html" },
  node_hopper_drift: { label: "Node Hopper Drift", path: "node-hopper-drift.html" },
};

function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
}

function loadMeta() {
  const data = safeGet(META_KEY, null);
  if (data && typeof data === "object" && data.version === 1 && data.games) return data;
  return { version: 1, games: {} };
}

function saveMeta(meta) {
  safeSet(META_KEY, meta);
}

function ensureGame(meta, gameId) {
  if (!meta.games[gameId]) {
    meta.games[gameId] = {
      plays: 0,
      best: 0,
      totalScore: 0,
      lastScore: 0,
      lastAt: 0,
    };
  }
  return meta.games[gameId];
}

function dispatchKey(type, key) {
  window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }));
}

function createTouchControls(mapping) {
  const shell = document.querySelector(".game-shell");
  if (!shell || !mapping) return;

  const wrap = document.createElement("div");
  wrap.className = "touch-controls";

  const leftPad = document.createElement("div");
  leftPad.className = "touch-pad";
  const rightPad = document.createElement("div");
  rightPad.className = "touch-pad touch-pad-actions";

  const build = (label, key, parent) => {
    if (!key) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "touch-btn";
    btn.textContent = label;

    const down = (ev) => {
      ev.preventDefault();
      btn.classList.add("active");
      dispatchKey("keydown", key);
    };

    const up = (ev) => {
      ev.preventDefault();
      btn.classList.remove("active");
      dispatchKey("keyup", key);
    };

    btn.addEventListener("pointerdown", down);
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointercancel", up);
    btn.addEventListener("pointerleave", up);
    parent.appendChild(btn);
  };

  build("LEFT", mapping.left, leftPad);
  build("RIGHT", mapping.right, leftPad);
  build("UP", mapping.up, leftPad);
  build("DOWN", mapping.down, leftPad);

  build("A", mapping.a, rightPad);
  build("B", mapping.b, rightPad);

  wrap.appendChild(leftPad);
  wrap.appendChild(rightPad);
  shell.appendChild(wrap);
}

function createToolbar(gameId) {
  const shell = document.querySelector(".game-shell");
  if (!shell) return null;

  const bar = document.createElement("div");
  bar.className = "arcade-toolbar";

  const pauseBtn = document.createElement("button");
  pauseBtn.type = "button";
  pauseBtn.className = "tool-btn";
  pauseBtn.textContent = "Pause (P)";

  const muteBtn = document.createElement("button");
  muteBtn.type = "button";
  muteBtn.className = "tool-btn";
  muteBtn.textContent = "Audio On (M)";

  const hubLink = document.createElement("a");
  hubLink.className = "tool-link";
  hubLink.href = "index.html";
  hubLink.textContent = "Arcade Hub";

  const stat = document.createElement("span");
  stat.className = "tool-stat";
  stat.textContent = `Best: 0 (${ARCADE_GAMES[gameId]?.label || gameId})`;

  bar.appendChild(pauseBtn);
  bar.appendChild(muteBtn);
  bar.appendChild(hubLink);
  bar.appendChild(stat);

  const heading = shell.querySelector("h2");
  if (heading) heading.insertAdjacentElement("afterend", bar);
  else shell.prepend(bar);

  return { pauseBtn, muteBtn, stat };
}

function createAudio() {
  let ctx = null;
  let unlocked = false;

  const unlock = () => {
    if (unlocked) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      unlocked = true;
    } catch {
      unlocked = false;
    }
  };

  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });

  return {
    blip(freq = 520, duration = 0.05, volume = 0.035, muted = false) {
      if (!unlocked || muted || !ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    },
  };
}

export function bootArcadeGame({ gameId, touch }) {
  const toolbar = createToolbar(gameId);
  createTouchControls(touch);

  let paused = false;
  let muted = false;
  let scorePrev = 0;
  let sessionBest = 0;
  let finalized = false;
  let lastBeepAt = 0;

  const audio = createAudio();

  const meta = loadMeta();
  const game = ensureGame(meta, gameId);
  game.plays += 1;
  saveMeta(meta);

  const applyToolbar = () => {
    if (!toolbar) return;
    toolbar.pauseBtn.textContent = paused ? "Resume (P)" : "Pause (P)";
    toolbar.muteBtn.textContent = muted ? "Audio Off (M)" : "Audio On (M)";
    const m = loadMeta();
    const g = ensureGame(m, gameId);
    toolbar.stat.textContent = `Best: ${g.best} (${ARCADE_GAMES[gameId]?.label || gameId})`;
  };

  const commitRun = (value) => {
    if (value <= 0) return;
    const m = loadMeta();
    const g = ensureGame(m, gameId);
    g.totalScore += value;
    g.lastScore = value;
    g.lastAt = Date.now();
    if (value > g.best) g.best = value;
    saveMeta(m);
    applyToolbar();
  };

  const finalize = () => {
    if (finalized) return;
    finalized = true;
    commitRun(sessionBest);
  };

  window.addEventListener("pagehide", finalize);
  window.addEventListener("beforeunload", finalize);

  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "p") {
      paused = !paused;
      e.preventDefault();
      applyToolbar();
    }
    if (k === "m") {
      muted = !muted;
      e.preventDefault();
      applyToolbar();
    }
  });

  if (toolbar) {
    toolbar.pauseBtn.addEventListener("click", () => {
      paused = !paused;
      applyToolbar();
    });
    toolbar.muteBtn.addEventListener("click", () => {
      muted = !muted;
      applyToolbar();
    });
  }

  applyToolbar();

  return {
    update(scoreNow) {
      if (scoreNow > sessionBest) sessionBest = scoreNow;

      // Detect restart/run rollover and persist previous run score.
      if (scoreNow + 120 < scorePrev && scorePrev > 150) {
        commitRun(scorePrev);
        scorePrev = scoreNow;
      }

      const now = performance.now();
      if (scoreNow - scorePrev >= 40 && now - lastBeepAt > 120) {
        audio.blip(510 + ((scoreNow % 6) * 45), 0.04, 0.03, muted);
        lastBeepAt = now;
      }

      scorePrev = scoreNow;
      applyToolbar();
    },

    isPaused() {
      return paused;
    },

    drawPause(ctx, w, h) {
      if (!paused) return;
      ctx.fillStyle = "rgba(0, 0, 0, 0.52)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#ffe3a4";
      ctx.font = "12px 'Press Start 2P'";
      const msg = "PAUSED - PRESS P";
      const tw = ctx.measureText(msg).width;
      ctx.fillText(msg, w / 2 - tw / 2, h / 2);
    },
  };
}

export function getArcadeSnapshot() {
  const meta = loadMeta();
  const games = {};
  let totalBest = 0;
  let totalScore = 0;
  let totalPlays = 0;

  for (const [id, cfg] of Object.entries(ARCADE_GAMES)) {
    const g = ensureGame(meta, id);
    games[id] = {
      id,
      label: cfg.label,
      path: cfg.path,
      ...g,
    };
    totalBest += g.best;
    totalScore += g.totalScore;
    totalPlays += g.plays;
  }

  return { games, totalBest, totalScore, totalPlays };
}

export function getRandomGamePath() {
  const list = Object.values(ARCADE_GAMES);
  return list[Math.floor(Math.random() * list.length)].path;
}
