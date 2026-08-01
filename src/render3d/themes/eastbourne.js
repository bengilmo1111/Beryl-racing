// Wellington Harbour, the Days Bay shoreline, and the seawall.
//
// Ported from the 2D drawEastbourneSetting(). The harbour geometry is still
// expressed relative to the (scaled) world, so it stays aligned with the route
// at any LENGTH_SCALE. Original at 491875f:src/scenes/RaceScene.js.
import { Group, Mesh, PlaneGeometry, BoxGeometry } from 'three';
import { WORLD } from '../../config.js';
import { C, basic, lambert } from './../palette.js';

const WATER_COLOR = 0x4fadd0;
const FOAM_COLOR = 0xffe2a6;

export function buildEastbourne(terrain) {
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

  return group;
}
