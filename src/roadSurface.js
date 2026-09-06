// Query the same two triangles per segment that render3d/road.js draws.
// A world-sized terrain grid cannot resolve a car-sized patch of sloping road.
// Keep this independent of Three so the surface can be checked without WebGL.
export class RoadSurface {
  constructor(roads) {
    this.cells = new Map();
    this.cellSize = 512;
    this.patches = [];
    for (const road of roads) {
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
    // Junction overlays are horizontal discs above the ribbons.
    for (const patch of this.patches) {
      if (Math.hypot(x - patch.x, y - patch.y) <= patch.radius) {
        const h = patch.height + 0.06;
        height = height === null ? h : Math.max(height, h);
      }
    }
    return height;
  }
}
