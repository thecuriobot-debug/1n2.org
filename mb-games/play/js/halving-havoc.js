import { bootArcadeGame } from "./arcade-shell.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  score: document.getElementById("score"),
  high: document.getElementById("high"),
  lives: document.getElementById("lives"),
  wave: document.getElementById("wave"),
  charge: document.getElementById("charge"),
};

const W = canvas.width;
const H = canvas.height;
const KEY = "mb_halving_high";
const arcade = bootArcadeGame({
  gameId: "halving_havoc",
  touch: { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown", a: " ", b: "x" },
});

const keys = Object.create(null);
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;

  if (["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "s", " ", "z", "x", "r"].includes(k) || e.key === " ") {
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
let wave = 1;
let charge = 18;
let elapsed = 0;
let gameOver = false;
let shotClock = 0;
let spawnClock = 0;
let flash = 0;

const player = {
  x: W / 2,
  y: H - 78,
  w: 30,
  h: 30,
  speed: 268,
  invuln: 0,
  dirX: 0,
  dirY: -1,
};

let bullets = [];
let enemies = [];
let pickups = [];

const stars = [];
for (let i = 0; i < 95; i++) {
  stars.push({ x: Math.random() * W, y: Math.random() * H, s: 0.4 + Math.random() * 1.8 });
}

function restart() {
  score = 0;
  lives = 3;
  wave = 1;
  charge = 18;
  elapsed = 0;
  gameOver = false;
  shotClock = 0;
  spawnClock = 0;
  flash = 0;

  player.x = W / 2;
  player.y = H - 78;
  player.invuln = 0;
  player.dirX = 0;
  player.dirY = -1;

  bullets = [];
  enemies = [];
  pickups = [];

  syncUi();
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function spawnEnemy() {
  const type = Math.random() < 0.23 ? "brute" : "runner";
  const size = type === "brute" ? 34 : 26;
  const speed = (type === "brute" ? 68 : 102) + wave * 6;
  const edge = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;

  if (edge === 0) {
    x = Math.random() * (W - size);
    y = -size - 4;
  } else if (edge === 1) {
    x = W + 4;
    y = Math.random() * (H - size);
  } else if (edge === 2) {
    x = Math.random() * (W - size);
    y = H + 4;
  } else {
    x = -size - 4;
    y = Math.random() * (H - size);
  }

  enemies.push({
    type,
    x,
    y,
    w: size,
    h: size,
    hp: type === "brute" ? 2 : 1,
    speed,
    drift: Math.random() * Math.PI * 2,
  });
}

function fireBullet() {
  const mag = Math.hypot(player.dirX, player.dirY) || 1;
  const dx = player.dirX / mag;
  const dy = player.dirY / mag;

  bullets.push({
    x: player.x + player.w / 2 - 3,
    y: player.y + player.h / 2 - 3,
    w: 6,
    h: 6,
    vx: dx * 360,
    vy: dy * 360,
    ttl: 1.1,
  });
}

function usePulseBomb() {
  if (charge < 100) return;
  charge = 0;
  score += 140;

  for (const en of enemies) {
    en.dead = true;
    score += en.type === "brute" ? 70 : 45;
  }
}

function loseLife() {
  if (player.invuln > 0 || gameOver) return;
  lives -= 1;
  player.invuln = 1.2;
  charge = Math.max(0, charge - 24);
  flash = 0.22;
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
  wave = 1 + Math.floor(elapsed / 19);

  let mx = 0;
  let my = 0;
  if (keys.arrowleft || keys.a) mx -= 1;
  if (keys.arrowright || keys.d) mx += 1;
  if (keys.arrowup || keys.w) my -= 1;
  if (keys.arrowdown || keys.s) my += 1;

  if (mx || my) {
    const mag = Math.hypot(mx, my);
    mx /= mag;
    my /= mag;
    player.dirX = mx;
    player.dirY = my;
  }

  player.x += mx * player.speed * dt;
  player.y += my * player.speed * dt;
  player.x = Math.max(4, Math.min(W - player.w - 4, player.x));
  player.y = Math.max(34, Math.min(H - player.h - 4, player.y));

  player.invuln = Math.max(0, player.invuln - dt);
  shotClock = Math.max(0, shotClock - dt);
  flash = Math.max(0, flash - dt);

  if ((keys[" "] || keys.z) && shotClock <= 0) {
    shotClock = 0.145;
    fireBullet();
  }

  if (keys.x) {
    keys.x = false;
    usePulseBomb();
  }

  spawnClock += dt;
  const spawnEvery = Math.max(0.16, 0.66 - elapsed * 0.004);
  if (spawnClock >= spawnEvery) {
    spawnClock = 0;
    spawnEnemy();
  }

  for (const st of stars) {
    st.y += 28 * st.s * dt;
    if (st.y > H) {
      st.y = -2;
      st.x = Math.random() * W;
    }
  }

  for (const b of bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.ttl -= dt;
    if (b.ttl <= 0 || b.x < -12 || b.y < -12 || b.x > W + 12 || b.y > H + 12) b.dead = true;
  }

  const pRect = { x: player.x, y: player.y, w: player.w, h: player.h };

  for (const en of enemies) {
    const dx = player.x + player.w / 2 - (en.x + en.w / 2);
    const dy = player.y + player.h / 2 - (en.y + en.h / 2);
    const mag = Math.hypot(dx, dy) || 1;

    en.drift += dt * 5;
    en.x += (dx / mag) * en.speed * dt + Math.sin(en.drift) * dt * 16;
    en.y += (dy / mag) * en.speed * dt + Math.cos(en.drift * 1.1) * dt * 14;

    const eRect = { x: en.x, y: en.y, w: en.w, h: en.h };
    if (overlap(pRect, eRect)) {
      en.dead = true;
      loseLife();
    }
  }

  for (const b of bullets) {
    if (b.dead) continue;
    for (const en of enemies) {
      if (en.dead) continue;
      const eRect = { x: en.x, y: en.y, w: en.w, h: en.h };
      if (!overlap(b, eRect)) continue;

      b.dead = true;
      en.hp -= 1;
      if (en.hp <= 0) {
        en.dead = true;
        score += en.type === "brute" ? 95 : 58;
        charge = Math.min(112, charge + (en.type === "brute" ? 12 : 7));
        if (Math.random() < 0.16) {
          pickups.push({ x: en.x + en.w / 2 - 7, y: en.y + en.h / 2 - 7, w: 14, h: 14, pulse: Math.random() * 6.28 });
        }
      }
    }
  }

  for (const p of pickups) {
    p.pulse += dt * 8;
    p.y += 26 * dt;
    if (p.y > H + 20) p.dead = true;

    if (!p.dead && overlap(pRect, p)) {
      p.dead = true;
      charge = Math.min(114, charge + 20);
      score += 68;
    }
  }

  enemies = enemies.filter((en) => !en.dead);
  bullets = bullets.filter((b) => !b.dead);
  pickups = pickups.filter((p) => !p.dead);

  score += Math.floor(dt * (16 + wave * 1.8));

  if (score > highScore) {
    highScore = score;
    localStorage.setItem(KEY, String(highScore));
  }

  syncUi();
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#071338");
  g.addColorStop(1, "#0e0b18");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  for (const st of stars) {
    const b = Math.floor(125 + st.s * 70);
    ctx.fillStyle = `rgb(${b}, ${b + 20}, 255)`;
    ctx.fillRect(st.x, st.y, Math.max(1, st.s), Math.max(1, st.s));
  }

  ctx.strokeStyle = "rgba(118, 213, 255, 0.1)";
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 30);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
}

function drawPlayer() {
  if (player.invuln > 0 && Math.floor(performance.now() / 80) % 2) return;

  ctx.fillStyle = "#ffcd67";
  ctx.fillRect(player.x, player.y, player.w, player.h);
  ctx.fillStyle = "#233d64";
  ctx.fillRect(player.x + 7, player.y + 9, player.w - 14, 9);
  ctx.fillStyle = "#92f3ff";
  ctx.fillRect(player.x + 10, player.y + 3, player.w - 20, 6);
}

function drawEnemies() {
  for (const en of enemies) {
    if (en.type === "runner") {
      ctx.fillStyle = "#ff6e86";
      ctx.fillRect(en.x, en.y, en.w, en.h);
      ctx.fillStyle = "#4f1826";
      ctx.fillRect(en.x + 5, en.y + 7, en.w - 10, 7);
    } else {
      ctx.fillStyle = "#b593ff";
      ctx.fillRect(en.x, en.y, en.w, en.h);
      ctx.fillStyle = "#2e2255";
      ctx.fillRect(en.x + 7, en.y + 10, en.w - 14, 8);
      ctx.fillStyle = "#ffdd87";
      ctx.fillRect(en.x + en.w / 2 - 3, en.y + 5, 6, 4);
    }
  }
}

function drawBulletsAndPickups() {
  for (const b of bullets) {
    ctx.fillStyle = "#84fbbf";
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }

  for (const p of pickups) {
    const r = Math.sin(p.pulse) * 1.4;
    ctx.fillStyle = "#ffd56a";
    ctx.fillRect(p.x - r * 0.2, p.y - r * 0.2, p.w + r * 0.4, p.h + r * 0.4);
    ctx.fillStyle = "#76520e";
    ctx.font = "9px 'Press Start 2P'";
    ctx.fillText("B", p.x + 3, p.y + 10);
  }
}

function drawHud() {
  ctx.fillStyle = "#10254a";
  ctx.fillRect(0, 0, W, 30);
  ctx.fillStyle = "#8ed8ff";
  ctx.font = "10px 'Press Start 2P'";
  ctx.fillText("HALVING HAVOC", 10, 20);

  const meterW = 162;
  const mx = W - meterW - 12;
  ctx.fillStyle = "#192a45";
  ctx.fillRect(mx, 8, meterW, 14);
  ctx.fillStyle = charge >= 100 ? "#7effb2" : "#ffbf60";
  ctx.fillRect(mx + 1, 9, Math.floor(((meterW - 2) * Math.min(100, charge)) / 100), 12);

  if (charge >= 100) {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(W / 2 - 145, H - 52, 290, 24);
    ctx.fillStyle = "#c8ffdd";
    ctx.font = "10px 'Press Start 2P'";
    const txt = "PRESS X: HALVING BLAST";
    ctx.fillText(txt, W / 2 - ctx.measureText(txt).width / 2, H - 36);
  }

  if (flash > 0) {
    ctx.fillStyle = `rgba(255, 84, 109, ${flash * 1.8})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.64)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffe2a3";
    ctx.font = "12px 'Press Start 2P'";
    const txt = "REKT - PRESS SPACE";
    ctx.fillText(txt, W / 2 - ctx.measureText(txt).width / 2, H / 2);
  }
}

function draw() {
  drawBackground();
  drawEnemies();
  drawBulletsAndPickups();
  drawPlayer();
  drawHud();
}

function syncUi() {
  ui.score.textContent = String(score);
  ui.high.textContent = String(highScore);
  ui.lives.textContent = String(lives);
  ui.wave.textContent = String(wave);
  ui.charge.textContent = `${Math.floor(charge)}%`;
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
