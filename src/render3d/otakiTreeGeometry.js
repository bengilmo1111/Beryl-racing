import { IcosahedronGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Broad, broken farm-tree crowns: several overlapping lobes rather than one
// cone. Remain one shared geometry per species, instanced at the seeded poses.
export function otakiTreeCrown(variant) {
  const conifer = variant === 'tree-2';
  const lobes = conifer
    ? [[0, .26, 0, .25], [-.13, .02, .06, .29], [.11, -.16, -.04, .32], [0, -.30, .02, .35]]
    : [[-.26, -.04, .02, .27], [.24, -.07, -.02, .29], [0, .14, 0, .31], [-.05, -.12, .22, .28], [.02, -.14, -.22, .26]];
  const parts = lobes.map(([x, y, z, radius]) => {
    const geometry = new IcosahedronGeometry(radius, 1);
    geometry.scale(1, conifer ? 1 : .70, 1);
    geometry.translate(x, y, z);
    return geometry;
  });
  const merged = mergeGeometries(parts);
  parts.forEach(p => p.dispose());
  return merged;
}
