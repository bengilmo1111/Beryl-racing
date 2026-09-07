// Query the same two triangles per segment that render3d/road.js draws.
// A world-sized terrain grid cannot resolve a car-sized patch of sloping road.
// Keep this independent of Three so the surface can be checked without WebGL.
export class RoadSurface {
  constructor(roads) {
    this.cells = new Map();
    this.cellSize = 512;
    this.patches = findJunctions(roads);
    for (const patch of this.patches) for (const triangle of patch.triangles) {
      this.addTriangle(...triangle.map(p => ({ ...p, h: p.h + 0.06 })));
    }
    for (const road of roads) {
      for (const triangle of road.pavedAreas || []) this.addTriangle(...triangle);
      const { left, right, heights, closed } = road;
      const vertex = (point, i) => ({ x: point.x, y: point.y, h: heights?.[i] || 0 });
      const count = closed ? left.length : left.length - 1;
      for (let i = 0; i < count; i++) {
        const j = (i + 1) % left.length;
        const a = vertex(left[i], i), b = vertex(right[i], i);
        const c = vertex(right[j], j), d = vertex(left[j], j);
        this.addTriangle(a, b, c);
        this.addTriangle(a, c, d);
      }
    }
  }

  addTriangle(a, b, c) {
    const triangle = { a, b, c };
    const size = this.cellSize;
    const x0 = Math.floor(Math.min(a.x, b.x, c.x) / size);
    const x1 = Math.floor(Math.max(a.x, b.x, c.x) / size);
    const y0 = Math.floor(Math.min(a.y, b.y, c.y) / size);
    const y1 = Math.floor(Math.max(a.y, b.y, c.y) / size);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const key = `${x},${y}`;
      if (!this.cells.has(key)) this.cells.set(key, []);
      this.cells.get(key).push(triangle);
    }
  }

  heightAt(x, y) {
    const key = `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
    let height = null;
    for (const { a, b, c } of this.cells.get(key) || []) {
      const denominator = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
      if (Math.abs(denominator) < 1e-9) continue;
      const u = ((b.y - c.y) * (x - c.x) + (c.x - b.x) * (y - c.y)) / denominator;
      const v = ((c.y - a.y) * (x - c.x) + (a.x - c.x) * (y - c.y)) / denominator;
      const w = 1 - u - v;
      if (Math.min(u, v, w) < -1e-7) continue;
      const h = u * a.h + v * b.h + w * c.h;
      height = height === null ? h : Math.max(height, h);
    }
    return height;
  }
}

const JUNCTION_SPREAD = 1.15;

export function findJunctions(roads) {
  const out = [];
  if (!roads || roads.length < 2) return out;
  for (const road of roads.slice(1)) {
    const line = road.centerline;
    for (const point of road.junctionPoints || [line[0], line[line.length - 1]]) {
      let best = Infinity;
      let host = null;
      let index = 0;
      for (const other of roads) {
        if (other === road) continue;
        for (let i = 0; i < other.centerline.length; i++) {
          const c = other.centerline[i];
          const d = Math.hypot(c.x - point.x, c.y - point.y);
          if (d < best) { best = d; host = other; index = i; }
        }
      }
      // Only an end that actually lands on another road is a junction. A branch
      // that simply stops in a paddock is not, and must not get an apron.
      if (!host || best > host.half) continue;
      const radius = (host.half + road.half) * JUNCTION_SPREAD;
      if (out.some(j => Math.hypot(j.x - point.x, j.y - point.y) < Math.min(j.radius, radius))) continue;
      const triangles = [];
      for (const r of [host, road]) for (let i = 0; i < r.left.length - 1; i++) {
        const a = r.centerline[i], b = r.centerline[i + 1];
        if (Math.min(Math.hypot(a.x - point.x, a.y - point.y),
          Math.hypot(b.x - point.x, b.y - point.y)) > radius) continue;
        const vertex = (p, index) => ({ x: p.x, y: p.y, h: r.heights?.[index] || 0 });
        const l = vertex(r.left[i], i), rr = vertex(r.right[i], i);
        const ln = vertex(r.left[i + 1], i + 1), rn = vertex(r.right[i + 1], i + 1);
        triangles.push([l, rr, rn], [l, rn, ln]);
      }
      out.push({
        triangles,
        x: point.x,
        y: point.y,
        radius: (host.half + road.half) * JUNCTION_SPREAD,
        height: host.heights ? host.heights[index] : 0,
      });
    }
  }
  return out;
}
