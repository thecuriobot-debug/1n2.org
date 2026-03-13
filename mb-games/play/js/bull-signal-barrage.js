import { bootArcadeGame } from "./arcade-shell.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  score: document.getElementById("score"),
  high: document.getElementById("high"),
  lives: document.getElementById("lives"),
  wave: document.getElementById("wave"),
  heat: document.getElementById("heat"),
};

const W = canvas.width;
const H = canvas.height;
const KEY = "mb_bull_signal_high";

const arcade = bootArcadeGame({
  gameId: "bull_signal_barrage",
  touch: { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown", a: " ", b: "x" },
});

const keys = Object.create(null);
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (["arrowleft", "arrowright", "arrowup", "arrowdown", " ", "x", "z", "r"].includes(k) || e.key === " ") {
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
let heat = 0;
let gameOver = false;
let elapsed = 0;

const player = {
  x: W / 2 - 12,
  y: H - 58,
  w: 24,
  h: 20,
  speed: 255,
  fireCooldown: 0,
  invuln: 0,
};

let shots = [];
let enemies = [];
let enemyShots = [];
let coins = [];
let particles = [];
let stars = [];
let spawnClock = 0;

for (let i = 0; i < 75; i++) {
  stars.push({ x: Math.random() * W, y: Math.random() * H, s: 0.5 + Math.random() * 1.6 });
}

function restart() {
  score = 0;
  lives = 3;
  wave = 1;
  heat = 0;
  gameOver = false;
  elapsed = 0;

  player.x = W / 2 - 12;
  player.y = H - 58;
  player.fireCooldown = 0;
  player.invuln = 0;

  shots = [];
  enemies = [];
  enemyShots = [];
  coins = [];
  particles = [];
  spawnClock = 0;
  syncUi();
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function spawnEnemy() {
  const hard = Math.min(1, elapsed / 100);
  const r = Math.random();
  if (r < 0.12 + hard * 0.12) {
    enemies.push({
      type: "whale",
      x: 40 + Math.random() * (W - 96),
      y: -36,
      w: 48,
      h: 32,
      vy: 45 + Math.random() * 35,
      hp: 5,
      fire: 1.2 + Math.random() * 1.2,
      sway: Math.random() * Math.PI * 2,
    });
    return;
  }
  if (r < 0.45) {
    enemies.push({
      type: "bear",
      x: 20 + Math.random() * (W - 50),
      y: -24,
      w: 26,
      h: 20,
      vy: 95 + Math.random() * 45 + hard * 55,
      hp: 2,
      fire: 9,
      sway: Math.random() * Math.PI * 2,
    });
    return;
  }

  enemies.push({
    type: "drone",
    x: 14 + Math.random() * (W - 34),
    y: -22,
    w: 20,
    h: 16,
    vy: 120 + Math.random() * 65 + hard * 70,
    hp: 1,
    fire: 1.6 + Math.random() * 1.8,
    sway: Math.random() * Math.PI * 2,
  });
}

function shoot() {
  if (player.fireCooldown > 0 || gameOver) return;
  player.fireCooldown = 0.12;
  shots.push({ x: player.x + player.w / 2 - 2, y: player.y - 4, w: 4, h: 10, vy: -420 });
}

function useHeatBlast() {
  if (heat < 100 || gameOver) return;
  heat = 0;

  let hits = 0;
  for (const e of enemies) {
    e.hp = 0;
    hits += 1;
    spawnBurst(e.x + e.w / 2, e.y + e.h / 2, 12, "#ff9f4f");
  }
  for (const s of enemyShots) s.y = H + 100;
  enemies = [];
  enemyShots = [];
  score += hits * 130 + 200;
}

function collectCoin(coin) {
  coin.y = H + 100;
  score += 45;
  heat = Math.min(100, heat + 14);
}

function loseLife() {
  if (player.invuln > 0 || gameOver) return;
  lives -= 1;
  player.invuln = 1.3;
  heat = Math.max(0, heat - 35);
  spawnBurst(player.x + player.w / 2, player.y + player.h / 2, 18, "#ff6f7c");
  if (lives <= 0) gameOver = true;
}

function spawnBurst(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count;
    const speed = 40 + Math.random() * 140;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: 0.2 + Math.random() * 0.45,
      color,
    });
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

  if (keys.arrowup || keys.w) player.y -= player.speed * dt;
  if (keys.arrowdown || keys.s) player.y += player.speed * dt;
  if (keys.arrowleft || keys.a) player.x -= player.speed * dt;
  if (keys.arrowright || keys.d) player.x += player.speed * dt;

  if (keys[" "] || keys.z) shoot();
  if (keys.x) {
    keys.x = false;
    useHeatBlast();
  }

  player.x = Math.max(8, Math.min(W - player.w - 8, player.x));
  player.y = Math.max(42, Math.min(H - player.h - 8, player.y));
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  player.invuln = Math.max(0, player.invuln - dt);

  for (const st of stars) {
    st.y += 30 * st.s * dt;
    if (st.y > H + 2) {
      st.y = -2;
      st.x = Math.random() * W;
    }
  }

  spawnClock += dt;
  const spawnRate = Math.max(0.2, 0.7 - Math.min(0.5, elapsed / 200));
  while (spawnClock >= spawnRate) {
    spawnClock -= spawnRate;
    spawnEnemy();
  }

  for (const s of shots) s.y += s.vy * dt;
  shots = shots.filter((s) => s.y > -20);

  for (const e of enemies) {
    e.y += e.vy * dt;
    e.sway += dt * 3.2;
    e.x += Math.sin(e.sway) * 32 * dt;
    e.x = Math.max(4, Math.min(W - e.w - 4, e.x));

    e.fire -= dt;
    if (e.fire <= 0) {
      e.fire = e.type === "drone" ? 1.3 : 1.8;
      enemyShots.push({
        x: e.x + e.w / 2 - 2,
        y: e.y + e.h - 1,
        w: 4,
        h: 10,
        vy: e.type === "whale" ? 225 : 270,
      });
    }
  }
  enemies = enemies.filter((e) => e.y < H + 40 && e.hp > 0);

  for (const b of enemyShots) b.y += b.vy * dt;
  enemyShots = enemyShots.filter((b) => b.y < H + 20);

  for (const c of coins) c.y += c.vy * dt;
  coins = coins.filter((c) => c.y < H + 20);

  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    p.vx *= 0.97;
    p.vy *= 0.97;
  }
  particles = particles.filter((p) => p.life > 0);

  for (const s of shots) {
    for (const e of enemies) {
      if (e.hp <= 0 || !overlap(s, e)) continue;
      s.y = -100;
      e.hp -= 1;
      score += 30;

      if (e.hp <= 0) {
        const isBig = e.type === "whale";
        score += isBig ? 240 : e.type === "bear" ? 120 : 80;
        heat = Math.min(100, heat + (isBig ? 20 : 10));
        spawnBurst(e.x + e.w / 2, e.y + e.h / 2, isBig ? 16 : 10, isBig ? "#c59aff" : "#ffd07f");
        if (Math.random() < (isBig ? 0.8 : 0.2)) {
          coins.push({ x: e.x + e.w / 2 - 6, y: e.y + e.h / 2 - 6, w: 12, h: 12, vy: 95 });
        }
      }
      break;
    }
  }

  const pRect = { x: player.x, y: player.y, w: player.w, h: player.h };
  for (const e of enemies) {
    if (overlap(e, pRect)) {
      e.hp = 0;
      loseLife();
    }
  }
  for (const b of enemyShots) {
    if (overlap(b, pRect)) {
      b.y = H + 100;
      loseLife();
    }
  }
  for (const c of coins) {
    if (overlap(c, pRect)) collectCoin(c);
  }

  if (score > highScore) {
    highScore = score;
    localStorage.setItem(KEY, String(highScore));
  }
  syncUi();
}

function drawPlayer() {
  if (player.invuln > 0 && Math.floor(performance.now() / 80) % 2) return;
  const x = player.x;
  const y = player.y;

  ctx.fillStyle = "#5dc9ff";
  ctx.fillRect(x + 8, y, 8, 20);
  ctx.fillRect(x, y + 8, 24, 8);
  ctx.fillStyle = "#ffd26b";
  ctx.fillRect(x + 10, y + 4, 4, 5);
  ctx.fillStyle = "#ff6f86";
  ctx.fillRect(x + 3, y + 15, 4, 3);
  ctx.fillRect(x + 17, y + 15, 4, 3);
}

function drawEnemy(e) {
  if (e.type === "whale") {
    ctx.fillStyle = "#9f7bff";
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.fillStyle = "#3d236f";
    ctx.fillRect(e.x + 8, e.y + 11, 30, 9);
    ctx.fillStyle = "#ffd46f";
    ctx.fillRect(e.x + 18, e.y + 5, 8, 4);
    return;
  }
  if (e.type === "bear") {
    ctx.fillStyle = "#ff7a62";
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.fillStyle = "#582218";
    ctx.fillRect(e.x + 5, e.y + 6, 16, 8);
    return;
  }

  ctx.fillStyle = "#79f3d0";
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.fillStyle = "#14503f";
  ctx.fillRect(e.x + 5, e.y + 5, 10, 5);
}

function draw() {
  ctx.fillStyle = "#050815";
  ctx.fillRect(0, 0, W, H);

  for (const st of stars) {
    const b = Math.floor(120 + st.s * 70);
    ctx.fillStyle = `rgb(${b},${b},${b})`;
    ctx.fillRect(st.x, st.y, Math.max(1, st.s), Math.max(1, st.s));
  }

  ctx.fillStyle = "#132449";
  ctx.fillRect(0, 0, W, 30);
  ctx.fillStyle = "#89dcff";
  ctx.font = "10px 'Press Start 2P'";
  ctx.fillText("BULL SIGNAL BARRAGE", 12, 20);

  for (const s of shots) {
    ctx.fillStyle = "#ffe27d";
    ctx.fillRect(s.x, s.y, s.w, s.h);
  }

  for (const b of enemyShots) {
    ctx.fillStyle = "#ff7183";
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }

  for (const c of coins) {
    ctx.fillStyle = "#ffcf6b";
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = "#8d6000";
    ctx.fillRect(c.x + 4, c.y + 3, 4, 6);
  }

  for (const e of enemies) drawEnemy(e);
  drawPlayer();

  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 2, 2);
  }

  ctx.fillStyle = "#102746";
  ctx.fillRect(12, H - 20, 136, 8);
  ctx.fillStyle = "#ff924e";
  ctx.fillRect(12, H - 20, Math.floor((136 * heat) / 100), 8);
  ctx.strokeStyle = "#66cfff";
  ctx.strokeRect(12, H - 20, 136, 8);

  ctx.fillStyle = "#d6ebff";
  ctx.font = "9px 'Press Start 2P'";
  ctx.fillText("HEAT BLAST (X)", 160, H - 12);

  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.68)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffde9f";
    ctx.font = "12px 'Press Start 2P'";
    const msg = "GAME OVER - PRESS SPACE";
    const tw = ctx.measureText(msg).width;
    ctx.fillText(msg, W / 2 - tw / 2, H / 2);
  }
}

function syncUi() {
  ui.score.textContent = String(score);
  ui.high.textContent = String(highScore);
  ui.lives.textContent = String(lives);
  ui.wave.textContent = String(wave);
  ui.heat.textContent = String(Math.floor(heat));
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
