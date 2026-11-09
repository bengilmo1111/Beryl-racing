import { buildOtaki } from '../src/render3d/themes/otaki.js';
import assert from 'node:assert/strict';
import { Box3, Matrix4, Raycaster, Vector3 } from 'three';
import { buildProps } from '../src/render3d/props.js';
import { buildStartApproach, buildGround } from '../src/render3d/road.js';
import { nearestRoadPose } from '../src/driveRoute.js';
import { buildStructures } from '../src/structures.js';
import { otakiBridgeBarriers } from '../src/otakiBridge.js';
import { inWaterRegion } from '../src/waterRegions.js';
import { metres } from '../src/scale.js';
import { TRACKS } from '../src/tracks.js';
import { applyTrack, WORLD } from '../src/config.js';
import { buildTrack } from '../src/track.js';
import { Terrain } from '../src/terrain.js';
import { otakiFinish, crossesOtakiFinish } from '../src/otakiFinish.js';
import { fenceBarriers } from '../src/fenceBarriers.js';
import { bounceOffBarriers } from '../src/remutakaBarriers.js';
import { ChaseCamera } from '../src/render3d/chaseCamera.js';
const def = TRACKS.find(d => d.id === 'otaki');
applyTrack(def);
const track = buildTrack(), terrain = new Terrain(track, WORLD, def);
const finish = otakiFinish(track), tx = Math.cos(finish.angle), ty = Math.sin(finish.angle);
const point = (along, across = 0) => ({ x: finish.x + tx * along - ty * across, y: finish.y + ty * along + tx * across });
assert.ok(crossesOtakiFinish(track, point(-300), point(300)), 'Fast movement across paint must finish');
assert.ok(!crossesOtakiFinish(track, point(-300, track.half + 30), point(300, track.half + 30)), 'Grass beside finish must not finish');
assert.ok(!crossesOtakiFinish(track, point(-500), point(-100)), 'Approaching finish must not finish early');
for (const yaw of [0, 0.7, 2]) {
 const barriers = fenceBarriers([{ kind: 'fence', x: 0, y: 0, length: 1400, yaw }]);
 const n = { x: -Math.sin(yaw), y: Math.cos(yaw) };
 const car = { x: -n.x * 120, y: -n.y * 120, vx: -n.x * 500, vy: -n.y * 500, collideRadius: 40, axleOffset: 60, forward: { x: Math.cos(yaw), y: Math.sin(yaw) } };
 assert.ok(bounceOffBarriers(car, barriers, { x: n.x * 120, y: n.y * 120 }));
 assert.ok(car.x * n.x + car.y * n.y >= 46 - 1e-6, 'Fast sweep must remain on approach side of fence');
}
const chase = new ChaseCamera(false, track);
const cp = track.centerline[100];
const car = { x: cp.x, y: cp.y, rotation: 0, lateral: 0, speed: 0 };
chase.update(car, 1/60, terrain);
const pitch = chase.lookPitch;
chase.update(car, 1/60, { heightAt: (x,y) => x === car.x && y === car.y ? 0 : 100000 });
assert.ok(Math.abs(chase.lookPitch - pitch) < 10, 'Look pitch must not swoop onto an off-road bank');
console.log('Otaki fixes PASS: finite finish, swept fence collisions, bounded camera pitch');

const station = buildStructures(def, track).find(s => s.kind === 'station');
assert.ok(station, 'Station must have a shared solid footprint');
const stationRoad = nearestRoadPose(track, station.x, station.z);
assert.ok(stationRoad.distance > stationRoad.road.half + Math.hypot(station.w, station.d) / 2,
  'Station footprint must be clear of every road');
const river = track.sea.find(s => s.angle != null);
assert.ok(inWaterRegion(track.sea, river.cx, river.cy));
const branch = track.roads.find(r => r.id === 'rahui-mill-tasman');
for (const { a, b } of otakiBridgeBarriers(track, def)) {
  for (const p of [a, b]) {
    const pose = nearestRoadPose({ roads: [branch] }, p.x, p.y);
    assert.ok(pose.distance > branch.half + 100, 'Bridge parapets must leave the town route open');
  }
}
// Deliberately lay a belt across the river and road: only dry, road-clear
// individual crowns may survive, regardless of its midpoint's placement.
const props = buildProps([{ kind: 'shelterBelt', x: river.cx, y: river.cy,
  yaw: river.angle, length: 14000 }], terrain, track);
const trunks = props.getObjectByName('shelter-belt-trunks');
const matrix = new Matrix4();
assert.ok(trunks.count > 0, 'Regression needs surviving dry trees as well');
for (let i = 0; i < trunks.count; i++) {
  trunks.getMatrixAt(i, matrix);
  const x = matrix.elements[12], y = matrix.elements[14];
  assert.ok(!inWaterRegion(track.sea, x, y, metres(3)), 'Belt trees must not stand in water');
  const pose = nearestRoadPose(track, x, y);
  assert.ok(pose.distance >= pose.road.half + metres(4), 'Belt crowns must not cross the road');
}
const ground = buildGround(terrain, def.theme);
ground.updateMatrixWorld(true);
const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
let checked = 0;
for (let i = 0; i < 36; i++) {
  const angle = i * Math.PI / 18;
  const x = river.cx + Math.cos(angle) * 2600, y = river.cy + Math.sin(angle) * 2600;
  if (terrain.roadSurface.heightAt(x, y) !== null || inWaterRegion(track.sea, x, y)) continue;
  ray.ray.origin.set(x, 100000, y);
  const hit = ray.intersectObject(ground)[0];
  assert.ok(hit);
  assert.ok(Math.abs(terrain.heightAt(x, y) - (hit.point.y + 8)) < 0.02,
    'Beryl must sit above the actual riverbank triangles');
  checked++;
}
assert.ok(checked > 10);
console.log(`Otaki scenery PASS: road-clear station and bridge, dry belt trees, ${checked} grounded riverbank poses`);

const coastArt = buildOtaki(track, def, terrain, buildStructures(def, track));
coastArt.updateMatrixWorld(true);
const ocean = new Box3().setFromObject(coastArt.getObjectByName('otaki-coastal-water'));
const sand = new Box3().setFromObject(coastArt.getObjectByName('otaki-beach-sand'));
assert.ok(Math.abs(ocean.max.x - sand.min.x) < .01, 'Beach must meet the ocean without sand covering the water');
let foamVertices = 0;
coastArt.getObjectByName('otaki-surf-lines').traverse(object => {
  const positions = object.geometry?.attributes.position;
  if (!positions) return;
  for (let i = 0; i < positions.count; i++) {
    assert.ok(positions.getX(i) < ocean.max.x, 'Surf must be on the water side of the shoreline');
    foamVertices++;
  }
});
assert.ok(foamVertices > 100);
console.log(`Otaki coast PASS: continuous shoreline and ${foamVertices} water-side surf vertices`);

const approach = buildStartApproach(track);
approach.updateMatrixWorld(true);
const start = track.start;
const rearX = start.x - Math.sin(start.rotation) * 140;
const rearY = start.y + Math.cos(start.rotation) * 140;
const startRay = new Raycaster(new Vector3(rearX, 100000, rearY), new Vector3(0, -1, 0));
assert.ok(startRay.intersectObject(approach).length, 'Starting car rear must have visible road beneath it');
console.log('Otaki start PASS: road extends beneath the full starting car');

assert.equal(track.roads.length, 4, 'Town uses two substantial routes and two cross-town connections');
assert.ok(track.roads.every(road => road.half === track.half), 'All town streets have the main road width');
assert.ok(Math.cos(finish.angle) < -.9, 'Beach arrival must face out to sea');
assert.ok(finish.x - def.layout.coastX < 2200, 'Finish must be on the beachfront, not the inland coast road');
for (const across of [-600, 0, 600])
  assert.notEqual(terrain.roadSurface.heightAt(track.centerline.at(-1).x - 250, track.centerline.at(-1).y + across), null,
    'The whole beachfront stopping area must be drivable');
console.log('Otaki arrival PASS: sea-facing beachfront finish, shared parking surface, full-width connected streets');
