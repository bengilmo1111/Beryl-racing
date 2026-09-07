import { BufferGeometry, Float32BufferAttribute } from 'three';
import { metres } from '../scale.js';

// Shared corners give each span the same edge as its neighbour. Unlike flat
// boxes, the top and bottom follow the ground at both ends of every span.
export function seawallGeometry(points, terrain) {
  const positions = [], indices = [];
  points.forEach((p, i) => {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    const length = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const nx = -(b.z - a.z) / length * metres(0.25);
    const nz = (b.x - a.x) / length * metres(0.25);
    const floor = terrain.heightAt(p.x, p.z) - metres(0.1);
    for (const [side, rise] of [[-1, 0], [1, 0], [-1, metres(0.9)], [1, metres(0.9)]]) {
      positions.push(p.x + nx * side, floor + rise, p.z + nz * side);
    }
    if (i) {
      const k = (i - 1) * 4, n = i * 4;
      for (const [u, v] of [[0, 2], [2, 3], [3, 1], [1, 0]]) {
        indices.push(k + u, k + v, n + u, k + v, n + v, n + u);
      }
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
