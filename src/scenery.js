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
    clustersPerKm: 118,
    clusterMax: 4,
    band: metres(85),
    // Thinner than the near band on purpose: this is a settlement on a harbour,
    // and a far field packed as tight as the verge hides the water, which is the
    // whole reason the road is where it is.
    farSpecies: ['tree-1', 'tree-2', 'tree-3', 'tree-3'],
    farClustersPerKm: 34,
    farClusterMax: 4,
    farBand: [metres(85), metres(380)],
    verge: metres(9),
    fences: true,
    poles: true,
    gatesPerKm: 3.5,
    shelterBelts: 4,
    scrub: 460,
    bales: 0,
    rocks: 0,
  },
  otaki: {
    // Market gardens and grazing: macrocarpa shelter belts, post-and-wire, and
    // the power line that follows every rural road in the country.
    species: ['tree-3', 'tree-3', 'tree-2', 'tree-2', 'tree-1'],
    // Trees hug the fence line and then stop. A 105 m near band filled the
    // paddocks solid and Ōtaki became Remutaka — the market gardens and the
    // shelter belts, which are the things that say "Kāpiti farmland", were both
    // behind a wall of canopies.
    clustersPerKm: 128,
    clusterMax: 3,
    band: metres(42),
    // Deliberately sparse. Ōtaki is market gardens and grazing, so the paddocks
    // want to be open, with the tree line arriving as *shelter belts* rather
    // than as scattered canopies — at 62 the flats read as forest and the course
    // became indistinguishable from Remutaka.
    farSpecies: ['tree-3', 'tree-2', 'tree-2', 'tree-1'],
    farClustersPerKm: 18,
    farClusterMax: 3,
    farBand: [metres(60), metres(430)],
    verge: metres(11),
    fences: true,
    poles: true,
    gatesPerKm: 4.5,
    shelterBelts: 38,
    scrub: 430,
    bales: 210,
    rocks: 0,
  },
  remutaka: {
    // Bush to the road edge on both sides and no farm furniture at all — it is a
    // hill road through a forest park.
    species: ['tree-2', 'tree-2', 'tree-1', 'tree-3'],
    clustersPerKm: 250,
    clusterMax: 6,
    band: metres(65),
    farSpecies: ['tree-2', 'tree-2', 'tree-1'],
    farClustersPerKm: 150,
    farClusterMax: 6,
    farBand: [metres(65), metres(330)],
    verge: metres(7),
    fences: false,
    poles: false,
    gatesPerKm: 0,
    shelterBelts: 0,
    scrub: 1400,
    bales: 0,
    rocks: 300,
  },
};

// Only what is close enough to hit is solid.
//
// Density went up several times over here, and every solid tree is another entry
// in resolveObstacles()' per-frame sweep. A tree three hundred metres off the
// road is scenery — it exists to fill the middle distance, and paying for it on
// every frame of every race buys nothing. So the near band collides and the far
// band does not, which keeps the obstacle count roughly where it was while the
// object count multiplies.
const SOLID_WITHIN = metres(48);

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

// Roadside furniture is laid at a fixed offset from the primary route, which
// knows nothing about the roads crossing it. Left alone that runs a post-and-wire
// fence straight across the mouth of every side street — the same fault the
// kerbs and centre line had, and just as obvious once you are looking at a
// junction.
//
// Trees do not need this: they already go through distanceToCenterline, which
// sees the whole network.
const JUNCTION_CLEAR = 1.6;

// `reach` is how far the prop itself extends from its own position. A fence
// segment is 24 m long, so testing only its centre point cleared the posts and
// left the wire strung straight across the road — the radius has to cover what
// is being placed, not just where it is placed.
function blocksAJunction(x, y, roads, reach = 0) {
  for (let r = 1; r < roads.length; r++) {
    const line = roads[r].centerline;
    const limit = roads[r].half * JUNCTION_CLEAR + reach;
    for (const p of line) {
      if (Math.abs(p.x - x) > limit || Math.abs(p.y - y) > limit) continue;
      if (Math.hypot(p.x - x, p.y - y) < limit) return true;
    }
  }
  return false;
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
  const roads = track.roads || [track];
  const cumulative = arcLengths(line);
  const routeLength = cumulative[cumulative.length - 1];
  // Clear air between the carriageway and anything solid. Trees that brush the
  // kerb make a two-lane road feel like a tunnel.
  const inner = TRACK.roadWidth / 2 + plan.verge;

  // Trees, in two bands.
  //
  // The near band is what you drive past and is solid; the far band fills the
  // middle distance and is not. Both walk the route the same way, so the only
  // difference between them is how far out they reach and whether they collide.
  const scatterTrees = (perKm, clusterMax, from, to, species, solid) => {
    const step = metres(1000) / perKm;
    for (let s2 = step; s2 < routeLength; s2 += step) {
      const at = alongRoute(line, cumulative, s2);
      for (const side of [-1, 1]) {
        const count = Phaser.Math.Between(0, clusterMax);
        for (let n = 0; n < count; n++) {
          const offset = from + Phaser.Math.FloatBetween(0, to - from);
          const jitter = Phaser.Math.FloatBetween(-step * 0.8, step * 0.8);
          const variant = Phaser.Utils.Array.GetRandom(species);
          const size = Phaser.Math.FloatBetween(0.78, 1.3);
          const x = at.x + at.nx * side * offset + at.ny * jitter;
          const y = at.y + at.ny * side * offset - at.nx * jitter;
          if (!insideWorld(x, y)) continue;
          // The road-network check still runs and still transparently covers
          // every branch: a band measured off the primary route knows nothing
          // about the side street it may be crossing.
          if (distanceToCenterline(x, y, line) < inner) continue;
          const sp = SPECIES[variant];
          trees.push({ x, y, variant, canopyWidth: sp.canopy * size });
          if (solid && offset < SOLID_WITHIN) obstacles.push({ x, y, r: sp.trunk * size });
        }
      }
    }
  };

  scatterTrees(plan.clustersPerKm, plan.clusterMax, inner, inner + plan.band, plan.species, true);
  scatterTrees(
    plan.farClustersPerKm, plan.farClusterMax,
    inner + plan.farBand[0], inner + plan.farBand[1],
    plan.farSpecies, false
  );

  // Low cover: flax, tussock and gorse on the verge and out into the paddocks.
  // Cheap, never solid, and the thing that stops the ground between the trees
  // reading as mown lawn.
  // Clumped rather than sprinkled — it is undergrowth, and undergrowth grows in
  // patches. Weighted towards the verge, where it is actually seen.
  for (let i = 0; i < plan.scrub; i++) {
    const s2 = Phaser.Math.FloatBetween(0.01, 0.99) * routeLength;
    const side = Phaser.Math.Between(0, 1) ? 1 : -1;
    const spread = Phaser.Math.FloatBetween(0, 1);
    const offset = inner + metres(-4) + spread * spread * plan.farBand[1] * 0.5;
    const clump = Phaser.Math.Between(1, 4);
    const at = alongRoute(line, cumulative, s2);
    for (let k = 0; k < clump; k++) {
      const dx = Phaser.Math.FloatBetween(-metres(6), metres(6));
      const dz = Phaser.Math.FloatBetween(-metres(6), metres(6));
      const size = Phaser.Math.FloatBetween(0.7, 1.6);
      const x = at.x + at.nx * side * offset + dx;
      const y = at.y + at.ny * side * offset + dz;
      if (!insideWorld(x, y)) continue;
      if (distanceToCenterline(x, y, line) < inner - metres(3)) continue;
      props.push({ kind: 'scrub', x, y, yaw: Phaser.Math.FloatBetween(0, Math.PI), size });
    }
  }

  // Round bales, dropped in twos and threes the way they are left in a paddock.
  for (let i = 0; i < plan.bales; i++) {
    const s2 = Phaser.Math.FloatBetween(0.03, 0.97) * routeLength;
    const side = Phaser.Math.Between(0, 1) ? 1 : -1;
    const offset = inner + Phaser.Math.FloatBetween(metres(30), metres(220));
    const yaw = Phaser.Math.FloatBetween(0, Math.PI);
    const at = alongRoute(line, cumulative, s2);
    const x = at.x + at.nx * side * offset;
    const y = at.y + at.ny * side * offset;
    if (!insideWorld(x, y)) continue;
    if (distanceToCenterline(x, y, line) < inner + metres(14)) continue;
    props.push({ kind: 'bale', x, y, yaw, size: 1 });
  }

  // Boulders and slip debris, which is what a bush hill road actually has on its
  // uphill side.
  for (let i = 0; i < plan.rocks; i++) {
    const s2 = Phaser.Math.FloatBetween(0.01, 0.99) * routeLength;
    const side = Phaser.Math.Between(0, 1) ? 1 : -1;
    const offset = inner + Phaser.Math.FloatBetween(metres(-2), metres(90));
    const size = Phaser.Math.FloatBetween(0.6, 1.8);
    const at = alongRoute(line, cumulative, s2);
    const x = at.x + at.nx * side * offset;
    const y = at.y + at.ny * side * offset;
    if (!insideWorld(x, y)) continue;
    if (distanceToCenterline(x, y, line) < inner - metres(2)) continue;
    props.push({ kind: 'rock', x, y, yaw: Phaser.Math.FloatBetween(0, Math.PI), size });
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
        if (blocksAJunction(x, y, roads, fenceStep * 0.6)) continue;
        props.push({ kind: 'fence', x, y, yaw: Math.atan2(at.ny, at.nx), length: fenceStep });
      }
    }
  }

  // Farm gates and letterboxes, at intervals along the fence line. A gap in a
  // fence with a gate and a box beside it is what tells you somebody lives here.
  // Off the RNG like the rest of the furniture.
  if (plan.gatesPerKm) {
    const gateStep = metres(1000) / plan.gatesPerKm;
    const offset = TRACK.roadWidth / 2 + metres(5.5);
    let n = 0;
    for (let s2 = gateStep * 0.5; s2 < routeLength; s2 += gateStep) {
      const side = n++ % 2 ? 1 : -1;
      const at = alongRoute(line, cumulative, s2);
      const x = at.x + at.nx * side * offset;
      const y = at.y + at.ny * side * offset;
      if (!insideWorld(x, y)) continue;
      if (blocksAJunction(x, y, roads, metres(6))) continue;
      props.push({ kind: 'gate', x, y, yaw: Math.atan2(at.ny, at.nx), side });
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
      if (blocksAJunction(x, y, roads)) continue;
      props.push({ kind: 'pole', x, y, yaw: Math.atan2(at.ny, at.nx) });
    }
  }

  return { trees, props, obstacles };
}
