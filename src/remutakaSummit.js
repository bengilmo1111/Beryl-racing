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
  // One continuous stripe catches both the summit car park and the through
  // carriageway. The old stripe lived wholly inside the parking triangle, so a
  // player following the road could sail past it and over the end of the map.
  // At this position the triangle is still broad, allowing the paint to run
  // from the exposed road edge right across to the back of the parking area.
  const finishAlong = 0;
  const parkingWidth = depth * ((metres(22) - finishAlong) / metres(28));
  const finishLeft = -road.half;
  const finishRight = base + parkingWidth;
  const finishBand = [
    point(finishLeft, finishAlong - metres(0.3)),
    point(finishRight, finishAlong - metres(0.3)),
    point(finishRight, finishAlong + metres(0.3)),
    point(finishLeft, finishAlong + metres(0.3)),
  ];
  const centre = point((finishLeft + finishRight) / 2, finishAlong);
  return { index, origin, h, angle, point, finishBand,
    triangle: [point(base, metres(-22)), point(base + depth, metres(6)), point(base, metres(22))],
    finish: { ...centre, index, angle: angle - Math.PI / 2 } };
}

export function crossesSummitFinish(track, from, to) {
  return crossesFinishBand(remutakaSummit(track).finishBand, from, to);
}
