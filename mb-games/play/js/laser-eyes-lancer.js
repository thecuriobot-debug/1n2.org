import { bootArcadeGame } from "./arcade-shell.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  score: document.getElementById("score"),
  high: document.getElementById("high"),
  lives: document.getElementById("lives"),
  wave: document.getElementById("wave"),
  chain: document.getElementById("chain"),
};

const W = canvas.width;
const H = canvas.height;
const KEY = "mb_lancer_high";
const arcade = bootArcadeGame({
  gameId: "laser_eyes_lancer",
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
let chain = 0;
let chainTimer = 0;
let bombs = 2;
let gameOver = false;
let elapsed = 0;

const player = {
  x: 56,
  y: H / 2,
  w: 28,
  h: 20,
  speed: 260,
  fireCooldown: 0,
  invuln: 0,
};

let bullets = [];
let enemies = [];
let enemyBullets = [];
let stars = [];
let spawnClock = 0;

for (let i = 0; i < 70; i++) {
  stars.push({ x: Math.random() * W, y: Math.random() * H, s: 0.4 + Math.random() * 1.8 });
}

function restart() {
  score = 0;
  lives = 3;
  wave = 1;
  chain = 0;
  chainTimer = 0;
  bombs = 2;
  gameOver = false;
  elapsed = 0;

  player.x = 56;
  player.y = H / 2;
  player.fireCooldown = 0;
  player.invuln = 0;

  bullets = [];
  enemies = [];
  enemyBullets = [];
  spawnClock = 0;
  syncUi();
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function spawnEnemy() {
  const hard = Math.min(1, elapsed / 90);
  const isWhale = Math.random() < 0.12 + hard * 0.2;

  if (isWhale) {
    enemies.push({
      x: W + 30,
      y: 60 + Math.random() * (H - 150),
      w: 44,
      h: 32,
      vx: -(85 + Math.random() * 30),
      hp: 5,
      type: "whale",
      fire: 1.1 + Math.random() * 1.4,
    });
    return;
  }

  enemies.push({
    x: W + 20,
    y: 30 + Math.random() * (H - 70),
    w: 24,
    h: 18,
    vx: -(140 + Math.random() * 90 + hard * 70),
    hp: 1,
    type: "drone",
    wobble: Math.random() * Math.PI * 2,
    fire: 9,
  });
}

function shoot() {
  if (player.fireCooldown > 0) return;
  player.fireCooldown = 0.11;
  bullets.push({ x: player.x + player.w, y: player.y + player.h / 2 - 2, w: 10, h: 4, vx: 450 });
}

function useBomb() {
  if (bombs <= 0) return;
  bombs -= 1;
  score += enemies.length * 60;
  enemies = [];
  enemyBullets = [];
  chain = Math.min(25, chain + 2);
}

function loseLife() {
  if (player.invuln > 0 || gameOver) return;
  lives -= 1;
  chain = 0;
  chainTimer = 0;
  player.invuln = 1.5;

  if (lives <= 0) {
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
  wave = 1 + Math.floor(elapsed / 20);

  if (keys.arrowup || keys.w) player.y -= player.speed * dt;
  if (keys.arrowdown || keys.s) player.y += player.speed * dt;
  if (keys.arrowleft || keys.a) player.x -= player.speed * dt;
  if (keys.arrowright || keys.d) player.x += player.speed * dt;

  if (keys[" "] || keys.z) shoot();
  if (keys.x) {
    keys.x = false;
    useBomb();
  }

  player.x = Math.max(8, Math.min(W - player.w - 10, player.x));
  player.y = Math.max(34, Math.min(H - player.h - 8, player.y));
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  player.invuln = Math.max(0, player.invuln - dt);

  spawnClock += dt;
  const spawnRate = Math.max(0.22, 0.75 - Math.min(0.5, elapsed / 200));
  while (spawnClock >= spawnRate) {
    spawnClock -= spawnRate;
    spawnEnemy();
  }

  for (const st of stars) {
    st.x -= 35 * st.s * dt;
    if (st.x < -2) {
      st.x = W + 2;
      st.y = Math.random() * H;
    }
  }

  for (const b of bullets) b.x += b.vx * dt;
  bullets = bullets.filter((b) => b.x < W + 30);

  for (const e of enemies) {
    e.x += e.vx * dt;
    if (e.type === "drone") {
      e.wobble += dt * 4;
      e.y += Math.sin(e.wobble) * 18 * dt;
    }

    e.fire -= dt;
    if (e.fire <= 0) {
      e.fire = e.type === "whale" ? 1.5 : 9;
      if (e.type === "whale") {
        enemyBullets.push({ x: e.x - 6, y: e.y + 14, w: 8, h: 5, vx: -220 });
      }
    }
  }
  enemies = enemies.filter((e) => e.x > -80 && e.hp > 0);

  for (const eb of enemyBullets) eb.x += eb.vx * dt;
  enemyBullets = enemyBullets.filter((b) => b.x > -20);

  for (const b of bullets) {
    for (const e of enemies) {
      if (e.hp <= 0 || !rectsOverlap(b, e)) continue;
      b.x = W + 100;
      e.hp -= 1;
      if (e.hp <= 0) {
        chain += 1;
        chainTimer = 2.2;
        score += (e.type === "whale" ? 280 : 100) + chain * 8;
      } else {
        score += 35;
      }
      break;
    }
  }

  const pRect = { x: player.x, y: player.y, w: player.w, h: player.h };
  for (const e of enemies) {
    if (rectsOverlap(pRect, e)) {
      e.hp = 0;
      loseLife();
    }
  }
  for (const eb of enemyBullets) {
    if (rectsOverlap(pRect, eb)) {
      eb.x = -200;
      loseLife();
    }
  }

  chainTimer = Math.max(0, chainTimer - dt);
  if (chainTimer <= 0) chain = 0;

  if (score > highScore) {
    highScore = score;
    localStorage.setItem(KEY, String(highScore));
  }

  syncUi();
}

function drawShip(x, y, blink) {
  if (blink && Math.floor(performance.now() / 80) % 2) return;

  ctx.fillStyle = "#78c8ff";
  ctx.fillRect(x, y + 8, 16, 8);
  ctx.fillStyle = "#ffb640";
  ctx.fillRect(x + 16, y + 6, 12, 12);
  ctx.fillStyle = "#203f5d";
  ctx.fillRect(x + 6, y + 10, 7, 4);
  ctx.fillStyle = "#ff6f65";
  ctx.fillRect(x - 4, y + 10, 4, 3);
}

function drawEnemy(e) {
  if (e.type === "whale") {
    ctx.fillStyle = "#9b6fff";
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.fillStyle = "#2a154b";
    ctx.fillRect(e.x + 6, e.y + 10, 30, 10);
    ctx.fillStyle = "#ffdd72";
    ctx.fillRect(e.x + 14, e.y + 6, 8, 6);
  } else {
    ctx.fillStyle = "#ff6b7a";
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.fillStyle = "#3f1220";
    ctx.fillRect(e.x + 6, e.y + 6, 12, 6);
  }
}

function draw() {
  ctx.fillStyle = "#040814";
  ctx.fillRect(0, 0, W, H);

  for (const st of stars) {
    const b = Math.floor(130 + st.s * 65);
    ctx.fillStyle = `rgb(${b},${b},${b})`;
    ctx.fillRect(st.x, st.y, Math.max(1, st.s), Math.max(1, st.s));
  }

  ctx.fillStyle = "#10203e";
  ctx.fillRect(0, 0, W, 30);
  ctx.fillStyle = "#8fdbff";
  ctx.font = "10px 'Press Start 2P'";
  ctx.fillText("LASER EYES LANCER", 12, 20);

  for (const b of bullets) {
    ctx.fillStyle = "#7effb2";
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }

  for (const eb of enemyBullets) {
    ctx.fillStyle = "#ffac50";
    ctx.fillRect(eb.x, eb.y, eb.w, eb.h);
  }

  for (const e of enemies) drawEnemy(e);
  drawShip(player.x, player.y, player.invuln > 0);

  ctx.fillStyle = "#c6d9ff";
  ctx.font = "9px 'Press Start 2P'";
  ctx.fillText(`BOMBS ${bombs}`, 12, H - 12);

  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.66)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffdf9a";
    ctx.font = "12px 'Press Start 2P'";
    const txt = "GAME OVER - PRESS SPACE";
    const tw = ctx.measureText(txt).width;
    ctx.fillText(txt, W / 2 - tw / 2, H / 2);
  }
}

function syncUi() {
  ui.score.textContent = String(score);
  ui.high.textContent = String(highScore);
  ui.lives.textContent = String(lives);
  ui.wave.textContent = String(wave);
  ui.chain.textContent = String(chain);
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
