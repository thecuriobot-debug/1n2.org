import { bootArcadeGame } from "./arcade-shell.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  score: document.getElementById("score"),
  high: document.getElementById("high"),
  lives: document.getElementById("lives"),
  wave: document.getElementById("wave"),
  rant: document.getElementById("rant"),
};

const W = canvas.width;
const H = canvas.height;
const KEY = "mb_meme_blaster_high";
const arcade = bootArcadeGame({
  gameId: "mad_meme_blaster",
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
let rant = 0;
let gameOver = false;
let elapsed = 0;
let shotClock = 0;
let invuln = 0;
let flash = 0;

const player = {
  x: W / 2,
  y: H - 52,
  w: 44,
  h: 22,
  speed: 290,
};

const stars = [];
for (let i = 0; i < 70; i++) {
  stars.push({ x: Math.random() * W, y: Math.random() * H, s: 0.6 + Math.random() * 1.6 });
}

let bullets = [];
let enemyBullets = [];
let enemies = [];
let formationX = 100;
let formationY = 70;
let formationDir = 1;

function restart() {
  score = 0;
  lives = 3;
  wave = 1;
  rant = 0;
  gameOver = false;
  elapsed = 0;
  shotClock = 0;
  invuln = 0;
  flash = 0;

  player.x = W / 2;

  bullets = [];
  enemyBullets = [];
  spawnWave();

  syncUi();
}

function spawnWave() {
  enemies = [];
  formationX = 76;
  formationY = 62;
  formationDir = Math.random() < 0.5 ? -1 : 1;

  const rows = Math.min(5, 3 + Math.floor((wave - 1) / 2));
  const cols = 9;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const typeRoll = (r + c + wave) % 3;
      const type = typeRoll === 0 ? "paper" : typeRoll === 1 ? "fud" : "bot";
      enemies.push({
        gx: c * 52,
        gy: r * 38,
        w: 30,
        h: 20,
        type,
        hp: type === "bot" ? 2 : 1,
      });
    }
  }
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function fireShot() {
  bullets.push({ x: player.x - 2, y: player.y - 10, w: 4, h: 12, speed: 440 });
}

function useRantBlast() {
  if (rant < 100) return false;
  rant = 0;
  score += 180;
  enemyBullets.length = 0;

  for (const en of enemies) {
    const x = formationX + en.gx;
    const y = formationY + en.gy;
    if (y < H * 0.62) {
      en.hp -= 1;
      if (en.hp <= 0) en.dead = true;
    }
  }

  return true;
}

function loseLife() {
  if (invuln > 0 || gameOver) return;
  lives -= 1;
  invuln = 1.2;
  flash = 0.24;
  rant = Math.max(0, rant - 20);
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
  invuln = Math.max(0, invuln - dt);
  shotClock = Math.max(0, shotClock - dt);
  flash = Math.max(0, flash - dt);

  if (keys.arrowleft || keys.a) player.x -= player.speed * dt;
  if (keys.arrowright || keys.d) player.x += player.speed * dt;
  player.x = Math.max(player.w / 2 + 6, Math.min(W - player.w / 2 - 6, player.x));

  if ((keys[" "] || keys.z) && shotClock <= 0) {
    shotClock = 0.16;
    fireShot();
  }

  if (keys.x) {
    keys.x = false;
    useRantBlast();
  }

  for (const st of stars) {
    st.y += 17 * st.s * dt;
    if (st.y > H) {
      st.y = -2;
      st.x = Math.random() * W;
    }
  }

  const formSpeed = 18 + wave * 4;
  formationX += formationDir * formSpeed * dt;

  let leftMost = Infinity;
  let rightMost = -Infinity;
  let bottomMost = -Infinity;
  for (const en of enemies) {
    if (en.dead) continue;
    const x = formationX + en.gx;
    const y = formationY + en.gy;
    leftMost = Math.min(leftMost, x);
    rightMost = Math.max(rightMost, x + en.w);
    bottomMost = Math.max(bottomMost, y + en.h);
  }

  if (leftMost < 18 || rightMost > W - 18) {
    formationDir *= -1;
    formationY += 12;
  }

  if (bottomMost > H - 88) {
    loseLife();
    formationY -= 20;
  }

  const shooterPool = enemies.filter((en) => !en.dead);
  if (shooterPool.length > 0) {
    const shotsPerSec = 0.6 + wave * 0.1;
    if (Math.random() < shotsPerSec * dt) {
      const shooter = shooterPool[Math.floor(Math.random() * shooterPool.length)];
      enemyBullets.push({
        x: formationX + shooter.gx + shooter.w / 2 - 3,
        y: formationY + shooter.gy + shooter.h,
        w: 6,
        h: 12,
        speed: 150 + wave * 16,
      });
    }
  }

  for (const b of bullets) b.y -= b.speed * dt;
  for (const b of enemyBullets) b.y += b.speed * dt;

  const pRect = { x: player.x - player.w / 2, y: player.y, w: player.w, h: player.h };

  for (const b of bullets) {
    if (b.dead) continue;
    for (const en of enemies) {
      if (en.dead) continue;
      const eRect = { x: formationX + en.gx, y: formationY + en.gy, w: en.w, h: en.h };
      if (!overlap(b, eRect)) continue;

      b.dead = true;
      en.hp -= 1;
      if (en.hp <= 0) {
        en.dead = true;
        const pts = en.type === "bot" ? 90 : en.type === "fud" ? 65 : 55;
        score += pts + wave * 4;
        rant = Math.min(105, rant + (en.type === "bot" ? 12 : 8));
      }
      break;
    }
  }

  for (const b of enemyBullets) {
    if (b.dead) continue;
    if (overlap(pRect, b)) {
      b.dead = true;
      loseLife();
    }
  }

  for (const en of enemies) {
    if (en.dead) continue;
    const eRect = { x: formationX + en.gx, y: formationY + en.gy, w: en.w, h: en.h };
    if (overlap(pRect, eRect)) {
      en.dead = true;
      loseLife();
    }
  }

  bullets = bullets.filter((b) => !b.dead && b.y > -18);
  enemyBullets = enemyBullets.filter((b) => !b.dead && b.y < H + 20);
  enemies = enemies.filter((en) => !en.dead);

  if (enemies.length === 0) {
    wave += 1;
    score += 240 + wave * 25;
    rant = Math.min(105, rant + 25);
    spawnWave();
  }

  score += Math.floor(dt * (9 + wave * 1.1));

  if (score > highScore) {
    highScore = score;
    localStorage.setItem(KEY, String(highScore));
  }

  syncUi();
}

function drawBackdrop() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#090f2a");
  g.addColorStop(1, "#140915");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  for (const st of stars) {
    const b = Math.floor(120 + st.s * 75);
    ctx.fillStyle = `rgb(${b}, ${b}, ${b + 25})`;
    ctx.fillRect(st.x, st.y, Math.max(1, st.s), Math.max(1, st.s));
  }

  ctx.fillStyle = "rgba(130, 215, 255, 0.08)";
  for (let x = 0; x < W; x += 40) ctx.fillRect(x, 30, 1, H - 30);
}

function drawPlayer() {
  if (invuln > 0 && Math.floor(performance.now() / 75) % 2) return;

  const x = player.x - player.w / 2;
  const y = player.y;
  ctx.fillStyle = "#ffcc62";
  ctx.fillRect(x, y + 4, player.w, player.h - 4);
  ctx.fillStyle = "#2c3a5b";
  ctx.fillRect(x + 10, y + 10, player.w - 20, 6);
  ctx.fillStyle = "#ff687f";
  ctx.fillRect(x + 4, y + 16, 8, 4);
  ctx.fillRect(x + player.w - 12, y + 16, 8, 4);
}

function drawEnemies() {
  for (const en of enemies) {
    const x = formationX + en.gx;
    const y = formationY + en.gy;

    if (en.type === "paper") {
      ctx.fillStyle = "#85ddff";
      ctx.fillRect(x, y, en.w, en.h);
      ctx.fillStyle = "#163f53";
      ctx.fillRect(x + 6, y + 6, en.w - 12, 7);
      ctx.fillStyle = "#0c2b3a";
      ctx.fillRect(x + 10, y + 14, 10, 3);
    } else if (en.type === "fud") {
      ctx.fillStyle = "#ff6a82";
      ctx.fillRect(x, y, en.w, en.h);
      ctx.fillStyle = "#531927";
      ctx.fillRect(x + 5, y + 5, en.w - 10, 6);
      ctx.fillStyle = "#ffd08a";
      ctx.fillRect(x + 13, y + 13, 4, 4);
    } else {
      ctx.fillStyle = "#b792ff";
      ctx.fillRect(x, y, en.w, en.h);
      ctx.fillStyle = "#2b1f53";
      ctx.fillRect(x + 6, y + 6, en.w - 12, 6);
      ctx.fillStyle = "#ffd171";
      ctx.fillRect(x + 3, y + 12, 24, 4);
    }
  }
}

function drawBullets() {
  for (const b of bullets) {
    ctx.fillStyle = "#8cfdbc";
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }
  for (const b of enemyBullets) {
    ctx.fillStyle = "#ffb762";
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }
}

function drawHud() {
  ctx.fillStyle = "#102247";
  ctx.fillRect(0, 0, W, 30);
  ctx.fillStyle = "#8dd9ff";
  ctx.font = "10px 'Press Start 2P'";
  ctx.fillText("MAD MEME BLASTER", 10, 20);

  const meterW = 150;
  const x = W - meterW - 12;
  ctx.fillStyle = "#1a2844";
  ctx.fillRect(x, 8, meterW, 14);
  ctx.fillStyle = rant >= 100 ? "#7effb2" : "#ffbe5d";
  ctx.fillRect(x + 1, 9, Math.floor(((meterW - 2) * Math.min(100, rant)) / 100), 12);

  if (rant >= 100) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(W / 2 - 152, H - 52, 304, 24);
    ctx.fillStyle = "#cbffe2";
    ctx.font = "10px 'Press Start 2P'";
    const t = "PRESS X: MAD RANT BLAST";
    ctx.fillText(t, W / 2 - ctx.measureText(t).width / 2, H - 36);
  }

  if (flash > 0) {
    ctx.fillStyle = `rgba(255, 84, 103, ${flash * 1.8})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.64)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffe1a2";
    ctx.font = "12px 'Press Start 2P'";
    const txt = "MEME WIPED - PRESS SPACE";
    ctx.fillText(txt, W / 2 - ctx.measureText(txt).width / 2, H / 2);
  }
}

function draw() {
  drawBackdrop();
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
  ui.rant.textContent = `${Math.floor(rant)}%`;
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
