// Builds the race track geometry: a smooth centreline (closed loop or open
// point-to-point, per TRACK.closed) plus the left/right tarmac edges,
// checkpoints, and a helper to test whether a point is on-road.
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
  const closed = !!TRACK.closed;

  // Smooth Catmull-Rom through the anchors. A closed loop uses a periodic spline
  // (wrapping neighbours); an open route duplicates the endpoints instead.
  const centerline = [];
  if (closed) {
    for (let i = 0; i < n; i++) {
      const p0 = anchors[(i - 1 + n) % n];
      const p1 = anchors[i];
      const p2 = anchors[(i + 1) % n];
      const p3 = anchors[(i + 2) % n];
      for (let s = 0; s < steps; s++) {
        centerline.push(catmullRom(p0, p1, p2, p3, s / steps));
      }
    }
  } else {
    for (let i = 0; i < n - 1; i++) {
      const p0 = anchors[Math.max(0, i - 1)];
      const p1 = anchors[i];
      const p2 = anchors[(i + 1) % n];
      const p3 = anchors[Math.min(n - 1, i + 2)];
      for (let s = 0; s < steps; s++) {
        centerline.push(catmullRom(p0, p1, p2, p3, s / steps));
      }
    }
    centerline.push({ ...anchors[n - 1] });
  }

  const count = centerline.length;
  const half = TRACK.roadWidth / 2;
  const wrap = (i) => (closed ? (i + count) % count : Math.min(Math.max(i, 0), count - 1));
  const left = [];
  const right = [];
  for (let i = 0; i < count; i++) {
    const prev = centerline[wrap(i - 1)];
    const next = centerline[wrap(i + 1)];
    let tx = next.x - prev.x;
    let ty = next.y - prev.y;
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;
    // Left normal is (-ty, tx).
    left.push({ x: centerline[i].x - ty * half, y: centerline[i].y + tx * half });
    right.push({ x: centerline[i].x + ty * half, y: centerline[i].y - tx * half });
  }

  // Ordered gates. On a loop, index 0 is the start/finish gate and the gates are
  // spread over the whole lap; on an open route, index 0 is the start and the
  // last gate is the finish.
  const checkpoints = [];
  for (let c = 0; c < TRACK.numCheckpoints; c++) {
    const idx = closed
      ? Math.floor((c / TRACK.numCheckpoints) * count)
      : Math.floor((c / (TRACK.numCheckpoints - 1)) * (count - 1));
    const p = centerline[idx];
    const next = centerline[wrap(idx + 1)];
    const prev = centerline[wrap(idx - 1)];
    checkpoints.push({
      x: p.x,
      y: p.y,
      index: idx,
      angle: closed
        ? Math.atan2(next.y - p.y, next.x - p.x)
        : Math.atan2(next.y - prev.y, next.x - prev.x),
    });
  }

  // Start pose: on the line, facing along the track from the first sample.
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
    closed,
  };
}

// Shortest distance from (px,py) to the centreline polyline. On a closed loop
// the final wrap-around segment is included; on an open route it is not (so the
// straight line from finish back to start never reads as "on-road").
export function distanceToCenterline(px, py, centerline) {
  let best = Infinity;
  const n = centerline.length;
  const segs = TRACK.closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
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
