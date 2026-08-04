// Solid buildings: simulation, not decoration.
//
// Every entry here is something Beryl cannot drive through, and the same list is
// what the render themes place their geometry from. That single-list rule is the
// point of the module. A building you can see but drive through, or hit but not
// see, is exactly the failure the seawall comment in RaceScene warns about — and
// it is easy to reintroduce, because the geometry lives in render3d/, which is a
// lazily-loaded chunk the simulation must never import.
//
// A footprint is `{ x, z, w, d, yaw }`: centre, extent along the building's own
// local X and Z, and its rotation. Themes place a model at exactly that pose.
//
// Nothing here consumes RNG. Positions are authored, so adding or moving a
// building cannot perturb the seeded scenery placement in scenery.js — only the
// obstacle list itself changes.
import { EASTBOURNE_LAYOUT } from './eastbourneRoute.js';

// Clear air between the kerb and the nearest corner of a building.
const SHOULDER = 70;

// Footprints of the four villa variants in render3d/houses.js, plus the room a
// verandah and weatherboard base add. Kept slightly generous: over-estimating a
// footprint costs a little clearance, under-estimating puts a wall in the road.
const VILLA_FOOTPRINT = {
  villa: { w: 196, d: 176 },
  bungalow: { w: 226, d: 160 },
  cottage: { w: 171, d: 128 },
  'two-storey': { w: 174, d: 152 },
};

// Axis-aligned bounds of a rotated rectangle.
function boundsOf(s) {
  const c = Math.abs(Math.cos(s.yaw));
  const sn = Math.abs(Math.sin(s.yaw));
  const halfX = (s.w * c + s.d * sn) / 2;
  const halfZ = (s.w * sn + s.d * c) / 2;
  return { minX: s.x - halfX, maxX: s.x + halfX, minZ: s.z - halfZ, maxZ: s.z + halfZ };
}

// Closest a footprint comes to any road, measured against the whole network.
//
// Exact point-to-rectangle distance against the rotated footprint's axis-aligned
// bounds. Using the bounds rather than the rectangle is deliberately
// conservative: it over-estimates the building, which errs toward more
// clearance, never less.
function clearance(roads, s) {
  const b = boundsOf(s);
  let worst = Infinity;
  for (const road of roads) {
    for (const p of road.centerline) {
      const ox = Math.max(b.minX - p.x, 0, p.x - b.maxX);
      const oz = Math.max(b.minZ - p.y, 0, p.y - b.maxZ);
      const d = Math.hypot(ox, oz) - road.half;
      if (d < worst) worst = d;
    }
  }
  return worst;
}

// Nearest point on any road, and the outward direction from it toward `s` —
// which is the side of the road the building was authored on.
function roadSideAt(roads, x, z) {
  let best = Infinity;
  let c = null;
  for (const road of roads) {
    for (const p of road.centerline) {
      const d = Math.hypot(p.x - x, p.y - z);
      if (d < best) {
        best = d;
        c = p;
      }
    }
  }
  let dx = x - c.x;
  let dz = z - c.y;
  const len = Math.hypot(dx, dz) || 1;
  return { c, dx: dx / len, dz: dz / len };
}

// Push a building off the carriageway until its footprint clears the kerb.
//
// Iterative, and it has to be. A single perpendicular setback is only correct
// where the road is straight: these footprints are hundreds of units wide, and a
// curving road — or, in Eastbourne's village, a second road the building was not
// measured against — swings back under the far end even though the near corner
// cleared. Measuring the whole footprint against the whole network and pushing
// again is what catches that.
function pushClear(roads, s) {
  if (clearance(roads, s) >= SHOULDER) return s;

  const { dx, dz } = roadSideAt(roads, s.x, s.z);
  for (let i = 0; i < 24; i += 1) {
    const deficit = SHOULDER - clearance(roads, s);
    if (deficit <= 1) break;
    s.x += dx * (deficit + 4);
    s.z += dz * (deficit + 4);
  }
  return s;
}

function villa({ x, z, yaw, variant, wall, roof, door }) {
  return {
    kind: 'villa',
    variant,
    x,
    z,
    yaw,
    ...VILLA_FOOTPRINT[variant],
    palette: { wall, roof, door },
  };
}

function eastbourneStructures() {
  const places = EASTBOURNE_LAYOUT.places;

  // Houses run for most of the coast, thickening toward the village. Colour is
  // carried by roofs and doors rather than by a rainbow of walls.
  const houses = [
    [2340, 3600, Math.PI / 2, 'cottage', 'white', 'roofGreen', 0x58736a],
    [2260, 4300, Math.PI / 2 + 0.08, 'bungalow', 'warmWhite', 'roofDark', 0x4f7180],
    [2420, 5000, Math.PI / 2 - 0.06, 'villa', 'white', 'roofRed', 0x86514b],
    [2380, 5850, Math.PI / 2 + 0.05, 'cottage', 'paleBlue', 'roofDark', 0x446c76],
    [2470, 6700, Math.PI / 2 - 0.08, 'bungalow', 'white', 'roofGreen', 0x6c5b48],
    [2380, 7600, Math.PI / 2 + 0.03, 'villa', 'warmWhite', 'roofRed', 0x77524c],
    [2600, 8450, Math.PI / 2 - 0.04, 'cottage', 'white', 'roofDark', 0x506b5c],
    [2550, 9300, Math.PI / 2 + 0.06, 'bungalow', 'white', 'roofGreen', 0x4b6e79],
    [2820, 10050, Math.PI / 2 - 0.05, 'two-storey', 'warmWhite', 'roofDark', 0x7d5149],
    [3020, 10800, Math.PI / 2 + 0.04, 'villa', 'white', 'roofRed', 0x557468],
    [3850, 11250, -Math.PI / 2, 'cottage', 'white', 'roofGreen', 0x4e7180],
    [4050, 11850, -Math.PI / 2 + 0.06, 'bungalow', 'warmWhite', 'roofDark', 0x76544b],
    [4010, 13000, -Math.PI / 2 - 0.04, 'villa', 'white', 'roofRed', 0x496d62],
    [3600, 13700, Math.PI, 'cottage', 'white', 'roofGreen', 0x5a7080],
    [2450, 13450, 0, 'bungalow', 'warmWhite', 'roofDark', 0x77514d],
    [2050, 12600, Math.PI / 2, 'cottage', 'white', 'roofGreen', 0x466d79],
    [2050, 11800, Math.PI / 2, 'villa', 'white', 'roofRed', 0x765048],
  ].map(([x, z, yaw, variant, wall, roof, door]) =>
    villa({ x, z, yaw, variant, wall, roof, door })
  );

  return [
    ...houses,
    // Williams Park's shelter. The lawn itself is flat ground, not a structure.
    {
      kind: 'shelter', x: places.williamsPark.x + 170, z: places.williamsPark.z + 40,
      w: 190, d: 135, yaw: 0,
    },
    // The clinic, shop strip and school in the order the map puts them.
    { kind: 'clinic', x: places.doctors.x, z: places.doctors.z, w: 210, d: 430, yaw: Math.PI / 2 },
    { kind: 'shops', x: places.shops.x, z: places.shops.z, w: 200, d: 860, yaw: Math.PI / 2 },
    {
      kind: 'school', x: places.school.x + 80, z: places.school.z - 55,
      w: 190, d: 620, yaw: Math.PI / 2,
    },
    // The RSA, which is the finish.
    { kind: 'rsa', x: places.rsa.x, z: places.rsa.z, w: 520, d: 280, yaw: Math.PI },
  ];
}

// Ōtaki's farmhouses through the market-garden flats.
//
// Authored here, at final world scale, and read back by themes/otaki for
// rendering. When the course was rebuilt Forks-to-coast the theme briefly went
// back to owning its own copy of these positions, which left five farmhouses you
// could drive straight through and nine invisible collision blobs sitting where
// the old pre-rebuild course used to be — the exact split this module exists to
// prevent. Palettes stay in the theme; positions live here.
// Positions are fractions of the world, not world units.
//
// They were authored as absolute coordinates against a 19,000 x 11,000 Ōtaki.
// The moment the course was rescaled every one of them would have collapsed into
// the bottom-left corner, miles from the road they are meant to sit beside —
// which is the same see-it-versus-hit-it split this module exists to prevent,
// arriving by a different route. A fraction cannot go stale when the world
// changes size.
const OTAKI_FARMHOUSES = [
  { fx: 14350 / 19000, fz: 3900 / 11000, yaw: -0.18, variant: 'homestead', shed: true },
  { fx: 12400 / 19000, fz: 4450 / 11000, yaw: Math.PI + 0.08, variant: 'gabled', shed: false },
  { fx: 10900 / 19000, fz: 6000 / 11000, yaw: 0.18, variant: 'cottage', shed: true },
  { fx: 8200 / 19000, fz: 7200 / 11000, yaw: Math.PI - 0.16, variant: 'two-storey', shed: false },
  { fx: 7000 / 19000, fz: 7550 / 11000, yaw: 0.42, variant: 'homestead', shed: true },
];

const FARMHOUSE_FOOTPRINT = {
  homestead: { w: 250, d: 164 },
  gabled: { w: 230, d: 142 },
  cottage: { w: 178, d: 122 },
  'two-storey': { w: 190, d: 138 },
};

function otakiStructures(def) {
  return OTAKI_FARMHOUSES.flatMap(({ fx, fz, yaw, variant, shed }) => {
    const x = fx * def.world.width;
    const z = fz * def.world.height;
    const out = [{ kind: 'farmhouse', variant, shed, x, z, yaw, ...FARMHOUSE_FOOTPRINT[variant] }];
    if (shed) {
      // The shed sits at local (190, 105) inside the farmhouse group.
      const c = Math.cos(yaw);
      const sn = Math.sin(yaw);
      out.push({
        kind: 'shed', x: x + 190 * c + 105 * sn, z: z - 190 * sn + 105 * c,
        w: 115, d: 95, yaw: yaw - 0.18,
      });
    }
    return out;
  });
}

// How far along the main straight the grandstand sits, as a fraction of the lap.
//
// It cannot simply stand opposite the pits. Manfeild's layout folds back on
// itself, so the "infield" beside the start/finish line is not open ground — the
// ess runs through it, and a stand placed straight across the track lands on the
// racing surface. Moving it along the straight puts it against open infield
// instead. Shared with themes/manfeild so the model and its footprint agree.
//
// A fraction rather than the 1750 world units it used to be, for the same reason
// the farmhouses above are fractions: the venue is 3.5x the size it was tuned
// at, and a fixed offset would have parked the stand in the first corner.
const MANFEILD_STAND_FRACTION = 1750 / 50643;

export function manfeildStandZ(track) {
  return lapLength(track) * MANFEILD_STAND_FRACTION;
}

function lapLength(track) {
  const c = track.centerline;
  let total = 0;
  for (let i = 1; i < c.length; i++) total += Math.hypot(c[i].x - c[i - 1].x, c[i].y - c[i - 1].y);
  return total;
}

function manfeildStructures(def, track) {
  const cp = track.checkpoints[0];
  const yaw = Math.PI / 2 - cp.angle;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  // The venue group is placed at checkpoint 0 and rotated by `yaw`, so its
  // children's local coordinates have to be taken through the same transform to
  // land where the player sees them.
  const toWorld = (lx, lz, extra = 0) => ({
    x: cp.x + lx * c + lz * s,
    z: cp.y - lx * s + lz * c,
    yaw: yaw + extra,
  });

  const side = track.half + 72;
  const out = [];

  // Pit wall, six garage bays, timing tower and paddock sheds.
  out.push({ kind: 'pit-wall', ...toWorld(side, -30), w: 24, d: 1280 });
  for (let i = 0; i < 6; i += 1) {
    out.push({ kind: 'garage', ...toWorld(side + 190, -470 + i * 188), w: 196, d: 166 });
  }
  out.push({ kind: 'tower', ...toWorld(side + 205, 255), w: 170, d: 120 });
  for (let i = 0; i < 3; i += 1) {
    out.push({ kind: 'paddock-shed', ...toWorld(side + 470, -380 + i * 310), w: 276, d: 166 });
  }
  // The grandstand, opposite the pits.
  out.push({
    kind: 'grandstand',
    ...toWorld(-(track.half + 230) - 120, manfeildStandZ(track)),
    w: 330,
    d: 900,
  });

  // Marshal huts, at the authored post positions in def.landmarks.
  for (const [x, z] of def.landmarks || []) {
    out.push({ kind: 'marshal-hut', x, z, w: 100, d: 88, yaw: 0 });
  }
  return out;
}

// Every solid building on a course, already pushed clear of the roads.
export function buildStructures(def, track) {
  let list = [];
  if (def.theme === 'eastbourne') list = eastbourneStructures();
  else if (def.theme === 'otaki') list = otakiStructures(def);
  else if (def.theme === 'manfield') list = manfeildStructures(def, track);

  const roads = track.roads || [track];
  // Manfeild's venue is authored against the track and is meant to sit right on
  // the pit wall, so it is exempt from the push-out; everything else gets seated
  // clear of the carriageway.
  if (def.theme !== 'manfield') for (const s of list) pushClear(roads, s);
  return list;
}

// Collision circles covering a footprint.
//
// The car collides against circles, so a long building becomes a row of them
// along its major axis — a single circle round a 900-unit grandstand would block
// half the paddock. The result is a stadium shape: very slightly inside the
// rectangle at the corners, which is the right way to be wrong. You would rather
// clip a corner you can see than be stopped by a wall that is not there.
export function structureObstacles(structures) {
  const obstacles = [];
  for (const s of structures) {
    const major = Math.max(s.w, s.d);
    const minor = Math.min(s.w, s.d);
    const r = minor / 2;
    const count = Math.max(1, Math.round(major / minor));
    const alongX = s.w >= s.d;
    const c = Math.cos(s.yaw);
    const sn = Math.sin(s.yaw);
    for (let i = 0; i < count; i += 1) {
      const t = count === 1 ? 0 : (i / (count - 1) - 0.5) * (major - minor);
      const lx = alongX ? t : 0;
      const lz = alongX ? 0 : t;
      obstacles.push({ x: s.x + lx * c + lz * sn, y: s.z - lx * sn + lz * c, r });
    }
  }
  return obstacles;
}
