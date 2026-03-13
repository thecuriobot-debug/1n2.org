import { bootArcadeGame } from "./arcade-shell.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  score: document.getElementById("score"),
  high: document.getElementById("high"),
  lives: document.getElementById("lives"),
  whales: document.getElementById("whales"),
  sats: document.getElementById("sats"),
};

const W = canvas.width;
const H = canvas.height;
const KEY = "mb_whale_high";
const arcade = bootArcadeGame({
  gameId: "whale_watch_panic",
  touch: { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown", a: " " },
});

const keys = Object.create(null);
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (["arrowleft", "arrowright", "arrowup", "arrowdown", " ", "r"].includes(k) || e.key === " ") e.preventDefault();

  if (k === "r") {
    restart();
    return;
  }

  if (gameOver && (k === " " || k === "enter")) {
    restart();
    return;
  }

  if (k === " " && dashCd <= 0 && !gameOver) {
    dashCd = 1.2;
    dashTimer = 0.14;
  }
});
window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

let highScore = Number(localStorage.getItem(KEY) || 0);
let score = 0;
let lives = 3;
let sats = 0;
let gameOver = false;
let elapsed = 0;
let spawnClock = 0;
let dashCd = 0;
let dashTimer = 0;

const player = {
  x: W / 2,
  y: H / 2,
  w: 22,
  h: 22,
  speed: 190,
  invuln: 0,
};

let whales = [];
let satTokens = [];
let bubbles = [];

for (let i = 0; i < 55; i++) bubbles.push({ x: Math.random() * W, y: Math.random() * H, s: 0.6 + Math.random() * 2.1 });

function restart() {
  score = 0;
  lives = 3;
  sats = 0;
  gameOver = false;
  elapsed = 0;
  spawnClock = 0;
  dashCd = 0;
  dashTimer = 0;

  player.x = W / 2;
  player.y = H / 2;
  player.invuln = 0;

  whales = [];
  satTokens = [];
  spawnWhale();
  syncUi();
}

function spawnWhale() {
  const edge = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;
  if (edge === 0) {
    x = -30;
    y = 20 + Math.random() * (H - 40);
  } else if (edge === 1) {
    x = W + 30;
    y = 20 + Math.random() * (H - 40);
  } else if (edge === 2) {
    x = 20 + Math.random() * (W - 40);
    y = -30;
  } else {
    x = 20 + Math.random() * (W - 40);
    y = H + 30;
  }

  whales.push({
    x,
    y,
    w: 34,
    h: 24,
    speed: 56 + Math.random() * 42 + elapsed * 0.6,
    vx: 0,
    vy: 0,
    wobble: Math.random() * 6.28,
  });
}

function spawnSat() {
  satTokens.push({
    x: 24 + Math.random() * (W - 48),
    y: 34 + Math.random() * (H - 68),
    w: 14,
    h: 14,
    pulse: Math.random() * 6.28,
  });
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function loseLife() {
  if (player.invuln > 0 || gameOver) return;
  lives -= 1;
  player.invuln = 1.3;
  if (lives <= 0) gameOver = true;
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

  for (const b of bubbles) {
    b.y += (8 + b.s * 16) * dt;
    b.x += Math.sin((elapsed + b.s) * 0.8) * 5 * dt;
    if (b.y > H + 4) {
      b.y = -3;
      b.x = Math.random() * W;
    }
  }

  let mx = 0;
  let my = 0;
  if (keys.arrowleft || keys.a) mx -= 1;
  if (keys.arrowright || keys.d) mx += 1;
  if (keys.arrowup || keys.w) my -= 1;
  if (keys.arrowdown || keys.s) my += 1;

  const len = Math.hypot(mx, my) || 1;
  const dashMul = dashTimer > 0 ? 2.2 : 1;
  player.x += (mx / len) * player.speed * dashMul * dt;
  player.y += (my / len) * player.speed * dashMul * dt;

  player.x = Math.max(8, Math.min(W - player.w - 8, player.x));
  player.y = Math.max(34, Math.min(H - player.h - 8, player.y));

  dashCd = Math.max(0, dashCd - dt);
  dashTimer = Math.max(0, dashTimer - dt);
  player.invuln = Math.max(0, player.invuln - dt);

  spawnClock += dt;
  if (spawnClock >= Math.max(1.3, 3.6 - elapsed * 0.03)) {
    spawnClock = 0;
    spawnWhale();
  }

  if (satTokens.length < 4) spawnSat();

  for (const w of whales) {
    const tx = player.x + player.w / 2;
    const ty = player.y + player.h / 2;
    const dx = tx - (w.x + w.w / 2);
    const dy = ty - (w.y + w.h / 2);
    const dlen = Math.hypot(dx, dy) || 1;

    w.wobble += dt * 4;
    const wob = Math.sin(w.wobble) * 22;

    w.vx = (dx / dlen) * w.speed + wob * 0.12;
    w.vy = (dy / dlen) * w.speed - wob * 0.12;

    w.x += w.vx * dt;
    w.y += w.vy * dt;

    w.x = Math.max(-20, Math.min(W - w.w + 20, w.x));
    w.y = Math.max(18, Math.min(H - w.h + 14, w.y));
  }

  for (const s of satTokens) s.pulse += dt * 6;

  const pRect = { x: player.x, y: player.y, w: player.w, h: player.h };
  for (const w of whales) {
    if (overlap(pRect, w)) {
      loseLife();
      break;
    }
  }

  for (const s of satTokens) {
    if (overlap(pRect, s)) {
      s.x = -100;
      sats += 1;
      score += 120;
    }
  }
  satTokens = satTokens.filter((s) => s.x > -40);

  score += Math.floor(dt * (10 + whales.length * 1.8));

  if (score > highScore) {
    highScore = score;
    localStorage.setItem(KEY, String(highScore));
  }

  syncUi();
}

function draw() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#071a2f");
  g.addColorStop(1, "#04263f");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  for (const b of bubbles) {
    const a = 0.22 + b.s * 0.12;
    ctx.fillStyle = `rgba(170,220,255,${a})`;
    ctx.fillRect(b.x, b.y, Math.max(1, b.s), Math.max(1, b.s));
  }

  ctx.fillStyle = "#10314f";
  ctx.fillRect(0, 0, W, 30);
  ctx.fillStyle = "#99e6ff";
  ctx.font = "10px 'Press Start 2P'";
  ctx.fillText("WHALE WATCH PANIC", 10, 20);

  for (const s of satTokens) {
    const pulse = Math.sin(s.pulse) * 1.6;
    ctx.fillStyle = "#ffd45d";
    ctx.fillRect(s.x - pulse * 0.3, s.y - pulse * 0.3, s.w + pulse * 0.6, s.h + pulse * 0.6);
    ctx.fillStyle = "#6d470d";
    ctx.font = "8px 'Press Start 2P'";
    ctx.fillText("B", s.x + 4, s.y + 10);
  }

  for (const w of whales) {
    ctx.fillStyle = "#7aa0ff";
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = "#203875";
    ctx.fillRect(w.x + 6, w.y + 7, w.w - 12, 8);
    ctx.fillStyle = "#e8f2ff";
    ctx.fillRect(w.x + w.w - 10, w.y + 8, 3, 3);
  }

  const blink = player.invuln > 0 && Math.floor(performance.now() / 80) % 2;
  if (!blink) {
    ctx.fillStyle = dashTimer > 0 ? "#9fffd0" : "#ffb947";
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.fillStyle = "#24395e";
    ctx.fillRect(player.x + 6, player.y + 6, 10, 8);
    ctx.fillStyle = "#ff6d5f";
    ctx.fillRect(player.x + 16, player.y + 8, 5, 6);
  }

  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.64)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffe39f";
    ctx.font = "12px 'Press Start 2P'";
    const txt = "WHALED - PRESS SPACE";
    const tw = ctx.measureText(txt).width;
    ctx.fillText(txt, W / 2 - tw / 2, H / 2);
  }
}

function syncUi() {
  ui.score.textContent = String(score);
  ui.high.textContent = String(highScore);
  ui.lives.textContent = String(lives);
  ui.whales.textContent = String(whales.length);
  ui.sats.textContent = String(sats);
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
