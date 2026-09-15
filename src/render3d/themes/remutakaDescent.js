import { clearRoadTerrain } from '../../terrainClearance.js';
import { RoadSurface } from '../../roadSurface.js';
import { buildGround } from '../road.js';
import { FOG } from '../../config.js';
import { metres } from '../../scale.js';

// Scenery beyond the completed run. Preserve the primary road, checkpoint
// fractions and finish position; continue its final tangent into the valley.
export function remutakaDescent(track) {
  const line = track.centerline;
  const last = line.length - 1;
  const origin = line[last], prev = line[last - 1];
  const heading = Math.atan2(origin.y - prev.y, origin.x - prev.x);
  const length = Math.max(metres(1200), FOG.far * 1.5);
  const count = Math.ceil(length / metres(8));
  const step = length / count;
  const centerline = [{ ...origin }], heights = [track.heights[last]];
  const left = [{ ...track.left[last] }], right = [{ ...track.right[last] }];
  let x = origin.x, y = origin.y;
  for (let i = 1; i <= count; i++) {
    const distance = i * step;
    // A broad left bend carries the continuation onto the exposed valley side,
    // then straightens into the atmospheric haze, beyond the camera's fog band.
    const turn = 0.9 * (1 - Math.exp(-Math.pow(distance / metres(220), 2)));
    const angle = heading - turn;
    x += Math.cos(angle) * step;
    y += Math.sin(angle) * step;
    centerline.push({ x, y });
    const nx = -Math.sin(angle), ny = Math.cos(angle);
    left.push({ x: x + nx * track.half, y: y + ny * track.half });
    right.push({ x: x - nx * track.half, y: y - ny * track.half });
    // Ease into a descent, then flatten rather than falling through the valley.
    heights.push(heights[0] - metres(20) * (1 - Math.exp(-Math.pow(distance / metres(450), 2))));
  }
  return { id: 'remutaka-scenic-descent', centerline, left, right,
    heights, half: track.half, closed: false, surfaces: Array(centerline.length).fill('sealed') };
}

// Cut the visual ground around the continuation without altering race physics.
export function buildRemutakaGround(terrain, track) {
  const info = terrain.describe();
  const grid = clearRoadTerrain(info, new RoadSurface([remutakaDescent(track)]));
  return buildGround({ describe: () => ({ ...info, grid }), seaLevel: terrain.seaLevel }, 'remutaka');
}
