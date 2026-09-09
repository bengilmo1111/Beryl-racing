import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Exercise real scene methods in Node. Only Phaser's rendering shell is
// replaced; use its actual pure math helpers for scene/scenery calculations.
const bundle = await build({
  stdin: { contents: `
    export { RaceScene } from './src/scenes/RaceScene.js';
    export { Car } from './src/entities/Car.js';
    export { TRACKS } from './src/tracks.js';
    export { CAR, applyTrack } from './src/config.js';
    export { buildTrack } from './src/track.js';
    export { buildStructures } from './src/structures.js';
    export { scatterScenery } from './src/scenery.js';
    export { summerTrees } from './src/eastbourneSummer.js';
    export { eastbourneCoast } from './src/coast.js';
    export { coastalProfile } from './src/coastalProfile.js';
    export { nearestRoadPose, buildRouteProgress } from './src/driveRoute.js';
    export { createSeededRandom } from './src/harness/rng.js';
  `, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', write: false,
  plugins: [{ name: 'phaser-render-shell', setup(b) {
    b.onResolve({ filter: /^phaser$/ }, () => ({ path: 'phaser', namespace: 'shell' }));
    b.onLoad({ filter: /.*/, namespace: 'shell' }, () => ({ resolveDir: process.cwd(), contents: `
      import Between from 'phaser/src/math/Between.js';
      import FloatBetween from 'phaser/src/math/FloatBetween.js';
      import Clamp from 'phaser/src/math/Clamp.js';
      import Distance from 'phaser/src/math/distance/DistanceBetween.js';
      import GetRandom from 'phaser/src/utils/array/GetRandom.js';
      export default { Scene: class {}, Math: { Between, FloatBetween, Clamp,
        Distance: { Between: Distance } }, Utils: { Array: { GetRandom } } };
    ` }));
  } }],
});
const m = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const def = m.TRACKS[0]; m.applyTrack(def);
const track = m.buildTrack(), structures = m.buildStructures(def, track);
const originalRandom = Math.random; Math.random = m.createSeededRandom(779425);
const scenery = m.scatterScenery(track, def); Math.random = originalRandom;
const trees = m.summerTrees(track, structures, scenery.trees);
assert.ok(trees.length >= 12, `Need a visible population of flowering trees, got ${trees.length}`);
for (const t of trees) {
  assert.equal(t.widthScale, 3); assert.equal(t.heightScale, 2);
  const pose = m.nearestRoadPose(track, t.x, t.z);
  assert.ok(pose.distance > pose.road.half + t.r + 55, 'Flowering trunks must leave the full road clear');
}
const sprite = { setOrigin() {}, setDepth() {}, setScale(s) {
  this.scaleX = this.scaleY = s; this.displayWidth = 128*s; this.displayHeight = 256*s;
} };
const car = new m.Car({ make: { sprite: () => sprite } }, 10000, 10000, 0);
const scene = Object.assign(new m.RaceScene(), { track, def, obstacles: [], car,
  timing: true, finished: false, expected: 1, routeUpdateAt: 0,
  routeProgress: m.buildRouteProgress(track), coastProfile: m.coastalProfile(track),
  time: { now: 10000 }, nextRecoveryAt: 0, recoveryCount: 0, lapStartTime: 0,
  lastSafe: { ...track.start }, world3d: { chase: { snap() {} } },
  hud: { lap: { setText(t) { scene.hint = t; } }, showMessage() {} },
});
scene.placeSeawall();
const wall = m.eastbourneCoast(track).wall;
for (const p of wall) {
  const near = m.nearestRoadPose(track, p.x, p.z);
  assert.ok(near.distance > near.road.half + car.collideRadius + 88,
    `Wall intrudes into ${near.road.id}`);
}
let impacts = 0;
for (let i = 4; i < wall.length - 4; i += 37) {
  const p = wall[i], q = wall[i+1];
  let nx = -(q.z-p.z), ny = q.x-p.x;
  const length = Math.hypot(nx, ny); nx /= length; ny /= length;
  if (nx > 0) { nx = -nx; ny = -ny; }
  for (const hz of [20, 30, 60]) for (const angle of [-0.5, 0, 0.5]) {
    car.reset(p.x - nx * 330, p.z - ny * 330, Math.atan2(nx, -ny) + angle);
    const forward = car.forward;
    car.vx = forward.x * m.CAR.maxSpeed; car.vy = forward.y * m.CAR.maxSpeed;
    for (let frame = 0; frame < hz; frame++) {
      car.update(1/hz, { throttle: 1, steer: 0 }, true, null);
      scene.resolveObstacles();
    }
    assert.ok((car.x-p.x)*nx + (car.y-p.z)*ny < 0, `Escaped seawall at sample ${i}/${hz}Hz`);
    impacts++;
  }
}
// No legal road position can trigger the water fallback.
for (const road of track.roads) for (const p of road.centerline) {
  assert.ok(p.x > scene.coastProfile(p.y).shoreX, `${road.id}: false water recovery`);
}
const coast = scene.coastProfile(wall[150].z);
car.reset(coast.shoreX - 200, wall[150].z, 0);
scene.updateRouteHelp(10000);
assert.equal(scene.recoveryCount, 1);
assert.equal(scene.lapStartTime, -3000);
assert.equal(car.x, track.start.x);
assert.equal(car.y, track.start.y);
scene.updateRouteHelp(10400);
assert.equal(scene.recoveryCount, 1, 'Water recovery must not repeat after returning to the road');
for (const id of ['muritai-road', 'village-inland']) {
  const road = track.roads.find(r => r.id === id);
  let before = -Infinity;
  for (let i = 0; i < road.centerline.length - 1; i++) {
    const value = scene.routeProgress.at({ road, index: i, t: 0 });
    assert.ok(value > before && (before === -Infinity || value-before < 0.003), `${id}: progress must advance smoothly`);
    before = value;
  }
}
console.log(`Eastbourne drive fixes PASS: ${trees.length} flowering trees, ${impacts} wall impacts, road clearance, water recovery and smooth branch progress`);
