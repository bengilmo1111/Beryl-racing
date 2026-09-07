import { eastbourneCoast, WALL_SETBACK } from './coast.js';
import { metres } from './scale.js';

// The eastern harbour edge is a west-facing, single-valued shoreline. Sorting
// also joins the short overlapping primary/Marine Parade sampling ranges.
export function coastalProfile(track) {
  const coast = eastbourneCoast(track);
  const rows = coast.points.map(p => ({
    z: p.z, shoreX: p.x,
    wallX: p.x - p.nx * (coast.beach - WALL_SETBACK),
  })).sort((a, b) => a.z - b.z);
  return z => {
    let lo = 0, hi = rows.length - 1;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >> 1;
      if (rows[mid].z <= z) lo = mid; else hi = mid;
    }
    const a = rows[lo], b = rows[hi];
    const t = Math.max(0, Math.min(1, (z - a.z) / Math.max(1, b.z - a.z)));
    return { shoreX: a.shoreX + (b.shoreX - a.shoreX) * t,
      wallX: a.wallX + (b.wallX - a.wallX) * t };
  };
}

export function coastalGroundHeight(x, shoreX, wallX, wallHeight, sea) {
  if (x <= shoreX) return sea - metres(0.2) - Math.min(metres(2), (shoreX - x) * 0.1);
  const t = Math.max(0, Math.min(1, (x - shoreX) / Math.max(1, wallX - shoreX)));
  return sea - metres(0.2) + (wallHeight - sea + metres(0.2)) * t;
}
