import { bootArcadeGame } from "./arcade-shell.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  score: document.getElementById("score"),
  high: document.getElementById("high"),
  vault: document.getElementById("vault"),
  wave: document.getElementById("wave"),
  keys: document.getElementById("keys"),
};

const W = canvas.width;
const H = canvas.height;
const KEY = "mb_siege_high";
const arcade = bootArcadeGame({
  gameId: "cold_storage_siege",
  touch: { left: "ArrowLeft", right: "ArrowRight", a: " ", b: "x" },
});

const keysDown = Object.create(null);
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keysDown[k] = true;

  if (["arrowleft", "arrowright", " ", "z", "x", "r"].includes(k) || e.key === " ") e.preventDefault();

  if (k === "r") {
    restart();
    return;
  }

  if (gameOver && (k === " " || k === "enter")) restart();
});
window.addEventListener("keyup", (e) => {
  keysDown[e.key.toLowerCase()] = false;
});

let highScore = Number(localStorage.getItem(KEY) || 0);
let score = 0;
let vault = 5;
let wave = 1;
let keyCharges = 0;
let elapsed = 0;
let gameOver = false;
let spawnClock = 0;

const player = {
  x: W / 2,
  y: H - 64,
  w: 32,
  h: 20,
  speed: 290,
  fireCd: 0,
};

let bullets = [];
let enemies = [];
let drops = [];
let stars = [];

for (let i = 0; i < 55; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, s: 0.4 + Math.random() * 1.6 });

function restart() {
  score = 0;
  vault = 5;
  wave = 1;
  keyCharges = 0;
  elapsed = 0;
  gameOver = false;
  spawnClock = 0;

  player.x = W / 2;
  player.fireCd = 0;

  bullets = [];
  enemies = [];
  drops = [];

  syncUi();
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function fire() {
  if (player.fireCd > 0 || gameOver) return;
  player.fireCd = 0.14;
  bullets.push({ x: player.x + player.w / 2 - 2, y: player.y - 6, w: 4, h: 10, vy: -430 });
}

function spawnEnemy() {
  const typeRoll = Math.random();
  const tough = typeRoll < 0.18;
  const w = tough ? 28 : 22;
  const h = tough ? 22 : 16;

  enemies.push({
    x: 24 + Math.random() * (W - 48 - w),
    y: -24,
    w,
    h,
    hp: tough ? 3 : 1,
    vy: (50 + Math.random() * 55 + wave * 7),
    type: tough ? "whale" : "drone",
  });
}

function useKeyBlast() {
  if (keyCharges <= 0 || gameOver) return;
  keyCharges -= 1;
  score += enemies.length * 80;
  enemies = [];
  drops = [];
}

function loseVault(amount) {
  vault -= amount;
  if (vault <= 0) {
    vault = 0;
    gameOver = true;
  }
}

function update(dt) {
  if (gameOver) {
    if (score > highScore) {
      highScore = score;
      localStorage.setItem(KEY, String(highScore));
    }
    syncUi();
    return;
  }

  elapsed += dt;
  wave = 1 + Math.floor(elapsed / 16);

  for (const s of stars) {
    s.y += (12 + s.s * 22) * dt;
    if (s.y > H + 2) {
      s.y = -2;
      s.x = Math.random() * W;
    }
  }

  if (keysDown.arrowleft || keysDown.a) player.x -= player.speed * dt;
  if (keysDown.arrowright || keysDown.d) player.x += player.speed * dt;
  player.x = Math.max(8, Math.min(W - player.w - 8, player.x));

  if (keysDown[" "] || keysDown.z) fire();
  if (keysDown.x) {
    keysDown.x = false;
    useKeyBlast();
  }

  player.fireCd = Math.max(0, player.fireCd - dt);

  spawnClock += dt;
  const spawnRate = Math.max(0.22, 0.92 - wave * 0.04);
  if (spawnClock >= spawnRate) {
    spawnClock = 0;
    spawnEnemy();
  }

  for (const b of bullets) b.y += b.vy * dt;
  bullets = bullets.filter((b) => b.y > -20);

  for (const e of enemies) e.y += e.vy * dt;

  for (const e of enemies) {
    if (e.y > H - 34) {
      e.hp = 0;
      loseVault(1);
    }
  }

  for (const d of drops) d.y += d.vy * dt;
  drops = drops.filter((d) => d.y < H + 20);

  for (const b of bullets) {
    for (const e of enemies) {
      if (e.hp <= 0 || !overlap(b, e)) continue;
      b.y = -100;
      e.hp -= 1;
      score += e.type === "whale" ? 45 : 28;
      if (e.hp <= 0) {
        score += e.type === "whale" ? 180 : 95;
        if (Math.random() < 0.14) drops.push({ x: e.x + e.w / 2 - 7, y: e.y + 4, w: 14, h: 14, vy: 110 });
      }
      break;
    }
  }

  const pRect = { x: player.x, y: player.y, w: player.w, h: player.h };
  for (const e of enemies) {
    if (e.hp > 0 && overlap(pRect, e)) {
      e.hp = 0;
      loseVault(1);
    }
  }

  for (const d of drops) {
    if (overlap(pRect, d)) {
      d.y = H + 100;
      keyCharges += 1;
      score += 120;
    }
  }

  enemies = enemies.filter((e) => e.hp > 0 && e.y < H + 40);

  score += Math.floor(dt * (12 + wave * 3));

  if (score > highScore) {
    highScore = score;
    localStorage.setItem(KEY, String(highScore));
  }

  syncUi();
}

function draw() {
  ctx.fillStyle = "#050917";
  ctx.fillRect(0, 0, W, H);

  for (const s of stars) {
    const b = Math.floor(120 + s.s * 70);
    ctx.fillStyle = `rgb(${b},${b},${b})`;
    ctx.fillRect(s.x, s.y, Math.max(1, s.s), Math.max(1, s.s));
  }

  ctx.fillStyle = "#0f1e3a";
  ctx.fillRect(0, 0, W, 30);
  ctx.fillStyle = "#8fd7ff";
  ctx.font = "10px 'Press Start 2P'";
  ctx.fillText("COLD STORAGE SIEGE", 10, 20);

  ctx.fillStyle = "#1d2e5b";
  ctx.fillRect(0, H - 32, W, 32);
  ctx.fillStyle = "#79ffb4";
  ctx.fillRect(20, H - 24, Math.max(0, (W - 40) * (vault / 5)), 10);

  for (const d of drops) {
    ctx.fillStyle = "#ffe273";
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = "#61480f";
    ctx.font = "8px 'Press Start 2P'";
    ctx.fillText("K", d.x + 4, d.y + 10);
  }

  for (const b of bullets) {
    ctx.fillStyle = "#86ffbb";
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }

  for (const e of enemies) {
    if (e.type === "whale") {
      ctx.fillStyle = "#b38cff";
      ctx.fillRect(e.x, e.y, e.w, e.h);
      ctx.fillStyle = "#3d236a";
      ctx.fillRect(e.x + 5, e.y + 6, e.w - 10, 8);
    } else {
      ctx.fillStyle = "#ff6f7c";
      ctx.fillRect(e.x, e.y, e.w, e.h);
      ctx.fillStyle = "#581922";
      ctx.fillRect(e.x + 4, e.y + 4, e.w - 8, 6);
    }
  }

  ctx.fillStyle = "#ffbf46";
  ctx.fillRect(player.x, player.y, player.w, player.h);
  ctx.fillStyle = "#223759";
  ctx.fillRect(player.x + 8, player.y + 5, 16, 8);
  ctx.fillStyle = "#ff704f";
  ctx.fillRect(player.x + 2, player.y + 13, 5, 4);
  ctx.fillRect(player.x + player.w - 7, player.y + 13, 5, 4);

  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.66)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffe2a5";
    ctx.font = "12px 'Press Start 2P'";
    const txt = "VAULT LOST - PRESS SPACE";
    const tw = ctx.measureText(txt).width;
    ctx.fillText(txt, W / 2 - tw / 2, H / 2);
  }
}

function syncUi() {
  ui.score.textContent = String(score);
  ui.high.textContent = String(highScore);
  ui.vault.textContent = String(vault);
  ui.wave.textContent = String(wave);
  ui.keys.textContent = String(keyCharges);
  arcade.update(score);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.04, (now - last) / 1000);
  last = now;
  if (!arcade.isPaused()) update(dt);
  draw();
  arcade.drawPause(ctx, W, H);
  requestAnimationFrame(frame);
}

restart();
requestAnimationFrame(frame);
