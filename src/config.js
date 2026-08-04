// Central place for shared constants and the *live* course configuration.
//
// The game now ships more than one course (see tracks.js). WORLD, TRACK, CAR and
// STORAGE_KEY are no longer fixed: they describe whichever course is currently
// selected. `applyTrack()` repopulates them in place, so modules that imported
// these objects/bindings (Car.js, track.js, RaceScene, TitleScene) always read
// the active course without needing to know which one it is.

import { atLeast, worldDiagonal } from './scale.js';

export const DESIGN = {
  // Landscape design resolution; the Scale Manager fits this to any screen.
  width: 1280,
  height: 720,
};

// --- Live course configuration --------------------------------------------
// These start as harmless neutral defaults and are overwritten by applyTrack()
// the moment tracks.js loads (which happens before any scene is created).

export const WORLD = {
  width: 2400,
  height: 5000,
};

export const TRACK = {
  anchors: [
    { x: 800, y: 400 },
    { x: 1280, y: 4740 },
  ],
  roadWidth: 360,
  samplesPerSegment: 20,
  numCheckpoints: 2,
  closed: false,
};

export const CAR = {
  maxSpeed: 60,
  accel: 72,
  brakeDecel: 150,
  reverseAccel: 42,
  maxReverse: 30,
  coastDrag: 12,
  overspeedDrag: 90,
  turnRate: 3.3,
  lowSpeedTurn: 0.5,
  gripNormal: 9.0,
  gripDrift: 2.4,
  gripGrass: 4.0,
  driftTurnBoost: 1.5,
  grassMaxSpeedFactor: 0.5,
  grassDrag: 100,
  driftLateral: 14,
};

// Best-time storage key for the active course. It's a `let` (not `const`) so
// applyTrack() can point it at the selected course's key; ES-module live
// bindings mean importers see the update automatically.
export let STORAGE_KEY = 'beryl-racing-3d.eastbourne-dash.bestTimeMs.v1';

// Copy a course definition (see tracks.js) into the live config objects. TRACK
// is fully replaced (old geometry keys cleared first) so no stale field from a
// previously selected course can leak through.
export function applyTrack(def) {
  Object.assign(WORLD, def.world);
  Object.assign(CAR, def.physics);
  for (const k of Object.keys(TRACK)) delete TRACK[k];
  Object.assign(TRACK, def.geometry);
  Object.assign(FOG, fogFor(def.world), def.fog || {});
  STORAGE_KEY = def.storageKey;
}

// How far you can see, per course.
//
// Deliberately distant. Fog does not cull anything in Three — every mesh is
// submitted to the GPU either way — so a tight band buys no performance at all;
// it only decides how much of the world the player is allowed to see. At ~59
// units/metre the old 1200–3000 band was about 20–50 m of visibility, which on a
// summer afternoon read as sea fog rolling in.
//
// What is left is heat haze: it starts far enough out that the whole course is
// legible, and fades to COLORS.haze rather than to the sky, so the horizon goes
// milky while the sky above stays clean blue.
//
// Per-course because "how far should the player see" is a property of the place.
// See the note on Manfeild's `fog` in tracks.js.
// Scaled from the world so "how far can you see" stays the same *fraction* of a
// course however long the course gets. The floors are the hand-tuned numbers
// they replace, and every current world is small enough to sit on them, so
// nothing changes today.
const FOG_NEAR_SPANS = 0.3;
const FOG_FAR_SPANS = 0.9;
const DEFAULT_FOG = { near: 5000, far: 15000 };
export const FOG = { ...DEFAULT_FOG };

function fogFor(world) {
  const span = worldDiagonal(world);
  return {
    near: atLeast(DEFAULT_FOG.near, span * FOG_NEAR_SPANS),
    far: atLeast(DEFAULT_FOG.far, span * FOG_FAR_SPANS),
  };
}

// Gilmore Games house palette (see gilmore-directory/docs/ART-DIRECTION.md).
export const COLORS = {
  ink: 0x15314b,
  sky: 0x6ec5e9,
  hill: 0x67b85a,
  deepHill: 0x246b45,
  cream: 0xfff8e7,
  paper: 0xfffdf6,
  sunshine: 0xffd166,
  red: 0xe84a5f,
  purple: 0x8e5ccb,
  orange: 0xf28c45,
  // Beryl herself
  berylBody: 0x2ec4d6,
  berylBodyDark: 0x1a7f8c,
  berylRoof: 0x63d6e4,
  glass: 0x22333b,
  chrome: 0xd8dee2,
  tarmac: 0x53585f,
  tarmacEdge: 0x3c4046,
  // Ōtaki Rally surfaces & scenery
  gravel: 0x9a8b74, // warm grey-brown dusty gravel road
  sand: 0xe6d6a8, // dry beach sand
  river: 0x5a8f8c, // blue-green river / calm water
  // Summer heat haze. Distance fades to this rather than to the sky, which is
  // what makes it read as hot air rather than as weather: the sky above stays a
  // clean blue while the horizon goes milky and slightly warm. Roughly the sky
  // lifted 70% toward the warm white the sun light uses.
  haze: 0xd4e7e9,
};
