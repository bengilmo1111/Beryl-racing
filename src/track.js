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

// Smooth Catmull-Rom through the anchors. A closed loop uses a periodic spline
// (wrapping neighbours); an open route duplicates the endpoints instead.
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

// The tarmac edges: the centreline offset by ±half along its own normal.
//
// This is where roadWidth has a hard per-course ceiling. Offsetting by a fixed
// amount is only valid while half is smaller than the local corner radius; past
// that the two edges cross and the road folds through itself, which shows up as
// the kerb line cutting diagonally across the tarmac. The ceiling is therefore
// twice the tightest corner's radius, and each course's roadWidth is set under
// its own — see the notes in tracks.js.
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
    // Left normal is (-ty, tx).
    left.push({ x: centerline[i].x - ty * half, y: centerline[i].y + tx * half });
    right.push({ x: centerline[i].x + ty * half, y: centerline[i].y - tx * half });
  }

  return { left, right, half };
}

// Optional per-sample road surface. `surfaceBands` is an ordered list of
// { type, until } where `until` is a fraction (0..1] of the route; each sample
// takes the first band whose `until` covers its position. Absent → null, and
// everything downstream falls back to a single (sealed) surface.
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

// Optional per-sample road height, from an ordered { at, h } profile keyed to a
// fraction of the route. Interpolated with a smoothstep so grade changes ease in
// and out rather than breaking sharply — a linear profile puts a visible crease
// across the road at every control point. Absent → null, and the course is flat
// with gravity disabled entirely.
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

// Branch roads take their height from the nearest point on the primary route
// rather than carrying a profile of their own. Eastbourne's side streets join
// the coast road at both ends, so anything else would leave a step at the
// junction where the two surfaces meet at different heights.
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

// Ordered gates on the primary route. On a loop, index 0 is the start/finish
// gate and the gates are spread over the whole lap; on an open route, index 0 is
// the start and the last gate is the finish. `checkpointFractions` overrides the
// even spacing, which is how Eastbourne keeps every required gate before the
// village splits into alternative streets — otherwise one arbitrary route would
// become the "correct" one.
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
    // The coarse index rides along the same way, and for the same reason: every
    // caller already holds a centreline array, and none of them should have to
    // learn about an index to get one.
    Object.defineProperty(road.centerline, 'coarse', {
      value: buildCoarse(road.centerline, road.closed),
      configurable: true,
      enumerable: false,
    });
  }

  const checkpoints = buildCheckpoints(primary);
  // Start pose: on the line, facing along the route from the first sample.
  const start = primary.centerline[0];
  const startNext = primary.centerline[1];
  const tx = startNext.x - start.x;
  const ty = startNext.y - start.y;
  // Sprite is drawn nose-up; forward = (sin r, -cos r) => r = atan2(tx, -ty).
  const startRotation = Math.atan2(tx, -ty);

  return {
    ...primary,
    roads,
    checkpoints,
    // Standing water the terrain builder holds flat, instead of letting it
    // follow the nearest road height uphill. Coastlines are authored as rects;
    // the river is generated here because it has to line up with the checkpoint
    // the bridge crossing is already keyed to.
    sea: buildWaterRegions(checkpoints, primary.heights),
    start: { x: start.x, y: start.y, rotation: startRotation },
  };
}

// Coastline rects plus, if the course has one, an oriented carve for the river.
//
// The river has to be generated rather than authored: it runs across the road at
// whatever angle the route happens to take through its checkpoint, and the
// terrain either side has to drop to the water while the road stays up on the
// bridge. Road cells are pinned before carving, so the bridge survives.
function buildWaterRegions(checkpoints, heights) {
  const elevation = TRACK.elevation;
  if (!elevation) return null;
  const regions = [...(elevation.sea || [])];
  const river = elevation.river;
  if (river && checkpoints[river.cp]) {
    const cp = checkpoints[river.cp];
    // `angle` is the along-road direction, so halfW measures the water the car
    // crosses and halfL runs up and downstream.
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

// Height at a fraction along an ordered [{ at, h }] profile. Smoothstep between
// control points, flat beyond the ends.
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

// Squared distance from (px,py) to the segment centerline[i] → centerline[i+1].
function segmentDistanceSq(px, py, centerline, i, n) {
  const a = centerline[i];
  const b = centerline[(i + 1) % n];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy || 1;
  let t = ((px - a.x) * dx + (py - a.y) * dy) / lenSq;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  return (px - cx) * (px - cx) + (py - cy) * (py - cy);
}

// Reference implementation: scan every segment. Correct, and O(samples).
//
// Kept, exported and tested against, because the fast path below must agree with
// it exactly — not approximately. Both the on-track test and scenery rejection
// compare the result against a threshold, so a result that differs in the last
// bit is a different course.
export function linearDistanceToPolyline(px, py, centerline, closed) {
  let best = Infinity;
  const n = centerline.length;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const d = segmentDistanceSq(px, py, centerline, i, n);
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

// Shortest distance from (px,py) to one polyline. On a closed loop the final
// wrap-around segment is included; on an open route it is not, so the straight
// line from finish back to start never reads as "on-road".
//
// Scanning every segment is what this used to do, and at ~800 samples a course
// that was free. The routes are an order of magnitude longer now, and this runs
// twice a frame for the on-track test plus thousands of times at load for
// scenery rejection, so it takes a coarse index first — see `buildCoarse`.
function distanceToPolyline(px, py, centerline, closed) {
  const coarse = centerline.coarse;
  if (!coarse) return linearDistanceToPolyline(px, py, centerline, closed);

  const n = centerline.length;
  const segs = closed ? n : n - 1;
  const { indices, stride } = coarse;
  const cutoffSq = anchorCutoffSq(px, py, centerline, coarse);

  // The segments around every anchor still in contention. Windows
  // overlap, so `scanned` keeps the sweep linear rather than re-walking them.
  let best = Infinity;
  let scanned = 0;
  for (let k = 0; k < indices.length; k++) {
    const anchor = indices[k];
    const p = centerline[anchor];
    const d = (px - p.x) * (px - p.x) + (py - p.y) * (py - p.y);
    if (d > cutoffSq) continue;
    const lo = Math.max(scanned, anchor - stride);
    const hi = Math.min(segs, anchor + stride);
    for (let i = lo; i < hi; i++) {
      const ds = segmentDistanceSq(px, py, centerline, i, n);
      if (ds < best) best = ds;
    }
    if (hi > scanned) scanned = hi;
  }

  return Math.sqrt(best);
}

// How far a candidate can be from the nearest anchor and still matter.
//
// The nearest anchor is itself on the polyline, so the true nearest distance is
// no larger than that. And every point on the polyline is within `span / 2` of
// arc length of some anchor — hence at most that far in a straight line, since
// arc length is never shorter than the chord. So nothing beyond
// `nearestAnchor + span / 2` can win, and this bound is exact rather than a
// tolerance: the fast path returns the same value as a full scan, bit for bit.
function anchorCutoffSq(px, py, centerline, coarse) {
  let best = Infinity;
  const indices = coarse.indices;
  for (let k = 0; k < indices.length; k++) {
    const p = centerline[indices[k]];
    const d = (px - p.x) * (px - p.x) + (py - p.y) * (py - p.y);
    if (d < best) best = d;
  }
  const cutoff = Math.sqrt(best) + coarse.span * 0.5;
  return cutoff * cutoff;
}

// Every Nth sample, plus the longest arc gap between consecutive anchors. The
// gap is what makes the cutoff provable rather than a heuristic.
const COARSE_STRIDE = 16;

function buildCoarse(centerline, closed) {
  const n = centerline.length;
  if (n < COARSE_STRIDE * 4) return null;

  const indices = [];
  for (let i = 0; i < n; i += COARSE_STRIDE) indices.push(i);
  if (indices[indices.length - 1] !== n - 1) indices.push(n - 1);

  let span = 0;
  let run = 0;
  let next = 1;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const a = centerline[i];
    const b = centerline[(i + 1) % n];
    run += Math.hypot(b.x - a.x, b.y - a.y);
    if (next < indices.length && i + 1 >= indices[next]) {
      if (run > span) span = run;
      run = 0;
      next += 1;
    }
  }
  if (run > span) span = run;

  return { indices, stride: COARSE_STRIDE, span };
}

// Shortest distance from (px,py) to the road, used by the on-track test, by
// scenery placement and by the harness.
//
// `centerline` arrays produced by buildTrack() carry a non-enumerable `network`
// back-reference to every road on the course, so a caller that only has the
// primary centreline still gets the whole network. That is what lets Eastbourne
// gain Marine Parade, the inland route and the cross streets without touching a
// single simulation call site — every branch counts as on-road automatically.
//
// The returned value is a distance only for the primary road. For a branch it is
// biased by the width difference so that the caller's existing `<= track.half`
// test stays correct on a narrower street; see the adjustment below.
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
  // Roads in order, samples in ascending index, strict `<`: the first sample to
  // reach the minimum wins. The coarse pass below must not disturb that, which
  // is why its windows are swept in ascending order too.
  for (const road of roads) {
    const centerline = road.centerline;
    const coarse = centerline.coarse;
    const n = centerline.length;

    if (!coarse) {
      for (let i = 0; i < n; i++) {
        const dx = centerline[i].x - px;
        const dy = centerline[i].y - py;
        const d = dx * dx + dy * dy;
        if (d < best) {
          best = d;
          type = road.surfaces ? road.surfaces[i] : null;
        }
      }
      continue;
    }

    const cutoffSq = anchorCutoffSq(px, py, centerline, coarse);
    let scanned = 0;
    for (let k = 0; k < coarse.indices.length; k++) {
      const anchor = coarse.indices[k];
      const p = centerline[anchor];
      const da = (px - p.x) * (px - p.x) + (py - p.y) * (py - p.y);
      if (da > cutoffSq) continue;
      const lo = Math.max(scanned, anchor - coarse.stride);
      const hi = Math.min(n, anchor + coarse.stride + 1);
      for (let i = lo; i < hi; i++) {
        const dx = centerline[i].x - px;
        const dy = centerline[i].y - py;
        const d = dx * dx + dy * dy;
        if (d < best) {
          best = d;
          type = road.surfaces ? road.surfaces[i] : null;
        }
      }
      if (hi > scanned) scanned = hi;
    }
  }
  return type;
}
