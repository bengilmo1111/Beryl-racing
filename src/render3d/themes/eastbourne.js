// Wellington Harbour, the Days Bay shoreline, the seawall, and Eastbourne's
// roadside weatherboard houses.
//
// The harbour is ported from the 2D drawEastbourneSetting(). Its geometry is
// still expressed relative to the (scaled) world, so it stays aligned with the
// route at any LENGTH_SCALE. Original at 491875f:src/scenes/RaceScene.js.
//
// The houses have no 2D ancestor. They are deliberately low-poly architectural
// caricatures: compact villas, seaside bungalows and cottages whose identity
// comes from form and colour rather than texture detail.
import { Group, Mesh, PlaneGeometry, BoxGeometry } from 'three';
import { WORLD } from '../../config.js';
import { C, basic, lambert } from './../palette.js';
import { buildEastbourneParallax } from './eastbourneParallax.js';
import { buildEastbourneVilla } from '../houses.js';
import { buildEastbourneLandmarks } from '../landmarks/eastbourneLandmarks.js';

const WATER_COLOR = 0x4fadd0;
const FOAM_COLOR = 0xffe2a6;

// Houses are scenery only — no collision. They sit off the road shoulder, so
// what keeps you on the tarmac is still the grass penalty and the seawall.
function placeHouse(group, terrain, spec, sx, sz) {
  const house = buildEastbourneVilla(spec);
  const x = spec.x * sx;
  const z = spec.z * sz;
  house.position.set(x, terrain.heightAt(x, z) + 1, z);
  house.rotation.y = spec.yaw;
  group.add(house);
}

export function buildEastbourne(track, def, terrain) {
  const group = new Group();
  const W = WORLD.width;
  const H = WORLD.height;
  const hw = W * 0.167; // harbour width (was 400 in a 2400-wide world)
  const hEnd = H * 0.8; // harbour runs down to the inland turn
  const wall = hw + W * 0.008;
  const sea = terrain.seaLevel || 0;

  // Water. Extends well past the world edge so the harbour reads as open sea
  // rather than a rectangular pond sitting next to the road.
  const water = new Mesh(
    new PlaneGeometry(hw + W * 0.6, hEnd + H * 0.5),
    basic(WATER_COLOR, { fog: true })
  );
  water.geometry.rotateX(-Math.PI / 2);
  water.position.set(hw / 2 - W * 0.3, sea + 2, hEnd / 2 - H * 0.05);
  group.add(water);

  // Foam line along the shore, where the 2D version drew a thick cream stroke.
  const foam = new Mesh(new PlaneGeometry(18, hEnd), basic(FOAM_COLOR, { fog: true }));
  foam.geometry.rotateX(-Math.PI / 2);
  foam.position.set(hw, sea + 3, hEnd / 2);
  group.add(foam);

  // The seawall. In 2D this was invisible — a row of collision circles you
  // bumped into for no apparent reason. In 3D it finally reads as the thing that
  // makes the harbour visible but unreachable.
  //
  // Deliberately built from the same numbers RaceScene.placeSeawall() uses for
  // its obstacles, so what you see and what you hit are the same wall. That
  // obstacle loop is simulation and is not touched here.
  const wallStart = H * 0.09;
  const wallLength = hEnd - wallStart;
  const seawall = new Mesh(new BoxGeometry(46, 78, wallLength), lambert(C.cream));
  seawall.position.set(wall, sea + 39, wallStart + wallLength / 2);
  group.add(seawall);

  // Route-defining Eastbourne landmarks as real low-poly geometry: Days Bay
  // Wharf, Williams Park, Rona Bay, the village shop strip and the RSA finish.
  // Seated on the authored `def.landmarks` points — the same list the roadside
  // signs come from — and on terrain height, so they stay put through any
  // re-authoring of the route or change of scale.
  group.add(buildEastbourneLandmarks(track, def, terrain, { shoreX: hw, seaLevel: sea }));

  // Four depth bands beyond the playable route provide the Eastbourne view:
  // harbour hills, nearer headlands, village roofs, and inland bush. Because
  // they are real 3D silhouettes the chase camera produces gentle parallax
  // without per-frame background code or large textures.
  group.add(buildEastbourneParallax(sea));

  // Eastbourne's real housing stock is varied, but at road speed it resolves to
  // a few strong recurring cues: painted weatherboards, dark or red corrugated
  // roofs, sash windows, small verandahs, front gables and the occasional taller
  // villa tucked against the bush. Positions are authored in the unscaled
  // 2400×5000 course space and mapped into the live scaled world, the same way
  // the harbour numbers above are.
  const sx = W / 2400;
  const sz = H / 5000;
  const houses = [
    {
      x: 1110, z: 870, yaw: Math.PI / 2 - 0.12, variant: 'cottage',
      palette: { wall: 0xf0eee5, trim: 0xfaf7ea, roof: 0x6f7b73, door: 0x668168 },
    },
    {
      x: 1090, z: 1320, yaw: Math.PI / 2 + 0.08, variant: 'bungalow',
      palette: { wall: 0xe5edf0, trim: 0xffffff, roof: 0x394951, door: 0x3d6f84 },
    },
    {
      x: 1060, z: 1900, yaw: Math.PI / 2 - 0.04, variant: 'villa',
      palette: { wall: 0xf3dfaa, trim: 0xfff8e5, roof: 0x9a4a3d, door: 0x7a3534 },
    },
    {
      x: 1110, z: 2500, yaw: Math.PI / 2 + 0.1, variant: 'cottage',
      palette: { wall: 0xd7dfc6, trim: 0xf6f0df, roof: 0x5f6d69, door: 0x8d5a48 },
    },
    {
      x: 1070, z: 3160, yaw: Math.PI / 2 - 0.08, variant: 'bungalow',
      palette: { wall: 0xe9c8c0, trim: 0xfff3e8, roof: 0x59646d, door: 0x7c5053 },
    },
    {
      x: 1110, z: 3660, yaw: Math.PI / 2 + 0.04, variant: 'villa',
      palette: { wall: 0xc8dbe2, trim: 0xf7f1df, roof: 0x6f3f38, door: 0x345d68 },
    },
    {
      x: 1390, z: 3910, yaw: Math.PI / 2 - 0.35, variant: 'two-storey',
      palette: { wall: 0xeadfca, trim: 0xfff7e8, roof: 0x41484d, door: 0x7c3432 },
    },
    {
      x: 1730, z: 4320, yaw: Math.PI / 2 - 0.55, variant: 'cottage',
      palette: { wall: 0xe9eee8, trim: 0xffffff, roof: 0x788274, door: 0x52756c },
    },
  ];
  for (const house of houses) placeHouse(group, terrain, house, sx, sz);

  return group;
}
