import { eastbourneCoast } from './coast.js';
import { metres } from './scale.js';

// Extend open water north/south, not along a road heading that turns inland.
// Keep collision/scenery placement's existing coast and RNG contract intact.
export function visualCoast(track) {
  const coast = eastbourneCoast(track);
  const points = coast.points.map(p => ({ ...p }));
  if (points.length > 2) {
    points[0] = { ...points[0], x: points[1].x, nx: -1, nz: 0 };
    const last = points.length - 1;
    points[last] = { ...points[last], x: points[last - 1].x, nx: -1, nz: 0 };
  }
  return { ...coast, points };
}

// The eastern harbour edge is a west-facing, single-valued shoreline. Sorting
// also joins the short overlapping primary/Marine Parade sampling ranges.
export function coastalProfile(track) {
  const coast = visualCoast(track);
  const shoreline = coast.points.map(p => ({ z: p.z, x: p.x })).sort((a, b) => a.z - b.z);
  const wall = coast.wall.slice().sort((a, b) => a.z - b.z);
  const interpolate = (rows, z, key) => {
    let lo = 0, hi = rows.length - 1;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >> 1;
      if (rows[mid].z <= z) lo = mid; else hi = mid;
    }
    const a = rows[lo], b = rows[hi];
    const t = Math.max(0, Math.min(1, (z - a.z) / Math.max(1, b.z - a.z)));
    return a[key] + (b[key] - a[key]) * t;
  };
  return z => ({ shoreX: interpolate(shoreline, z, 'x'),
    wallX: interpolate(wall, z, 'x'), wallHeight: interpolate(wall, z, 'roadHeight') });
}

export function coastalGroundHeight(x, shoreX, wallX, wallHeight, sea) {
  if (x <= shoreX) return sea - metres(0.2) - Math.min(metres(2), (shoreX - x) * 0.1);
  const t = Math.max(0, Math.min(1, (x - shoreX) / Math.max(1, wallX - shoreX)));
  return sea - metres(0.2) + (wallHeight - sea + metres(0.2)) * t;
}
