// Central place for tunable constants. Tweak these to change the feel.

export const DESIGN = {
  // Landscape design resolution; Scale.FIT letterboxes to any screen.
  width: 1280,
  height: 720,
};

export const WORLD = {
  width: 3000,
  height: 2000,
};

// The circuit is a hand-authored closed loop: a long bottom straight, sweeping
// right-handers, a top ess, and a left sweeper back to the line. Points are
// smoothed with a periodic Catmull-Rom spline in track.js.
export const TRACK = {
  anchors: [
    { x: 760, y: 1560 },
    { x: 1700, y: 1660 },
    { x: 2400, y: 1520 },
    { x: 2720, y: 1170 },
    { x: 2520, y: 820 },
    { x: 2660, y: 470 },
    { x: 2080, y: 400 },
    { x: 1680, y: 560 },
    { x: 1250, y: 380 },
    { x: 760, y: 440 },
    { x: 400, y: 820 },
    { x: 470, y: 1240 },
    { x: 560, y: 1480 },
  ],
  roadWidth: 300, // full width of the tarmac — wide, for drifting room
  samplesPerSegment: 20, // spline smoothness
  numCheckpoints: 6, // includes the start/finish gate (index 0)
};

// Arcade handling: fast, punchy, and slidey. Beryl carries a real velocity
// vector so she can drift — grip on the sideways component is high normally and
// drops sharply on the handbrake (see entities/Car.js).
export const CAR = {
  maxSpeed: 940, // px/s on tarmac
  accel: 900, // px/s^2 under throttle — snappy launch
  brakeDecel: 1600, // px/s^2 braking against motion
  reverseAccel: 340,
  maxReverse: 240,
  coastDrag: 150, // gentle slow-down when coasting (keeps momentum)
  overspeedDrag: 700, // pulls back toward the surface's max speed
  turnRate: 3.3, // rad/s at speed
  lowSpeedTurn: 0.5, // fraction of turn available near standstill
  gripNormal: 9.0, // sideways grip on tarmac (high = sticky)
  gripDrift: 2.4, // sideways grip while handbraking (low = slides)
  gripGrass: 4.0, // sideways grip off-track (loose)
  driftTurnBoost: 1.5, // extra steering authority mid-drift
  grassMaxSpeedFactor: 0.5, // top speed multiplier off-track
  grassDrag: 900, // extra slow-down off-track
  driftLateral: 70, // |sideways speed| above this counts as a drift (fx/skids)
};

export const STORAGE_KEY = 'beryl-racing.bestLapMs.v1';

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
