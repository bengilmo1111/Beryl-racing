// Central place for tunable constants. Tweak these to change the feel.

export const DESIGN = {
  // Landscape design resolution; Scale.FIT letterboxes to any screen.
  width: 1280,
  height: 720,
};

export const WORLD = {
  width: 2400,
  height: 5000,
};

// Eastbourne Pootle's compressed north-to-south route. The harbour stays on
// the player's left until the village, before the road turns inland to the RSA.
export const TRACK = {
  anchors: [
    { x: 800, y: 400 },
    { x: 650, y: 700 },
    { x: 740, y: 1100 },
    { x: 610, y: 1580 },
    { x: 740, y: 2100 },
    { x: 580, y: 2660 },
    { x: 720, y: 3200 },
    { x: 640, y: 3700 },
    { x: 850, y: 4050 },
    { x: 1250, y: 4200 },
    { x: 1450, y: 4470 },
    { x: 1280, y: 4740 },
  ],
  roadWidth: 180,
  samplesPerSegment: 20, // spline smoothness
  numCheckpoints: 10,
};

// Arcade handling: fast, punchy, and slidey. Beryl carries a real velocity
// vector so she can drift — grip on the sideways component is high normally and
// drops sharply on the handbrake (see entities/Car.js).
export const CAR = {
  maxSpeed: 60, // px/s; tuned for an approximately two-minute clean run
  accel: 72,
  brakeDecel: 150,
  reverseAccel: 42,
  maxReverse: 30,
  coastDrag: 12,
  overspeedDrag: 90,
  turnRate: 3.3, // rad/s at speed
  lowSpeedTurn: 0.5, // fraction of turn available near standstill
  gripNormal: 9.0, // sideways grip on tarmac (high = sticky)
  gripDrift: 2.4, // sideways grip while handbraking (low = slides)
  gripGrass: 4.0, // sideways grip off-track (loose)
  driftTurnBoost: 1.5, // extra steering authority mid-drift
  grassMaxSpeedFactor: 0.5, // top speed multiplier off-track
  grassDrag: 100, // extra slow-down off-track
  driftLateral: 14, // |sideways speed| above this counts as a drift (fx/skids)
};

export const STORAGE_KEY = 'beryl-racing.eastbourne-pootle.bestTimeMs.v1';

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
