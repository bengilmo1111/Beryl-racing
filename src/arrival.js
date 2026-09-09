import { metres } from './scale.js';

// One shared parking footprint for the surface, decoration and finish clearance.
// Local +y points into the parking area, following the final approach.
export function rsaArrival(road) {
  const line = road.centerline;
  const end = line.at(-1), before = line.at(-2);
  const yaw = Math.atan2(end.x - before.x, end.y - before.y);
  const h = (road.heights?.at(-1) || 0) + 0.3;
  const point = (x, y) => ({
    x: end.x + metres(x) * Math.cos(yaw) + metres(y) * Math.sin(yaw),
    y: end.y - metres(x) * Math.sin(yaw) + metres(y) * Math.cos(yaw), h,
  });
  // The triangle narrows toward its far tip. Used by full-width paint so
  // both ends land exactly on the paved edges at any longitudinal position.
  const crossSection = y => {
    const fraction = (34 - y) / 68;
    return [point(-16 * fraction, y), point(18 * fraction, y)];
  };
  const finishBand = [...crossSection(-3.25), ...crossSection(-2.75).reverse()];
  return { yaw, h, point, crossSection, finishBand, triangle: [point(-16, -34), point(18, -34), point(0, 34)],
    building: point(22, 7) };
}

export function inTriangle(x, y, [a, b, c]) {
  const cross = (p, q) => (q.x - p.x) * (y - p.y) - (q.y - p.y) * (x - p.x);
  const signs = [cross(a, b), cross(b, c), cross(c, a)];
  return signs.every(n => n >= -1e-6) || signs.every(n => n <= 1e-6);
}

// Sweep a frame's movement against the same finite band drawn on the tarmac.
// This catches either direction, slow contact and a fast step over the paint,
// without extending the finish into the grass beyond the car park edges.
export function crossesRsaFinish(road, from, to) {
  const polygon = rsaArrival(road).finishBand;
  let enter = 0, leave = 1;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const side = p => (b.x-a.x)*(p.y-a.y) - (b.y-a.y)*(p.x-a.x);
    const start = side(from), end = side(to);
    if (start < 0 && end < 0) return false;
    if (start < 0) enter = Math.max(enter, start / (start-end));
    if (end < 0) leave = Math.min(leave, start / (start-end));
    if (enter > leave) return false;
  }
  return true;
}
