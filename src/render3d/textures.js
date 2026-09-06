// Canvas-drawn textures.
//
// Every CanvasTexture here sets colorSpace = SRGBColorSpace explicitly. Three
// converts plain colour values from sRGB automatically but leaves canvas-backed
// textures alone, so without it text and checkers render noticeably washed out
// while the mesh colours beside them look right.
import { CanvasTexture, SRGBColorSpace, LinearFilter } from 'three';
import { FONT } from '../ui/format.js';

function finish(canvas) {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

// Black/white starting grid checker.
export function checkerTexture(cols = 10, rows = 4, cell = 32) {
  const canvas = document.createElement('canvas');
  canvas.width = cols * cell;
  canvas.height = rows * cell;
  const ctx = canvas.getContext('2d');
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#1b1b1b' : '#ffffff';
      ctx.fillRect(c * cell, r * cell, cell, cell);
    }
  }
  return finish(canvas);
}

// A text panel, styled the way the 2D game styled its roadside labels. Returns
// { texture, aspect } so the caller can size a plane without distorting it.
export function labelTexture(text, {
  color = '#fff8e7',
  background = '#15314b',
  stroke = null,
  strokeWidth = 8,
  fontSize = 64,
  padX = 28,
  padY = 18,
  radius = 16,
} = {}) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = `700 ${fontSize}px ${FONT}`;
  ctx.font = font;
  const width = Math.ceil(ctx.measureText(text).width) + padX * 2;
  const height = fontSize + padY * 2;
  canvas.width = width;
  canvas.height = height;

  // Resizing the canvas resets the context, so restate everything.
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (background) {
    ctx.fillStyle = background;
    roundedRect(ctx, 0, 0, width, height, radius);
    ctx.fill();
  }
  if (stroke) {
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, width / 2, height / 2);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, width / 2, height / 2);

  return { texture: finish(canvas), aspect: width / height };
}

function roundedRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
