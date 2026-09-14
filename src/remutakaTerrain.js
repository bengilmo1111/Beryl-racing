// Shared Remutaka road-side geometry.
//
// This module is deliberately Three-free. The simulation-side terrain builder
// and the render-only Remutaka theme both need to agree which side of each road
// sample is the uphill bank and which is the exposed valley edge. Keeping that
// decision here prevents a guardrail protecting one side while the ground drops
// away on the other.

const LOOK = 8;
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
  }

  // In X/Z with Y up, (-tz, tx) points to the driver's RIGHT.
  // The Wellington ascent keeps the bank right and valley left through bends.
  sides.fill(1);

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
      // Driver-right normal in the X/Z ground plane.
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
// into the valley on the outside. The road itself and a narrow shoulder remain
// pinned to the simulation height, so the rendered tarmac never floats.
export function remutakaVisualHeight(point, x, z, baseHeight, roadHalf) {
  if (!point) return baseHeight;
  const signed = (x - point.x) * point.nx + (z - point.z) * point.nz;
  const insideDistance = signed * point.inside;
  const shoulder = roadHalf + 65;
  const edgeDistance = Math.max(0, Math.abs(signed) - shoulder);
  if (edgeDistance <= 0) return baseHeight;

  // The cliff is already pronounced at the foot and strengthens up the climb.
  const drama = 0.65 + 0.35 * smoothstep(0.05, 0.5, point.progress);
  const grain =
    Math.sin(x * 0.0041 + z * 0.0023) * 42 +
    Math.sin(x * 0.0017 - z * 0.0037 + point.progress * 17) * 30;

  if (insideDistance >= 0) {
    const cut = smoothstep(0, 340, edgeDistance) * (500 + 1500 * drama);
    const upperSlope = smoothstep(340, 2200, edgeDistance) * (220 + 620 * drama);
    return baseHeight + cut + upperSlope + grain * drama;
  }

  const cliff = smoothstep(0, 280, edgeDistance) * (500 + 1350 * drama);
  const valley = smoothstep(280, 2500, edgeDistance) * (260 + 1080 * drama);
  return baseHeight - cliff - valley - Math.abs(grain) * drama * 0.55;
}
