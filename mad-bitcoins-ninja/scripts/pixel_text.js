const GLYPHS = {
  " ": ["0", "0", "0", "0", "0"],
  A: ["010", "101", "111", "101", "101"],
  B: ["110", "101", "110", "101", "110"],
  C: ["011", "100", "100", "100", "011"],
  D: ["110", "101", "101", "101", "110"],
  E: ["111", "100", "110", "100", "111"],
  F: ["111", "100", "110", "100", "100"],
  G: ["011", "100", "101", "101", "011"],
  H: ["101", "101", "111", "101", "101"],
  I: ["111", "010", "010", "010", "111"],
  J: ["001", "001", "001", "101", "010"],
  K: ["101", "101", "110", "101", "101"],
  L: ["100", "100", "100", "100", "111"],
  M: ["10001", "11011", "10101", "10001", "10001"],
  N: ["101", "111", "111", "111", "101"],
  O: ["010", "101", "101", "101", "010"],
  P: ["110", "101", "110", "100", "100"],
  Q: ["010", "101", "101", "010", "001"],
  R: ["110", "101", "110", "101", "101"],
  S: ["011", "100", "010", "001", "110"],
  T: ["111", "010", "010", "010", "010"],
  U: ["101", "101", "101", "101", "111"],
  V: ["101", "101", "101", "101", "010"],
  W: ["10001", "10001", "10101", "11011", "10001"],
  X: ["101", "101", "010", "101", "101"],
  Y: ["101", "101", "010", "010", "010"],
  Z: ["111", "001", "010", "100", "111"],
  0: ["111", "101", "101", "101", "111"],
  1: ["010", "110", "010", "010", "111"],
  2: ["111", "001", "111", "100", "111"],
  3: ["111", "001", "111", "001", "111"],
  4: ["101", "101", "111", "001", "001"],
  5: ["111", "100", "111", "001", "111"],
  6: ["111", "100", "111", "101", "111"],
  7: ["111", "001", "010", "100", "100"],
  8: ["111", "101", "111", "101", "111"],
  9: ["111", "101", "111", "001", "111"],
  ":": ["0", "1", "0", "1", "0"],
  ".": ["0", "0", "0", "0", "1"],
  ",": ["0", "0", "0", "1", "10"],
  "!": ["1", "1", "1", "0", "1"],
  "?": ["111", "001", "011", "000", "010"],
  "-": ["000", "000", "111", "000", "000"],
  "/": ["001", "001", "010", "100", "100"],
  "'": ["1", "1", "0", "0", "0"],
  "%": ["1001", "0010", "0100", "1000", "1001"],
  "(": ["01", "10", "10", "10", "01"],
  ")": ["10", "01", "01", "01", "10"],
  "_": ["000", "000", "000", "000", "111"],
};

const FALLBACK = ["111", "101", "010", "000", "010"];

function glyphFor(char) {
  return GLYPHS[char] || FALLBACK;
}

function glyphWidth(glyph) {
  return glyph[0].length;
}

export function measurePixelText(text, scale = 1, spacing = 1) {
  const normalized = String(text || "").toUpperCase();
  if (!normalized.length) {
    return 0;
  }

  let width = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    const glyph = glyphFor(normalized[i]);
    width += glyphWidth(glyph) * scale;
    if (i < normalized.length - 1) {
      width += spacing * scale;
    }
  }
  return width;
}

function drawGlyph(ctx, glyph, x, y, scale, color) {
  ctx.fillStyle = color;
  for (let row = 0; row < glyph.length; row += 1) {
    const rowBits = glyph[row];
    for (let col = 0; col < rowBits.length; col += 1) {
      if (rowBits[col] === "1") {
        ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
      }
    }
  }
}

export function drawPixelText(ctx, text, x, y, options = {}) {
  const {
    scale = 1,
    spacing = 1,
    color = "#f5f7ff",
    shadow = false,
    shadowColor = "#091017",
    shadowOffsetX = 1,
    shadowOffsetY = 1,
  } = options;

  const normalized = String(text || "").toUpperCase();
  let cursor = x;

  for (let i = 0; i < normalized.length; i += 1) {
    const glyph = glyphFor(normalized[i]);

    if (shadow) {
      drawGlyph(
        ctx,
        glyph,
        cursor + shadowOffsetX * scale,
        y + shadowOffsetY * scale,
        scale,
        shadowColor,
      );
    }

    drawGlyph(ctx, glyph, cursor, y, scale, color);

    cursor += glyphWidth(glyph) * scale;
    if (i < normalized.length - 1) {
      cursor += spacing * scale;
    }
  }

  return cursor - x;
}

export function drawWrappedPixelText(ctx, text, x, y, maxWidth, options = {}) {
  const scale = options.scale ?? 1;
  const spacing = options.spacing ?? 1;
  const lineHeight = options.lineHeight ?? 7 * scale;
  const words = String(text || "").toUpperCase().split(" ");
  let line = "";
  let linesDrawn = 0;

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (measurePixelText(test, scale, spacing) > maxWidth && line) {
      drawPixelText(ctx, line, x, y + linesDrawn * lineHeight, options);
      line = word;
      linesDrawn += 1;
    } else {
      line = test;
    }
  }

  if (line) {
    drawPixelText(ctx, line, x, y + linesDrawn * lineHeight, options);
    linesDrawn += 1;
  }

  return linesDrawn;
}
