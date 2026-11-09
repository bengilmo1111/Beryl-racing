import { metres } from './scale.js';
import { nearestRoadPose } from './driveRoute.js';
import { inWaterRegion } from './waterRegions.js';

// Shared visible poses and collision footprints. No seeded RNG consumption.
export function buildOtakiCattle(track, structures = []) {
  const cows = [];
  const add = (index, across, along, road, variant) => {
    const p = track.centerline[index], q = track.centerline[index + 1];
    const angle = Math.atan2(q.y - p.y, q.x - p.x);
    const x = p.x - Math.sin(angle) * across + Math.cos(angle) * along;
    const y = p.y + Math.cos(angle) * across + Math.sin(angle) * along;
    if (inWaterRegion(track.sea, x, y, metres(3))) return;
    const pose = nearestRoadPose(track, x, y);
    if (!road && pose.distance < pose.road.half + metres(5)) return;
    if (structures.some(s => Math.hypot(s.x - x, s.z - y) < Math.hypot(s.w, s.d) / 2 + metres(3))) return;
    cows.push({ x, y, yaw: -angle + (road ? 0 : Math.sin(variant * 2) * .8), road, variant });
  };
  for (const [herd, fraction] of [.12, .23, .31].entries()) {
    const i = Math.floor(track.centerline.length * fraction);
    for (let j = 0; j < 8; j++) {
      const side = j < 4 ? -1 : 1;
      add(i, side * (track.half + metres(14 + (j % 4) * 3)), metres((j % 4 - 1.5) * 5), false, herd * 8 + j);
    }
  }
  // Single animals on the right-hand side, leaving the driver's left lane
  // open. All precede the river/town traffic band and are widely separated.
  for (const [j, fraction] of [.18, .29, .40].entries())
    add(Math.floor(track.centerline.length * fraction), track.half * .65, 0, true, 24 + j);
  const obstacles = cows.flatMap(cow => [{ along: -.6, r: .48 }, { along: .6, r: .48 }, { along: 1.16, r: .34 }].map(part => ({
    x: cow.x + Math.cos(cow.yaw) * metres(part.along),
    y: cow.y - Math.sin(cow.yaw) * metres(part.along),
    r: metres(part.r),
  })));
  return { cows, obstacles };
}
