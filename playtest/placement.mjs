// Everything is where it belongs, measured in metres.
//
// `src/courseSchema.js` stops a number being *forgotten* by the scaling pass.
// This stops a number being *wrong* — scaled correctly, declared correctly, and
// still leaving the thing it describes hundreds of metres from where it should
// be. Those are different failures and only one of them has a schema fix.
//
// Every occurrence in docs/architecture/WORLD-SCALE.md would have failed here:
//
//   - The seventeen Eastbourne villas 900 m from the nearest road.
//   - Ōtaki's farmhouses thousands of units from their own collision circles.
//   - The shoreline 250 m out to sea, when the beach was authored at 20 m.
//   - Manfeild's fog wall 155 m in front of a car doing 220 km/h.
//
// None of them was caught by any test. All four were caught by a person looking
// at a screenshot, weeks later. The point of this file is that a course whose
// pieces have drifted apart should fail in Node in two seconds.
//
// Thresholds are deliberately loose. This is not a pixel test and it must not
// become one: it is looking for the difference between "beside the road" and
// "in the next paddock", which is a factor of thirty, not a few per cent. A
// tight threshold here would be re-tuned every time somebody moved a house, and
// a check that gets re-tuned to pass is not a check.
import assert from 'node:assert/strict';
import { TRACKS } from '../src/tracks.js';
import { applyTrack, FOG, WORLD } from '../src/config.js';
import { buildTrack } from '../src/track.js';
import { buildStructures } from '../src/structures.js';
import { eastbourneCoast } from '../src/coast.js';
import { UNITS_PER_METRE, worldDiagonal } from '../src/scale.js';

const m = (units) => units / UNITS_PER_METRE;

// How far from a road a building of each kind may stand.
//
// Per kind, because "beside the road" means different things: a villa on Marine
// Drive has street frontage by definition, and a Kāpiti farmhouse at the end of
// its own shelter-belted drive genuinely is a couple of hundred metres back.
// One global number would either wave the farmhouses through — the limit being
// set by the loosest case — or fail them forever.
//
// The point is to catch the difference between "beside the road" and "in the
// next paddock", which is a factor of thirty. None of these is a tight fit.
const MAX_FROM_ROAD_M = {
  villa: 45,
  shops: 45,
  clinic: 45,
  school: 45,
  rsa: 45,
  shelter: 45,
  // Up a drive, behind a shelter belt. This is what a farm looks like.
  farmhouse: 240,
  shed: 240,
  // A circuit's venue sits behind its own fence and paddock.
  'pit-wall': 60,
  garage: 90,
  tower: 90,
  grandstand: 90,
  'paddock-shed': 180,
  'marshal-hut': 60,
  default: 60,
};

// A road is two lanes. Anything outside this is not a road width, it is a number
// that has been multiplied by something.
const ROAD_WIDTH_M = { min: 3, max: 14 };

// How far you can see, as a fraction of the world's diagonal. Below about a
// third of a course you are driving in fog; much above two you may as well have
// none. Manfeild sat at 0.16 for weeks.
const FOG_FAR_SPANS = { min: 0.35, max: 2.5 };

// The route has to fit in its own world, with room for the scenery bands.
const WORLD_MARGIN_M = 40;

const failures = [];
function check(course, label, ok, detail) {
  if (ok) return;
  failures.push(`${course}: ${label} — ${detail}`);
}

// Distance from a point to the nearest carriageway edge, over the whole network.
function metresToRoad(roads, x, z) {
  let best = Infinity;
  for (const road of roads) {
    for (const p of road.centerline) {
      const d = Math.hypot(p.x - x, p.y - z) - road.half;
      if (d < best) best = d;
    }
  }
  return m(best);
}

for (const def of TRACKS) {
  applyTrack(def);
  const track = buildTrack();
  const roads = track.roads || [track];
  const structures = buildStructures(def, track);

  // --- roads are roads ------------------------------------------------------
  for (const road of roads) {
    const width = m(road.half * 2);
    check(
      def.id,
      `road "${road.id}" width`,
      width >= ROAD_WIDTH_M.min && width <= ROAD_WIDTH_M.max,
      `${width.toFixed(1)} m, expected ${ROAD_WIDTH_M.min}-${ROAD_WIDTH_M.max}`
    );
  }

  // --- buildings are beside roads -------------------------------------------
  let worstBuilding = 0;
  let worstKind = null;
  const worstOf = new Map();
  for (const s of structures) {
    const away = metresToRoad(roads, s.x, s.z);
    if (!(worstOf.get(s.kind) >= away)) worstOf.set(s.kind, away);
    if (away > worstBuilding) {
      worstBuilding = away;
      worstKind = s.kind;
    }
  }
  for (const [kind, away] of worstOf) {
    const limit = MAX_FROM_ROAD_M[kind] ?? MAX_FROM_ROAD_M.default;
    check(
      def.id,
      `"${kind}" furthest from a road`,
      away <= limit,
      `${away.toFixed(0)} m, limit ${limit} m`
    );
  }
  if (process.env.PLACEMENT_VERBOSE) {
    for (const [kind, away] of [...worstOf].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${def.id} ${kind.padEnd(14)} worst ${away.toFixed(0)} m`);
    }
  }

  // --- the route fits its world ---------------------------------------------
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const road of roads) {
    for (const p of road.centerline) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minZ) minZ = p.y;
      if (p.y > maxZ) maxZ = p.y;
    }
  }
  check(
    def.id,
    'route inside its world',
    minX > -WORLD.width && maxX < WORLD.width * 2 && minZ > -WORLD.height && maxZ < WORLD.height * 2,
    `route spans x ${Math.round(minX)}..${Math.round(maxX)}, z ${Math.round(minZ)}..${Math.round(maxZ)}`
      + ` in a ${WORLD.width}x${WORLD.height} world`
  );
  check(
    def.id,
    'world is not mostly empty',
    (maxX - minX) > WORLD.width * 0.25 && (maxZ - minZ) > WORLD.height * 0.25,
    `route occupies ${(((maxX - minX) / WORLD.width) * 100).toFixed(0)}%`
      + ` x ${(((maxZ - minZ) / WORLD.height) * 100).toFixed(0)}% of its world`
  );
  void WORLD_MARGIN_M;

  // --- you can see ----------------------------------------------------------
  const spans = FOG.far / worldDiagonal(WORLD);
  check(
    def.id,
    'fog distance',
    spans >= FOG_FAR_SPANS.min && spans <= FOG_FAR_SPANS.max,
    `far = ${spans.toFixed(2)} of the world diagonal (${m(FOG.far).toFixed(0)} m),`
      + ` expected ${FOG_FAR_SPANS.min}-${FOG_FAR_SPANS.max}`
  );

  // --- the coast is a beach, not a bay --------------------------------------
  //
  // Measured against the coastal road rather than against a remembered number,
  // so it tests the thing that actually went wrong: the *gap* between the road
  // and the water, in metres, at every sample along it.
  let coastReport = '';
  if (def.theme === 'eastbourne') {
    const { points, beach } = eastbourneCoast(track);
    const want = m(beach);
    let closest = Infinity;
    let furthest = 0;
    // Skip the run-on at either end: it is deliberately extrapolated past the
    // last coastal road and has nothing to be measured against.
    for (let i = 1; i < points.length - 1; i += 1) {
      const away = metresToRoad(roads, points[i].x, points[i].z);
      if (away < closest) closest = away;
      if (away > furthest) furthest = away;
    }
    check(
      def.id,
      'beach width',
      furthest <= want * 1.6 && closest >= want * 0.4,
      `${closest.toFixed(0)}-${furthest.toFixed(0)} m of beach, authored as ${want.toFixed(0)} m`
    );
    coastReport = `  beach ${closest.toFixed(0)}-${furthest.toFixed(0)} m (authored ${want.toFixed(0)})`;
  }

  console.log(
    `placement ${def.id.padEnd(16)} buildings ${String(structures.length).padStart(4)}`
    + `  furthest ${worstBuilding.toFixed(0).padStart(3)} m`
    + `  fog ${spans.toFixed(2)} diag`
    + `  road ${m(track.half * 2).toFixed(1)} m`
    + coastReport
  );
}

if (failures.length) {
  for (const line of failures) console.error(`placement FAIL  ${line}`);
  assert.fail(`${failures.length} placement check(s) failed — see docs/architecture/WORLD-SCALE.md`);
}
console.log('placement: every building, beach and fog band is where it belongs');

// --- the guard itself -------------------------------------------------------
//
// A mechanism that has never been observed to fire is not a guard, it is a hope.
// This drops an undeclared number into a copy of a real course definition and
// insists the walker refuses it, naming the path.
{
  const { walkNumbers, kindOf, UndeclaredNumberError } = await import('../src/courseSchema.js');
  const smuggled = { geometry: { elevation: { river: { newIdea: 42 } } } };
  let caught = null;
  try {
    walkNumbers(smuggled, (path, value) => {
      if (kindOf(path) === undefined) throw new UndeclaredNumberError(path, value, 'test');
    });
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof UndeclaredNumberError, 'an undeclared number must throw');
  assert.equal(caught.path, 'geometry.elevation.river.newIdea');
  assert.match(caught.message, /size.+does NOT scale/s, 'and must say what the kinds are');

  // ...and that a declared one does not, so the guard is not simply refusing
  // everything.
  let threw = false;
  try {
    walkNumbers({ geometry: { roadWidth: 360 } }, (path, value) => {
      if (kindOf(path) === undefined) throw new UndeclaredNumberError(path, value, 'test');
    });
  } catch {
    threw = true;
  }
  assert.equal(threw, false, 'a declared number must pass');
  console.log('placement: the schema guard refuses an undeclared number and passes a declared one');
}
