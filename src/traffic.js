// Other people on the road.
//
// Ambient traffic: Morris Minors going about their day on Marine Drive, some
// travelling with you and some the other way. They are not rivals — nothing
// here is timed, scored or raced — and they are not scenery either, because you
// can hit them.
//
// They are deliberately *kinematic* rather than simulated. Each car holds a
// position along the road measured in arc length, a lane offset and a cruising
// speed, and every frame it walks a little further along the centreline. It does
// not run Car.update and no bot drives it.
//
// That is the whole reason this can be added to a course whose finish times are
// pinned. A simulated car can understeer into the sea, stall at zero speed, or
// need a random number to vary its line; this one can do none of those things
// and draws no random numbers at all, so it cannot disturb the seeded scenery
// stream that src/scenery.js and the AC2 baselines are built on.
//
// Nor do these cars live in RaceScene.obstacles. That list is fingerprinted by
// playtest/ac2-determinism.mjs and asserted to clear the RSA finish by
// playtest/eastbourne-arrival.mjs; putting moving cars in it would quietly break
// what both of those checks mean. Traffic keeps its own list and is resolved in
// a second pass — see RaceScene.resolveObstacles.
import { kmhToUnits, metres } from './scale.js';
import { CAR_FOOTPRINT } from './entities/Car.js';

// Where traffic is allowed to be, as fractions of the route. A car that runs off
// one end of an open road reappears at the other, inside this band.
//
// The margins are not cosmetic. Below START_CLEAR is the start box, where a
// wrapping car would materialise on top of a player who has not moved yet; above
// FINISH_CLEAR is the RSA arrival, which the course needs kept clear so the run
// can actually be finished.
const START_CLEAR = 0.05;
const FINISH_CLEAR = 0.92;

// How close a car will get to the one in front before it stops closing. Traffic
// is authored as a list of speeds, and over a run of any length a faster car
// behind a slower one in the same lane will catch it; without this they would
// simply drive through each other. Roughly three car lengths.
const HEADWAY = metres(13);

// Cumulative distance to each centreline sample, which is what lets a car be
// placed "820 metres along the road" rather than "at sample 41".
function arcLengths(centerline) {
  const cumulative = new Array(centerline.length);
  cumulative[0] = 0;
  for (let i = 1; i < centerline.length; i += 1) {
    const a = centerline[i - 1];
    const b = centerline[i];
    cumulative[i] = cumulative[i - 1] + Math.hypot(b.x - a.x, b.y - a.y);
  }
  return cumulative;
}

// The point and unit tangent of the road at a given distance along it. Binary
// search rather than a walk: this runs once per car per frame and a compact
// coastal route is still a couple of thousand samples long.
function poseAt(centerline, cumulative, distance) {
  let lo = 0;
  let hi = cumulative.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid] <= distance) lo = mid;
    else hi = mid;
  }
  const a = centerline[lo];
  const b = centerline[hi];
  const span = cumulative[hi] - cumulative[lo];
  const t = span > 0 ? (distance - cumulative[lo]) / span : 0;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: a.x + dx * t, y: a.y + dy * t, tx: dx / length, ty: dy / length };
}

// `def.traffic` is absent on every course but Eastbourne, and this returns null
// for those — so the other three run no extra code at all, rather than running
// an empty loop that would still have to be reasoned about.
export function buildTraffic(def, track) {
  const spec = def.traffic;
  if (!spec || !Array.isArray(spec.cars) || !spec.cars.length) return null;

  const road = track.roads ? track.roads[0] : track;
  const centerline = road.centerline;
  const cumulative = arcLengths(centerline);
  const routeLength = cumulative[cumulative.length - 1];

  // The band a car wraps within, in distance rather than fractions.
  const low = routeLength * START_CLEAR;
  const high = routeLength * FINISH_CLEAR;
  const band = high - low;

  // Half a lane off the centre, on the left of the direction of travel. This is
  // New Zealand: keeping left is what makes an oncoming car something you pass
  // rather than something you meet head-on.
  const lane = spec.laneFraction * road.half;

  const cars = spec.cars.map((entry) => ({
    direction: entry.direction < 0 ? -1 : 1,
    cruise: kmhToUnits(entry.speedKmh),
    // What the car is actually doing this frame, which is its cruising speed
    // unless it has caught the one in front.
    speed: kmhToUnits(entry.speedKmh),
    distance: low + band * entry.at,
    // Filled in by place() below. Named to match what updateBeryl() reads off
    // the player's car, so the render layer needs no adapter for them.
    x: 0,
    y: 0,
    rotation: 0,
    lateral: 0,
  }));

  function place(car) {
    const pose = poseAt(centerline, cumulative, car.distance);
    // The direction of travel, and the left of it. buildEdges() in track.js
    // offsets its `left` edge by (-ty, tx); that is the road's left in a
    // y-downward world, which is the driver's *right*. Left of travel is the
    // other one.
    const fx = pose.tx * car.direction;
    const fy = pose.ty * car.direction;
    car.x = pose.x + fy * lane;
    car.y = pose.y - fx * lane;
    // Beryl's convention, so the render layer can treat these as cars:
    // forward = (sin rotation, -cos rotation).
    car.rotation = Math.atan2(fx, -fy);
  }

  // One queue per direction, ordered along the way each is travelling, so every
  // car knows which one is in front of it. A car clamped to the pace of the one
  // ahead can never pass it, so this order is fixed once and never re-sorted.
  const queues = [1, -1].map((direction) => cars
    .filter((car) => car.direction === direction)
    .sort((a, b) => (a.distance - b.distance) * direction));

  for (const car of cars) place(car);

  // Two circles per car, nose and tail, the same way Beryl is approximated in
  // Car.collisionPoints(). One circle round the middle of a car twice as long as
  // it is wide either lets you clip the corners or stops you a car's length
  // short of the doors.
  const circles = cars.flatMap(() => [{ x: 0, y: 0, r: CAR_FOOTPRINT.collideRadius },
    { x: 0, y: 0, r: CAR_FOOTPRINT.collideRadius }]);

  return {
    cars,

    update(dt) {
      for (const queue of queues) {
        // Front of the queue first, so a follower reacts to where its leader is
        // going rather than where it was.
        for (let i = queue.length - 1; i >= 0; i -= 1) {
          const car = queue[i];
          car.speed = car.cruise;
          if (queue.length > 1) {
            const ahead = queue[(i + 1) % queue.length];
            let gap = (ahead.distance - car.distance) * car.direction;
            while (gap < 0) gap += band;
            if (gap < HEADWAY && ahead.speed < car.speed) car.speed = ahead.speed;
          }
          car.distance += car.direction * car.speed * dt;
          if (car.distance > high) car.distance -= band;
          else if (car.distance < low) car.distance += band;
          place(car);
        }
      }
    },

    // Rebuilt in place each frame rather than reallocated: this is called once
    // per frame for the whole fleet.
    collisionCircles() {
      for (let i = 0; i < cars.length; i += 1) {
        const car = cars[i];
        const ax = Math.sin(car.rotation) * CAR_FOOTPRINT.axleOffset;
        const ay = -Math.cos(car.rotation) * CAR_FOOTPRINT.axleOffset;
        const nose = circles[i * 2];
        const tail = circles[i * 2 + 1];
        nose.x = car.x + ax;
        nose.y = car.y + ay;
        tail.x = car.x - ax;
        tail.y = car.y - ay;
      }
      return circles;
    },
  };
}
