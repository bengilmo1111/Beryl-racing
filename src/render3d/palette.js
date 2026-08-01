// The Gilmore house palette (src/config.js COLORS) as Three colours, plus the
// atmosphere constants the world is built against.
//
// Materials here are Lambert or Basic only — deliberately not MeshStandard,
// which needs an environment map to look like anything, costs more, and pulls
// PMREM generation into the bundle. Flat poster colours are also what
// docs/ART-DIRECTION.md asks for.
import { Color, Fog, MeshLambertMaterial, MeshBasicMaterial } from 'three';
import { COLORS } from '../config.js';

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
  glass: new Color(COLORS.glass),
  chrome: new Color(COLORS.chrome),
};

// Fog doubles as draw-distance management: the long point-to-point courses fade
// into the sky instead of needing any culling scheme.
export const FOG_NEAR = 1200;
export const FOG_FAR = 3000;
// Depth precision scales with 1/near, so a needlessly close near plane throws
// resolution away. This is a chase camera: nothing ever renders between it and
// Beryl, who sits ~430 units ahead, and the ground below it is ~235 away. 50 is
// comfortably clear of both and buys 5x the depth resolution over a reflexive
// near = 10 — useful headroom, given how many near-coplanar flat surfaces the
// road stack has (ground, apron, road, skid decals, start line).
export const CAMERA_NEAR = 50;
// Far has to clear the whole course, not just the fogged world.
//
// Fog hides everything past FOG_FAR anyway, so 3600 was ample for terrain and
// road. It is not enough for the unfogged background bands (themes/*Parallax),
// which sit at fixed world points along a 10,000-unit route: a cloud simply
// vanished at the far plane instead of fading, and popped back as the camera
// closed on it.
//
// This is close to free. Depth precision is dominated by the *near* plane —
// with near at 50, moving far from 3600 to 14000 changes the resolution by well
// under a percent — and nothing extra is actually shaded, since the geometry
// beyond the fog band resolves to sky colour.
export const CAMERA_FAR = 14000;

export function makeFog() {
  return new Fog(C.sky.getHex(), FOG_NEAR, FOG_FAR);
}

export function lambert(color, opts = {}) {
  return new MeshLambertMaterial({ color, ...opts });
}

export function basic(color, opts = {}) {
  return new MeshBasicMaterial({ color, ...opts });
}
