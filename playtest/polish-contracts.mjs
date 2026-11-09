import assert from 'node:assert/strict';
import { readBestSplits, writeBestSplits, bestComparison } from '../src/personalBest.js';
import { recoveryPoseClear, chooseRecoveryPose, recoverySection, rememberSafeRecovery, missedCheckpoint } from '../src/recovery.js';
import { buildRouteProgress, nearestRoadPose } from '../src/driveRoute.js';
import { ChaseCamera } from '../src/render3d/chaseCamera.js';
import { applyTrack, CAR } from '../src/config.js';
import { TRACKS } from '../src/tracks.js';
import { buildTrack } from '../src/track.js';
import { buildStartApproach } from '../src/render3d/road.js';

const saved = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const values = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: key => values.get(key), setItem: (key, value) => values.set(key, value),
} });
writeBestSplits('a', 30000.9, [10000, 20000, 30000.9]);
assert.deepEqual(readBestSplits('a', 30000, 3), [10000, 20000, 30000.9]);
assert.equal(readBestSplits('a', 29000, 3), null, 'stale splits must not compare against a different best');
assert.equal(readBestSplits('a', 30000, 2), null, 'changed gate count invalidates old splits');
values.set('a.splits', JSON.stringify({ time: 30000, gates: [20000, 10000, 30000] }));
assert.equal(readBestSplits('a', 30000, 3), null);
Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('denied'); } });
assert.equal(readBestSplits('a', 30000, 3), null);
assert.doesNotThrow(() => writeBestSplits('a', 30000, [30000]));
if (saved) Object.defineProperty(globalThis, 'localStorage', saved); else delete globalThis.localStorage;
assert.match(bestComparison(9000, 10000), /1.0s QUICKER/);
assert.match(bestComparison(11000, 10000), /1.0s FROM/);

const line = Array.from({ length: 21 }, (_, i) => ({ x: i * 100, y: 0 }));
const primary = { id: 'primary', centerline: line, half: 200, closed: false };
const track = { ...primary, roads: [primary], checkpoints: [0, 10, 20].map(index => ({ ...line[index], index })) };
const car = { x: 1200, y: 0, rotation: Math.PI / 2, speed: 100, collideRadius: 50, axleOffset: 60 };
const scene = { track, car, expected: 2, routeProgress: buildRouteProgress(track), obstacles: [], barriers: [], captureRadius: 200 };
rememberSafeRecovery(scene, nearestRoadPose(track, 1200, 0), .6);
assert.equal(scene.lastSafe.x, 1200);
rememberSafeRecovery(scene, nearestRoadPose(track, 2100, 0), 1.05);
assert.equal(scene.lastSafe.x, 1200, 'passing an unearned gate must not advance recovery');
scene.traffic = { collisionCircles: () => [{ x: 1200, y: 0, r: 100 }] };
assert.notEqual(chooseRecoveryPose(scene).x, 1200, 'recheck moving cars at the moment of reset');
assert.equal(scene.expected, 2);
assert.equal(missedCheckpoint({...scene,expected:1},.9),true);
assert.equal(missedCheckpoint({...scene,expected:1},.6),false,'stay quiet while still near the gate capture zone');
assert.equal(recoveryPoseClear(scene.lastSafe, car, [], [{ a: { x: 1200, y: -100 }, b: { x: 1200, y: 100 } }]), false);

// The closing segment of a circuit must advance toward 1, rather than stick
// at the final sample or jump to the next lap while choosing a recovery pose.
const loop = { id: 'primary', closed: true, half: 200, centerline: [{x:0,y:0},{x:1000,y:0},{x:1000,y:1000},{x:0,y:1000}] };
const circuit = { ...loop, roads: [loop], checkpoints: [{...loop.centerline[0],index:0},{...loop.centerline[2],index:2}] };
const progress = buildRouteProgress(circuit);
assert.equal(progress.at({road:loop,index:3,t:.5}), .875);
assert.ok(recoverySection({track:circuit,routeProgress:progress,expected:0}, .875));
assert.equal(recoverySection({track:circuit,routeProgress:progress,expected:1}, .875), false);
const earlyLap={track:circuit,routeProgress:progress,expected:1,car:{...car,x:0,y:40},captureRadius:200};
assert.equal(recoverySection(earlyLap,.99),true,'a gate captured before the progress wrap belongs to the new lap');
assert.equal(missedCheckpoint(earlyLap,.99),false);
assert.equal(missedCheckpoint({...earlyLap,expected:0},.1),true,'a missed finish still needs a recovery prompt');
const lapRecovery = chooseRecoveryPose({ track:circuit, routeProgress:progress, expected:0, car,
  captureRadius:200, lastSafe:{x:0,y:0,rotation:0},lastSafeExpected:1 });
assert.ok(Math.hypot(lapRecovery.x,lapRecovery.y) > 200, 'recovery on the closing leg cannot award a lap');

applyTrack(TRACKS.find(d => d.id === 'remutaka'));
const camera = new ChaseCamera(false, track);
const testCar = { x: 1200, y: 150, rotation: 0, speed: 0, lateral: 0 };
camera.update(testCar, 1/60, { heightAt: () => 0 });
assert.equal(camera.recoveryBlend, 1);
assert.equal(camera.anchor.z, 0, 'put the recovery camera over the road rather than the bank');
assert.ok(camera.camera.position.y > 400, 'bank-facing camera should lift above foreground rails');
camera.camera.updateMatrixWorld();
const projected = camera.anchor.clone().set(testCar.x,70,testCar.y).project(camera.camera);
assert.ok(Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1, 'recovery view must retain the car');
const recoveryDirection = camera.recoveryRoadDirection;
testCar.rotation = -0.01;
camera.update(testCar, 1/60, { heightAt: () => 0 });
assert.equal(camera.recoveryRoadDirection, recoveryDirection, 'small corrections at right angles must not reverse the camera');
testCar.rotation = Math.PI / 2; testCar.speed = CAR.maxSpeed * .6; camera.snap();
camera.update(testCar, 1/60, { heightAt: () => 0 });
assert.equal(camera.recoveryBlend, 0, 'normal forward driving keeps its existing rig');
applyTrack(TRACKS[0]);
const approach = buildStartApproach(buildTrack());
assert.ok([...approach.geometry.attributes.position.array].every(Number.isFinite), 'flat roads also need a finite start approach');
console.log('Polish contracts PASS: safe recovery, traffic/barriers, circuit wrap, split validation and recovery camera');
