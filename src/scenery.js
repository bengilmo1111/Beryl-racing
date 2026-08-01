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

// The convex hull of a closed course's centreline: the footprint of the circuit
// site. Monotone chain, computed once per scatter.
//
// The hull, and not the area the centreline encloses, is deliberate. A layout
// that folds back on itself has gaps between its straights that are *outside*
// the closed centreline — cross the track once and you are out again — so an
// enclosure test leaves woodland in exactly the gaps that look worst. The hull
// treats the whole site as one venue.
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

// All three tree textures are 128x128, so a placed tree's displayWidth is
// exactly 128 * scale. Pinning it as a constant is what lets the collision
// radius stop depending on a Phaser GameObject having been created.
const TREE_TEXTURE_SIZE = 128;

// Returns { trees, obstacles }. `trees` is render data (the caller decides
// whether that means a sprite or a mesh); `obstacles` is gameplay and must be
// appended to the scene's obstacle list in this order.
export function scatterScenery(track, def) {
  const trees = [];
  const obstacles = [];
  const hull = def.mode === 'circuit' ? centerlineHull(track.centerline) : null;
  let placed = 0;
  let tries = 0;
  // More trees on the now-larger worlds so the roadside doesn't look bare.
  while (placed < 90 && tries < 1200) {
    tries++;
    const x = Phaser.Math.Between(120, WORLD.width - 120);
    const y = Phaser.Math.Between(120, WORLD.height - 120);
    // No trees in Wellington Harbour (Eastbourne's water strip on the left).
    if (def.theme === 'eastbourne' && x < WORLD.width * 0.196 && y < WORLD.height * 0.81) continue;
    // No trees inside a circuit's footprint. Manfeild is a venue on open
    // farmland, and on a layout that folds back on itself twice a blind scatter
    // puts woodland in every gap between the straights. Trees ring the site
    // instead, which is what the shelter belts out there do.
    if (hull && insideHull(x, y, hull)) continue;
    // No trees on Ōtaki Beach / sea (the NW corner).
    if (def.theme === 'otaki') {
      const b = def.scenery && def.scenery.beach;
      if (b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) continue;
    }
    const d = distanceToCenterline(x, y, track.centerline);
    if (d < TRACK.roadWidth / 2 + 90) continue; // keep clear of the track
    const variant = Phaser.Utils.Array.GetRandom(VARIANTS);
    const scale = Phaser.Math.FloatBetween(0.7, 1.4);
    const displayWidth = TREE_TEXTURE_SIZE * scale;
    trees.push({ x, y, variant, scale, displayWidth });
    // Solid trunk/canopy: a collision circle a bit smaller than the sprite so
    // you bump the tree, not its transparent padding.
    obstacles.push({ x, y, r: displayWidth * 0.3 });
    placed++;
  }
  return { trees, obstacles };
}
