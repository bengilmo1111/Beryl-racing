import { BufferGeometry, Float32BufferAttribute } from 'three';

// Subtract the actual paved triangles, preserving interpolated decoration
// heights. Junction-radius/midpoint tests miss long strips and acute joins.
export function clearRoads(geometry, roads) {
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  const a = source.attributes.position;
  const bounds = p => ({ x0: Math.min(...p.map(v => v.x)), x1: Math.max(...p.map(v => v.x)),
    z0: Math.min(...p.map(v => v.z)), z1: Math.max(...p.map(v => v.z)) });
  const touches = (a, b) => a.x0 <= b.x1 && a.x1 >= b.x0 && a.z0 <= b.z1 && a.z1 >= b.z0;
  const cuts = [];
  for (const road of roads) for (let i = 0; i < road.left.length - (road.closed ? 0 : 1); i++) {
    const j = (i + 1) % road.left.length;
    const p = [road.left[i], road.right[i], road.right[j], road.left[j]].map(p => ({ x: p.x, z: p.y }));
    for (const t of [[p[0], p[1], p[2]], [p[0], p[2], p[3]]]) cuts.push({ p: t, b: bounds(t) });
  }
  for (const road of roads) for (const triangle of road.pavedAreas || []) {
    const p = triangle.map(v => ({ x: v.x, z: v.y }));
    cuts.push({ p, b: bounds(p) });
  }
  const positions = [];
  for (let i = 0; i < a.count; i += 3) {
    let pieces = [Array.from({ length: 3 }, (_, k) => ({ x: a.getX(i+k), y: a.getY(i+k), z: a.getZ(i+k) }))];
    const box = bounds(pieces[0]);
    for (const cut of cuts) {
      if (!touches(box, cut.b)) continue;
      const [u, v, w] = cut.p;
      const sign = Math.sign((v.x-u.x)*(w.z-u.z)-(v.z-u.z)*(w.x-u.x));
      if (!sign) continue;
      pieces = pieces.flatMap(poly => {
        if (!touches(bounds(poly), cut.b)) return [poly];
        let inside = poly;
        const outside = [];
        for (let edge = 0; edge < 3 && inside.length; edge++) {
          const p = cut.p[edge], q = cut.p[(edge+1)%3];
          const distance = r => sign*((q.x-p.x)*(r.z-p.z)-(q.z-p.z)*(r.x-p.x));
          const next = [], rejected = [];
          for (let k = 0; k < inside.length; k++) {
            const a = inside[k], b = inside[(k+1)%inside.length];
            const da = distance(a), db = distance(b);
            (da >= 0 ? next : rejected).push(a);
            if ((da >= 0) !== (db >= 0)) {
              const t = da/(da-db), point = { x: a.x+(b.x-a.x)*t, y: a.y+(b.y-a.y)*t, z: a.z+(b.z-a.z)*t };
              next.push(point); rejected.push(point);
            }
          }
          if (rejected.length >= 3) outside.push(rejected);
          inside = next;
        }
        return outside;
      });
      if (!pieces.length) break;
    }
    for (const p of pieces) for (let k = 1; k < p.length-1; k++) {
      for (const v of [p[0], p[k], p[k+1]]) positions.push(v.x, v.y, v.z);
    }
  }
  if (source !== geometry) source.dispose();
  const result = new BufferGeometry();
  result.setAttribute('position', new Float32BufferAttribute(positions, 3));
  result.computeVertexNormals();
  return result;
}
