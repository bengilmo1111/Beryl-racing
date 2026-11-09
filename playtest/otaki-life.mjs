import assert from 'node:assert/strict';
import { TRACKS } from '../src/tracks.js';
import { applyTrack } from '../src/config.js';
import { buildTrack } from '../src/track.js';
import { buildStructures } from '../src/structures.js';
import { buildOtakiCattle } from '../src/otakiCattle.js';
import { buildTraffic } from '../src/traffic.js';
import { nearestRoadPose } from '../src/driveRoute.js';
import { inWaterRegion } from '../src/waterRegions.js';
const def = TRACKS.find(d => d.id === 'otaki'); applyTrack(def);
const track = buildTrack(), structures = buildStructures(def, track);
const cattle = buildOtakiCattle(track, structures);
assert.equal(cattle.cows.filter(c => c.road).length, 3);
assert.ok(cattle.cows.filter(c => !c.road).length >= 16);
assert.equal(cattle.obstacles.length, cattle.cows.length * 3);
assert.deepEqual(cattle, buildOtakiCattle(track, structures), 'Cattle layout must be repeatable');
for (const cow of cattle.cows) {
  assert.ok(!inWaterRegion(track.sea, cow.x, cow.y, 150));
  const pose = nearestRoadPose(track,cow.x,cow.y);
  if (cow.road) {
    assert.ok(pose.distance < track.half - 40);
    assert.ok(Math.hypot(cow.x-track.start.x,cow.y-track.start.y) > 1000);
  } else assert.ok(pose.distance > pose.road.half + 290);
}
const traffic = buildTraffic(def,track);
assert.equal(traffic.cars.length,4);
assert.ok(traffic.cars.some(c=>c.direction===1) && traffic.cars.some(c=>c.direction===-1));
for(let i=0;i<2400;i++) {
  traffic.update(1/30);
  for (const car of traffic.cars) {
    const pose = nearestRoadPose(track,car.x,car.y);
    assert.ok(pose.distance < track.half - 50);
    assert.ok(Math.hypot(car.x-track.checkpoints.at(-1).x,car.y-track.checkpoints.at(-1).y)>1000);
    assert.ok(cattle.cows.filter(c=>c.road).every(c=>Math.hypot(c.x-car.x,c.y-car.y)>1000));
  }
}
console.log(`Otaki life PASS: ${cattle.cows.length} solid cows (3 on-road), four moving Minors, clear finish and separate traffic band`);
