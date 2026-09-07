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
  return { yaw, h, point, triangle: [point(-16, -34), point(18, -34), point(0, 34)],
    building: point(22, 7) };
}

export function inTriangle(x, y, [a, b, c]) {
  const cross = (p, q) => (q.x - p.x) * (y - p.y) - (q.y - p.y) * (x - p.x);
  const signs = [cross(a, b), cross(b, c), cross(c, a)];
  return signs.every(n => n >= -1e-6) || signs.every(n => n <= 1e-6);
}
