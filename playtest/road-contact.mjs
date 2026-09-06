import assert from 'node:assert/strict';
import { Raycaster, Vector3 } from 'three';
import { TRACKS } from '../src/tracks.js';
import { applyTrack } from '../src/config.js';
import { buildTrack } from '../src/track.js';
import { Terrain } from '../src/terrain.js';
import { buildRoad, findJunctions, buildJunctions } from '../src/render3d/road.js';
import { buildBeryl, updateBeryl } from '../src/render3d/beryl.js';

const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
const world = new Vector3();
let checked = 0;
let oldMismatch = 0;
for (const def of TRACKS) {
  applyTrack(def);
  const track = buildTrack();
  const terrain = new Terrain(track, def.world, def);
  terrain.roadSurface.patches = findJunctions(track.roads);
  const meshes = track.roads.map(buildRoad);
  meshes.push(...buildJunctions(terrain.roadSurface.patches).children);
  meshes.forEach((mesh) => mesh.updateMatrixWorld());
  const rig = buildBeryl();
  rig.root.updateMatrixWorld(true);
  for (const wheel of rig.wheels) {
    const archRay = new Raycaster(new Vector3(200, wheel.position.y, wheel.position.z), new Vector3(-1, 0, 0));
    assert.equal(archRay.intersectObject(rig.chassis, true).length, 0,
      'bodywork must not pass through the wheel hubs');
    archRay.ray.origin.y = wheel.position.y * 2 + 5;
    assert.ok(archRay.intersectObject(rig.chassis, true).length > 0,
      'a visible wing must remain above each wheel opening');
  }
  for (const road of track.roads) {
    for (let i = 1; i < road.centerline.length - 1; i += 29) {
      const p = road.centerline[i];
      const next = road.centerline[i + 1];
      const rotation = Math.atan2(next.x - p.x, -(next.y - p.y));
      for (const offset of [-0.65, 0, 0.65]) {
        const x = p.x + Math.cos(rotation) * road.half * offset;
        const y = p.y + Math.sin(rotation) * road.half * offset;
        ray.ray.origin.set(x, 100000, y);
        const hits = ray.intersectObjects(meshes);
        assert.ok(hits.length, `${def.id}: ray missed the rendered road`);
        const actual = hits[0].point.y;
        assert.ok(Math.abs(terrain.heightAt(x, y) - actual) < 0.02,
          `${def.id}: car support disagrees with the rendered triangles`);
        oldMismatch = Math.max(oldMismatch, Math.abs(terrain.physicsHeightAt(x, y) - actual));
        const car = { x, y, rotation, speed: 0, lateral: 0 };
        const grade = terrain.roadGradeAlong(x, y, Math.sin(rotation), -Math.cos(rotation));
        updateBeryl(rig, car, { steer: 0 }, 1 / 60, terrain.heightAt(x, y), grade,
          (px, py) => terrain.heightAt(px, py));
        rig.root.updateMatrixWorld(true);
        for (const wheel of rig.wheels) {
          wheel.getWorldPosition(world);
          const radius = wheel.position.y;
          assert.ok(world.y - radius >= terrain.heightAt(world.x, world.z) - 0.01,
            `${def.id}: wheel buried beneath the road at sample ${i}`);
        }
        checked++;
      }
    }
  }
  for (const mesh of meshes) { mesh.geometry.dispose(); mesh.material.dispose(); }
}

// Explicitly cover the old Euler-order failure at each compass heading.
const rig = buildBeryl();
for (const rotation of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
  updateBeryl(rig, { x: 0, y: 0, rotation, speed: 0, lateral: 0 }, { steer: 0 }, 1 / 60, 0, 0.2);
  rig.root.updateMatrixWorld(true);
  const nose = new Vector3(0, 0, -100).applyMatrix4(rig.root.matrixWorld);
  assert.ok(nose.y > 19 && nose.y < 20, 'Uphill pitch must lift the nose in every heading');
}
console.log(`road-contact PASS: ${checked} road positions and four headings; old terrain mismatch up to ${oldMismatch.toFixed(1)} units`);
