// Builds the race track geometry: a smooth closed centreline plus the left/right
// tarmac edges, checkpoints, and a helper to test whether a point is on-road.
import { TRACK } from './config.js';

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

export function buildTrack() {
  const anchors = TRACK.anchors;
  const n = anchors.length;
  const steps = TRACK.samplesPerSegment;

  // Smooth, periodic Catmull-Rom through the anchors -> closed centreline.
  const centerline = [];
  for (let i = 0; i < n; i++) {
    const p0 = anchors[(i - 1 + n) % n];
    const p1 = anchors[i];
    const p2 = anchors[(i + 1) % n];
    const p3 = anchors[(i + 2) % n];
    for (let s = 0; s < steps; s++) {
      centerline.push(catmullRom(p0, p1, p2, p3, s / steps));
    }
  }

  const count = centerline.length;
  const half = TRACK.roadWidth / 2;
  const left = [];
  const right = [];
  for (let i = 0; i < count; i++) {
    const prev = centerline[(i - 1 + count) % count];
    const next = centerline[(i + 1) % count];
    let tx = next.x - prev.x;
    let ty = next.y - prev.y;
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;
    // Left normal is (-ty, tx).
    left.push({ x: centerline[i].x - ty * half, y: centerline[i].y + tx * half });
    right.push({ x: centerline[i].x + ty * half, y: centerline[i].y - tx * half });
  }

  // Evenly spaced checkpoints; index 0 is the start/finish gate.
  const checkpoints = [];
  for (let c = 0; c < TRACK.numCheckpoints; c++) {
    const idx = Math.floor((c / TRACK.numCheckpoints) * count);
    const p = centerline[idx];
    const next = centerline[(idx + 1) % count];
    checkpoints.push({
      x: p.x,
      y: p.y,
      index: idx,
      angle: Math.atan2(next.y - p.y, next.x - p.x),
    });
  }

  // Start pose: on the line, facing along the track (counter-clockwise here).
  const start = centerline[0];
  const startNext = centerline[1];
  const tx = startNext.x - start.x;
  const ty = startNext.y - start.y;
  // Sprite is drawn nose-up; forward = (sin r, -cos r) => r = atan2(tx, -ty).
  const startRotation = Math.atan2(tx, -ty);

  return {
    centerline,
    left,
    right,
    checkpoints,
    start: { x: start.x, y: start.y, rotation: startRotation },
    half,
  };
}

// Shortest distance from (px,py) to the closed centreline polyline.
export function distanceToCenterline(px, py, centerline) {
  let best = Infinity;
  const n = centerline.length;
  for (let i = 0; i < n; i++) {
    const a = centerline[i];
    const b = centerline[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy || 1;
    let t = ((px - a.x) * dx + (py - a.y) * dy) / lenSq;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const cx = a.x + t * dx;
    const cy = a.y + t * dy;
    const d = (px - cx) * (px - cx) + (py - cy) * (py - cy);
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}
