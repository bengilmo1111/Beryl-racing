// Named places, as positions on the road network rather than coordinates.
//
// Eastbourne's village was a handful of authored points — Williams Park, the
// doctors, the shops, the school, the RSA — and `npm run test:placement` found
// them 460 m, 126 m, 31 m, 97 m and 48 m from the nearest road. Williams Park is
// a park *on* Marine Drive; the shelter in it was most of half a kilometre
// inland, up a hillside, invisible from the course.
//
// Nobody put them there. They were authored against a world a seventeenth of the
// current size, where 1,640 units looked like a reasonable gap, and the rescale
// multiplied the gap along with everything else. It is the same fault as the
// beach and the houses, for the seventh and eighth time.
//
// A place is now a fraction along a named road plus a setback **in metres**. The
// fraction cannot go stale because it is a fraction; the setback cannot because
// metres are metres. There is no third number to get wrong.
import { metres } from './scale.js';

function walkerFor(road) {
  const line = road.centerline;
  const cumulative = new Float64Array(line.length);
  for (let i = 1; i < line.length; i += 1) {
    cumulative[i] = cumulative[i - 1]
      + Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y);
  }
  return { line, cumulative, total: cumulative[cumulative.length - 1] };
}

// By arc length, not by sample index. Samples are evenly spaced in *parameter*,
// so a long straight anchor span and a tight bend produce very differently sized
// steps — indexing by fraction would put a place hundreds of metres from where
// the fraction says.
function alongRoad(road, fraction) {
  const { line, cumulative, total } = walkerFor(road);
  const target = Math.min(total, Math.max(0, fraction * total));
  let lo = 0;
  let hi = line.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  const i = Math.max(1, lo);
  const a = line[i - 1];
  const b = line[i];
  const span = cumulative[i] - cumulative[i - 1] || 1;
  const t = (target - cumulative[i - 1]) / span;
  const tx = (b.x - a.x) / span;
  const ty = (b.y - a.y) / span;
  return {
    x: a.x + (b.x - a.x) * t,
    z: a.y + (b.y - a.y) * t,
    // Left normal, which is the direction a positive `offsetMetres` moves in.
    nx: -ty,
    nz: tx,
    yaw: Math.atan2(tx, ty),
  };
}

// `{ road, at, offsetMetres }` -> `{ x, z, yaw }`.
//
// `offsetMetres` is measured from the centreline, so it has to clear the
// carriageway itself; the values in the route files are all comfortably outside
// it, and `pushClear` in structures.js catches anything that is not.
export function resolvePlace(track, spec) {
  const roads = track.roads || [track];
  const road = roads.find((r) => r.id === spec.road) || roads[0];
  const at = alongRoad(road, spec.at);
  const offset = metres(spec.offsetMetres || 0);
  return {
    x: at.x + at.nx * offset,
    z: at.z + at.nz * offset,
    yaw: at.yaw,
    // Handy for anything that wants to sit square to the street.
    facing: at.yaw + Math.PI / 2,
  };
}

// Every place in a layout, resolved once.
export function resolvePlaces(track, places) {
  const out = {};
  for (const [name, spec] of Object.entries(places || {})) {
    out[name] = resolvePlace(track, spec);
  }
  return out;
}
