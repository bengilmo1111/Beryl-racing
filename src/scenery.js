// Deterministic roadside scenery placement.
//
// This is simulation, not decoration: every tree placed here also becomes a
// collision circle that resolveObstacles() reads every frame. Placement runs off
// the seeded Phaser RNG, so the draw order stays deliberately simple.
import Phaser from 'phaser';
import { TRACK, WORLD } from './config.js';
import { distanceToCenterline } from './track.js';

const VARIANTS = ['tree-1', 'tree-2', 'tree-3'];
const TREE_TEXTURE_SIZE = 128;

export function scatterScenery(track, def) {
  const trees = [];
  const obstacles = [];

  // Manfeild's rhythm comes from circuit furniture, not generic woodland.
  if (def.theme === 'manfield') return { trees, obstacles };

  let placed = 0;
  let tries = 0;
  while (placed < 90 && tries < 1200) {
    tries++;
    const x = Phaser.Math.Between(120, WORLD.width - 120);
    const y = Phaser.Math.Between(120, WORLD.height - 120);

    if (def.theme === 'eastbourne') {
      // The harbour and continuous narrow beach occupy the whole western edge.
      // Previously this exclusion stopped before the end of the course, leaving
      // trees standing in the water beside Eastbourne village.
      if (x < WORLD.width * 0.23) continue;

      // Keep the deliberately authored village core readable: clinic, shop row,
      // school, RSA and their connecting streets should not be hidden inside a
      // random thicket. The remaining candidates naturally collect on the broad
      // inland half of the map, reinforcing the steep green hillside.
      if (y > WORLD.height * 0.7 && x < WORLD.width * 0.64) continue;
    }

    if (def.theme === 'otaki') {
      const b = def.scenery && def.scenery.beach;
      if (b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) continue;
    }

    // distanceToCenterline transparently checks the complete Eastbourne road
    // network, so no alternate route receives trees or invisible obstacles.
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
