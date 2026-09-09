import assert from 'node:assert/strict';
import { TRACKS } from '../src/tracks.js';
import { CAR, applyTrack } from '../src/config.js';
import { Car } from '../src/entities/Car.js';

// Car's only scene dependency is its old, invisible sprite footprint. Exercise
// the real update method with that small adapter; no copied physics or browser.
export function testCar(x = 10000, y = 10000, rotation = 0) {
  const sprite = {
    setOrigin() {}, setDepth() {},
    setScale(scale) {
      this.scaleX = this.scaleY = scale;
      this.displayWidth = 128 * scale;
      this.displayHeight = 256 * scale;
    },
  };
  return new Car({ make: { sprite: () => sprite } }, x, y, rotation);
}

const eastbourne = TRACKS.find((track) => track.id === 'eastbourne-dash');
applyTrack(eastbourne);
const still = testCar();
for (let i = 0; i < 60; i++) still.update(1 / 60, { throttle: 0, steer: 1 }, true);
assert.equal(still.rotation, 0, 'A stopped car must not pivot');

const tap = testCar();
tap.vy = -CAR.maxSpeed;
tap.update(1 / 60, { throttle: 1, steer: 1 }, true);
assert.ok(tap.rotation > 0 && tap.rotation < 0.003, 'A one-frame tap should make a small correction');
const grass = testCar();
grass.vy = -CAR.maxSpeed;
grass.update(1 / 60, { throttle: 0, steer: 0 }, false);
assert.ok(grass.speed > CAR.maxSpeed * 0.95, 'Crossing the verge must not instantly halve speed');
for (let i = 0; i < 120; i++) grass.update(1 / 60, { throttle: 0, steer: 0 }, false);
assert.ok(grass.speed < CAR.maxSpeed * 0.65, 'Grass still needs a meaningful slowdown');

for (const hz of [30, 60, 120]) {
  const car = testCar();
  for (let i = 0; i < hz * 4; i++) car.update(1 / hz, { throttle: 1, steer: 0 }, true);
  assert.ok(car.speed > CAR.maxSpeed * 0.87 && car.speed < CAR.maxSpeed * 0.89,
    `Acceleration target drifted at ${hz}Hz`);
}
const reset = testCar();
reset.steer = 1; reset.lateral = 100; reset.drifting = true;
reset.reset(500, 500, 0);
assert.equal(reset.steer, 0);
assert.equal(reset.lateral, 0);
assert.equal(reset.drifting, false);
// Replay mixed inputs against the actual Car implementation on equal terrain.
// Track layout can differ; the same car inputs and surface must behave alike.
function handlingTrace(track) {
  applyTrack(track);
  const car = testCar();
  const states = [];
  for (const [seconds, input, onRoad, surface, grade] of [
    [3, { throttle: 1, steer: 0 }, true, 'sealed', 0],
    [1, { throttle: 1, steer: 1 }, true, 'sealed', 0],
    [1, { throttle: 1, steer: -0.5 }, true, 'gravel', 0],
    [1, { throttle: 0, steer: 0 }, false, 'grass', 0],
    [1, { throttle: 1, steer: 0.5, handbrake: true }, true, 'sealed', 0],
    [3, { throttle: -1, steer: -1 }, true, 'sealed', 0],
    [2, { throttle: 1, steer: 0 }, true, 'sealed', 0.08],
    [2, { throttle: 1, steer: 0 }, true, 'sealed', -0.08],
  ]) {
    for (let i = 0; i < seconds * 60; i++) {
      car.update(1 / 60, input, onRoad, surface, grade);
      states.push([car.x, car.y, car.vx, car.vy, car.rotation, car.steer, car.drifting]);
    }
  }
  return states;
}
const expected = handlingTrace(eastbourne);
const roadConfig = { ...CAR };
for (const id of ['remutaka', 'otaki', 'eastbourne-dash']) {
  const track = TRACKS.find((track) => track.id === id);
  assert.deepEqual(handlingTrace(track), expected, `${id}: road-car response must match Eastbourne`);
  assert.deepEqual(CAR, roadConfig, `${id}: full driving configuration must match`);
}
applyTrack(TRACKS.find((track) => track.id === 'manfield'));
assert.equal(CAR.arcade, false, 'Manfeild must retain its race handling');
assert.equal(CAR.steerResponse, undefined, 'Course configuration must not leak');
assert.equal(CAR.topSpeedKmh, 220, 'Manfeild must retain its faster top speed');
assert.ok(CAR.accel > roadConfig.accel, 'Manfeild must accelerate faster');
console.log('arcade-driving PASS: identical road-course traces and configurations, tap steering, stationary steering, grass, 30/60/120Hz acceleration, recovery reset and course isolation');
