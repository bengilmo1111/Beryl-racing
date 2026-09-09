import assert from 'node:assert/strict';
import waypoint from './bots/waypoint.js';
import { steeringTaps, heldSteering, lateBraking } from './bots/imperfect.js';

// Eastbourne steeringTaps / seed 779425, PR #42 frame 10801. The final
// 20-second trace contains zero speed, zero throttle and zero brake throughout:
// a controller deadlock, not proof that collision geometry traps the car.
const stopped = {
  frame: 10801, pos: { x: 16720.985948019, y: 88425.510330867 },
  heading: -2.963402268, speed: 0, maxSpeed: 1608.3333333333333,
  nextCheckpoint: { x: 14800, y: 114560 },
  driveTarget: { x: 15589.273089581, y: 88765.588202642 }, finished: false,
};
for (const bot of [waypoint, steeringTaps, heldSteering, lateBraking]) {
  for (const heading of [stopped.heading, 0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const input = bot({ ...stopped, heading });
    assert.ok(input.throttle > 0 && input.brake === 0, `${bot.name}: must request motion when stopped`);
  }
}
assert.deepEqual(waypoint({ ...stopped, finished: true }), { throttle: 0, brake: 1, steer: 0 });
assert.deepEqual(waypoint({ ...stopped, speed: stopped.maxSpeed }), { steer: 1, throttle: 0, brake: 1 },
  'a badly aligned car at speed must still brake');
assert.ok(waypoint({ ...stopped, speed: stopped.maxSpeed * 0.04 }).throttle > 0,
  'restart must persist above zero speed, not chatter on the first moving frame');
assert.deepEqual(waypoint({ ...stopped, nextCheckpoint: null, driveTarget: null }), { throttle: 0, brake: 1, steer: 0 });
console.log('Bot restart PASS: recorded deadlock, five headings, four drivers, low-speed restart and high-speed braking');
