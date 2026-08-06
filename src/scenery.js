// Deterministic roadside scenery placement.
//
// This is simulation, not decoration: trees placed here also become collision
// circles that resolveObstacles() reads every frame, and the placement runs off
// the global RNG the playtest harness seeds. The order of draws is part of the
// determinism contract — reordering one, or adding one, moves every recorded
// finish position. See docs/playtest.md and the AC2 baselines.
//
// A course that wants nothing must return *before* any draw, as Manfeild does,
// rather than filtering candidates away inside the loop: bailing out early
// consumes nothing, whereas rejecting candidates consumes draws and leaves the
// stream in a different place for anything seeded afterwards.
//
// ---
//
// Placement follows the route, not the world.
//
// This used to be 90 candidates thrown uniformly at the whole map and rejected
// if they landed on a road. That is a reasonable thing to write and a bad thing
// to look at: a course occupies a thin ribbon of a large rectangle, so nearly
// every tree landed somewhere the player never goes and the roadside — the only
// part anyone sees — got whatever was left over. After the rescale the worlds
// are ~100x larger in area and those 90 trees were invisible.
//
// So the walk is along the centreline by arc length, into bands either side.
// Density is authored per kilometre of road, which is the unit that actually
// matters and does not change meaning when a course is resized.
import Phaser from 'phaser';
import { TRACK, WORLD } from './config.js';
import { distanceToCenterline } from './track.js';
import { metres } from './scale.js';

// Real sizes, at last.
//
// A tree used to be `128 * scale` units across — 90 to 180 units, which at 57.9
// units/metre is a 1.5 to 3 metre shrub. Every one of them. That was always
// wrong, and a world ten times too small hid it; at the rescaled size they read
// as pin-pricks on the horizon.
//
// Canopy width and trunk radius are separate numbers now, because they have to
// be. You bump the trunk, not the canopy, and the old collision radius was
// derived from the canopy (`displayWidth * 0.3`) — at a realistic canopy that
// would put a six-metre bumper around every pōhutukawa.
const SPECIES = {
  'tree-1': { canopy: metres(13), trunk: metres(0.55) }, // pōhutukawa
  'tree-2': { canopy: metres(6.5), trunk: metres(0.4) }, // shelter-belt conifer
  'tree-3': { canopy: metres(11), trunk: metres(0.6) }, // farm macrocarpa
};

// What grows where. Species lists are weighted by repetition so the pick stays a
// single `GetRandom` on the seeded stream rather than a loop of comparisons.
//
// `clustersPerKm` counts *attempts*, not trees: each one places 0..clusterMax on
// each side, so the tree count lands near four times this. Named for what the
// loop does rather than what it produces, because the loop is the thing you tune
// and a name that lies about a factor of four is how the last set of numbers
// went wrong.
const THEMES = {
  eastbourne: {
    // A coastal settlement under a steep bush hillside: pōhutukawa along the
    // shore, darker bush climbing away from the road.
    species: ['tree-1', 'tree-1', 'tree-1', 'tree-2', 'tree-3'],
    // Open enough to keep the harbour in view. At 130 the pōhutukawa closed over
    // the road into a tunnel, which is Remutaka's look, not a seaside village's.
    clustersPerKm: 62,
    clusterMax: 3,
    band: metres(90),
    verge: metres(9),
    fences: false,
    poles: true,
    shelterBelts: 0,
  },
  otaki: {
    // Market gardens and grazing: macrocarpa shelter belts, post-and-wire, and
    // the power line that follows every rural road in the country.
    species: ['tree-3', 'tree-3', 'tree-2', 'tree-2', 'tree-1'],
    clustersPerKm: 76,
    clusterMax: 3,
    band: metres(115),
    verge: metres(11),
    fences: true,
    poles: true,
    shelterBelts: 9,
  },
  remutaka: {
    // Bush to the road edge on both sides and no farm furniture at all — it is a
    // hill road through a forest park.
    species: ['tree-2', 'tree-2', 'tree-1', 'tree-3'],
    clustersPerKm: 210,
    clusterMax: 6,
    band: metres(70),
    verge: metres(7),
    fences: false,
    poles: false,
    shelterBelts: 0,
  },
};

function arcLengths(line) {
  const cumulative = new Float64Array(line.length);
  for (let i = 1; i < line.length; i++) {
    cumulative[i] = cumulative[i - 1]
      + Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y);
  }
  return cumulative;
}

// Point and left-hand normal at a distance along the route.
function alongRoute(line, cumulative, distance) {
  let lo = 0;
  let hi = line.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid] < distance) lo = mid + 1;
    else hi = mid;
  }
  const i = Math.max(1, lo);
  const a = line[i - 1];
  const b = line[i];
  const span = cumulative[i] - cumulative[i - 1] || 1;
  const t = (distance - cumulative[i - 1]) / span;
  const tx = (b.x - a.x) / span;
  const ty = (b.y - a.y) / span;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, nx: -ty, ny: tx };
}

function insideWorld(x, y) {
  return x > 60 && y > 60 && x < WORLD.width - 60 && y < WORLD.height - 60;
}

// Returns { trees, props, obstacles }. `trees` and `props` are render data — the
// caller decides what a mesh looks like — and `obstacles` is gameplay, which
// must be appended to the scene's list in this order.
export function scatterScenery(track, def) {
  const trees = [];
  const props = [];
  const obstacles = [];

  // Manfeild is a bare, open race venue on farmland. Its rhythm comes from the
  // pit complex, grandstand, marshal huts, fencing, bales and boards in
  // themes/manfeild, not a generic ring of trees — and returning here rather
  // than filtering inside the loop makes the no-tree rule absolute, leaving no
  // invisible collision circles on a circuit meant to be driven flat out.
  const plan = THEMES[def.theme];
  if (!plan) return { trees, props, obstacles };

  const line = track.centerline;
  const cumulative = arcLengths(line);
  const routeLength = cumulative[cumulative.length - 1];
  // Clear air between the carriageway and anything solid. Trees that brush the
  // kerb make a two-lane road feel like a tunnel.
  const inner = TRACK.roadWidth / 2 + plan.verge;

  const step = metres(1000) / plan.clustersPerKm;
  for (let s = step; s < routeLength; s += step) {
    const at = alongRoute(line, cumulative, s);
    for (const side of [-1, 1]) {
      const count = Phaser.Math.Between(0, plan.clusterMax);
      for (let n = 0; n < count; n++) {
        const offset = inner + Phaser.Math.FloatBetween(0, plan.band);
        const jitter = Phaser.Math.FloatBetween(-step * 0.8, step * 0.8);
        const variant = Phaser.Utils.Array.GetRandom(plan.species);
        const size = Phaser.Math.FloatBetween(0.78, 1.3);
        const x = at.x + at.nx * side * offset + at.ny * jitter;
        const y = at.y + at.ny * side * offset - at.nx * jitter;
        if (!insideWorld(x, y)) continue;
        // The road-network check still runs and still transparently covers every
        // branch: a band measured off the primary route knows nothing about the
        // side street it may be crossing.
        if (distanceToCenterline(x, y, line) < inner) continue;
        const species = SPECIES[variant];
        trees.push({ x, y, variant, canopyWidth: species.canopy * size });
        obstacles.push({ x, y, r: species.trunk * size });
      }
    }
  }

  // Shelter belts. A dark macrocarpa row across a paddock is the strongest rural
  // cue there is, and one row does the work of fifty separate canopies.
  for (let i = 0; i < plan.shelterBelts; i++) {
    const s = Phaser.Math.FloatBetween(0.04, 0.96) * routeLength;
    const side = Phaser.Math.Between(0, 1) ? 1 : -1;
    const offset = Phaser.Math.FloatBetween(metres(60), metres(190));
    const length = Phaser.Math.FloatBetween(metres(90), metres(210));
    const lean = Phaser.Math.FloatBetween(-0.5, 0.5);
    const at = alongRoute(line, cumulative, s);
    const x = at.x + at.nx * side * (inner + offset);
    const y = at.y + at.ny * side * (inner + offset);
    if (!insideWorld(x, y)) continue;
    if (distanceToCenterline(x, y, line) < inner + metres(40)) continue;
    props.push({ kind: 'shelterBelt', x, y, yaw: Math.atan2(at.ny, at.nx) + lean, length });
  }

  // Roadside furniture, laid along the route. Deliberately off the RNG: fences
  // and power poles are regular by nature, so they need no draws — and keeping
  // them off the stream means tuning them cannot move a recorded finish.
  //
  // Neither is solid. A continuous fence either side of a road is realistic and
  // turns every course into a corridor with no way back once you leave it; the
  // shelter belts are discrete and far enough out that they can be, and are not
  // yet either — leaving the road has to stay survivable.
  if (plan.fences) {
    const fenceStep = metres(24);
    const offset = TRACK.roadWidth / 2 + metres(4.5);
    for (let s = 0; s < routeLength; s += fenceStep) {
      const at = alongRoute(line, cumulative, s);
      for (const side of [-1, 1]) {
        const x = at.x + at.nx * side * offset;
        const y = at.y + at.ny * side * offset;
        if (!insideWorld(x, y)) continue;
        props.push({ kind: 'fence', x, y, yaw: Math.atan2(at.ny, at.nx), length: fenceStep });
      }
    }
  }

  if (plan.poles) {
    const poleStep = metres(46);
    const offset = TRACK.roadWidth / 2 + metres(7);
    for (let s = poleStep; s < routeLength; s += poleStep) {
      const at = alongRoute(line, cumulative, s);
      const x = at.x + at.nx * offset;
      const y = at.y + at.ny * offset;
      if (!insideWorld(x, y)) continue;
      props.push({ kind: 'pole', x, y, yaw: Math.atan2(at.ny, at.nx) });
    }
  }

  return { trees, props, obstacles };
}
