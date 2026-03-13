import { bootArcadeGame } from "./arcade-shell.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  score: document.getElementById("score"),
  high: document.getElementById("high"),
  lives: document.getElementById("lives"),
  level: document.getElementById("level"),
  power: document.getElementById("power"),
};

const W = canvas.width;
const H = canvas.height;
const KEY = "mb_bear_high";
const arcade = bootArcadeGame({
  gameId: "bear_breakout",
  touch: { left: "ArrowLeft", right: "ArrowRight", a: " " },
});

const keys = Object.create(null);
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (["arrowleft", "arrowright", " ", "r"].includes(k) || ["ArrowLeft", "ArrowRight", " "].includes(e.key)) {
    e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

let highScore = Number(localStorage.getItem(KEY) || 0);
let score = 0;
let level = 1;
let lives = 3;
let gameOver = false;

const paddle = {
  x: W / 2 - 64,
  y: H - 36,
  w: 128,
  h: 14,
  speed: 440,
};

const ball = {
  x: W / 2,
  y: H - 54,
  r: 8,
  vx: 210,
  vy: -210,
  stuck: true,
};

let multiplier = 1;
let powerLabel = "None";
let powerTimer = 0;
let message = "PRESS SPACE TO LAUNCH";

let bricks = [];
let powerups = [];

function createBricks() {
  bricks = [];
  const rows = Math.min(8, 5 + Math.floor(level / 2));
  const cols = 10;
  const bw = 56;
  const bh = 18;
  const gap = 4;
  const offsetX = 22;
  const offsetY = 54;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const hp = r >= rows - 2 ? 2 : 1;
      bricks.push({
        x: offsetX + c * (bw + gap),
        y: offsetY + r * (bh + gap),
        w: bw,
        h: bh,
        hp,
      });
    }
  }
}

function resetBall() {
  ball.stuck = true;
  ball.x = paddle.x + paddle.w / 2;
  ball.y = paddle.y - ball.r - 2;
  ball.vx = 205 + level * 10;
  ball.vy = -(205 + level * 10);
}

function restart() {
  score = 0;
  lives = 3;
  level = 1;
  multiplier = 1;
  powerTimer = 0;
  powerLabel = "None";
  paddle.w = 128;
  gameOver = false;
  powerups = [];
  message = "PRESS SPACE TO LAUNCH";
  createBricks();
  resetBall();
  syncUi();
}

function spawnPowerup(x, y) {
  const roll = Math.random();
  if (roll > 0.16) return;
  const type = roll < 0.08 ? "HODL" : roll < 0.14 ? "MOON" : "KEY";
  powerups.push({ x, y, vy: 95, type, size: 14 });
}

function applyPower(type) {
  if (type === "KEY") {
    lives += 1;
    powerLabel = "EXTRA LIFE";
    powerTimer = 1.2;
    return;
  }

  powerTimer = 10;
  if (type === "HODL") {
    paddle.w = 168;
    powerLabel = "HODL PADDLE";
  }
  if (type === "MOON") {
    multiplier = 2;
    powerLabel = "TO THE MOON x2";
  }
}

function updatePower(dt) {
  if (powerTimer <= 0) return;
  powerTimer -= dt;
  if (powerTimer > 0) return;

  multiplier = 1;
  paddle.w = 128;
  powerLabel = "None";
  powerTimer = 0;
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function update(dt) {
  if (keys.r) {
    keys.r = false;
    restart();
    return;
  }

  if (gameOver) {
    if (keys[" "]) {
      keys[" "] = false;
      restart();
    }
    return;
  }

  if (keys.arrowleft || keys.a) paddle.x -= paddle.speed * dt;
  if (keys.arrowright || keys.d) paddle.x += paddle.speed * dt;
  if (paddle.x < 8) paddle.x = 8;
  if (paddle.x + paddle.w > W - 8) paddle.x = W - 8 - paddle.w;

  updatePower(dt);

  if (ball.stuck) {
    ball.x = paddle.x + paddle.w / 2;
    ball.y = paddle.y - ball.r - 2;
    if (keys[" "]) {
      keys[" "] = false;
      ball.stuck = false;
      const startSpeed = 220 + level * 14;
      ball.vx = (Math.random() > 0.5 ? 1 : -1) * startSpeed * 0.75;
      ball.vy = -startSpeed;
      message = "";
    }
  } else {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x - ball.r < 0) {
      ball.x = ball.r;
      ball.vx *= -1;
    }
    if (ball.x + ball.r > W) {
      ball.x = W - ball.r;
      ball.vx *= -1;
    }
    if (ball.y - ball.r < 38) {
      ball.y = 38 + ball.r;
      ball.vy *= -1;
    }

    if (ball.y - ball.r > H) {
      lives -= 1;
      multiplier = 1;
      paddle.w = 128;
      powerLabel = "None";
      powerTimer = 0;
      if (lives <= 0) {
        gameOver = true;
        message = "GAME OVER - PRESS SPACE";
      }
      resetBall();
    }
  }

  const paddleRect = { x: paddle.x, y: paddle.y, w: paddle.w, h: paddle.h };
  const ballRect = { x: ball.x - ball.r, y: ball.y - ball.r, w: ball.r * 2, h: ball.r * 2 };

  if (!ball.stuck && overlap(ballRect, paddleRect) && ball.vy > 0) {
    const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
    const speed = Math.min(420, Math.hypot(ball.vx, ball.vy) + 12);
    const angle = hit * 1.12;
    ball.vx = speed * Math.sin(angle);
    ball.vy = -Math.abs(speed * Math.cos(angle));
    ball.y = paddle.y - ball.r - 1;
  }

  for (const brick of bricks) {
    if (brick.hp <= 0) continue;

    if (!overlap(ballRect, brick)) continue;

    const prevX = ball.x - ball.vx * dt;
    const prevY = ball.y - ball.vy * dt;
    const prevRect = { x: prevX - ball.r, y: prevY - ball.r, w: ball.r * 2, h: ball.r * 2 };

    const fromLeft = prevRect.x + prevRect.w <= brick.x;
    const fromRight = prevRect.x >= brick.x + brick.w;

    if (fromLeft || fromRight) ball.vx *= -1;
    else ball.vy *= -1;

    brick.hp -= 1;
    score += brick.hp <= 0 ? 100 * multiplier : 40 * multiplier;

    if (brick.hp <= 0) spawnPowerup(brick.x + brick.w / 2, brick.y + brick.h / 2);
    break;
  }

  for (const pu of powerups) pu.y += pu.vy * dt;
  powerups = powerups.filter((pu) => pu.y < H + 30);

  for (const pu of powerups) {
    if (
      pu.x > paddle.x - 4 &&
      pu.x < paddle.x + paddle.w + 4 &&
      pu.y + pu.size > paddle.y &&
      pu.y - pu.size < paddle.y + paddle.h
    ) {
      applyPower(pu.type);
      pu.y = H + 100;
    }
  }

  if (bricks.every((b) => b.hp <= 0)) {
    level += 1;
    message = `WAVE ${level}`;
    setTimeout(() => {
      if (!gameOver) message = "";
    }, 800);
    createBricks();
    resetBall();
  }

  if (score > highScore) {
    highScore = score;
    localStorage.setItem(KEY, String(highScore));
  }

  syncUi();
}

function drawHudBar() {
  ctx.fillStyle = "#111b3a";
  ctx.fillRect(0, 0, W, 36);
  ctx.fillStyle = "#ffbf42";
  ctx.font = "12px 'Press Start 2P'";
  ctx.fillText("BEAR MARKET BREAKOUT", 12, 23);
}

function drawBricks() {
  for (const b of bricks) {
    if (b.hp <= 0) continue;
    ctx.fillStyle = b.hp === 2 ? "#ff6f7b" : "#d64555";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = "#ffb0b8";
    ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    ctx.fillStyle = "#ffd36f";
    ctx.font = "10px 'Press Start 2P'";
    ctx.fillText("B", b.x + b.w / 2 - 4, b.y + 13);
  }
}

function drawPowerups() {
  for (const pu of powerups) {
    ctx.fillStyle = pu.type === "HODL" ? "#75ffab" : pu.type === "MOON" ? "#fcd168" : "#80d4ff";
    ctx.fillRect(pu.x - pu.size / 2, pu.y - pu.size / 2, pu.size, pu.size);
    ctx.strokeStyle = "#041022";
    ctx.strokeRect(pu.x - pu.size / 2 + 0.5, pu.y - pu.size / 2 + 0.5, pu.size - 1, pu.size - 1);
    ctx.fillStyle = "#102233";
    ctx.font = "9px 'Press Start 2P'";
    const label = pu.type === "KEY" ? "+1" : pu.type[0];
    ctx.fillText(label, pu.x - 6, pu.y + 3);
  }
}

function drawPaddle() {
  ctx.fillStyle = "#95a8b9";
  ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
  const sw = Math.max(18, paddle.w * 0.3);
  ctx.fillStyle = "#2e4733";
  ctx.fillRect(paddle.x + paddle.w / 2 - sw / 2, paddle.y + 3, sw, 8);
}

function drawBall() {
  ctx.fillStyle = "#ffc546";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8a5914";
  ctx.stroke();
  ctx.fillStyle = "#4a2d04";
  ctx.font = "9px 'Press Start 2P'";
  ctx.fillText("B", ball.x - 4, ball.y + 3);
}

function drawMessage() {
  if (!message) return;
  ctx.fillStyle = "rgba(4, 8, 18, 0.7)";
  ctx.fillRect(0, H / 2 - 28, W, 56);
  ctx.fillStyle = "#eaf2ff";
  ctx.font = "12px 'Press Start 2P'";
  const textW = ctx.measureText(message).width;
  ctx.fillText(message, W / 2 - textW / 2, H / 2 + 6);
}

function render() {
  ctx.fillStyle = "#060a15";
  ctx.fillRect(0, 0, W, H);

  drawHudBar();
  drawBricks();
  drawPowerups();
  drawPaddle();
  drawBall();
  drawMessage();
}

function syncUi() {
  ui.score.textContent = String(score);
  ui.high.textContent = String(highScore);
  ui.lives.textContent = String(lives);
  ui.level.textContent = String(level);
  ui.power.textContent = powerLabel;
  arcade.update(score);
}

let last = performance.now();
function frame(t) {
  const dt = Math.min(0.033, (t - last) / 1000);
  last = t;
  if (!arcade.isPaused()) update(dt);
  render();
  arcade.drawPause(ctx, W, H);
  requestAnimationFrame(frame);
}

restart();
requestAnimationFrame(frame);
