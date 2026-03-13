import { bootArcadeGame } from "./arcade-shell.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  score: document.getElementById("score"),
  high: document.getElementById("high"),
  lives: document.getElementById("lives"),
  speed: document.getElementById("speed"),
  crates: document.getElementById("crates"),
};

const W = canvas.width;
const H = canvas.height;
const KEY = "mb_highway_high";
const arcade = bootArcadeGame({
  gameId: "hashrate_highway",
  touch: { left: "ArrowLeft", right: "ArrowRight" },
});

const lanes = [216, 320, 424];
const keys = Object.create(null);
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (["arrowleft", "arrowright", "a", "d", "r", " "].includes(k) || e.key === " ") {
    e.preventDefault();
  }

  if (k === "r") {
    restart();
    return;
  }

  if (gameOver && (k === " " || k === "enter")) {
    restart();
    return;
  }

  if (!gameOver) {
    if (k === "arrowleft" || k === "a") lane = Math.max(0, lane - 1);
    if (k === "arrowright" || k === "d") lane = Math.min(lanes.length - 1, lane + 1);
  }
});
window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

let highScore = Number(localStorage.getItem(KEY) || 0);
let score = 0;
let lives = 3;
let lane = 1;
let crates = 0;
let speedFactor = 1;
let gameOver = false;
let elapsed = 0;
let lineOffset = 0;
let flash = 0;

const player = {
  x: lanes[1],
  y: H - 96,
  w: 54,
  h: 82,
};

let entities = [];
let spawnClock = 0;

function restart() {
  score = 0;
  lives = 3;
  lane = 1;
  crates = 0;
  speedFactor = 1;
  gameOver = false;
  elapsed = 0;
  flash = 0;
  lineOffset = 0;
  player.x = lanes[1];
  entities = [];
  spawnClock = 0;
  syncUi();
}

function spawnEntity() {
  const isCrate = Math.random() < 0.23;
  const laneIndex = Math.floor(Math.random() * lanes.length);
  entities.push({
    type: isCrate ? "crate" : "hazard",
    lane: laneIndex,
    x: lanes[laneIndex],
    y: -80,
    w: isCrate ? 38 : 52,
    h: isCrate ? 38 : 68,
  });
}

function collide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function loseLife() {
  lives -= 1;
  flash = 0.22;
  speedFactor = Math.max(1, speedFactor - 0.15);
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
  speedFactor = 1 + Math.min(2.8, elapsed / 28 + crates * 0.02);

  player.x += (lanes[lane] - player.x) * Math.min(1, dt * 12);

  const roadSpeed = 165 * speedFactor;
  lineOffset = (lineOffset + roadSpeed * dt) % 72;

  spawnClock += dt;
  const spawnRate = Math.max(0.2, 0.76 - elapsed / 180);
  if (spawnClock >= spawnRate) {
    spawnClock = 0;
    spawnEntity();
  }

  for (const en of entities) en.y += roadSpeed * dt;
  entities = entities.filter((en) => en.y < H + 100);

  const pRect = { x: player.x - player.w / 2, y: player.y, w: player.w, h: player.h };

  for (const en of entities) {
    const eRect = { x: en.x - en.w / 2, y: en.y, w: en.w, h: en.h };
    if (!collide(pRect, eRect)) continue;

    en.y = H + 200;
    if (en.type === "crate") {
      crates += 1;
      score += 180;
    } else {
      loseLife();
    }
  }

  score += Math.floor(28 * dt * speedFactor);
  if (score > highScore) {
    highScore = score;
    localStorage.setItem(KEY, String(highScore));
  }

  flash = Math.max(0, flash - dt);
  syncUi();
}

function drawRoad() {
  ctx.fillStyle = "#101729";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#1b2844";
  ctx.fillRect(150, 0, 340, H);

  ctx.fillStyle = "#0d1322";
  ctx.fillRect(145, 0, 5, H);
  ctx.fillRect(490, 0, 5, H);

  ctx.fillStyle = "#7ad5ff";
  for (let i = -1; i < 10; i++) {
    const y = i * 72 + lineOffset;
    ctx.fillRect(316, y, 8, 40);
    ctx.fillRect(212, y, 8, 40);
    ctx.fillRect(420, y, 8, 40);
  }
}

function drawPlayer() {
  const x = player.x - player.w / 2;
  const y = player.y;
  const blink = flash > 0 && Math.floor(performance.now() / 70) % 2;
  if (blink) return;

  ctx.fillStyle = "#ffb83a";
  ctx.fillRect(x, y + 8, player.w, player.h - 8);
  ctx.fillStyle = "#26334f";
  ctx.fillRect(x + 10, y + 24, player.w - 20, 22);
  ctx.fillStyle = "#ffc95f";
  ctx.fillRect(x + 8, y + 10, player.w - 16, 6);
  ctx.fillStyle = "#ff6b70";
  ctx.fillRect(x + 8, y + 70, 10, 6);
  ctx.fillRect(x + player.w - 18, y + 70, 10, 6);
}

function drawEntities() {
  for (const en of entities) {
    const x = en.x - en.w / 2;
    const y = en.y;

    if (en.type === "crate") {
      ctx.fillStyle = "#ffd167";
      ctx.fillRect(x, y, en.w, en.h);
      ctx.strokeStyle = "#7f5a16";
      ctx.strokeRect(x + 0.5, y + 0.5, en.w - 1, en.h - 1);
      ctx.fillStyle = "#8a6216";
      ctx.font = "10px 'Press Start 2P'";
      ctx.fillText("ASIC", x + 4, y + 22);
    } else {
      ctx.fillStyle = "#ff5d69";
      ctx.fillRect(x, y, en.w, en.h);
      ctx.fillStyle = "#3e0f17";
      ctx.fillRect(x + 8, y + 18, en.w - 16, 24);
    }
  }
}

function drawHud() {
  ctx.fillStyle = "#111b35";
  ctx.fillRect(0, 0, W, 30);
  ctx.fillStyle = "#93dcff";
  ctx.font = "10px 'Press Start 2P'";
  ctx.fillText("HASHRATE HIGHWAY", 12, 20);

  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffe1a0";
    ctx.font = "12px 'Press Start 2P'";
    const txt = "LIQUIDATED - PRESS SPACE";
    const tw = ctx.measureText(txt).width;
    ctx.fillText(txt, W / 2 - tw / 2, H / 2);
  }
}

function draw() {
  drawRoad();
  drawEntities();
  drawPlayer();
  drawHud();
}

function syncUi() {
  ui.score.textContent = String(score);
  ui.high.textContent = String(highScore);
  ui.lives.textContent = String(lives);
  ui.speed.textContent = `${speedFactor.toFixed(1)}x`;
  ui.crates.textContent = String(crates);
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
