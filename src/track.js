// Builds road geometry: a smooth primary centreline plus optional branch roads,
// checkpoints, surfaces, elevation and helpers for testing whether a point is on
// any driveable road.
import { TRACK } from './config.js';

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

function buildCenterline(anchors, steps, closed) {
  const n = anchors.length;
  const centerline = [];

  if (closed) {
    for (let i = 0; i < n; i++) {
      const p0 = anchors[(i - 1 + n) % n];
      const p1 = anchors[i];
      const p2 = anchors[(i + 1) % n];
      const p3 = anchors[(i + 2) % n];
      for (let s = 0; s < steps; s++) {
        centerline.push(catmullRom(p0, p1, p2, p3, s / steps));
      }
    }
  } else {
    for (let i = 0; i < n - 1; i++) {
      const p0 = anchors[Math.max(0, i - 1)];
      const p1 = anchors[i];
      const p2 = anchors[i + 1];
      const p3 = anchors[Math.min(n - 1, i + 2)];
      for (let s = 0; s < steps; s++) {
        centerline.push(catmullRom(p0, p1, p2, p3, s / steps));
      }
    }
    centerline.push({ ...anchors[n - 1] });
  }

  return centerline;
}

function buildEdges(centerline, roadWidth, closed) {
  const count = centerline.length;
  const half = roadWidth / 2;
  const wrap = (i) => (closed ? (i + count) % count : Math.min(Math.max(i, 0), count - 1));
  const left = [];
  const right = [];

  for (let i = 0; i < count; i++) {
    const prev = centerline[wrap(i - 1)];
    const next = centerline[wrap(i + 1)];
    let tx = next.x - prev.x;
    let ty = next.y - prev.y;
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;
    left.push({ x: centerline[i].x - ty * half, y: centerline[i].y + tx * half });
    right.push({ x: centerline[i].x + ty * half, y: centerline[i].y - tx * half });
  }

  return { left, right, half };
}

function buildSurfaces(surfaceBands, count) {
  if (!Array.isArray(surfaceBands) || !surfaceBands.length) return null;
  const surfaces = new Array(count);
  for (let i = 0; i < count; i++) {
    const frac = count > 1 ? i / (count - 1) : 0;
    let type = surfaceBands[surfaceBands.length - 1].type;
    for (const band of surfaceBands) {
      if (frac <= band.until) {
        type = band.type;
        break;
      }
    }
    surfaces[i] = type;
  }
  return surfaces;
}

function buildHeights(profile, count) {
  if (!Array.isArray(profile) || profile.length < 2) return null;
  const heights = new Array(count);
  for (let i = 0; i < count; i++) {
    const frac = count > 1 ? i / (count - 1) : 0;
    heights[i] = sampleProfile(profile, frac);
  }
  return heights;
}

function buildRoad(spec, fallback = {}) {
  const closed = spec.closed ?? fallback.closed ?? false;
  const roadWidth = spec.roadWidth ?? fallback.roadWidth;
  const steps = spec.samplesPerSegment ?? fallback.samplesPerSegment;
  const centerline = buildCenterline(spec.anchors, steps, closed);
  const { left, right, half } = buildEdges(centerline, roadWidth, closed);
  return {
    id: spec.id || fallback.id || 'primary',
    centerline,
    left,
    right,
    half,
    closed,
    surfaces: buildSurfaces(spec.surfaceBands, centerline.length),
    heights: buildHeights(spec.elevation && spec.elevation.profile, centerline.length),
  };
}

function copyNearestPrimaryHeights(primary, road) {
  if (!primary.heights) return null;
  return road.centerline.map((point) => {
    let best = Infinity;
    let bestHeight = primary.heights[0];
    for (let i = 0; i < primary.centerline.length; i++) {
      const dx = primary.centerline[i].x - point.x;
      const dy = primary.centerline[i].y - point.y;
      const d = dx * dx + dy * dy;
      if (d < best) {
        best = d;
        bestHeight = primary.heights[i];
      }
    }
    return bestHeight;
  });
}

function buildCheckpoints(primary) {
  const centerline = primary.centerline;
  const count = centerline.length;
  const closed = primary.closed;
  const fractions = Array.isArray(TRACK.checkpointFractions) && TRACK.checkpointFractions.length
    ? TRACK.checkpointFractions
    : Array.from({ length: TRACK.numCheckpoints }, (_, c) => (
        closed ? c / TRACK.numCheckpoints : c / (TRACK.numCheckpoints - 1)
      ));
  const wrap = (i) => (closed ? (i + count) % count : Math.min(Math.max(i, 0), count - 1));

  return fractions.map((fraction) => {
    const idx = closed
      ? Math.floor(fraction * count) % count
      : Math.floor(fraction * (count - 1));
    const p = centerline[idx];
    const next = centerline[wrap(idx + 1)];
    const prev = centerline[wrap(idx - 1)];
    return {
      x: p.x,
      y: p.y,
      index: idx,
      angle: closed
        ? Math.atan2(next.y - p.y, next.x - p.x)
        : Math.atan2(next.y - prev.y, next.x - prev.x),
    };
  });
}

export function buildTrack() {
  const primary = buildRoad(
    {
      id: 'primary',
      anchors: TRACK.anchors,
      roadWidth: TRACK.roadWidth,
      samplesPerSegment: TRACK.samplesPerSegment,
      closed: !!TRACK.closed,
      surfaceBands: TRACK.surfaceBands,
      elevation: TRACK.elevation,
    },
    TRACK
  );

  const roads = [primary];
  for (const branchSpec of TRACK.branches || []) {
    const branch = buildRoad(branchSpec, TRACK);
    branch.heights = copyNearestPrimaryHeights(primary, branch);
    roads.push(branch);
  }

  // Existing callers pass only track.centerline to distanceToCenterline(). Give
  // that array a non-enumerated network reference so old code automatically
  // treats every Eastbourne street as driveable without changing simulation
  // call sites or determinism-sensitive ordering.
  for (const road of roads) {
    Object.defineProperty(road.centerline, 'network', {
      value: roads,
      configurable: true,
      enumerable: false,
    });
  }

  const checkpoints = buildCheckpoints(primary);
  const start = primary.centerline[0];
  const startNext = primary.centerline[1];
  const tx = startNext.x - start.x;
  const ty = startNext.y - start.y;
  const startRotation = Math.atan2(tx, -ty);

  return {
    ...primary,
    roads,
    checkpoints,
    sea: buildWaterRegions(checkpoints, primary.heights),
    start: { x: start.x, y: start.y, rotation: startRotation },
  };
}

function buildWaterRegions(checkpoints, heights) {
  const elevation = TRACK.elevation;
  if (!elevation) return null;
  const regions = [...(elevation.sea || [])];
  const river = elevation.river;
  if (river && checkpoints[river.cp]) {
    const cp = checkpoints[river.cp];
    regions.push({
      cx: cp.x,
      cy: cp.y,
      angle: cp.angle,
      halfW: river.halfWidth,
      halfL: river.halfLength,
      level: (heights ? heights[cp.index] : 0) - river.drop,
    });
  }
  return regions.length ? regions : null;
}

function sampleProfile(profile, frac) {
  if (frac <= profile[0].at) return profile[0].h;
  const last = profile[profile.length - 1];
  if (frac >= last.at) return last.h;
  for (let i = 1; i < profile.length; i++) {
    const b = profile[i];
    if (frac > b.at) continue;
    const a = profile[i - 1];
    const span = b.at - a.at;
    const t = span > 0 ? (frac - a.at) / span : 0;
    const eased = t * t * (3 - 2 * t);
    return a.h + (b.h - a.h) * eased;
  }
  return last.h;
}

function distanceToPolyline(px, py, centerline, closed) {
  let best = Infinity;
  const n = centerline.length;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const a = centerline[i];
    const b = centerline[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy || 1;
    let t = ((px - a.x) * dx + (py - a.y) * dy) / lenSq;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const cx = a.x + t * dx;
    const cy = a.y + t * dy;
    const d = (px - cx) * (px - cx) + (py - cy) * (py - cy);
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

// Shortest distance from (px,py) to the supplied centreline. When the line came
// from buildTrack(), this transparently checks the complete road network.
export function distanceToCenterline(px, py, centerline) {
  const roads = centerline && centerline.network;
  if (roads) {
    let best = Infinity;
    for (const road of roads) {
      const d = distanceToPolyline(px, py, road.centerline, road.closed);
      // Account for differently sized branch roads while retaining the old
      // caller contract, which compares the returned value to primary half.
      const adjusted = d + (TRACK.roadWidth / 2 - road.half);
      if (adjusted < best) best = adjusted;
    }
    return best;
  }
  return distanceToPolyline(px, py, centerline, !!TRACK.closed);
}

// Road surface ('gravel' | 'sealed' | ...) at the nearest road sample, or null
// when the nearest road is ordinary sealed tarmac.
export function surfaceAt(px, py, track) {
  const roads = track && track.roads ? track.roads : track ? [track] : [];
  let best = Infinity;
  let type = null;
  for (const road of roads) {
    for (let i = 0; i < road.centerline.length; i++) {
      const dx = road.centerline[i].x - px;
      const dy = road.centerline[i].y - py;
      const d = dx * dx + dy * dy;
      if (d < best) {
        best = d;
        type = road.surfaces ? road.surfaces[i] : null;
      }
    }
  }
  return type;
}
