// The road must not fold through itself.
//
// `buildEdges` offsets the centreline by ±half along its own normal, which is
// only valid while half is smaller than the local corner radius. Past that the
// two edges cross and the road passes through itself — visible in-game as a kerb
// line cutting diagonally across the tarmac, and drivable as a corner that
// teleports you to the wrong side of the road.
//
// Three of the four courses were over that line before the rescale: Eastbourne's
// tightest radius was 45 against a half-width of 180, Remutaka's 62 against 120
// on 6% of its samples, Ōtaki's 36 against 140. Nothing caught it, because a
// folded road still builds, still renders and still lets a bot finish. This is
// the check that would have.
//
// It also builds the terrain and the structure list for every course, which
// costs nothing here and catches a bug this project keeps rediscovering: a
// function that loses an argument. `node --check` passes, `vite build` passes —
// Vite does not resolve free variables — and the first thing to notice is a
// browser run minutes later. `otakiStructures()` lost its `def` in this very
// change.
import assert from 'node:assert/strict';
import { TRACKS } from '../src/tracks.js';
import { applyTrack } from '../src/config.js';
import { buildTrack } from '../src/track.js';
import { Terrain } from '../src/terrain.js';
import { buildStructures, structureObstacles } from '../src/structures.js';
import { UNITS_PER_METRE, unitsToKmh } from '../src/scale.js';

// How much clearance to insist on beyond the bare minimum. At exactly 1.0 the
// edges touch without crossing, which is still a cusp in the tarmac; 1.5 keeps a
// visible radius on the inside kerb.
const MIN_RADIUS_RATIO = 1.5;

// Corner radius at a sample, from the circumcircle of it and its neighbours.
function radiusAt(a, b, c) {
  const ab = Math.hypot(b.x - a.x, b.y - a.y);
  const bc = Math.hypot(c.x - b.x, c.y - b.y);
  const ca = Math.hypot(a.x - c.x, a.y - c.y);
  const area = Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
  return area < 1e-9 ? Infinity : (ab * bc * ca) / (4 * area);
}

const failures = [];

for (const def of TRACKS) {
  applyTrack(def);
  const track = buildTrack();
  const roads = track.roads;

  let worstRatio = Infinity;
  let worstAt = null;
  let tight = 0;
  let samples = 0;
  let routeLength = 0;

  for (const road of roads) {
    const line = road.centerline;
    const n = line.length;
    const last = road.closed ? n : n - 1;
    for (let i = 1; i < n - 1; i++) {
      const ratio = radiusAt(line[i - 1], line[i], line[i + 1]) / road.half;
      samples++;
      if (ratio < MIN_RADIUS_RATIO) tight++;
      if (ratio < worstRatio) {
        worstRatio = ratio;
        worstAt = { road: road.id, x: Math.round(line[i].x), y: Math.round(line[i].y) };
      }
    }
    if (road === roads[0]) {
      for (let i = 1; i < last; i++) {
        routeLength += Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y);
      }
      if (road.closed) {
        routeLength += Math.hypot(line[0].x - line[n - 1].x, line[0].y - line[n - 1].y);
      }
    }
  }

  // Sample spacing has to stay fine enough that a corner reads as a curve
  // rather than a run of flats, and fine enough that the on-road test does not
  // step across the kerb between samples.
  const spacing = routeLength / roads[0].centerline.length;

  // Everything a course builds before a frame is drawn. Any of these throwing is
  // the failure; the assertions are just enough to make the results meaningful.
  const terrain = new Terrain(track, def.world, def);
  const structures = buildStructures(def, track);
  const obstacles = structureObstacles(structures);
  assert.ok(
    structures.every((s) => Number.isFinite(s.x) && Number.isFinite(s.z)),
    `${def.id}: a structure has a non-finite position`
  );
  assert.ok(
    obstacles.every((o) => Number.isFinite(o.x) && Number.isFinite(o.y) && o.r > 0),
    `${def.id}: a structure obstacle is malformed`
  );
  if (!terrain.flat) {
    assert.ok(
      Number.isFinite(terrain.heightAt(track.start.x, track.start.y)),
      `${def.id}: terrain height at the start line is not finite`
    );
  }

  const kmh = unitsToKmh(def.physics.maxSpeed);
  const km = routeLength / UNITS_PER_METRE / 1000;
  const line =
    `${def.id.padEnd(16)} ${km.toFixed(2)} km  ${kmh.toFixed(0).padStart(3)} km/h` +
    `  ${(routeLength / def.physics.maxSpeed).toFixed(0).padStart(3)}s flat out` +
    `  road ${String(def.geometry.roadWidth).padStart(3)}` +
    `  min radius ${worstRatio.toFixed(2)}x half` +
    `  spacing ${spacing.toFixed(0)}`;

  if (worstRatio < MIN_RADIUS_RATIO) {
    failures.push(
      `${def.id}: ${tight}/${samples} samples tighter than ${MIN_RADIUS_RATIO}x the road ` +
      `half-width; worst ${worstRatio.toFixed(2)}x on ${worstAt.road} at ${worstAt.x},${worstAt.y}`
    );
    console.log(`track-geometry FAIL  ${line}`);
  } else {
    console.log(`track-geometry PASS  ${line}`);
  }
}

assert.deepEqual(failures, [], `\n${failures.join('\n')}\n`);
console.log('track-geometry: no road folds through itself');
