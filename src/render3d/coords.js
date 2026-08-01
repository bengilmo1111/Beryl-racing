// The one place the 2D→3D mapping is expressed. Everything in render3d/ goes
// through here, so if the world ever looks mirrored there is exactly one file to
// look at.
//
// Game space is the 2D screen convention the simulation uses: x right, y DOWN,
// and a car's forward vector is (sin r, -cos r) — see Car.js `get forward`.
//
// Three space is y-up: X = game x, Y = height above the ground, Z = game y.
//
// Heading. Rotating an object about +Y by θ maps its default forward (-Z) to
// (-sin θ, 0, -cos θ). We need that to equal the game's (sin r, 0, -cos r), so
//     -sin θ = sin r  and  cos θ = cos r   ⟹   θ = -r.
//
// Sanity check that this is a rotation and not a mirror: the car's right in 2D
// is (cos r, sin r), which at r = 0 is +X. With the camera behind the car (the
// car faces -Z, so the camera sits at +Z looking toward -Z), camera-right is
// also +X. Game right is screen right, as it should be.
//
// Footnote: a top-down Three camera would show the world flipped relative to the
// old 2D view. That does not matter for a chase camera, but it would matter if a
// minimap is ever added.

export const GROUND_Y = 0;

// Scale note: 1 game unit = 1 Three unit. Beryl is 108.8 x 217.6 game units, so
// the world is roughly 70 units per metre. Every dimension in render3d/ is in
// those units.
export const UNITS_PER_METRE = 70;

// Write game (x, y) at a given height into an existing THREE.Vector3.
export function toThree(x, y, height, out) {
  return out.set(x, height, y);
}

// The Y rotation that makes a mesh face the same way the car does.
export function yawFor(rotation) {
  return -rotation;
}

// Forward unit vector in the XZ plane for a given game rotation, matching
// Car.js's `forward` getter.
export function forwardXZ(rotation, out) {
  return out.set(Math.sin(rotation), 0, -Math.cos(rotation));
}

// Shortest signed difference between two angles, in (-π, π]. Lerping raw yaw
// without this makes the camera whip the long way round at the wrap point.
export function angleDelta(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

// Frame-rate independent smoothing factor.
//
// `a60` is the per-frame lerp alpha the old 2D camera used at 60fps, so the feel
// carries over directly (Phaser's startFollow used 0.16).
//
// dt === 0 SNAPS, and that is load-bearing: the playtest harness renders with
// game.step(t, 0), so every harness draw has delta 0. Without the snap the first
// screenshot after loadCourse() would catch the camera at its uninitialised pose
// and every CI screenshot would be wrong.
export function alphaFor(a60, dt) {
  if (!(dt > 0)) return 1;
  return 1 - Math.pow(1 - a60, dt * 60);
}
