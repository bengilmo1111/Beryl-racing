// Shared Remutaka road-side geometry.
//
// This module is deliberately Three-free. The simulation-side terrain builder
// and the render-only Remutaka theme both need to agree which side of each road
// sample is the uphill bank and which is the exposed valley edge. Keeping that
// decision here prevents a guardrail protecting one side while the ground drops
// away on the other.

const LOOK = 8;
const TURN_THRESHOLD = 0.018;
const MIN_SIDE_RUN = 10;
const CACHE = new WeakMap();

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function unit(dx, dz) {
  const length = Math.hypot(dx, dz) || 1;
  return { x: dx / length, z: dz / length };
}

function mergeShortRuns(sides) {
  // A tiny sign run is sampling noise around a near-straight, not a real change
  // of mountain side. Merge those runs into the longer neighbour so the visual
  // cliff and guardrail never flick rapidly across the carriageway.
  let changed = true;
  while (changed) {
    changed = false;
    const runs = [];
    let start = 0;
    for (let i = 1; i <= sides.length; i += 1) {
      if (i < sides.length && sides[i] === sides[start]) continue;
      runs.push({ start, end: i, side: sides[start] });
      start = i;
    }

    for (let r = 0; r < runs.length; r += 1) {
      const run = runs[r];
      if (run.end - run.start >= MIN_SIDE_RUN) continue;
      const before = runs[r - 1];
      const after = runs[r + 1];
      const replacement = !before
        ? after?.side
        : !after
          ? before.side
          : (before.end - before.start >= after.end - after.start ? before.side : after.side);
      if (!replacement || replacement === run.side) continue;
      for (let i = run.start; i < run.end; i += 1) sides[i] = replacement;
      changed = true;
      break;
    }
  }
  return sides;
}

export function remutakaRoadProfile(track) {
  if (!track?.centerline?.length) return [];
  const cached = CACHE.get(track);
  if (cached) return cached;

  const line = track.centerline;
  const count = line.length;
  const curvature = new Float32Array(count);
  const sides = new Int8Array(count);

  for (let i = 0; i < count; i += 1) {
    const a = line[Math.max(0, i - LOOK)];
    const b = line[i];
    const c = line[Math.min(count - 1, i + LOOK)];
    const into = unit(b.x - a.x, b.y - a.y);
    const out = unit(c.x - b.x, c.y - b.y);
    const cross = into.x * out.z - into.z * out.x;
    curvature[i] = cross;
    if (Math.abs(cross) >= TURN_THRESHOLD) sides[i] = cross > 0 ? 1 : -1;
  }

  // Carry the nearest meaningful turn through the straights. On a mountain road
  // the cut/drop relationship does not vanish just because the centreline is
  // momentarily straight.
  let side = 0;
  for (let i = 0; i < count; i += 1) {
    if (sides[i]) side = sides[i];
    else if (side) sides[i] = side;
  }
  side = 0;
  for (let i = count - 1; i >= 0; i -= 1) {
    if (sides[i]) side = sides[i];
    else if (side) sides[i] = side;
  }
  if (!sides[0]) sides.fill(1);
  mergeShortRuns(sides);

  const profile = line.map((point, i) => {
    const prev = line[Math.max(0, i - 1)];
    const next = line[Math.min(count - 1, i + 1)];
    const tangent = unit(next.x - prev.x, next.y - prev.y);
    return {
      index: i,
      x: point.x,
      z: point.y,
      h: track.heights ? track.heights[i] : 0,
      tx: tangent.x,
      tz: tangent.z,
      // Left normal in the X/Z ground plane.
      nx: -tangent.z,
      nz: tangent.x,
      curvature: curvature[i],
      inside: sides[i] || 1,
      outside: -(sides[i] || 1),
      progress: count > 1 ? i / (count - 1) : 0,
    };
  });

  CACHE.set(track, profile);
  return profile;
}

export function remutakaPointContext(track, x, z) {
  const profile = remutakaRoadProfile(track);
  let best = Infinity;
  let nearest = profile[0] || null;
  for (const point of profile) {
    const dx = point.x - x;
    const dz = point.z - z;
    const distanceSq = dx * dx + dz * dz;
    if (distanceSq < best) {
      best = distanceSq;
      nearest = point;
    }
  }
  if (!nearest) return null;
  const signed = (x - nearest.x) * nearest.nx + (z - nearest.z) * nearest.nz;
  return {
    ...nearest,
    signed,
    insideDistance: signed * nearest.inside,
    distance: Math.sqrt(best),
  };
}

// Turn the old nearest-road plateau into the characteristic Remutaka cross
// section: a steep cut rising immediately on the inboard side and a fast fall
// into the valley on the outside. The road itself and a narrow survivable
// shoulder remain pinned to the simulation height, so the rendered tarmac never
// floats while the hill still feels as though it starts at the white line.
export function remutakaVisualHeight(point, x, z, baseHeight, roadHalf) {
  if (!point) return baseHeight;
  const signed = (x - point.x) * point.nx + (z - point.z) * point.nz;
  const insideDistance = signed * point.inside;
  // The reference road has very little spare ground between seal and cut/drop.
  // 2.3x road-half left a broad, park-like verge; 1.62 keeps a small recovery
  // strip without losing the claustrophobic mountain-road cross section.
  const shoulder = roadHalf * 1.62;
  const edgeDistance = Math.max(0, Math.abs(signed) - shoulder);
  if (edgeDistance <= 0) return baseHeight;

  // Te Mārua starts broad and approachable, but the road should feel committed
  // to the hill early. Reach most of the drama through the sweepers rather than
  // waiting until the summit hairpins.
  const drama = 0.28 + 0.72 * smoothstep(0.05, 0.56, point.progress);
  const grain =
    Math.sin(x * 0.0041 + z * 0.0023) * 48 +
    Math.sin(x * 0.0017 - z * 0.0037 + point.progress * 17) * 34;

  if (insideDistance >= 0) {
    // A close road cut: the first few metres do most of the vertical work, then
    // the mountain keeps rising behind it. That makes the bank loom in the chase
    // camera instead of reading as a distant smooth green hill.
    const cut = smoothstep(0, 300, edgeDistance) * (430 + 1420 * drama);
    const upperSlope = smoothstep(300, 1750, edgeDistance) * (300 + 760 * drama);
    return baseHeight + cut + upperSlope + grain * drama;
  }

  // The exposed edge should drop immediately behind the Armco. The valley then
  // keeps falling away so gaps in the vegetation reveal actual air rather than
  // another strip of grass a few metres down.
  const cliff = smoothstep(0, 250, edgeDistance) * (340 + 1180 * drama);
  const valley = smoothstep(250, 2250, edgeDistance) * (420 + 1420 * drama);
  return baseHeight - cliff - valley - Math.abs(grain) * drama * 0.6;
}
