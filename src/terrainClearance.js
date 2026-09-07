// A pinned grid vertex does not guarantee clearance between vertices: a coarse
// ground triangle can cross a curved, climbing road. Constrain every vertex of
// the road/ground intersection polygon, not just road centreline samples.
// Both surfaces are affine within that polygon, so its vertices bound the
// height difference everywhere. Only lower vertices; later constraints cannot
// invalidate earlier ones. The caller keeps simulation grids separate.
export function clearRoadTerrain(info, surface) {
  const { cols, rows, cell, minX, minY } = info;
  const grid = Float32Array.from(info.grid);
  const triangles = new Set([...surface.cells.values()].flat());
  const cross = (a, b, p) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  for (const { a, b, c } of triangles) {
    const area = cross(a, b, c);
    if (Math.abs(area) < 1e-9) continue;
    const sign = Math.sign(area);
    const c0 = Math.max(0, Math.floor((Math.min(a.x, b.x, c.x) - minX) / cell));
    const c1 = Math.min(cols - 2, Math.floor((Math.max(a.x, b.x, c.x) - minX) / cell));
    const r0 = Math.max(0, Math.floor((Math.min(a.y, b.y, c.y) - minY) / cell));
    const r1 = Math.min(rows - 2, Math.floor((Math.max(a.y, b.y, c.y) - minY) / cell));
    for (let r = r0; r <= r1; r++) for (let col = c0; col <= c1; col++) {
      const k = r * cols + col;
      for (const indices of [[k, k + cols, k + cols + 1], [k, k + cols + 1, k + 1]]) {
        let polygon = indices.map(i => ({ x: minX + (i % cols) * cell, y: minY + Math.floor(i / cols) * cell, h: grid[i] }));
        for (const [u, v] of [[a, b], [b, c], [c, a]]) {
          const clipped = [];
          for (let i = 0; i < polygon.length; i++) {
            const p = polygon[i], q = polygon[(i + 1) % polygon.length];
            const dp = sign * cross(u, v, p), dq = sign * cross(u, v, q);
            if (dp >= 0) clipped.push(p);
            if ((dp >= 0) !== (dq >= 0)) {
              const t = dp / (dp - dq);
              clipped.push({ x: p.x + t * (q.x - p.x), y: p.y + t * (q.y - p.y), h: p.h + t * (q.h - p.h) });
            }
          }
          polygon = clipped;
        }
        let excess = 0;
        for (const p of polygon) {
          const h = (cross(b, c, p) * a.h + cross(c, a, p) * b.h + cross(a, b, p) * c.h) / area;
          excess = Math.max(excess, p.h - h);
        }
        // Ground renders another 8 units below this field. A tiny numerical
        // margin handles Float32 rounding without cutting an artificial ditch.
        if (excess > 0) for (const i of indices) grid[i] -= excess + 0.02;
      }
    }
  }
  return grid;
}
