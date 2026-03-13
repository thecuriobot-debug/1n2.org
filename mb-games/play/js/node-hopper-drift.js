import { bootArcadeGame } from "./arcade-shell.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  score: document.getElementById("score"),
  high: document.getElementById("high"),
  lives: document.getElementById("lives"),
  wave: document.getElementById("wave"),
  fuel: document.getElementById("fuel"),
};

const W = canvas.width;
const H = canvas.height;
const KEY = "mb_node_drift_high";
const arcade = bootArcadeGame({
  gameId: "node_hopper_drift",
  touch: { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown", a: " " },
});

const keys = Object.create(null);
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;

  if (["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "s", " ", "r"].includes(k) || e.key === " ") {
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
let fuel = 100;
let combo = 0;
let gameOver = false;
let elapsed = 0;
let obstacleClock = 0;
let nodeClock = 0;
let fuelClock = 0;
let streamOffset = 0;
let flash = 0;

const player = {
  x: W / 2 - 16,
  y: H - 92,
  w: 32,
  h: 44,
  speed: 190,
  invuln: 0,
};

let obstacles = [];
let pickups = [];

function restart() {
  score = 0;
  lives = 3;
  wave = 1;
  fuel = 100;
  combo = 0;
  gameOver = false;
  elapsed = 0;
  obstacleClock = 0;
  nodeClock = 0;
  fuelClock = 0;
  streamOffset = 0;
  flash = 0;

  player.x = W / 2 - 16;
  player.y = H - 92;
  player.invuln = 0;

  obstacles = [];
  pickups = [];

  syncUi();
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function spawnObstacle() {
  const type = Math.random() < 0.34 ? "rock" : "bar";
  if (type === "rock") {
    const w = 28 + Math.random() * 20;
    obstacles.push({
      type,
      x: 34 + Math.random() * (W - 68 - w),
      y: -60,
      w,
      h: 24 + Math.random() * 20,
      drift: (Math.random() < 0.5 ? -1 : 1) * (18 + Math.random() * 30),
    });
    return;
  }

  const w = 120 + Math.random() * 160;
  obstacles.push({
    type,
    x: 16 + Math.random() * (W - 32 - w),
    y: -32,
    w,
    h: 16,
    drift: (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 18),
  });
}

function spawnPickup(type) {
  pickups.push({
    type,
    x: 34 + Math.random() * (W - 68),
    y: -22,
    w: 16,
    h: 16,
    pulse: Math.random() * 6.28,
  });
}

function loseLife(fromFuel = false) {
  if (player.invuln > 0 || gameOver) return;
  lives -= 1;
  player.invuln = 1.15;
  combo = 0;
  flash = 0.22;

  if (fromFuel) fuel = 56;
  else fuel = Math.max(28, fuel - 20);

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
  wave = 1 + Math.floor(elapsed / 22);
  player.invuln = Math.max(0, player.invuln - dt);
  flash = Math.max(0, flash - dt);

  const turbo = (keys[" "] || keys.shift) && fuel > 0;
  const moveSpeed = player.speed + wave * 4 + (turbo ? 110 : 0);

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
  }

  player.x += mx * moveSpeed * dt;
  player.y += my * moveSpeed * dt;
  player.x = Math.max(12, Math.min(W - player.w - 12, player.x));
  player.y = Math.max(42, Math.min(H - player.h - 10, player.y));

  const fuelBurn = turbo ? 20 : 7.5;
  fuel = Math.max(0, fuel - fuelBurn * dt);
  if (fuel <= 0.01) loseLife(true);

  const streamSpeed = 145 + wave * 16;
  streamOffset = (streamOffset + streamSpeed * dt) % 52;

  obstacleClock += dt;
  nodeClock += dt;
  fuelClock += dt;

  const obstacleEvery = Math.max(0.22, 0.62 - elapsed * 0.004);
  if (obstacleClock >= obstacleEvery) {
    obstacleClock = 0;
    spawnObstacle();
  }

  if (nodeClock >= 0.86) {
    nodeClock = 0;
    spawnPickup("node");
  }

  if (fuelClock >= 5.2) {
    fuelClock = 0;
    spawnPickup("fuel");
  }

  const pRect = { x: player.x, y: player.y, w: player.w, h: player.h };

  for (const ob of obstacles) {
    ob.y += streamSpeed * dt;
    ob.x += ob.drift * dt;
    if (ob.x < 8 || ob.x + ob.w > W - 8) ob.drift *= -1;

    if (!ob.dead && overlap(pRect, ob)) {
      ob.dead = true;
      loseLife(false);
    }
  }

  for (const p of pickups) {
    p.y += streamSpeed * dt * 0.92;
    p.pulse += dt * 8;

    if (!p.dead && overlap(pRect, p)) {
      p.dead = true;
      if (p.type === "node") {
        combo = Math.min(9, combo + 1);
        score += 70 + combo * 12;
        fuel = Math.min(100, fuel + 4);
      } else {
        fuel = Math.min(100, fuel + 34);
        score += 55;
      }
    }
  }

  obstacles = obstacles.filter((ob) => !ob.dead && ob.y < H + 80);
  pickups = pickups.filter((p) => !p.dead && p.y < H + 40);

  const comboMult = 1 + combo * 0.12;
  score += Math.floor(dt * (14 + wave * 2) * comboMult);

  if (score > highScore) {
    highScore = score;
    localStorage.setItem(KEY, String(highScore));
  }

  syncUi();
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#08193a");
  g.addColorStop(1, "#071126");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(101, 193, 255, 0.18)";
  for (let y = -52; y < H + 60; y += 52) {
    const dy = y + streamOffset;
    ctx.fillRect(0, dy, W, 1);
  }

  ctx.fillStyle = "rgba(126, 214, 255, 0.08)";
  for (let x = 0; x < W; x += 56) {
    const sway = Math.sin((elapsed * 2) + x * 0.05) * 6;
    ctx.fillRect(x + sway, 30, 1, H - 30);
  }
}

function drawObstacles() {
  for (const ob of obstacles) {
    if (ob.type === "rock") {
      ctx.fillStyle = "#7db8ff";
      ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
      ctx.fillStyle = "#294f7e";
      ctx.fillRect(ob.x + 6, ob.y + 6, ob.w - 12, 7);
    } else {
      ctx.fillStyle = "#ff6d83";
      ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
      ctx.fillStyle = "#5a1f2b";
      ctx.fillRect(ob.x + 8, ob.y + 4, ob.w - 16, 6);
    }
  }
}

function drawPickups() {
  for (const p of pickups) {
    const pulse = Math.sin(p.pulse) * 1.2;
    if (p.type === "node") {
      ctx.fillStyle = "#ffd464";
      ctx.fillRect(p.x - pulse * 0.3, p.y - pulse * 0.3, p.w + pulse * 0.6, p.h + pulse * 0.6);
      ctx.fillStyle = "#6f4c0e";
      ctx.font = "9px 'Press Start 2P'";
      ctx.fillText("N", p.x + 3, p.y + 10);
    } else {
      ctx.fillStyle = "#85ffb9";
      ctx.fillRect(p.x - pulse * 0.3, p.y - pulse * 0.3, p.w + pulse * 0.6, p.h + pulse * 0.6);
      ctx.fillStyle = "#1e6340";
      ctx.fillRect(p.x + 5, p.y + 3, 6, 10);
    }
  }
}

function drawPlayer() {
  if (player.invuln > 0 && Math.floor(performance.now() / 78) % 2) return;

  ctx.fillStyle = "#ffcb63";
  ctx.fillRect(player.x, player.y, player.w, player.h);
  ctx.fillStyle = "#21416b";
  ctx.fillRect(player.x + 8, player.y + 10, player.w - 16, 14);
  ctx.fillStyle = "#8eefff";
  ctx.fillRect(player.x + 11, player.y + 3, player.w - 22, 8);
  ctx.fillStyle = "#ff6d8d";
  ctx.fillRect(player.x + 4, player.y + 32, 8, 6);
  ctx.fillRect(player.x + player.w - 12, player.y + 32, 8, 6);
}

function drawHud() {
  ctx.fillStyle = "#102448";
  ctx.fillRect(0, 0, W, 30);
  ctx.fillStyle = "#8fd9ff";
  ctx.font = "10px 'Press Start 2P'";
  ctx.fillText("NODE HOPPER DRIFT", 10, 20);

  const meterW = 150;
  const x = W - meterW - 12;
  ctx.fillStyle = "#1b2b46";
  ctx.fillRect(x, 8, meterW, 14);
  ctx.fillStyle = fuel > 30 ? "#7effb2" : "#ffbf61";
  ctx.fillRect(x + 1, 9, Math.floor(((meterW - 2) * fuel) / 100), 12);

  ctx.fillStyle = "#cbe1ff";
  ctx.font = "9px 'Press Start 2P'";
  ctx.fillText(`x${(1 + combo * 0.12).toFixed(2)}`, W - 106, H - 12);

  if (flash > 0) {
    ctx.fillStyle = `rgba(255, 82, 106, ${flash * 1.8})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.64)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffe2a2";
    ctx.font = "12px 'Press Start 2P'";
    const txt = "DRIFT ENDED - PRESS SPACE";
    ctx.fillText(txt, W / 2 - ctx.measureText(txt).width / 2, H / 2);
  }
}

function draw() {
  drawBackground();
  drawObstacles();
  drawPickups();
  drawPlayer();
  drawHud();
}

function syncUi() {
  ui.score.textContent = String(score);
  ui.high.textContent = String(highScore);
  ui.lives.textContent = String(lives);
  ui.wave.textContent = String(wave);
  ui.fuel.textContent = `${Math.floor(fuel)}%`;
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
