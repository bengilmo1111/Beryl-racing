import assert from 'node:assert/strict';
import { Raycaster, Vector3 } from 'three';
import { TRACKS } from '../src/tracks.js';
import { applyTrack } from '../src/config.js';
import { buildTrack } from '../src/track.js';
import { Terrain } from '../src/terrain.js';
import { clearRoadTerrain } from '../src/terrainClearance.js';
import { RoadSurface } from '../src/roadSurface.js';
import { buildGround } from '../src/render3d/road.js';

// Independent ray/triangle intersections against the actual rendered mesh,
// including both edges, diagonal interiors and every segment of every road.
// The analytic check below densely samples every segment; rays check the real
// mesh at spaced positions without quadratic all-face traversal.
function groundHeight(terrain, grid, x, y) {
  const gx = (x - terrain.minX) / terrain.cell, gy = (y - terrain.minY) / terrain.cell;
  const c = Math.floor(gx), r = Math.floor(gy), u = gx - c, v = gy - r;
  const k = r * terrain.cols + c;
  const a = grid[k], b = grid[k + 1], d = grid[k + terrain.cols], e = grid[k + terrain.cols + 1];
  return (v >= u ? a + (e - d) * u + (d - a) * v : a + (b - a) * u + (e - b) * v) - 8;
}

const expectations = {
  remutaka: { intrusions: 7000, worst: 190 },
  otaki: { intrusions: 400, worst: 7 },
};
let totalChecked = 0, totalRays = 0, summary = [];
for (const id of Object.keys(expectations)) {
  const def = TRACKS.find(t => t.id === id);
  applyTrack(def);
  const track = buildTrack();
  const terrain = new Terrain(track, def.world, def);
  const original = Float32Array.from(terrain.drivingGrid);
  assert.notEqual(terrain.grid, terrain.drivingGrid, `${id}: visual clearance must not mutate driving terrain`);
  assert.notEqual(terrain.grid, terrain.physicsGrid, `${id}: visual clearance must not mutate physics`);
  const mesh = buildGround(terrain, def.theme);
  mesh.updateMatrixWorld(true);
  const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
  let checked = 0, before = 0, worst = 0, rays = 0;
  for (const route of track.roads || [track]) {
    for (let i = 0; i < route.left.length - 1; i++) {
      for (const f of [0, 0.25, 0.5, 0.75, 1]) for (const u of [0, 0.25, 0.5, 0.75, 1]) {
        const mix = (a, b, t) => a + (b - a) * t;
        const coord = key => mix(mix(route.left[i][key], route.right[i][key], u), mix(route.left[i + 1][key], route.right[i + 1][key], u), f);
        const x = coord('x'), y = coord('y');
        const road = terrain.roadSurface.heightAt(x, y);
        if (road === null) continue;
        const oldExcess = groundHeight(terrain, original, x, y) - road;
        if (oldExcess > 0.1) before++;
        worst = Math.max(worst, oldExcess);
        assert.ok(groundHeight(terrain, terrain.grid, x, y) <= road + 0.02,
          `${id}: terrain covers ${route.id || 'primary'} road at ${i}/${f}/${u}`);
        if (i % 97 === 0 && f === 0.5) {
          ray.ray.origin.set(x, 100000, y);
          const hits = ray.intersectObject(mesh);
          assert.ok(hits.length, `${id}: ground must remain present beneath road`);
          assert.ok(hits[0].point.y <= road + 0.02, `${id}: rendered ground covers road`);
          rays++;
        }
        checked++;
      }
    }
  }
  const expected = expectations[id];
  assert.ok(before > expected.intrusions && worst > expected.worst, `${id}: fixture must reproduce the original intrusion`);
  assert.deepEqual(terrain.drivingGrid, original);
  assert.ok(terrain.grid.every((h, i) => h <= original[i]), `${id}: clearance must only lower terrain`);
  mesh.geometry.dispose(); mesh.material.dispose();
  totalChecked += checked;
  totalRays += rays;
  summary.push(`${id} removed ${before} intrusions (worst ${worst.toFixed(2)})`);
}

// A tiny sloped road wholly inside one coarse triangle, with reversed winding:
// checking grid corners or road centreline alone misses this overlap.
const info = { cols: 2, rows: 2, cell: 10, minX: 0, minY: 0, grid: new Float32Array([20, 20, 20, 20]) };
for (const reverse of [false, true]) {
  const surface = new RoadSurface([]);
  const triangle = [{ x: 1, y: 2, h: 2 }, { x: 2, y: 3, h: 3 }, { x: 1, y: 4, h: 4 }];
  surface.addTriangle(...(reverse ? triangle.reverse() : triangle));
  const result = clearRoadTerrain(info, surface);
  assert.ok(result[0] <= 2 && result[2] <= 2 && result[3] <= 2);
  assert.equal(result[1], 20, 'non-overlapping vertex stays unchanged');
  assert.deepEqual([...info.grid], [20, 20, 20, 20]);
}
console.log(`terrain-clearance PASS: ${totalChecked} positions, ${totalRays} rendered rays; ${summary.join('; ')}; driving grids unchanged`);
