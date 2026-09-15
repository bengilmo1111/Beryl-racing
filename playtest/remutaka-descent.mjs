import assert from 'node:assert/strict';
import { Raycaster, Vector3 } from 'three';
import { TRACKS } from '../src/tracks.js';
import { applyTrack, FOG } from '../src/config.js';
import { buildTrack } from '../src/track.js';
import { Terrain } from '../src/terrain.js';
import { buildGround, buildRoad } from '../src/render3d/road.js';
import { remutakaDescent, buildRemutakaGround } from '../src/render3d/themes/remutakaDescent.js';
const def = TRACKS.find(t => t.id === 'remutaka');
applyTrack(def);
const track = buildTrack(), terrain = new Terrain(track, def.world, def);
const road = remutakaDescent(track);
for (const key of ['centerline', 'left', 'right', 'heights']) {
  assert.deepEqual(road[key][0], track[key].at(-1), `Continuous ${key} at join`);
}
const end = road.centerline.at(-1), start = road.centerline[0];
assert.ok(Math.hypot(end.x - start.x, end.y - start.y) > FOG.far, 'Road end must disappear beyond fog');
assert.ok(road.heights.at(-1) < road.heights[0] - 1000, 'Road visibly descends');
const ground = buildRemutakaGround(terrain, track), asphalt = buildRoad(road);
ground.updateMatrixWorld(); asphalt.updateMatrixWorld();
const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
let checks = 0;
for (let i = 1; i < road.centerline.length - 1; i += 7) {
  assert.ok(road.heights[i] <= road.heights[i - 1], 'No uphill kink');
  for (const fraction of [0.02, 0.5, 0.98]) {
    const a = road.left[i], b = road.right[i];
    ray.ray.origin.set(a.x + (b.x-a.x)*fraction, 100000, a.y + (b.y-a.y)*fraction);
    const hit = ray.intersectObject(asphalt)[0];
    assert.ok(hit, 'Continuous rendered tarmac');
    const below = ray.intersectObject(ground)[0];
    assert.ok(!below || below.point.y < hit.point.y, `Terrain must not cover descent at ${i}`);
    checks++;
  }
}
console.log(`Remutaka descent PASS: seamless join, downhill continuation, hidden endpoint, ${checks} terrain-clearance rays`);
