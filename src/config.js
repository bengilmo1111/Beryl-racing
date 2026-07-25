// Central place for shared constants and the *live* course configuration.
//
// The game now ships more than one course (see tracks.js). WORLD, TRACK, CAR and
// STORAGE_KEY are no longer fixed: they describe whichever course is currently
// selected. `applyTrack()` repopulates them in place, so modules that imported
// these objects/bindings (Car.js, track.js, RaceScene, TitleScene) always read
// the active course without needing to know which one it is.

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
  roadWidth: 180,
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
export let STORAGE_KEY = 'beryl-racing.eastbourne-pootle.bestTimeMs.v1';

// Copy a course definition (see tracks.js) into the live config objects. TRACK
// is fully replaced (old geometry keys cleared first) so no stale field from a
// previously selected course can leak through.
export function applyTrack(def) {
  Object.assign(WORLD, def.world);
  Object.assign(CAR, def.physics);
  for (const k of Object.keys(TRACK)) delete TRACK[k];
  Object.assign(TRACK, def.geometry);
  STORAGE_KEY = def.storageKey;
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
};
