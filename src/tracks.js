// Course catalogue. Each entry is a fully self-contained description of a
// course — its world size, road geometry, handling model, decoration theme,
// game mode and HUD/finish copy. config.applyTrack() copies the live parts into
// the shared config objects when a course becomes active.

import { applyTrack } from './config.js';
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
    // Authored at final world scale. The route file is data only: tracks.js
    // remains the authoritative definition and nothing is patched at apply time.
    preScaled: true,
    geometry: EASTBOURNE_GEOMETRY,
    layout: EASTBOURNE_LAYOUT,
    physics: {
      maxSpeed: 88,
      accel: 46,
      brakeDecel: 82,
      reverseAccel: 40,
      maxReverse: 34,
      coastDrag: 8,
      overspeedDrag: 90,
      turnRate: 3.1,
      lowSpeedTurn: 0.55,
      gripNormal: 5.4,
      gripDrift: 2.4,
      gripGrass: 3.4,
      driftTurnBoost: 1.5,
      grassMaxSpeedFactor: 0.5,
      grassDrag: 100,
      driftLateral: 14,
      gravity: 300,
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
    // The true corner sequence is preserved, but the whole venue is enlarged so
    // a broad drift road fits inside the real layout's tightest radius.
    lengthScale: 2.05,
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
      samplesPerSegment: 20,
      numCheckpoints: 18,
      closed: true,
    },
    physics: {
      maxSpeed: 940,
      accel: 900,
      brakeDecel: 1600,
      reverseAccel: 340,
      maxReverse: 240,
      coastDrag: 150,
      overspeedDrag: 700,
      turnRate: 3.3,
      lowSpeedTurn: 0.5,
      gripNormal: 9.0,
      gripDrift: 2.4,
      gripGrass: 4.0,
      driftTurnBoost: 1.5,
      grassMaxSpeedFactor: 0.5,
      grassDrag: 900,
      driftLateral: 70,
    },
    fog: { near: 3200, far: 9000 },
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
      // The switchbacks cap the width; wider offset edges fold through themselves.
      roadWidth: 240,
      samplesPerSegment: 20,
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
      maxSpeed: 100,
      accel: 54,
      brakeDecel: 92,
      reverseAccel: 42,
      maxReverse: 36,
      coastDrag: 9,
      overspeedDrag: 100,
      turnRate: 3.3,
      lowSpeedTurn: 0.6,
      gripNormal: 5.8,
      gripDrift: 2.6,
      gripGrass: 3.4,
      driftTurnBoost: 1.5,
      grassMaxSpeedFactor: 0.5,
      grassDrag: 110,
      driftLateral: 14,
      // Kept deliberately low so lifting mid-hairpin cannot stall the car at
      // zero speed on the steepest part of the climb.
      gravity: 200,
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
    // Like rebuilt Eastbourne, the final-scale road data is large enough to
    // warrant a data file while the course definition remains here.
    preScaled: true,
    geometry: OTAKI_GEOMETRY,
    layout: OTAKI_LAYOUT,
    physics: {
      maxSpeed: 115,
      accel: 62,
      brakeDecel: 100,
      reverseAccel: 46,
      maxReverse: 38,
      coastDrag: 9,
      overspeedDrag: 110,
      turnRate: 3.4,
      lowSpeedTurn: 0.6,
      gripNormal: 6.0,
      gripGravel: 4.2,
      gripDrift: 2.6,
      gripGrass: 3.2,
      driftTurnBoost: 1.5,
      grassMaxSpeedFactor: 0.5,
      grassDrag: 110,
      driftLateral: 14,
      gravity: 300,
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
    scenery: {
      riverCp: 6,
      railwayCp: 5,
      beach: { ...OTAKI_LAYOUT.zones.beach },
    },
  },
];

// --- Global feel tuning ----------------------------------------------------
// Length scaling applies to legacy course coordinates; rebuilt Eastbourne and
// Ōtaki are authored at final scale and opt out with `preScaled`. Physics
// scaling still applies to every course.
const LENGTH_SCALE = 2;
const SPEED_SCALE = 1.8;
const ACCEL_SCALE = 1.3;
const GRIP_SCALE = 1.4;

const SPEED_FIELDS = [
  'maxSpeed', 'accel', 'brakeDecel', 'reverseAccel', 'maxReverse',
  'coastDrag', 'overspeedDrag', 'grassDrag', 'driftLateral', 'gravity',
];
const GRIP_FIELDS = ['gripNormal', 'gripGravel', 'gripDrift', 'gripGrass'];

function scaleCourse(def) {
  if (def.preScaled) return scalePhysics(def);

  const L = LENGTH_SCALE * (def.lengthScale ?? 1);
  def.world = {
    width: Math.round(def.world.width * L),
    height: Math.round(def.world.height * L),
  };
  const g = def.geometry;
  g.anchors = g.anchors.map((a) => ({ x: a.x * L, y: a.y * L }));

  // Elevation scales with length so the grade remains unchanged.
  if (g.elevation) {
    g.elevation = { ...g.elevation };
    if (g.elevation.profile) {
      g.elevation.profile = g.elevation.profile.map((p) => ({ at: p.at, h: p.h * L }));
    }
    if (g.elevation.river) {
      const r = g.elevation.river;
      g.elevation.river = {
        cp: r.cp,
        halfWidth: r.halfWidth * L,
        halfLength: r.halfLength * L,
        drop: r.drop * L,
      };
    }
    if (g.elevation.sea) {
      g.elevation.sea = g.elevation.sea.map((r) => ({
        x: r.x * L,
        y: r.y * L,
        w: r.w * L,
        h: r.h * L,
        level: r.level * L,
      }));
    }
  }

  // roadWidth intentionally does not scale: it is constrained by local radius.
  if (def.landmarks) def.landmarks = def.landmarks.map(([x, y, t]) => [x * L, y * L, t]);
  if (def.arrows) def.arrows = def.arrows.map((a) => ({ ...a, x: a.x * L, y: a.y * L }));
  if (def.scenery && def.scenery.beach) {
    const b = def.scenery.beach;
    def.scenery.beach = { x: b.x * L, y: b.y * L, w: b.w * L, h: b.h * L };
  }
  return scalePhysics(def);
}

function scalePhysics(def) {
  for (const field of SPEED_FIELDS) {
    if (def.physics[field] != null) def.physics[field] *= SPEED_SCALE;
  }
  def.physics.accel *= ACCEL_SCALE;
  if (def.physics.brakeDecel != null) def.physics.brakeDecel *= ACCEL_SCALE;
  for (const field of GRIP_FIELDS) {
    if (def.physics[field] != null) def.physics[field] *= GRIP_SCALE;
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
