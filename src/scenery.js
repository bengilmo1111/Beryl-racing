// Deterministic roadside scenery placement.
//
// This is simulation, not decoration: every tree placed here also becomes a
// collision circle that resolveObstacles() reads every frame, and the placement
// runs off the global RNG that the playtest harness seeds. The call sequence
// below — two Between draws *before* the theme/distance filters, then GetRandom
// for the variant, then FloatBetween for the scale — is part of the determinism
// contract. Reordering it, or adding a draw, moves every recorded finish
// position. See docs/playtest.md and the AC2 baselines in progress.md.
//
// A course that wants no trees at all must return *before* the loop, as Manfeild
// does, rather than filter every candidate away inside it: bailing out early
// consumes no draws, whereas rejecting 1200 candidates would consume 2400 and
// leave the stream in a different place for anything seeded after it.
import Phaser from 'phaser';
import { TRACK, WORLD } from './config.js';
import { distanceToCenterline } from './track.js';

const VARIANTS = ['tree-1', 'tree-2', 'tree-3'];

// All three tree textures are 128x128, so a placed tree's displayWidth is
// exactly 128 * scale. Pinning it as a constant is what lets the collision
// radius stop depending on a Phaser GameObject having been created.
const TREE_TEXTURE_SIZE = 128;

function insideRect(x, y, rect) {
  return rect && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

// Returns { trees, obstacles }. `trees` is render data (the caller decides
// whether that means a sprite or a mesh); `obstacles` is gameplay and must be
// appended to the scene's obstacle list in this order.
export function scatterScenery(track, def) {
  const trees = [];
  const obstacles = [];

  // Manfeild is a bare, open race venue on farmland. Its rhythm comes from the
  // pit complex, grandstand, marshal huts, fencing, bales and boards in
  // themes/manfeild, not a generic ring of trees — and returning here rather
  // than filtering inside the loop makes the no-tree rule absolute, leaving no
  // invisible collision circles on a circuit meant to be driven flat out.
  if (def.theme === 'manfield') return { trees, obstacles };

  let placed = 0;
  let tries = 0;
  // More trees on the now-larger worlds so the roadside doesn't look bare.
  while (placed < 90 && tries < 1200) {
    tries++;
    const x = Phaser.Math.Between(120, WORLD.width - 120);
    const y = Phaser.Math.Between(120, WORLD.height - 120);

    if (def.theme === 'eastbourne') {
      // The harbour and continuous narrow beach occupy the whole western edge.
      if (x < WORLD.width * 0.23) continue;

      // Keep the deliberately authored village core readable: clinic, shop row,
      // school, RSA and their connecting streets should not be hidden inside a
      // random thicket. The remaining candidates naturally collect on the broad
      // inland half of the map, reinforcing the steep green hillside.
      if (y > WORLD.height * 0.7 && x < WORLD.width * 0.64) continue;
    }

    if (def.theme === 'otaki') {
      // These filters run only after the two coordinate draws above, preserving
      // the deterministic call order. The route itself is still cleared below
      // by distanceToCenterline(), which transparently sees every branch road.
      const beach = def.layout?.zones?.beach;
      const town = def.layout?.zones?.town;
      if (insideRect(x, y, beach) || insideRect(x, y, town)) continue;
    }

    // distanceToCenterline transparently checks the complete road network, so
    // no alternate route receives trees or invisible obstacles.
    const d = distanceToCenterline(x, y, track.centerline);
    if (d < TRACK.roadWidth / 2 + 90) continue;

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
