// Course catalogue. Each entry is a fully self-contained description of a
// course — its world size, road geometry, handling model, decoration theme,
// game mode and HUD/finish copy. config.applyTrack() copies the live parts into
// the shared config objects when a course becomes active.

import { applyTrack } from './config.js';
import { kmhToUnits } from './scale.js';
import { walkNumbers, kindOf, scales, UndeclaredNumberError } from './courseSchema.js';
import { EASTBOURNE_GEOMETRY, EASTBOURNE_LAYOUT } from './eastbourneRoute.js';
import { OTAKI_GEOMETRY, OTAKI_LAYOUT } from './otakiRoute.js';

export const TRACKS = [
  {
    id: 'eastbourne-dash',
    name: 'Eastbourne Dash',
    tagline: 'Coastal point-to-point',
    mode: 'sprint',
    theme: 'eastbourne',
    world: { ...EASTBOURNE_LAYOUT.world },
    // Days Bay round to Eastbourne and up to the RSA: about 3.8 km of coast
    // road once scaled, which is roughly the real run.
    lengthScale: 17,
    geometry: EASTBOURNE_GEOMETRY,
    layout: EASTBOURNE_LAYOUT,
    physics: {
      topSpeedKmh: 100,
      accel: 0.6795,
      brakeDecel: 1.2114,
      reverseAccel: 0.4545,
      maxReverse: 0.3864,
      coastDrag: 0.0909,
      overspeedDrag: 1.0227,
      grassDrag: 1.1364,
      driftLateral: 0.1591,
      gravity: 3.4091,
      turnRate: 3.1,
      lowSpeedTurn: 0.55,
      gripNormal: 7.56,
      gripDrift: 3.36,
      gripGrass: 4.76,
      driftTurnBoost: 1.5,
      grassMaxSpeedFactor: 0.5,
      maxClimbPenalty: 0.78,
      downhillOverspeed: 0.18,
    },
    storageKey: 'beryl-racing-3d.eastbourne-dash.bestTimeMs.v2',
    hud: { current: 'DASH TIME', progress: 'TO EASTBOURNE' },
    bestLabel: 'Eastbourne best',
    results: {
      title: 'DASH COMPLETE!',
      message: 'Phew! Just in time for a beer.',
      retryLabel: '↻  DASH AGAIN',
    },
  },
  {
    id: 'manfield',
    name: 'Manfeild Circuit',
    tagline: 'Chris Amon • 3.03 km',
    mode: 'circuit',
    theme: 'manfield',
    world: { width: 3540, height: 1920 },
    // The true corner sequence at its true size: 4.1 was chosen only so a
    // 450-wide road would fit inside the traced layout's tightest radius, which
    // left the venue 875 m round — 29% of the real lap, and close enough to see
    // the far side of the circuit from the main straight. 14.35 makes it the
    // real 3.03 km, and the radius problem goes away on its own.
    lengthScale: 14.35,
    geometry: {
      anchors: [
        { x: 1883, y: 1609 },
        { x: 1510, y: 1607 },
        { x: 1144, y: 1605 },
        { x: 777, y: 1605 },
        { x: 480, y: 1595 },
        { x: 315, y: 1515 },
        { x: 300, y: 1400 },
        { x: 449, y: 1249 },
        { x: 710, y: 1117 },
        { x: 987, y: 1024 },
        { x: 1251, y: 1031 },
        { x: 1494, y: 1143 },
        { x: 1696, y: 1364 },
        { x: 1836, y: 1443 },
        { x: 2000, y: 1372 },
        { x: 2205, y: 1177 },
        { x: 2410, y: 1130 },
        { x: 2683, y: 1148 },
        { x: 2872, y: 1074 },
        { x: 2893, y: 980 },
        { x: 2757, y: 876 },
        { x: 2470, y: 808 },
        { x: 2139, y: 799 },
        { x: 1766, y: 799 },
        { x: 1406, y: 800 },
        { x: 1026, y: 800 },
        { x: 660, y: 800 },
        { x: 412, y: 761 },
        { x: 322, y: 654 },
        { x: 367, y: 508 },
        { x: 577, y: 365 },
        { x: 846, y: 300 },
        { x: 1149, y: 306 },
        { x: 1446, y: 367 },
        { x: 1713, y: 438 },
        { x: 1998, y: 512 },
        { x: 2271, y: 584 },
        { x: 2533, y: 652 },
        { x: 2783, y: 717 },
        { x: 3036, y: 823 },
        { x: 3201, y: 1019 },
        { x: 3234, y: 1227 },
        { x: 3134, y: 1367 },
        { x: 2839, y: 1479 },
        { x: 2531, y: 1574 },
        { x: 2249, y: 1611 },
      ],
      roadWidth: 450,
      numCheckpoints: 18,
      closed: true,
    },
    // The joke, and the reason it is allowed to be one.
    //
    // Every other course is a Morris Minor doing what a Morris Minor does. This
    // one is a race circuit, so the only honest way for Beryl to be on it is if
    // somebody has done something unwise to the engine. At the real 3.03 km a
    // 110 km/h lap took 100 seconds, which is a long time to spend on a circuit;
    // 220 halves it and buys the gag at the same time.
    intro: 'BERYL HAS A V8 IN FOR TRACK DAY',
    // Eight cylinders, so four firings per crankshaft revolution instead of two,
    // and it revs past where the A-series gives up. See src/audio/EngineSound.js.
    engine: { cylinders: 8, redline: 6200, idle: 950 },
    physics: {
      topSpeedKmh: 220,
      accel: 1.2447,
      brakeDecel: 2.2128,
      reverseAccel: 0.3617,
      maxReverse: 0.2553,
      coastDrag: 0.1596,
      overspeedDrag: 0.7447,
      grassDrag: 0.9574,
      driftLateral: 0.0745,
      turnRate: 3.3,
      lowSpeedTurn: 0.5,
      gripNormal: 12.6,
      gripDrift: 3.36,
      gripGrass: 5.6,
      driftTurnBoost: 1.5,
      grassMaxSpeedFactor: 0.5,
    },
    // How far you can see, as fractions of the world diagonal.
    //
    // A circuit wants to see the far side of itself — the default band erased
    // the pit complex and the opposite straight, which are exactly what a race
    // track is for. This used to say `{ near: 3200, far: 9000 }`, tuned when
    // this world was 3,540 x 1,920 and still saying 3200/9000 when it became
    // 50,799 x 27,552: a white wall 155 m in front of a car doing 220 km/h,
    // which is two and a half seconds of visibility. Fractions cannot go stale
    // that way, and they are directly comparable with the 0.3/0.9 default.
    fogSpans: { near: 0.55, far: 1.4 },
    storageKey: 'beryl-racing-3d.manfield.bestLapMs.v1',
    hud: { current: 'LAP TIME', progress: 'LAP 1', lapWord: 'LAP' },
    bestLabel: 'Best lap',
    landmarks: [
      [436, 1446, 'POST 1'],
      [1110, 1143, 'POST 2'],
      [1858, 1305, 'POST 3'],
      [2366, 1275, 'POST 4'],
      [2727, 1003, 'POST 5'],
      [507, 572, 'POST 6'],
      [3116, 1165, 'POST 7'],
      [2534, 1680, 'POST 8'],
    ],
  },
  {
    id: 'remutaka',
    name: 'Remutaka Hill Climb',
    tagline: 'Summit hill climb',
    mode: 'sprint',
    theme: 'remutaka',
    world: { width: 5200, height: 3200 },
    // The real hill road climbs ~10 km; this is 3.5 km of it, caricatured as
    // docs/ART-DIRECTION.md asks rather than reproduced.
    lengthScale: 25,
    geometry: {
      anchors: [
        { x: 360, y: 2000 },
        { x: 780, y: 1900 },
        { x: 1250, y: 1980 },
        { x: 1750, y: 1780 },
        { x: 2250, y: 1900 },
        { x: 2750, y: 1620 },
        { x: 3200, y: 1500 },
        { x: 3560, y: 1780 },
        { x: 3720, y: 2160 },
        { x: 4080, y: 1980 },
        { x: 3900, y: 1600 },
        { x: 4280, y: 1460 },
        { x: 4080, y: 1140 },
        { x: 4500, y: 1040 },
        { x: 4380, y: 780 },
        { x: 4820, y: 680 },
      ],
      // 240 was all the old switchback radius allowed — 1.1 car lengths, a
      // single-track goat road on a state highway. The rescale lifts the
      // ceiling to ~930, so this is now an ordinary two-lane road.
      roadWidth: 420,
      numCheckpoints: 11,
      closed: false,
      elevation: {
        profile: [
          { at: 0, h: 0 },
          { at: 0.3, h: 45 },
          { at: 0.55, h: 160 },
          { at: 0.8, h: 320 },
          { at: 1, h: 440 },
        ],
      },
    },
    physics: {
      topSpeedKmh: 85,
      accel: 0.702,
      brakeDecel: 1.196,
      reverseAccel: 0.42,
      maxReverse: 0.36,
      coastDrag: 0.09,
      overspeedDrag: 1.0,
      grassDrag: 1.1,
      driftLateral: 0.14,
      gravity: 2.0,
      turnRate: 3.3,
      lowSpeedTurn: 0.6,
      gripNormal: 8.12,
      gripDrift: 3.64,
      gripGrass: 4.76,
      driftTurnBoost: 1.5,
      grassMaxSpeedFactor: 0.5,
      maxClimbPenalty: 0.78,
      downhillOverspeed: 0.12,
    },
    storageKey: 'beryl-racing-3d.remutaka.bestTimeMs.v1',
    hud: { current: 'CLIMB TIME', progress: 'TO THE SUMMIT' },
    bestLabel: 'Best climb',
    results: {
      title: 'SUMMIT!',
      message: 'We made it. Hope the brakes work on the way down.',
      retryLabel: '↻  CLIMB AGAIN',
    },
    landmarks: [
      [360, 2200, 'TE MĀRUA'],
      [3200, 1360, 'KAITOKE'],
      [2250, 2060, 'THE SWEEPERS'],
      [4820, 900, 'REMUTAKA SUMMIT'],
    ],
    arrows: [
      { x: 3760, y: 2360, text: 'HAIRPINS  ➜', rot: -0.5 },
      { x: 4360, y: 1300, text: '➜', rot: -1.2 },
    ],
    finishLabel: 'FINISH • SUMMIT',
  },
  {
    id: 'otaki',
    name: 'Ōtaki Rally',
    tagline: 'Forks-to-coast road rally',
    mode: 'sprint',
    theme: 'otaki',
    world: { ...OTAKI_LAYOUT.world },
    // The Forks down to the beach is ~15 km in reality; 4.2 km here.
    lengthScale: 10,
    geometry: OTAKI_GEOMETRY,
    layout: OTAKI_LAYOUT,
    physics: {
      topSpeedKmh: 95,
      accel: 0.7009,
      brakeDecel: 1.1304,
      reverseAccel: 0.4,
      maxReverse: 0.3304,
      coastDrag: 0.0783,
      overspeedDrag: 0.9565,
      grassDrag: 0.9565,
      driftLateral: 0.1217,
      gravity: 2.6087,
      turnRate: 3.4,
      lowSpeedTurn: 0.6,
      gripNormal: 8.4,
      gripGravel: 5.88,
      gripDrift: 3.64,
      gripGrass: 4.48,
      driftTurnBoost: 1.5,
      grassMaxSpeedFactor: 0.5,
      maxClimbPenalty: 0.78,
      downhillOverspeed: 0.15,
    },
    storageKey: 'beryl-racing-3d.otaki.bestTimeMs.v2',
    hud: { current: 'RALLY TIME', progress: 'TO THE BEACH' },
    bestLabel: 'Best rally',
    results: {
      title: 'BEACH!',
      message: 'Made it! Save us a spot at the picnic.',
      retryLabel: '↻  RALLY AGAIN',
    },
    // Recognition comes from the gorge, river, rail corridor, old-town grid and
    // beach rather than generated labels or arrows.
    // Checkpoint indices, not coordinates: the river and the level crossing are
    // built where the route happens to cross them. The beach rectangle used to
    // be copied in here as well and is not any more — it lives in
    // `layout.zones`, and two copies of one rectangle scaled by two different
    // code paths is the shape of the bug that put Ōtaki's farmhouses thousands
    // of units from their own collision circles.
    scenery: {
      riverCp: 6,
      railwayCp: 5,
    },
  },
];

// --- Scaling ---------------------------------------------------------------
//
// Two numbers per course, and both of them mean something you can check against
// the real place: `topSpeedKmh`, and `lengthScale` — how much bigger the course
// is than its authored coordinates.
//
// This replaces three global multipliers (LENGTH_SCALE 2, SPEED_SCALE 1.8,
// ACCEL_SCALE 1.3), a `preScaled` flag that made two of the four courses skip
// the geometry pass entirely, and per-course top speeds written directly in
// units per second. Under that arrangement Manfeild ran at 940 and Eastbourne at
// 88 — which look equally plausible on the page and are 104 km/h and 10 km/h.
// The layering is what hid it: no single line was wrong, and no two of them were
// comparable.
//
// Everything else about the car is expressed as a multiple of its top speed, so
// changing that number keeps the character — time to top speed, braking distance
// in car lengths — and only changes the pace.
const SPEED_RATIO_FIELDS = [
  'accel', 'brakeDecel', 'reverseAccel', 'maxReverse',
  'coastDrag', 'overspeedDrag', 'grassDrag', 'driftLateral', 'gravity',
];

// One pass over every number in the definition, deciding what to do with each
// by its declared kind rather than by a hand-written list of field names.
//
// The list is what kept failing. It skipped anything nobody remembered to add —
// which is how Eastbourne's shoreline, the village places and Ōtaki's farmhouse
// footprints each spent a while at a seventeenth of their proper distance — and
// it multiplied anything wrongly on it, which is how a 20 m beach became 250 m
// of open water. Both failures are silent. A number in the wrong units does not
// throw; it just puts things in the wrong place.
//
// Now an undeclared number is a startup error naming the exact path, so the
// failure happens at `npm run test:track-geometry`, in CI, and in the first
// second of every playtest — instead of in a screenshot three months later.
//
// Scaled in place. `structures.js`, `src/coast.js` and the render themes all
// import the route modules directly and hold references to these very objects;
// handing back a scaled copy would leave whichever of them still read the
// original placing houses at a seventeenth of the distance, which is precisely
// the see-it-versus-hit-it split structures.js exists to prevent.
function scaleCourse(def) {
  const L = def.lengthScale;

  walkNumbers(def, (path, value, parent, key) => {
    const kind = kindOf(path);
    if (kind === undefined) throw new UndeclaredNumberError(path, value, def.id);
    if (!scales(kind)) return;
    parent[key] = value * L;
  });

  // The two the renderer indexes a grid by, so they must land on whole units.
  def.world.width = Math.round(def.world.width);
  def.world.height = Math.round(def.world.height);
  if (def.layout) {
    def.layout.world.width = Math.round(def.layout.world.width);
    def.layout.world.height = Math.round(def.layout.world.height);
  }

  return scalePhysics(def);
}

function scalePhysics(def) {
  const top = kmhToUnits(def.physics.topSpeedKmh);
  def.physics.maxSpeed = top;
  for (const field of SPEED_RATIO_FIELDS) {
    if (def.physics[field] != null) def.physics[field] *= top;
  }
  return def;
}

TRACKS.forEach(scaleCourse);

const SELECT_KEY = 'beryl-racing.selectedTrack.v1';
let selectedId = TRACKS[0].id;

export function getSelectedTrack() {
  return TRACKS.find((track) => track.id === selectedId) || TRACKS[0];
}

export function getSelectedTrackId() {
  return getSelectedTrack().id;
}

export function setSelectedTrack(id) {
  if (!TRACKS.some((track) => track.id === id)) return;
  selectedId = id;
  try {
    localStorage.setItem(SELECT_KEY, id);
  } catch (error) {
    void error;
  }
  applyTrack(getSelectedTrack());
}

(function initSelection() {
  try {
    const saved = localStorage.getItem(SELECT_KEY);
    if (saved && TRACKS.some((track) => track.id === saved)) selectedId = saved;
  } catch (error) {
    void error;
  }
  applyTrack(getSelectedTrack());
})();
