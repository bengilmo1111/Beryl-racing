import { CAR_FOOTPRINT } from './entities/Car.js';
import { kmhToUnits, metres } from './scale.js';
import { nearestRoadPose } from './driveRoute.js';

// Circuit competitors keep unwrapped distance, so a lapped car never becomes
// the leader just because it crossed the start line. No scenery RNG is used.
export function buildRivals(def, track) {
  if (!def.rivals || !track.closed) return null;
  const line = [...track.centerline, track.centerline[0]];
  const distances = [0];
  for (let i = 1; i < line.length; i++) {
    distances.push(distances[i - 1] + Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y));
  }
  const length = distances.at(-1);
  const wrap = value => ((value % length) + length) % length;
  function pose(distance) {
    const d = wrap(distance);
    let lo = 0, hi = line.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (distances[mid] <= d) lo = mid;
      else hi = mid;
    }
    const a = line[lo], b = line[hi];
    const span = distances[hi] - distances[lo] || 1;
    const t = (d - distances[lo]) / span;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t,
      tx: (b.x - a.x) / span, ty: (b.y - a.y) / span };
  }
  function place(car) {
    const p = pose(car.distance);
    car.x = p.x + p.ty * car.lane;
    car.y = p.y - p.tx * car.lane;
    car.rotation = Math.atan2(p.tx, -p.ty);
  }
  const cars = def.rivals.map((spec, i) => ({
    distance: metres(12 + Math.floor(i / 2) * 10),
    lane: metres(i % 2 ? -2.3 : 2.3),
    cruise: kmhToUnits(spec.speedKmh), speed: 0, lateral: 0,
  }));
  cars.forEach(place);
  let playerDistance = 0, previousPlayerDistance = 0;
  const circles = cars.flatMap(() => Array.from({ length: 2 }, () => ({ x: 0, y: 0, r: CAR_FOOTPRINT.collideRadius })));
  return {
    cars, length,
    update(dt, player) {
      const p = nearestRoadPose(track, player.x, player.y);
      const d = distances[p.index] + (distances[p.index + 1] - distances[p.index]) * p.t;
      let delta = d - previousPlayerDistance;
      if (delta > length / 2) delta -= length;
      if (delta < -length / 2) delta += length;
      playerDistance += delta;
      previousPlayerDistance = d;
      for (const car of cars) {
        const here = pose(car.distance), ahead = pose(car.distance + metres(35));
        const bend = Math.acos(Math.max(-1, Math.min(1, here.tx * ahead.tx + here.ty * ahead.ty)));
        let target = car.cruise / (1 + bend * 1.8);
        // Hold a gap to cars in the same lane, including Beryl. The other
        // lane remains free for passing; competitors never drive through her.
        const playerLane = -(player.x - p.x) * Math.cos(p.rotation)
          - (player.y - p.y) * Math.sin(p.rotation);
        const leaders = [...cars.filter(other => other !== car),
          { distance: playerDistance, lane: playerLane, speed: Math.max(0, player.speed) }];
        for (const leader of leaders) {
          const gap = wrap(leader.distance - car.distance);
          if (Math.abs(leader.lane - car.lane) < metres(2) && gap < metres(9)) {
            target = Math.min(target, Math.max(0, leader.speed + (gap - metres(6)) * 2));
          }
        }
        car.speed += Math.max(-kmhToUnits(160) * dt, Math.min(kmhToUnits(220) * dt, target - car.speed));
        car.distance += car.speed * dt;
        place(car);
      }
    },
    position() { return 1 + cars.filter(car => car.distance > playerDistance).length; },
    collisionCircles() {
      cars.forEach((car, i) => {
        for (let end = 0; end < 2; end++) {
          const offset = CAR_FOOTPRINT.axleOffset * (end ? -1 : 1);
          circles[i * 2 + end].x = car.x + Math.sin(car.rotation) * offset;
          circles[i * 2 + end].y = car.y - Math.cos(car.rotation) * offset;
        }
      });
      return circles;
    },
  };
}
