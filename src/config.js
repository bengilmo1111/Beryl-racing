// Central place for tunable constants. Tweak these to change the feel.

export const DESIGN = {
  // Landscape design resolution; Scale.FIT letterboxes to any screen.
  width: 1280,
  height: 720,
};

export const WORLD = {
  width: 2400,
  height: 1600,
};

// The track is generated as a smooth closed loop around this centre. Each
// vertex sits on an ellipse whose radius is nudged by `radiusMul` to give the
// circuit some character while staying non-self-intersecting (star-convex).
export const TRACK = {
  center: { x: WORLD.width / 2, y: WORLD.height / 2 },
  rx: 900,
  ry: 560,
  radiusMul: [1.0, 0.82, 1.12, 0.86, 1.15, 0.92, 1.04, 0.8, 1.18, 0.9, 1.06, 0.84],
  roadWidth: 210, // full width of the tarmac
  samplesPerSegment: 22, // spline smoothness
  numCheckpoints: 6, // includes the start/finish gate (index 0)
};

export const CAR = {
  maxSpeed: 560, // px/s on tarmac
  accel: 430, // px/s^2 under throttle
  brakeDecel: 780, // px/s^2 when braking against motion
  reverseAccel: 220,
  maxReverse: 170,
  coastDrag: 260, // px/s^2 natural slow-down when coasting
  turnRate: 2.9, // rad/s at full speed
  lowSpeedTurn: 0.38, // fraction of turn available near standstill
  grassMaxSpeedFactor: 0.42, // top speed multiplier off-track
  grassDrag: 620, // extra slow-down off-track
  handbrakeTurnBoost: 1.55,
  handbrakeDrag: 420,
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
