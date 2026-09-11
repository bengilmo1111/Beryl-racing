// The other cars, drawn.
//
// Every one of them is the same Morris Minor the player drives — same mesh, same
// chrome, same grille — in a different colour and without Beryl's two personal
// details. That is the whole art direction: a road full of Minors is what
// Eastbourne looked like, and building a second vehicle would have been both
// more work and less true.
//
// Render-only, like everything else in this directory: it reads the simulation's
// traffic state and draws it, and never writes back. The cars' positions come
// from src/traffic.js and nothing here can move them.
import { Group } from 'three';
import { MINOR_COLOURS } from './palette.js';
import { buildBeryl, updateBeryl } from './beryl.js';

// Traffic has no driver to read a steering input from, and does not need one:
// the front wheels are turned by `input.steer` and these cars follow the road
// rather than being steered along it.
const NO_INPUT = { steer: 0 };

export function buildTrafficFleet(traffic) {
  const group = new Group();
  const rigs = traffic.cars.map((car, i) => {
    // Colours are handed out in list order rather than picked from the car's
    // speed or direction, so the fleet is the same every run and a screenshot
    // taken today can be compared with one taken next month.
    const rig = buildBeryl({
      bodyColor: MINOR_COLOURS[i % MINOR_COLOURS.length],
      identity: false,
    });
    group.add(rig.root);
    return rig;
  });
  return { group, rigs };
}

export function updateTrafficFleet(fleet, traffic, dt, terrain) {
  const surfaceHeight = (x, y) => terrain.heightAt(x, y);
  for (let i = 0; i < fleet.rigs.length; i += 1) {
    const car = traffic.cars[i];
    // The same call the player's car makes. A traffic car carries lateral 0 and
    // a steady speed, so its body sits level and its wheels turn at the right
    // rate without any of this having to know it is not Beryl.
    const ground = terrain.heightAt(car.x, car.y);
    const forwardX = Math.sin(car.rotation);
    const forwardY = -Math.cos(car.rotation);
    const grade = terrain.roadGradeAlong(car.x, car.y, forwardX, forwardY);
    updateBeryl(fleet.rigs[i], car, NO_INPUT, dt, ground, grade, surfaceHeight);
  }
}
