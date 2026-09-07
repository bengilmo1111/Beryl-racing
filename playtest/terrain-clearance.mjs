import assert from 'node:assert/strict';
import { Raycaster, Vector3 } from 'three';
import { TRACKS } from '../src/tracks.js';
import { applyTrack } from '../src/config.js';
import { buildTrack } from '../src/track.js';
import { Terrain } from '../src/terrain.js';
import { clearRoadTerrain } from '../src/terrainClearance.js';
import { RoadSurface } from '../src/roadSurface.js';
import { buildGround } from '../src/render3d/road.js';

const def = TRACKS.find(t => t.id === 'remutaka');
applyTrack(def);
const track = buildTrack();
const terrain = new Terrain(track, def.world, def);
const original = Float32Array.from(terrain.drivingGrid);
assert.notEqual(terrain.grid, terrain.drivingGrid, 'visual clearance must not mutate driving terrain');
assert.notEqual(terrain.grid, terrain.physicsGrid, 'visual clearance must not mutate physics');

// Independent ray/triangle intersections against the actual rendered mesh,
// including both edges, diagonal interiors and every road segment.
const mesh = buildGround(terrain, def.theme);
mesh.updateMatrixWorld(true);
const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
// The analytic check below densely samples every segment; rays check the real
// mesh at spaced positions without quadratic all-face traversal.
function groundHeight(grid, x, y) {
  const gx = (x - terrain.minX) / terrain.cell, gy = (y - terrain.minY) / terrain.cell;
  const c = Math.floor(gx), r = Math.floor(gy), u = gx - c, v = gy - r;
  const k = r * terrain.cols + c;
  const a = grid[k], b = grid[k + 1], d = grid[k + terrain.cols], e = grid[k + terrain.cols + 1];
  return (v >= u ? a + (e - d) * u + (d - a) * v : a + (b - a) * u + (e - b) * v) - 8;
}
let checked = 0, before = 0, worst = 0, rays = 0;
for (let i = 0; i < track.left.length - 1; i++) {
  for (const f of [0, 0.25, 0.5, 0.75, 1]) for (const u of [0, 0.25, 0.5, 0.75, 1]) {
    const mix = (a, b, t) => a + (b - a) * t;
    const coord = key => mix(mix(track.left[i][key], track.right[i][key], u), mix(track.left[i + 1][key], track.right[i + 1][key], u), f);
    const x = coord('x'), y = coord('y');
    const road = terrain.roadSurface.heightAt(x, y);
    if (road === null) continue;
    const oldExcess = groundHeight(original, x, y) - road;
    if (oldExcess > 0.1) before++;
    worst = Math.max(worst, oldExcess);
    assert.ok(groundHeight(terrain.grid, x, y) <= road + 0.02, `terrain covers road at ${i}/${f}/${u}`);
    if (i % 97 === 0 && f === 0.5) {
      ray.ray.origin.set(x, 100000, y);
      const hits = ray.intersectObject(mesh);
      assert.ok(hits.length, 'ground must remain present beneath road');
      assert.ok(hits[0].point.y <= road + 0.02, 'rendered ground covers road');
      rays++;
    }
    checked++;
  }
}
assert.ok(before > 7000 && worst > 190, 'fixture must reproduce the original intrusion');
assert.deepEqual(terrain.drivingGrid, original);
assert.ok(terrain.grid.every((h, i) => h <= original[i]), 'clearance must only lower terrain');

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
mesh.geometry.dispose(); mesh.material.dispose();
console.log(`terrain-clearance PASS: ${checked} positions, ${rays} rendered rays; removed ${before} intrusions (worst ${worst.toFixed(2)} units); driving grid unchanged`);
