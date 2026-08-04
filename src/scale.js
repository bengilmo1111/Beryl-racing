// How big the world is, stated once.
//
// Beryl's mesh is the ruler. She is 217.6 units long (src/render3d/beryl.js) and
// a Morris Minor 1000 is 3759 mm, so the world runs at 57.9 units per metre.
// Everything that has a real-world size — how fast she goes, how far you can
// see, how coarse the terrain grid is — should be derived from this rather than
// guessed in world units at the point of use.
//
// This exists because guessing did not work. `render3d/coords.js` claimed 70,
// prose in three other files claimed 59, and per-course top speeds were authored
// directly in units per second: 88 on Eastbourne and 940 on Manfeild. Those look
// equally plausible on the page, and they are 10 km/h and 104 km/h. A number
// written in km/h cannot be wrong by a factor of ten without somebody noticing.
export const UNITS_PER_METRE = 57.9;

export function kmhToUnits(kmh) {
  return (kmh / 3.6) * UNITS_PER_METRE;
}

export function unitsToKmh(unitsPerSecond) {
  return (unitsPerSecond / UNITS_PER_METRE) * 3.6;
}

export function metres(m) {
  return m * UNITS_PER_METRE;
}

// A distance that should grow with the course rather than stay put.
//
// The floor is what today's hand-tuned constant already was, so adopting this
// changes nothing at the present course sizes and scales correctly once a route
// gets longer. That is deliberate: a constant that silently changes behaviour
// the day it is introduced cannot be told apart from a regression.
export function atLeast(floor, derived) {
  return derived > floor ? derived : floor;
}

// The span a course occupies, which is what view distances scale against.
export function worldDiagonal(world) {
  return Math.hypot(world.width, world.height);
}
