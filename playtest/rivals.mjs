import assert from 'node:assert/strict';
import { TRACKS } from '../src/tracks.js';
import { applyTrack } from '../src/config.js';
import { buildTrack, distanceToCenterline } from '../src/track.js';
import { buildRivals } from '../src/rivals.js';
import { metres } from '../src/scale.js';

const def = TRACKS.find(track => track.id === 'manfield');
applyTrack(def);
const track = buildTrack();
const fleet = buildRivals(def, track);
const player = { ...track.start, speed: 0 };
assert.equal(fleet.cars.length, 4);
assert.equal(fleet.position(), 5);
assert.ok(fleet.cars.every(car => car.speed === 0), 'Grid waits for the countdown');
for (let frame = 0; frame < 7200; frame++) {
  fleet.update(1 / 60, player);
  if (frame % 60 === 0) {
    for (const car of fleet.cars) {
      assert.ok(Number.isFinite(car.rotation));
      assert.ok(distanceToCenterline(car.x, car.y, track.centerline) < track.half - metres(1));
    }
    for (let i = 0; i < fleet.cars.length; i++) {
      for (let j = i + 1; j < fleet.cars.length; j++) {
        assert.ok(Math.hypot(fleet.cars[i].x - fleet.cars[j].x, fleet.cars[i].y - fleet.cars[j].y) > metres(4), 'Rivals keep clear of one another');
      }
    }
  }
}
assert.ok(fleet.cars.every(car => car.distance > fleet.length), 'Every rival completes a full lap');
assert.equal(fleet.position(), 5, 'Lapped player remains behind');
assert.equal(fleet.collisionCircles().length, 8);

// Advance Beryl continuously through the seam, and verify overtaking and
// lapping use total distance rather than wrapping position on the circuit.
const ranking = buildRivals(def, track);
for (const point of track.centerline) ranking.update(0, { ...point, speed: 0 });
ranking.update(0, player);
assert.equal(ranking.position(), 1, 'A full lap puts Beryl ahead across the seam');
assert.equal(buildRivals(TRACKS.find(track => track.id === 'eastbourne-dash'), track), null);
console.log('Circuit rivals: grid, racing, spacing, road placement, lapping and collisions passed');
