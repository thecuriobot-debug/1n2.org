import { bootArcadeGame } from "./arcade-shell.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  score: document.getElementById("score"),
  high: document.getElementById("high"),
  lives: document.getElementById("lives"),
  wave: document.getElementById("wave"),
  signal: document.getElementById("signal"),
};

const W = canvas.width;
const H = canvas.height;
const KEY = "mb_wcn_signal_high";
const arcade = bootArcadeGame({
  gameId: "wcn_signal_jam",
  touch: { left: "ArrowLeft", right: "ArrowRight", a: " ", b: "x" },
});

const keys = Object.create(null);
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;

  if (["arrowleft", "arrowright", "a", "d", " ", "z", "x", "r"].includes(k) || e.key === " ") {
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
let signal = 20;
let gameOver = false;
let elapsed = 0;
let spawnClock = 0;
let shotClock = 0;
let flash = 0;

const stars = [];
for (let i = 0; i < 90; i++) {
  stars.push({ x: Math.random() * W, y: Math.random() * H, s: 0.5 + Math.random() * 1.8 });
}

const player = {
  x: W / 2,
  y: H - 56,
  w: 42,
  h: 26,
  speed: 280,
  invuln: 0,
};

let bullets = [];
let enemies = [];
let enemyBullets = [];
let pickups = [];

function restart() {
  score = 0;
  lives = 3;
  wave = 1;
  signal = 20;
  gameOver = false;
  elapsed = 0;
  spawnClock = 0;
  shotClock = 0;
  flash = 0;

  player.x = W / 2;
  player.invuln = 0;

  bullets = [];
  enemies = [];
  enemyBullets = [];
  pickups = [];

  syncUi();
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function scoreMultiplier() {
  return 1 + Math.floor(signal / 20) * 0.15;
}

function spawnEnemy() {
  const r = Math.random();
  const type = r < 0.2 ? "jammer" : r < 0.36 ? "whale" : "packet";

  if (type === "jammer") {
    enemies.push({
      type,
      x: 40 + Math.random() * (W - 120),
      y: -36,
      w: 44,
      h: 24,
      hp: 2,
      speed: 88 + wave * 5,
      phase: Math.random() * Math.PI * 2,
      fire: 1 + Math.random() * 0.8,
    });
    return;
  }

  if (type === "whale") {
    enemies.push({
      type,
      x: 40 + Math.random() * (W - 120),
      y: -44,
      w: 62,
      h: 28,
      hp: 3,
      speed: 75 + wave * 4,
      phase: Math.random() * Math.PI * 2,
      fire: 0.8 + Math.random() * 0.9,
    });
    return;
  }

  enemies.push({
    type,
    x: 24 + Math.random() * (W - 60),
    y: -30,
    w: 30,
    h: 18,
    hp: 1,
    speed: 118 + wave * 8,
    phase: Math.random() * Math.PI * 2,
    fire: 99,
  });
}

function spawnPickup(x, y) {
  pickups.push({ x, y, w: 14, h: 14, pulse: Math.random() * 6.28 });
}

function loseLife() {
  if (player.invuln > 0 || gameOver) return;
  lives -= 1;
  player.invuln = 1.15;
  signal = Math.max(0, signal - 28);
  flash = 0.22;
  if (lives <= 0) gameOver = true;
}

function firePlayerBullet() {
  bullets.push({ x: player.x - 2, y: player.y - 8, w: 4, h: 12, speed: 420 });
}

function triggerBroadcastBurst() {
  signal = 44;
  score += 650;
  enemyBullets.length = 0;

  for (const en of enemies) {
    en.hp -= 1;
    if (en.hp <= 0) {
      en.dead = true;
      score += 70;
    }
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
  wave = 1 + Math.floor(elapsed / 18);

  if (keys.arrowleft || keys.a) player.x -= player.speed * dt;
  if (keys.arrowright || keys.d) player.x += player.speed * dt;
  player.x = Math.max(player.w / 2 + 6, Math.min(W - player.w / 2 - 6, player.x));

  shotClock = Math.max(0, shotClock - dt);
  if ((keys[" "] || keys.z) && shotClock <= 0) {
    shotClock = 0.14;
    firePlayerBullet();
  }

  if (keys.x && signal >= 100) {
    keys.x = false;
    triggerBroadcastBurst();
  }

  spawnClock += dt;
  const spawnEvery = Math.max(0.23, 0.85 - elapsed * 0.006);
  if (spawnClock >= spawnEvery) {
    spawnClock = 0;
    spawnEnemy();
  }

  player.invuln = Math.max(0, player.invuln - dt);
  flash = Math.max(0, flash - dt);

  for (const st of stars) {
    st.y += 24 * st.s * dt;
    if (st.y > H) {
      st.y = -2;
      st.x = Math.random() * W;
    }
  }

  for (const b of bullets) b.y -= b.speed * dt;
  bullets = bullets.filter((b) => b.y > -20);

  for (const eb of enemyBullets) eb.y += eb.speed * dt;
  enemyBullets = enemyBullets.filter((b) => b.y < H + 20);

  for (const en of enemies) {
    en.y += en.speed * dt;
    en.phase += dt * 3;
    en.x += Math.sin(en.phase) * dt * (en.type === "packet" ? 52 : 74);
    en.x = Math.max(6, Math.min(W - en.w - 6, en.x));

    en.fire -= dt;
    if (en.fire <= 0) {
      en.fire = en.type === "whale" ? 0.54 : 0.92;
      enemyBullets.push({
        x: en.x + en.w / 2 - 3,
        y: en.y + en.h,
        w: 6,
        h: 12,
        speed: en.type === "whale" ? 210 : 175,
      });
    }

    if (en.y > H + 20) {
      en.dead = true;
      loseLife();
    }
  }

  const pRect = { x: player.x - player.w / 2, y: player.y, w: player.w, h: player.h };

  for (const b of bullets) {
    for (const en of enemies) {
      if (en.dead || b.dead) continue;
      const eRect = { x: en.x, y: en.y, w: en.w, h: en.h };
      if (!overlap(b, eRect)) continue;

      b.dead = true;
      en.hp -= 1;
      if (en.hp <= 0) {
        en.dead = true;
        score += Math.floor((en.type === "whale" ? 160 : en.type === "jammer" ? 95 : 55) * scoreMultiplier());
        signal = Math.min(115, signal + (en.type === "whale" ? 9 : 5));
        if (Math.random() < 0.17) spawnPickup(en.x + en.w / 2 - 7, en.y + en.h / 2 - 7);
      }
    }
  }

  for (const en of enemies) {
    if (en.dead) continue;
    const eRect = { x: en.x, y: en.y, w: en.w, h: en.h };
    if (overlap(pRect, eRect)) {
      en.dead = true;
      loseLife();
    }
  }

  for (const eb of enemyBullets) {
    if (eb.dead) continue;
    if (overlap(pRect, eb)) {
      eb.dead = true;
      loseLife();
    }
  }

  for (const p of pickups) {
    p.y += 118 * dt;
    p.pulse += dt * 8;
    if (p.y > H + 20) p.dead = true;

    if (!p.dead && overlap(pRect, p)) {
      p.dead = true;
      signal = Math.min(120, signal + 18);
      score += 90;
    }
  }

  enemies = enemies.filter((en) => !en.dead);
  bullets = bullets.filter((b) => !b.dead);
  enemyBullets = enemyBullets.filter((b) => !b.dead);
  pickups = pickups.filter((p) => !p.dead);

  if (signal >= 100) {
    score += Math.floor(42 * dt);
  }

  score += Math.floor((15 + wave * 1.5) * scoreMultiplier() * dt);

  if (score > highScore) {
    highScore = score;
    localStorage.setItem(KEY, String(highScore));
  }

  syncUi();
}

function drawBackdrop() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#041029");
  g.addColorStop(1, "#090915");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  for (const st of stars) {
    const b = Math.floor(120 + st.s * 70);
    ctx.fillStyle = `rgb(${b}, ${b + 14}, 255)`;
    ctx.fillRect(st.x, st.y, Math.max(1, st.s), Math.max(1, st.s));
  }

  ctx.strokeStyle = "rgba(118, 213, 255, 0.12)";
  for (let y = 38; y < H; y += 44) {
    ctx.beginPath();
    ctx.moveTo(0, y + Math.sin((elapsed + y) * 0.04) * 5);
    ctx.lineTo(W, y + Math.sin((elapsed + y) * 0.04) * 5);
    ctx.stroke();
  }
}

function drawPlayer() {
  if (player.invuln > 0 && Math.floor(performance.now() / 75) % 2) return;

  const x = player.x - player.w / 2;
  const y = player.y;

  ctx.fillStyle = "#f7c657";
  ctx.fillRect(x + 4, y + 10, player.w - 8, player.h - 10);
  ctx.fillStyle = "#20395f";
  ctx.fillRect(x + 9, y + 15, player.w - 18, 7);
  ctx.fillStyle = "#9df0ff";
  ctx.fillRect(x + 16, y + 4, 10, 9);
  ctx.fillStyle = "#ff6d8c";
  ctx.fillRect(x + 2, y + 18, 6, 5);
  ctx.fillRect(x + player.w - 8, y + 18, 6, 5);
}

function drawEnemies() {
  for (const en of enemies) {
    if (en.type === "packet") {
      ctx.fillStyle = "#ff6482";
      ctx.fillRect(en.x, en.y, en.w, en.h);
      ctx.fillStyle = "#4b1628";
      ctx.fillRect(en.x + 5, en.y + 5, en.w - 10, 6);
    } else if (en.type === "jammer") {
      ctx.fillStyle = "#9d7cff";
      ctx.fillRect(en.x, en.y, en.w, en.h);
      ctx.fillStyle = "#24154e";
      ctx.fillRect(en.x + 6, en.y + 8, en.w - 12, 7);
      ctx.fillStyle = "#ffdf89";
      ctx.fillRect(en.x + en.w / 2 - 2, en.y + 3, 4, 4);
    } else {
      ctx.fillStyle = "#4ed9ff";
      ctx.fillRect(en.x, en.y, en.w, en.h);
      ctx.fillStyle = "#0d3043";
      ctx.fillRect(en.x + 8, en.y + 10, en.w - 16, 8);
      ctx.fillStyle = "#f4b66a";
      ctx.fillRect(en.x + en.w / 2 - 4, en.y + 4, 8, 4);
    }
  }
}

function drawBullets() {
  for (const b of bullets) {
    ctx.fillStyle = "#8efac0";
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }
  for (const b of enemyBullets) {
    ctx.fillStyle = "#ffb261";
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }
}

function drawPickups() {
  for (const p of pickups) {
    const grow = Math.sin(p.pulse) * 1.4;
    ctx.fillStyle = "#ffd461";
    ctx.fillRect(p.x - grow * 0.3, p.y - grow * 0.3, p.w + grow * 0.6, p.h + grow * 0.6);
    ctx.fillStyle = "#704c11";
    ctx.font = "9px 'Press Start 2P'";
    ctx.fillText("W", p.x + 2, p.y + 10);
  }
}

function drawHud() {
  ctx.fillStyle = "#112249";
  ctx.fillRect(0, 0, W, 30);
  ctx.fillStyle = "#8ed8ff";
  ctx.font = "10px 'Press Start 2P'";
  ctx.fillText("WCN SIGNAL JAM", 10, 20);

  const meterW = 170;
  const sx = W - meterW - 14;
  ctx.fillStyle = "#17263e";
  ctx.fillRect(sx, 8, meterW, 14);
  ctx.fillStyle = signal >= 100 ? "#7effb2" : "#f3bf59";
  ctx.fillRect(sx + 1, 9, Math.floor(((meterW - 2) * Math.min(100, signal)) / 100), 12);

  if (flash > 0) {
    ctx.fillStyle = `rgba(255, 85, 105, ${flash * 1.9})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (signal >= 100) {
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(W / 2 - 176, H - 54, 352, 26);
    ctx.fillStyle = "#c8ffdf";
    ctx.font = "10px 'Press Start 2P'";
    const t = "PRESS X: BROADCAST BURST";
    ctx.fillText(t, W / 2 - ctx.measureText(t).width / 2, H - 36);
  }

  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.64)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffe0a0";
    ctx.font = "12px 'Press Start 2P'";
    const txt = "SIGNAL LOST - PRESS SPACE";
    ctx.fillText(txt, W / 2 - ctx.measureText(txt).width / 2, H / 2);
  }
}

function draw() {
  drawBackdrop();
  drawPickups();
  drawEnemies();
  drawBullets();
  drawPlayer();
  drawHud();
}

function syncUi() {
  ui.score.textContent = String(score);
  ui.high.textContent = String(highScore);
  ui.lives.textContent = String(lives);
  ui.wave.textContent = String(wave);
  ui.signal.textContent = `${Math.floor(signal)}%`;
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
