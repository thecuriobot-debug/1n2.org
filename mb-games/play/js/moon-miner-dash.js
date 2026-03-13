import { bootArcadeGame } from "./arcade-shell.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  score: document.getElementById("score"),
  high: document.getElementById("high"),
  lives: document.getElementById("lives"),
  speed: document.getElementById("speed"),
  sats: document.getElementById("sats"),
};

const W = canvas.width;
const H = canvas.height;
const GROUND_Y = 390;
const KEY = "mb_miner_high";
const arcade = bootArcadeGame({
  gameId: "moon_miner_dash",
  touch: { up: "ArrowUp", a: " " },
});

const keys = Object.create(null);
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;

  if ([" ", "arrowup", "w", "r"].includes(k) || e.key === " ") e.preventDefault();

  if (k === "r") {
    restart();
    return;
  }

  if (gameOver && (k === " " || k === "enter")) restart();

  if ((k === " " || k === "arrowup" || k === "w") && player.onGround && !gameOver) {
    player.vy = -430;
    player.onGround = false;
  }
});
window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

let highScore = Number(localStorage.getItem(KEY) || 0);
let score = 0;
let sats = 0;
let lives = 3;
let speed = 220;
let elapsed = 0;
let gameOver = false;
let obstacleClock = 0;
let satClock = 0;
let clouds = [];
let obstacles = [];
let satDrops = [];

const player = {
  x: 100,
  y: GROUND_Y,
  w: 30,
  h: 36,
  vy: 0,
  onGround: true,
  invuln: 0,
};

for (let i = 0; i < 8; i++) {
  clouds.push({ x: Math.random() * W, y: 40 + Math.random() * 140, s: 0.7 + Math.random() * 1.3 });
}

function restart() {
  score = 0;
  sats = 0;
  lives = 3;
  speed = 220;
  elapsed = 0;
  gameOver = false;
  obstacleClock = 0;
  satClock = 0;
  obstacles = [];
  satDrops = [];

  player.y = GROUND_Y;
  player.vy = 0;
  player.onGround = true;
  player.invuln = 0;

  syncUi();
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function spawnObstacle() {
  const tall = Math.random() < 0.4;
  const w = tall ? 24 : 34;
  const h = tall ? 56 : 30;
  obstacles.push({ x: W + 20, y: GROUND_Y + 36 - h, w, h });
}

function spawnSat() {
  satDrops.push({ x: W + 16, y: GROUND_Y - (20 + Math.random() * 120), w: 14, h: 14, pulse: Math.random() * 6.28 });
}

function loseLife() {
  if (player.invuln > 0 || gameOver) return;
  lives -= 1;
  player.invuln = 1.2;
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
  speed = Math.min(470, 220 + elapsed * 10 + sats * 0.9);

  player.vy += 920 * dt;
  player.y += player.vy * dt;

  if (player.y >= GROUND_Y) {
    player.y = GROUND_Y;
    player.vy = 0;
    player.onGround = true;
  }

  player.invuln = Math.max(0, player.invuln - dt);

  obstacleClock += dt;
  satClock += dt;

  const obstacleRate = Math.max(0.45, 1.18 - elapsed * 0.01);
  if (obstacleClock >= obstacleRate) {
    obstacleClock = 0;
    spawnObstacle();
  }

  if (satClock >= 0.95) {
    satClock = 0;
    spawnSat();
  }

  for (const c of clouds) {
    c.x -= 35 * c.s * dt;
    if (c.x < -100) {
      c.x = W + 40;
      c.y = 40 + Math.random() * 140;
    }
  }

  for (const o of obstacles) o.x -= speed * dt;
  obstacles = obstacles.filter((o) => o.x > -80);

  for (const s of satDrops) {
    s.x -= (speed * 0.95) * dt;
    s.pulse += dt * 6;
  }
  satDrops = satDrops.filter((s) => s.x > -30);

  const pRect = { x: player.x, y: player.y, w: player.w, h: player.h };

  for (const o of obstacles) {
    if (overlap(pRect, o)) {
      o.x = -200;
      loseLife();
    }
  }

  for (const s of satDrops) {
    if (overlap(pRect, s)) {
      s.x = -200;
      sats += 1;
      score += 55;
      if (sats % 15 === 0) score += 400;
    }
  }

  score += Math.floor(dt * (18 + speed * 0.08));

  if (score > highScore) {
    highScore = score;
    localStorage.setItem(KEY, String(highScore));
  }

  syncUi();
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0a1430");
  g.addColorStop(1, "#1a0f28");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(190,210,255,0.16)";
  for (const c of clouds) {
    ctx.fillRect(c.x, c.y, 60 * c.s, 20 * c.s);
    ctx.fillRect(c.x + 16 * c.s, c.y - 8 * c.s, 30 * c.s, 16 * c.s);
  }

  ctx.fillStyle = "#2f2d44";
  ctx.fillRect(0, GROUND_Y + 36, W, H - (GROUND_Y + 36));

  ctx.fillStyle = "#5f4f2a";
  for (let x = -40; x < W + 40; x += 40) {
    const mx = (x - ((elapsed * speed * 0.08) % 40));
    ctx.fillRect(mx, GROUND_Y + 30, 20, 6);
  }
}

function drawPlayer() {
  const blink = player.invuln > 0 && Math.floor(performance.now() / 70) % 2;
  if (blink) return;

  ctx.fillStyle = "#f7c24a";
  ctx.fillRect(player.x, player.y, player.w, player.h);
  ctx.fillStyle = "#1a263b";
  ctx.fillRect(player.x + 7, player.y + 8, 16, 10);
  ctx.fillStyle = "#84f8c5";
  ctx.fillRect(player.x + 5, player.y + 21, 6, 10);
  ctx.fillRect(player.x + 19, player.y + 21, 6, 10);
}

function drawObstacles() {
  for (const o of obstacles) {
    ctx.fillStyle = "#ff6770";
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.fillStyle = "#5e1f24";
    ctx.fillRect(o.x + 4, o.y + 4, o.w - 8, 8);
  }
}

function drawSats() {
  for (const s of satDrops) {
    const pulse = Math.sin(s.pulse) * 1.8;
    ctx.fillStyle = "#ffd159";
    ctx.fillRect(s.x - pulse * 0.3, s.y - pulse * 0.3, s.w + pulse * 0.6, s.h + pulse * 0.6);
    ctx.fillStyle = "#764e0e";
    ctx.font = "9px 'Press Start 2P'";
    ctx.fillText("B", s.x + 3, s.y + 10);
  }
}

function drawHud() {
  ctx.fillStyle = "#112142";
  ctx.fillRect(0, 0, W, 30);
  ctx.fillStyle = "#8fd8ff";
  ctx.font = "10px 'Press Start 2P'";
  ctx.fillText("MOON MINER DASH", 10, 20);

  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.64)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffe1a0";
    ctx.font = "12px 'Press Start 2P'";
    const txt = "REKT - PRESS SPACE";
    const tw = ctx.measureText(txt).width;
    ctx.fillText(txt, W / 2 - tw / 2, H / 2);
  }
}

function draw() {
  drawBackground();
  drawObstacles();
  drawSats();
  drawPlayer();
  drawHud();
}

function syncUi() {
  ui.score.textContent = String(score);
  ui.high.textContent = String(highScore);
  ui.lives.textContent = String(lives);
  ui.speed.textContent = `${(speed / 220).toFixed(1)}x`;
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
