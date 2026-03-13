import { bootArcadeGame } from "./arcade-shell.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  score: document.getElementById("score"),
  high: document.getElementById("high"),
  lines: document.getElementById("lines"),
  level: document.getElementById("level"),
  mempool: document.getElementById("mempool"),
};

const KEY = "mb_mempool_high";
const W = canvas.width;
const H = canvas.height;
const arcade = bootArcadeGame({
  gameId: "mempool_meltdown",
  touch: { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown", a: " ", b: "x" },
});

const COLS = 10;
const ROWS = 20;
const CELL = 20;
const BOARD_X = 64;
const BOARD_Y = 42;

const SHAPES = [
  [[1, 1, 1, 1]],
  [[1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 1], [1, 1, 0]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 1, 0], [0, 1, 1]],
];

const COLORS = [
  "#72b7ff",
  "#f4896a",
  "#8bf078",
  "#f4dd67",
  "#c597ff",
  "#74f6e3",
  "#ff94d4",
];

const keys = Object.create(null);
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;

  if (["arrowleft", "arrowright", "arrowup", "arrowdown", " ", "x", "r"].includes(k) || e.key === " ") {
    e.preventDefault();
  }

  if (k === "r") {
    restart();
    return;
  }

  if (gameOver) {
    if (k === " ") restart();
    return;
  }

  if (k === "arrowleft" || k === "a") tryMove(-1, 0);
  if (k === "arrowright" || k === "d") tryMove(1, 0);
  if (k === "arrowup" || k === "x" || k === "w") rotatePiece();
  if (k === " ") hardDrop();
  if (k === "arrowdown" || k === "s") softDrop();
});
window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

let board = [];
let current = null;
let nextPiece = null;
let score = 0;
let lines = 0;
let level = 1;
let mempool = 0;
let gameOver = false;
let highScore = Number(localStorage.getItem(KEY) || 0);
let gravityClock = 0;
let downClock = 0;
let textFlash = "";
let flashClock = 0;

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function cloneShape(shape) {
  return shape.map((row) => row.slice());
}

function randomPiece() {
  const idx = Math.floor(Math.random() * SHAPES.length);
  return {
    shape: cloneShape(SHAPES[idx]),
    x: Math.floor(COLS / 2) - 2,
    y: -1,
    color: idx,
  };
}

function collision(px, py, shape) {
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      const nx = px + x;
      const ny = py + y;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotate(shape) {
  const h = shape.length;
  const w = shape[0].length;
  const out = Array.from({ length: w }, () => Array(h).fill(0));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      out[x][h - y - 1] = shape[y][x];
    }
  }
  return out;
}

function rotatePiece() {
  const rotated = rotate(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const k of kicks) {
    if (!collision(current.x + k, current.y, rotated)) {
      current.shape = rotated;
      current.x += k;
      return;
    }
  }
}

function tryMove(dx, dy) {
  if (!collision(current.x + dx, current.y + dy, current.shape)) {
    current.x += dx;
    current.y += dy;
    return true;
  }
  return false;
}

function softDrop() {
  if (tryMove(0, 1)) {
    score += 1;
    return;
  }
  lockPiece();
}

function hardDrop() {
  let moved = 0;
  while (tryMove(0, 1)) moved += 1;
  score += moved * 2;
  lockPiece();
}

function mergeCurrent() {
  for (let y = 0; y < current.shape.length; y++) {
    for (let x = 0; x < current.shape[y].length; x++) {
      if (!current.shape[y][x]) continue;
      const by = current.y + y;
      const bx = current.x + x;
      if (by < 0) {
        gameOver = true;
      } else {
        board[by][bx] = current.color + 1;
      }
    }
  }
}

function clearLines() {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y--) {
    if (board[y].every((v) => v > 0)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(0));
      cleared += 1;
      y += 1;
    }
  }

  if (cleared > 0) {
    const lineScore = [0, 120, 320, 560, 900][cleared] || 1200;
    score += lineScore * level;
    lines += cleared;
    level = 1 + Math.floor(lines / 10);
    mempool = Math.max(0, mempool - (cleared * 14 + cleared * cleared * 3));

    if (cleared >= 3) {
      textFlash = "TO THE MOON CHAIN";
      flashClock = 1.0;
    }
  }
}

function spawnPiece() {
  current = nextPiece || randomPiece();
  nextPiece = randomPiece();
  current.x = Math.floor(COLS / 2) - Math.ceil(current.shape[0].length / 2);
  current.y = -1;
  if (collision(current.x, current.y, current.shape)) {
    gameOver = true;
    textFlash = "MEMPOOL OVERFLOW";
  }
}

function lockPiece() {
  mergeCurrent();
  clearLines();
  mempool += 7 + level * 0.6;
  spawnPiece();
}

function restart() {
  board = emptyBoard();
  score = 0;
  lines = 0;
  level = 1;
  mempool = 8;
  gameOver = false;
  gravityClock = 0;
  downClock = 0;
  textFlash = "PRESS SPACE FOR HARD DROP";
  flashClock = 1.8;
  nextPiece = randomPiece();
  spawnPiece();
  syncUi();
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

  const gravityRate = Math.max(0.08, 0.72 - (level - 1) * 0.05);
  gravityClock += dt;

  if (keys.arrowdown || keys.s) {
    downClock += dt;
    if (downClock > 0.045) {
      downClock = 0;
      softDrop();
    }
  } else {
    downClock = 0;
  }

  if (gravityClock >= gravityRate) {
    gravityClock = 0;
    if (!tryMove(0, 1)) lockPiece();
  }

  mempool += dt * (4 + level * 0.8);
  if (mempool >= 100) {
    mempool = 100;
    gameOver = true;
    textFlash = "MEMPOOL REKT - PRESS SPACE";
    flashClock = 999;
  }

  if (flashClock > 0) flashClock -= dt;
  if (score > highScore) {
    highScore = score;
    localStorage.setItem(KEY, String(highScore));
  }

  syncUi();
}

function drawCell(x, y, color, alpha = 1) {
  const px = BOARD_X + x * CELL;
  const py = BOARD_Y + y * CELL;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.strokeRect(px + 0.5, py + 0.5, CELL - 1, CELL - 1);
  ctx.globalAlpha = 1;
}

function drawBoard() {
  ctx.fillStyle = "#0f1935";
  ctx.fillRect(BOARD_X - 6, BOARD_Y - 6, COLS * CELL + 12, ROWS * CELL + 12);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x]) {
        drawCell(x, y, COLORS[board[y][x] - 1]);
      } else {
        ctx.strokeStyle = "rgba(136,177,255,0.1)";
        ctx.strokeRect(BOARD_X + x * CELL + 0.5, BOARD_Y + y * CELL + 0.5, CELL - 1, CELL - 1);
      }
    }
  }
}

function drawCurrentPiece() {
  for (let y = 0; y < current.shape.length; y++) {
    for (let x = 0; x < current.shape[y].length; x++) {
      if (!current.shape[y][x]) continue;
      const by = current.y + y;
      if (by < 0) continue;
      drawCell(current.x + x, by, COLORS[current.color]);
    }
  }
}

function drawGhost() {
  let ghostY = current.y;
  while (!collision(current.x, ghostY + 1, current.shape)) ghostY += 1;

  for (let y = 0; y < current.shape.length; y++) {
    for (let x = 0; x < current.shape[y].length; x++) {
      if (!current.shape[y][x]) continue;
      const by = ghostY + y;
      if (by < 0) continue;
      drawCell(current.x + x, by, COLORS[current.color], 0.18);
    }
  }
}

function drawSidebar() {
  const sx = 320;
  ctx.fillStyle = "#111b38";
  ctx.fillRect(sx, 42, 260, 400);

  ctx.fillStyle = "#ffd087";
  ctx.font = "10px 'Press Start 2P'";
  ctx.fillText("NEXT TX", sx + 20, 72);

  const shape = nextPiece.shape;
  const ox = sx + 38;
  const oy = 92;
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      ctx.fillStyle = COLORS[nextPiece.color];
      ctx.fillRect(ox + x * 18, oy + y * 18, 16, 16);
    }
  }

  ctx.fillStyle = "#dbe9ff";
  ctx.font = "11px 'Press Start 2P'";
  ctx.fillText(`SCORE ${score}`, sx + 20, 178);
  ctx.fillText(`LINES ${lines}`, sx + 20, 210);
  ctx.fillText(`LVL ${level}`, sx + 20, 242);
  ctx.fillText(`HIGH ${highScore}`, sx + 20, 274);

  ctx.fillStyle = "#ffcf7a";
  ctx.fillText("MEMPOOL", sx + 20, 322);
  ctx.fillStyle = "#1c243a";
  ctx.fillRect(sx + 20, 338, 220, 22);
  ctx.fillStyle = mempool > 80 ? "#ff5a65" : mempool > 60 ? "#ffb84a" : "#79f5b0";
  ctx.fillRect(sx + 22, 340, Math.floor((216 * mempool) / 100), 18);

  ctx.fillStyle = "#dbe9ff";
  ctx.fillText(`${Math.floor(mempool)}%`, sx + 20, 388);
}

function drawFlash() {
  if (!textFlash || flashClock <= 0) return;
  ctx.fillStyle = "rgba(4, 10, 20, 0.7)";
  ctx.fillRect(0, H / 2 - 24, W, 48);
  ctx.fillStyle = "#eaf2ff";
  ctx.font = "11px 'Press Start 2P'";
  const w = ctx.measureText(textFlash).width;
  ctx.fillText(textFlash, W / 2 - w / 2, H / 2 + 4);
}

function draw() {
  ctx.fillStyle = "#050a16";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#111a38";
  ctx.fillRect(0, 0, W, 30);
  ctx.fillStyle = "#8ed8ff";
  ctx.font = "11px 'Press Start 2P'";
  ctx.fillText("MEMPOOL MELTDOWN", 12, 20);

  drawBoard();
  drawGhost();
  drawCurrentPiece();
  drawSidebar();
  drawFlash();

  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffe19f";
    ctx.font = "13px 'Press Start 2P'";
    const txt = "REKT - PRESS SPACE";
    const tw = ctx.measureText(txt).width;
    ctx.fillText(txt, W / 2 - tw / 2, H / 2);
  }
}

function syncUi() {
  ui.score.textContent = String(score);
  ui.high.textContent = String(highScore);
  ui.lines.textContent = String(lines);
  ui.level.textContent = String(level);
  ui.mempool.textContent = `${Math.floor(mempool)}%`;
  arcade.update(score);
}

let last = performance.now();
function frame(t) {
  const dt = Math.min(0.04, (t - last) / 1000);
  last = t;
  if (!arcade.isPaused()) update(dt);
  draw();
  arcade.drawPause(ctx, W, H);
  requestAnimationFrame(frame);
}

restart();
requestAnimationFrame(frame);
