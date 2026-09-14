import { metres } from './scale.js';
import { crossesFinishBand } from './arrival.js';

// A roadside triangle at the crest; the through road continues downhill.
export function remutakaSummit(road) {
  const index = Math.round((road.centerline.length - 1) * 0.92);
  const origin = road.centerline[index];
  const a = road.centerline[index - 1], b = road.centerline[index + 1];
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const tx = Math.cos(angle), ty = Math.sin(angle);
  const h = road.heights[index] + 0.3;
  const point = (left, along) => ({ x: origin.x + ty * left + tx * along,
    y: origin.y - tx * left + ty * along, h });
  const base = road.half - metres(0.5), depth = metres(24);
  const section = left => {
    const t = (left - base) / depth;
    return [point(left, metres(-22 + 28*t)), point(left, metres(22 - 16*t))];
  };
  const finishBand = [...section(base + metres(8)), ...section(base + metres(8.6)).reverse()].reverse();
  const centre = point(base + metres(8.3), metres(2));
  return { index, origin, h, angle, point, finishBand,
    triangle: [point(base, metres(-22)), point(base + depth, metres(6)), point(base, metres(22))],
    finish: { ...centre, index, angle: angle - Math.PI / 2 } };
}

export function crossesSummitFinish(track, from, to) {
  return crossesFinishBand(remutakaSummit(track).finishBand, from, to);
}
