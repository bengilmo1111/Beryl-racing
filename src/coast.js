// Where the harbour is, derived from the road rather than authored beside it.
//
// Eastbourne's shoreline was a polyline of eleven hand-written coordinates. In
// the world it was authored in it sat about 20 m off Marine Drive, which is
// right — the real road is a footpath and a strip of shingle from the water.
// Then the course was rescaled 17× so its length would be honest, and the
// shoreline scaled with it, because a coordinate list has no way of knowing that
// *this* number was a beach and not a place. The harbour ended up 80 m off the
// road at the top of the drive and 250 m off it by the village, which is why the
// most coastal course in the game read as a road through a forest.
//
// The width of a beach is a size. It does not scale with the map. So the coast
// is now generated: offset the coastal roads' own centrelines, seaward, by a
// beach.
//
// This lives outside render3d/ on purpose. The seawall Beryl bumps into is
// simulation, the beach and water are render, and the two being derived from one
// function is what stops them drifting apart — the same reason structures.js
// owns every building. See docs/architecture/WORLD-SCALE.md.
import { metres } from './scale.js';
import { EASTBOURNE_LAYOUT } from './eastbourneRoute.js';

// Road edge to water.
//
// Wider than the real shingle strip, and deliberately. The terrain grid on a
// course this size has ~15 m cells, so a 26 m beach is under two cells across
// and the ramp down to the water cannot be resolved at all — it came out as a
// hard step with the sand tint landing wherever the cells happened to fall.
// 45 m is three cells, which is the minimum that reads as a slope, and Days Bay
// and Rona Bay do both have proper beaches.
const BEACH = metres(45);

// The low wall between the road and the beach. Marine Drive has one for most of
// its length, and the brief requires the water be visible and unreachable — so
// this is both the thing you can see and the thing you bump into.
export const WALL_SETBACK = metres(3);

// How far the coast runs on past the ends of the coastal roads. The harbour does
// not stop where the road turns inland, and a shoreline that ended in mid air at
// the village would be worse than the one being replaced.
const RUN_ON = metres(500);

// Unit normal at sample i, from the tangent through its neighbours.
function normalAt(line, i) {
  const a = line[Math.max(0, i - 1)];
  const b = line[Math.min(line.length - 1, i + 1)];
  const tx = b.x - a.x;
  const tz = b.y - a.y;
  const len = Math.hypot(tx, tz) || 1;
  return { x: -tz / len, z: tx / len };
}

// The harbour side.
//
// Wellington Harbour is west of Marine Drive, so of the two normals the seaward
// one is whichever has the lower mean x across the coastal stretch. Decided once
// for the whole coast rather than per sample: picking it sample by sample would
// flip the beach to the other side of the road at every bend that happened to
// turn back on itself.
function seawardSign(line, from, to) {
  let sum = 0;
  for (let i = from; i <= to; i += 1) sum += normalAt(line, i).x;
  return sum < 0 ? 1 : -1;
}

function roadsOf(track) {
  return track.roads || [track];
}

function primaryOf(track) {
  return roadsOf(track)[0];
}

function spanOf(line, from, to) {
  const last = line.length - 1;
  return {
    from: Math.max(0, Math.round(from * last)),
    to: Math.min(last, Math.round(to * last)),
  };
}

// The seaward sign for the course, decided on the primary's coastal stretch and
// then used for every coastal road, so they cannot disagree about which way the
// water is.
export function eastbourneSeaward(track) {
  const primary = primaryOf(track);
  const first = EASTBOURNE_LAYOUT.coastal[0];
  const { from, to } = spanOf(primary.centerline, first.from, first.to);
  return seawardSign(primary.centerline, from, to);
}

// The shoreline as a polyline, plus the wall line just off the seal.
//
// `points` is the seaward edge of the beach — where the water starts. `wall` is
// the same polyline pulled back to the road edge, and each carries the seaward
// normal it was built with so callers can ask which side of it they are on.
// Both come out of one walk so they cannot disagree, which is the point.
export function eastbourneCoast(track) {
  const roads = roadsOf(track);
  const sign = eastbourneSeaward(track);

  const points = [];
  const wall = [];
  for (const leg of EASTBOURNE_LAYOUT.coastal) {
    const road = roads.find((r) => r.id === leg.road);
    if (!road) continue;
    const line = road.centerline;
    const { from, to } = spanOf(line, leg.from, leg.to);
    const offset = road.half + BEACH;
    const wallOffset = road.half + WALL_SETBACK;
    for (let i = from; i <= to; i += 1) {
      const nrm = normalAt(line, i);
      points.push({
        x: line[i].x + nrm.x * sign * offset,
        z: line[i].y + nrm.z * sign * offset,
        nx: nrm.x * sign,
        nz: nrm.z * sign,
      });
      wall.push({
        x: line[i].x + nrm.x * sign * wallOffset,
        z: line[i].y + nrm.z * sign * wallOffset,
      });
    }
  }

  // Continue past both ends along the end headings, so the harbour does not
  // stop dead where the last coastal road does.
  const extend = (a, b, distance) => {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    const len = Math.hypot(dx, dz) || 1;
    return {
      x: a.x + (dx / len) * distance,
      z: a.z + (dz / len) * distance,
      nx: a.nx,
      nz: a.nz,
    };
  };
  if (points.length >= 2) {
    points.unshift(extend(points[0], points[1], RUN_ON));
    points.push(extend(points[points.length - 1], points[points.length - 2], RUN_ON));
  }
  // The wall stops where the road does. It is street furniture, not geography:
  // running it on past the ends would leave a low concrete wall standing in a
  // paddock, which the shoreline can get away with and a wall cannot.
  return { points, wall, sign, beach: BEACH };
}

// Is this point on the beach, or in the water?
//
// Returned as a closure over one pre-built coast rather than rebuilt per query,
// because scenery.js asks it a few thousand times at load. Trees were happily
// scattering onto the sand and out into the harbour once the water arrived
// beside the road — a stand of macrocarpa standing in Wellington Harbour being
// a fairly direct contradiction of "recognisable place".
export function beachMask(track, def) {
  if (!def || def.theme !== 'eastbourne') return null;
  const { points } = eastbourneCoast(track);
  if (!points.length) return null;
  // The whole beach, not just the water: back from the shoreline as far as the
  // wall. Trees in the harbour were the obvious failure, but a post-and-wire
  // farm fence running along the sand outside a seawall is the same mistake and
  // reads just as wrong.
  const inland = BEACH - WALL_SETBACK;

  return (x, z) => {
    let best = null;
    let bestGap = Infinity;
    for (const p of points) {
      const dx = p.x - x;
      const dz = p.z - z;
      const gap = dx * dx + dz * dz;
      if (gap < bestGap) {
        bestGap = gap;
        best = p;
      }
    }
    if (!best) return false;
    // Positive means seaward of the shoreline at that point.
    const along = (x - best.x) * best.nx + (z - best.z) * best.nz;
    return along > -inland;
  };
}
