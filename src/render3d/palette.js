// The Gilmore house palette (src/config.js COLORS) as Three colours, plus the
// atmosphere constants the world is built against.
//
// Materials here are Lambert or Basic only — deliberately not MeshStandard,
// which needs an environment map to look like anything, costs more, and pulls
// PMREM generation into the bundle. Flat poster colours are also what
// docs/ART-DIRECTION.md asks for.
import { Color, Fog, MeshLambertMaterial, MeshBasicMaterial } from 'three';
import { COLORS, FOG } from '../config.js';
import { atLeast, worldDiagonal } from '../scale.js';

export const C = {
  sky: new Color(COLORS.sky),
  hill: new Color(COLORS.hill),
  deepHill: new Color(COLORS.deepHill),
  tarmac: new Color(COLORS.tarmac),
  gravel: new Color(COLORS.gravel),
  cream: new Color(COLORS.cream),
  red: new Color(COLORS.red),
  white: new Color(0xffffff),
  ink: new Color(COLORS.ink),
  sunshine: new Color(COLORS.sunshine),
  river: new Color(COLORS.river),
  sand: new Color(COLORS.sand),
  berylBody: new Color(COLORS.berylBody),
  berylRoof: new Color(COLORS.berylRoof),
  haze: new Color(COLORS.haze),
  glass: new Color(COLORS.glass),
  chrome: new Color(COLORS.chrome),
};

// Fog distances are per course now — see FOG in config.js and the `fog` blocks
// in tracks.js. The engine-wide constants that used to live here were tuned for
// the point-to-point courses, where fog hiding the far end of the route is a
// feature; on the circuit the same band erased the pit complex and the opposite
// straight, which are exactly what a race track wants you to be able to see.
// Depth precision scales with 1/near, so a needlessly close near plane throws
// resolution away. This is a chase camera: nothing ever renders between it and
// Beryl, who sits ~430 units ahead, and the ground below it is ~235 away. 50 is
// comfortably clear of both and buys 5x the depth resolution over a reflexive
// near = 10 — useful headroom, given how many near-coplanar flat surfaces the
// road stack has (ground, apron, road, skid decals, start line).
export const CAMERA_NEAR = 50;
// Far has to clear the whole course, not just the fogged world.
//
// Fog hides everything past its own far distance, so 3600 was ample for terrain
// and road. It is not enough for the unfogged background bands
// (themes/*Parallax), which sit at fixed world points beyond the world edge: a
// cloud simply vanished at the far plane instead of fading, and popped back as
// the camera closed on it.
//
// 24000 clears the largest world with room for bands placed outside it.
// Manfeild is the one that forced this: its world diagonal alone is 16,511, so
// the old 14000 would have clipped the ranges and Taranaki. Otaki's 14,708
// diagonal was already fractionally over.
//
// This is close to free. Depth precision is dominated by the *near* plane — with
// near at 50, moving far from 3600 to 24000 changes the resolution by well under
// a percent — and nothing extra is really shaded, since anything past the fog
// band resolves to sky colour anyway.
// Scaled from the world rather than pinned, so a longer course does not clip its
// own background bands. The floor is the 24,000 this replaces — chosen for
// Manfeild's 16,511-unit diagonal — so no current course sees a change.
const CAMERA_FAR_FLOOR = 24000;
const CAMERA_FAR_SPANS = 1.5;
export function cameraFarFor(world) {
  return atLeast(CAMERA_FAR_FLOOR, worldDiagonal(world) * CAMERA_FAR_SPANS);
}

export function makeFog() {
  return new Fog(C.haze.getHex(), FOG.near, FOG.far);
}

export function lambert(color, opts = {}) {
  return new MeshLambertMaterial({ color, ...opts });
}

export function basic(color, opts = {}) {
  return new MeshBasicMaterial({ color, ...opts });
}
