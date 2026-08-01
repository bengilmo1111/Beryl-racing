// Deterministic roadside scenery placement.
//
// This is simulation, not decoration: every tree placed here also becomes a
// collision circle that resolveObstacles() reads every frame, and the placement
// runs off the global RNG that the playtest harness seeds. The call sequence
// below — two Between draws *before* the theme/distance filters, then GetRandom
// for the variant, then FloatBetween for the scale — is part of the determinism
// contract. Reordering it, or adding a draw, moves every recorded finish
// position. See docs/playtest.md and the AC2 baselines in progress.md.
import Phaser from 'phaser';
import { TRACK, WORLD } from './config.js';
import { distanceToCenterline } from './track.js';

const VARIANTS = ['tree-1', 'tree-2', 'tree-3'];

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
  let placed = 0;
  let tries = 0;
  // More trees on the now-larger worlds so the roadside doesn't look bare.
  while (placed < 90 && tries < 1200) {
    tries++;
    const x = Phaser.Math.Between(120, WORLD.width - 120);
    const y = Phaser.Math.Between(120, WORLD.height - 120);
    // No trees in Wellington Harbour (Eastbourne's water strip on the left).
    if (def.theme === 'eastbourne' && x < WORLD.width * 0.196 && y < WORLD.height * 0.81) continue;
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
