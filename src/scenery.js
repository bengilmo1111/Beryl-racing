// Deterministic roadside scenery placement.
//
// This is simulation, not decoration: every tree placed here also becomes a
// collision circle that resolveObstacles() reads every frame, and the placement
// runs off the global RNG that the playtest harness seeds. The call sequence
// below — two Between draws *before* the theme/mode/distance filters, then GetRandom
// for the variant, then FloatBetween for the scale — is part of the determinism
// contract. Reordering it, or adding a draw, moves every recorded finish
// position. See docs/playtest.md and the AC2 baselines in progress.md.
import Phaser from 'phaser';
import { TRACK, WORLD } from './config.js';
import { distanceToCenterline } from './track.js';

const VARIANTS = ['tree-1', 'tree-2', 'tree-3'];

function centerlineHull(centerline) {
  const pts = centerline.map((p) => ({ x: p.x, y: p.y })).sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const half = (list) => {
    const h = [];
    for (const p of list) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop();
      h.push(p);
    }
    h.pop();
    return h;
  };
  return half(pts).concat(half(pts.slice().reverse()));
}

function insideHull(x, y, hull) {
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i];
    const b = hull[(i + 1) % hull.length];
    if ((b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x) < 0) return false;
  }
  return true;
}

const TREE_TEXTURE_SIZE = 128;

export function scatterScenery(track, def) {
  const trees = [];
  const obstacles = [];

  // The Manfeild art pass is intentionally a bare, open race venue. Its visual
  // rhythm comes from the new pit, stand, marshal, fence, bale and sign models,
  // not a generic ring of trees. Returning before any random draws also makes
  // the no-tree rule absolute: no invisible tree collision circles remain.
  if (def.theme === 'manfield') return { trees, obstacles };

  const hull = def.mode === 'circuit' ? centerlineHull(track.centerline) : null;
  let placed = 0;
  let tries = 0;
  while (placed < 90 && tries < 1200) {
    tries++;
    const x = Phaser.Math.Between(120, WORLD.width - 120);
    const y = Phaser.Math.Between(120, WORLD.height - 120);
    if (def.theme === 'eastbourne' && x < WORLD.width * 0.196 && y < WORLD.height * 0.81) continue;
    if (hull && insideHull(x, y, hull)) continue;
    if (def.theme === 'otaki') {
      const b = def.scenery && def.scenery.beach;
      if (b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) continue;
    }
    const d = distanceToCenterline(x, y, track.centerline);
    if (d < TRACK.roadWidth / 2 + 90) continue;
    const variant = Phaser.Utils.Array.GetRandom(VARIANTS);
    const scale = Phaser.Math.FloatBetween(0.7, 1.4);
    const displayWidth = TREE_TEXTURE_SIZE * scale;
    trees.push({ x, y, variant, scale, displayWidth });
    obstacles.push({ x, y, r: displayWidth * 0.3 });
    placed++;
  }
  return { trees, obstacles };
}
