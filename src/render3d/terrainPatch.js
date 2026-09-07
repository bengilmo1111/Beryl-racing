import { BufferGeometry, Float32BufferAttribute } from 'three';
import { GROUND_Y } from './road.js';

// Clip the rendered ground triangles to a rotated plot. Sampling only a flat
// panel's centre (or even a subdivided bilinear grid) leaves floating edges and
// buried fragments where the actual ground triangles change slope.
export function terrainPatchGeometry(terrain, { x, z, width, depth, yaw = 0, lift = 2 }) {
  const info = terrain.describe();
  const { cols, rows, cell, minX, minY, grid } = info;
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const rx = Math.abs(c) * width / 2 + Math.abs(s) * depth / 2;
  const rz = Math.abs(s) * width / 2 + Math.abs(c) * depth / 2;
  const c0 = Math.max(0, Math.floor((x - rx - minX) / cell));
  const c1 = Math.min(cols - 2, Math.floor((x + rx - minX) / cell));
  const r0 = Math.max(0, Math.floor((z - rz - minY) / cell));
  const r1 = Math.min(rows - 2, Math.floor((z + rz - minY) / cell));
  const vertex = (col, row) => {
    const dx = minX + col * cell - x, dz = minY + row * cell - z;
    return { u: dx * c - dz * s, v: dx * s + dz * c, h: grid[row * cols + col] };
  };
  const clip = (polygon, axis, sign, limit) => {
    const out = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length];
      const da = a[axis] * sign - limit, db = b[axis] * sign - limit;
      if (da <= 0) out.push(a);
      if ((da <= 0) !== (db <= 0)) {
        const t = da / (da - db);
        out.push({ u: a.u + (b.u - a.u) * t, v: a.v + (b.v - a.v) * t, h: a.h + (b.h - a.h) * t });
      }
    }
    return out;
  };
  const positions = [];
  for (let row = r0; row <= r1; row++) for (let col = c0; col <= c1; col++) {
    const a = vertex(col, row), b = vertex(col + 1, row), d = vertex(col, row + 1), e = vertex(col + 1, row + 1);
    for (let polygon of [[a, d, e], [a, e, b]]) {
      for (const [axis, half] of [['u', width / 2], ['v', depth / 2]]) for (const sign of [-1, 1]) polygon = clip(polygon, axis, sign, half);
      for (let i = 1; i < polygon.length - 1; i++) for (const p of [polygon[0], polygon[i], polygon[i + 1]]) {
        positions.push(x + p.u * c + p.v * s, p.h + GROUND_Y + lift, z - p.u * s + p.v * c);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}
