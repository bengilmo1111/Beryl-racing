import { resolvePlace } from './places.js';
import { nearestRoadPose } from './driveRoute.js';
import { metres } from './scale.js';

// Shared positions and trunk footprints for the rendered flowering trees.
// Fixed candidates keep scenery RNG and every other course unchanged.
export function summerTrees(track, structures = [], existing = []) {
  const result = [];
  for (const road of track.roads.filter(r => r.id === 'primary' || r.id === 'muritai-road')) {
    const count = road.id === 'primary' ? 54 : 18;
    for (let i = 0; i < count; i++) {
      const at = road.id === 'primary' ? 0.13 + i / count * 0.80 : 0.05 + i / count * 0.90;
      const width = metres(7.2 + i % 3 * 0.5);
      const scale = width / 430;
      const p = resolvePlace(track, { road: road.id, at, offsetMetres: -(9 + i % 3 * 2) });
      const pose = nearestRoadPose(track, p.x, p.z);
      if (pose.distance < pose.road.half + width / 2 + metres(1)) continue;
      if (structures.some(s => Math.hypot(s.x - p.x, s.z - p.z) < Math.hypot(s.w, s.d) / 2 + width / 2 + metres(1))) continue;
      if (existing.some(t => Math.hypot(t.x - p.x, t.y - p.z) < width / 2 + (t.canopyWidth || 0) / 2)) continue;
      if (result.some(t => Math.hypot(t.x - p.x, t.z - p.z) < width * 1.4)) continue;
      result.push({ x: p.x, z: p.z, scale, variant: i % 3, yaw: i * 2.39996, r: 68 * scale });
    }
  }
  return result;
}
