import { bootArcadeGame } from "./arcade-shell.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  score: document.getElementById("score"),
  high: document.getElementById("high"),
  lives: document.getElementById("lives"),
  stage: document.getElementById("stage"),
  seeds: document.getElementById("seeds"),
};

const W = canvas.width;
const H = canvas.height;
const START_Y = 392;
const KEY = "mb_citadel_high";
const arcade = bootArcadeGame({
  gameId: "citadel_climb",
  touch: { left: "ArrowLeft", right: "ArrowRight", a: "ArrowUp" },
});

const keys = Object.create(null);
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;

  if (["arrowleft", "arrowright", "a", "d", "arrowup", "w", "r", " "].includes(k) || e.key === " ") {
    e.preventDefault();
  }

  if (k === "r") {
    restart();
    return;
  }

  if (gameOver && (k === " " || k === "enter")) restart();
});
window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

let highScore = Number(localStorage.getItem(KEY) || 0);
let score = 0;
let lives = 3;
let stage = 1;
let seeds = 0;
let climb = 0;
let gameOver = false;

const player = {
  x: W / 2 - 15,
  y: START_Y,
  w: 30,
  h: 36,
  vy: 0,
  speed: 210,
  invuln: 0,
};

let cameraY = 0;
let topGeneratedY = 0;
let platforms = [];
let pickups = [];

const stars = [];
for (let i = 0; i < 80; i++) {
  stars.push({ x: Math.random() * W, y: Math.random() * H, s: 0.6 + Math.random() * 1.6 });
}

function restart() {
  score = 0;
  lives = 3;
  stage = 1;
  seeds = 0;
  climb = 0;
  gameOver = false;

  player.x = W / 2 - 15;
  player.y = START_Y;
  player.vy = -430;
  player.invuln = 0;

  cameraY = 0;
  topGeneratedY = 430;
  platforms = [];
  pickups = [];

  platforms.push({ x: 160, y: 430, w: 320, h: 12, type: "stable", vx: 0 });

  while (topGeneratedY > cameraY - 760) {
    topGeneratedY -= 72 + Math.random() * 26;
    addPlatform(topGeneratedY);
  }

  syncUi();
}

function addPlatform(y) {
  const w = 84 + Math.random() * 64;
  const x = 24 + Math.random() * (W - w - 48);
  const isMove = stage > 1 && Math.random() < 0.22;

  platforms.push({
    x,
    y,
    w,
    h: 12,
    type: isMove ? "move" : "stable",
    vx: isMove ? (Math.random() < 0.5 ? -1 : 1) * (45 + Math.random() * 40) : 0,
  });

  if (Math.random() < 0.3) {
    pickups.push({ x: x + w / 2 - 7, y: y - 20, w: 14, h: 14, pulse: Math.random() * 6.28 });
  }
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function loseLife() {
  if (player.invuln > 0 || gameOver) return;
  lives -= 1;
  player.invuln = 1.1;

  if (lives <= 0) {
    gameOver = true;
    return;
  }

  const targetYMin = cameraY + 220;
  const targetYMax = cameraY + 430;
  let respawn = null;
  let bestDelta = Infinity;

  for (const p of platforms) {
    if (p.y < targetYMin || p.y > targetYMax) continue;
    const delta = Math.abs((cameraY + 320) - p.y);
    if (delta < bestDelta) {
      bestDelta = delta;
      respawn = p;
    }
  }

  if (!respawn) respawn = platforms[0];

  player.x = respawn.x + respawn.w / 2 - player.w / 2;
  player.y = respawn.y - player.h;
  player.vy = -380;
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

  player.invuln = Math.max(0, player.invuln - dt);

  let mx = 0;
  if (keys.arrowleft || keys.a) mx -= 1;
  if (keys.arrowright || keys.d) mx += 1;

  player.x += mx * player.speed * dt;
  if (player.x < -player.w) player.x = W;
  if (player.x > W) player.x = -player.w;

  const prevY = player.y;
  player.vy += 980 * dt;
  player.y += player.vy * dt;

  for (const p of platforms) {
    if (p.type === "move") {
      p.x += p.vx * dt;
      if (p.x < 14 || p.x + p.w > W - 14) p.vx *= -1;
    }

    const playerBottomPrev = prevY + player.h;
    const playerBottomNow = player.y + player.h;

    if (player.vy <= 0) continue;
    if (playerBottomPrev > p.y || playerBottomNow < p.y) continue;
    if (player.x + player.w < p.x + 4 || player.x > p.x + p.w - 4) continue;

    player.y = p.y - player.h;
    player.vy = -430;
  }

  for (const s of stars) {
    s.y += 12 * s.s * dt;
    if (s.y > H) {
      s.y = -2;
      s.x = Math.random() * W;
    }
  }

  for (const p of pickups) {
    p.pulse += dt * 8;
    if (overlap(player, p)) {
      p.dead = true;
      seeds += 1;
      score += 120;
    }
  }

  pickups = pickups.filter((p) => !p.dead && p.y < cameraY + H + 60);

  const targetCam = player.y - 248;
  if (targetCam < cameraY) cameraY = targetCam;

  while (topGeneratedY > cameraY - 760) {
    topGeneratedY -= 66 + Math.random() * 34;
    addPlatform(topGeneratedY);
  }

  platforms = platforms.filter((p) => p.y < cameraY + H + 260);

  climb = Math.max(climb, Math.floor(START_Y - player.y));
  stage = 1 + Math.floor(climb / 1450);
  score = climb + seeds * 120;

  if (player.y - cameraY > H + 120) loseLife();

  if (score > highScore) {
    highScore = score;
    localStorage.setItem(KEY, String(highScore));
  }

  syncUi();
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#091631");
  g.addColorStop(1, "#170b1d");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  for (const st of stars) {
    const b = Math.floor(130 + st.s * 60);
    ctx.fillStyle = `rgb(${b}, ${b}, ${b + 28})`;
    ctx.fillRect(st.x, st.y, Math.max(1, st.s), Math.max(1, st.s));
  }

  const skylineShift = (cameraY * 0.14) % 120;
  ctx.fillStyle = "rgba(88, 127, 205, 0.26)";
  for (let i = -2; i < 10; i++) {
    const x = i * 80 - skylineShift;
    const h = 90 + ((i + 7) % 4) * 28;
    ctx.fillRect(x, H - h, 56, h);
  }
}

function drawPlatforms() {
  for (const p of platforms) {
    const sy = p.y - cameraY;
    if (sy < -20 || sy > H + 20) continue;

    ctx.fillStyle = p.type === "move" ? "#8ec3ff" : "#ffd279";
    ctx.fillRect(p.x, sy, p.w, p.h);
    ctx.fillStyle = p.type === "move" ? "#254b79" : "#6a4c15";
    ctx.fillRect(p.x + 4, sy + 3, p.w - 8, 5);
  }
}

function drawPickups() {
  for (const p of pickups) {
    const sy = p.y - cameraY;
    if (sy < -20 || sy > H + 20) continue;

    const pulse = Math.sin(p.pulse) * 1.4;
    ctx.fillStyle = "#ffd564";
    ctx.fillRect(p.x - pulse * 0.3, sy - pulse * 0.3, p.w + pulse * 0.6, p.h + pulse * 0.6);
    ctx.fillStyle = "#7a5512";
    ctx.font = "9px 'Press Start 2P'";
    ctx.fillText("S", p.x + 3, sy + 10);
  }
}

function drawPlayer() {
  if (player.invuln > 0 && Math.floor(performance.now() / 80) % 2) return;

  const sy = player.y - cameraY;
  ctx.fillStyle = "#f4c55d";
  ctx.fillRect(player.x, sy, player.w, player.h);
  ctx.fillStyle = "#263e65";
  ctx.fillRect(player.x + 8, sy + 9, player.w - 16, 10);
  ctx.fillStyle = "#8deaf7";
  ctx.fillRect(player.x + 6, sy + 23, 6, 10);
  ctx.fillRect(player.x + player.w - 12, sy + 23, 6, 10);
}

function drawHud() {
  ctx.fillStyle = "#112349";
  ctx.fillRect(0, 0, W, 30);
  ctx.fillStyle = "#8fd9ff";
  ctx.font = "10px 'Press Start 2P'";
  ctx.fillText("CITADEL CLIMB", 10, 20);

  ctx.fillStyle = "#bfd9ff";
  ctx.font = "9px 'Press Start 2P'";
  const altitude = `${Math.max(0, climb)}m`;
  ctx.fillText(altitude, W - ctx.measureText(altitude).width - 12, 20);

  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.64)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffe2a2";
    ctx.font = "12px 'Press Start 2P'";
    const txt = "FELL OFF - PRESS SPACE";
    ctx.fillText(txt, W / 2 - ctx.measureText(txt).width / 2, H / 2);
  }
}

function draw() {
  drawBackground();
  drawPlatforms();
  drawPickups();
  drawPlayer();
  drawHud();
}

function syncUi() {
  ui.score.textContent = String(score);
  ui.high.textContent = String(highScore);
  ui.lives.textContent = String(lives);
  ui.stage.textContent = String(stage);
  ui.seeds.textContent = String(seeds);
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
