import { metres } from './scale.js';
import { crossesFinishBand } from './arrival.js';

// A short, broad saddle at the crest, with tapered shoulders following the
// carriageway rather than a separate parking wedge laid across it.
export function summitOpenness(distance) {
  const t = Math.max(0, Math.min(1, (Math.abs(distance) - metres(18)) / metres(32)));
  return 1 - t * t * (3 - 2 * t);
}

export function remutakaSummit(road) {
  const index = Math.round((road.centerline.length - 1) * 0.92);
  const origin = road.centerline[index];
  const a = road.centerline[index - 1], b = road.centerline[index + 1];
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const tx = Math.cos(angle), ty = Math.sin(angle);
  const h = road.heights[index] + 0.3;
  const point = (left, along) => ({ x: origin.x + ty * left + tx * along,
    y: origin.y - tx * left + ty * along, h });
  const distances = [0];
  for (let i = 1; i < road.centerline.length; i++) {
    distances[i] = distances[i - 1] + Math.hypot(road.centerline[i].x - road.centerline[i - 1].x,
      road.centerline[i].y - road.centerline[i - 1].y);
  }
  const openness = distances.map(d => summitOpenness(d - distances[index]));
  const leftWidth = metres(24), rightWidth = metres(12);
  const triangles = [];
  for (const [edge, width] of [[road.right, leftWidth], [road.left, rightWidth]]) {
    for (let i = 0; i < edge.length - 1; i++) {
      if (!openness[i] && !openness[i + 1]) continue;
      const pair = k => {
        const centre = road.centerline[k], e = edge[k];
        const scale = 1 + width * openness[k] / road.half;
        return [{ ...e, h: road.heights[k] + 0.3 },
          { x: centre.x + (e.x - centre.x) * scale,
            y: centre.y + (e.y - centre.y) * scale, h: road.heights[k] + 0.3 }];
      };
      const [a,b] = pair(i), [c,d] = pair(i + 1);
      for (const tri of [[a,b,d], [a,d,c]]) {
        const [u,v,w] = tri;
        const area = (v.x-u.x)*(w.y-u.y) - (v.y-u.y)*(w.x-u.x);
        if (Math.abs(area) < 0.01) continue;
        if (area < 0) tri.reverse();
        triangles.push(tri);
      }
    }
  }
  const finishLeft = -road.half - rightWidth;
  const finishRight = road.half + leftWidth;
  const finishBand = [point(finishLeft, -metres(0.3)), point(finishRight, -metres(0.3)),
    point(finishRight, metres(0.3)), point(finishLeft, metres(0.3))];
  return { index, origin, h, angle, point, finishBand, triangles, openness, leftWidth, rightWidth,
    finish: { ...point(0, 0), index, angle: angle - Math.PI / 2 } };
}

export function crossesSummitFinish(track, from, to) {
  return crossesFinishBand(remutakaSummit(track).finishBand, from, to);
}
