import assert from 'node:assert/strict';
import { Group, Raycaster, Vector3 } from 'three';
import { groundRibbon } from '../src/render3d/themes/eastbourne.js';
import { bakeStatic } from '../src/render3d/bake.js';
import { TRACKS } from '../src/tracks.js';
import { applyTrack } from '../src/config.js';
import { buildTrack } from '../src/track.js';
import { buildStructures } from '../src/structures.js';
import { metres } from '../src/scale.js';
import { HILL_OFFSETS, hillElevation } from '../src/eastbourneHills.js';
const def = TRACKS.find(d => d.id === 'eastbourne-dash');
applyTrack(def);
const track = buildTrack(), structures = buildStructures(def, track);
const homes = structures.filter(s => s.kind === 'villa');
assert.ok(homes.length > 40, 'Retain a populated settlement');
function overlaps(a, b) {
  const axes = s => [[Math.cos(s.yaw), -Math.sin(s.yaw)], [Math.sin(s.yaw), Math.cos(s.yaw)]];
  const aa = axes(a), bb = axes(b);
  return [...aa, ...bb].every(([x, z]) => {
    const radius = (s, axes) => Math.abs(x * axes[0][0] + z * axes[0][1]) * s.w / 2
      + Math.abs(x * axes[1][0] + z * axes[1][1]) * s.d / 2;
    return Math.abs((b.x - a.x) * x + (b.z - a.z) * z) < radius(a, aa) + radius(b, bb);
  });
}
for (const s of homes) {
  assert.ok(s.frontage, 'Every home needs street access');
  const dx = s.frontage.x - s.x, dz = s.frontage.z - s.z;
  assert.ok((-Math.sin(s.yaw) * dx - Math.cos(s.yaw) * dz) / Math.hypot(dx, dz) > 0.99, 'Front door faces its access');
  for (const other of structures.filter(o => o !== s)) {
    assert.ok(!overlaps(s, other), 'Building rectangles must not overlap after street-facing rotation');
  }
}
for (let f = 0; f <= 1; f += 0.01) for (let c = 0; c < HILL_OFFSETS.length; c++) {
  const h = hillElevation(f, c);
  assert.ok(Number.isFinite(h) && h >= 0 && h < 170);
}
assert.ok(hillElevation(0.25, 5) < 20, 'Days Bay must retain its low valley profile');
assert.ok(hillElevation(0.6, 4) < 5, 'Rona Bay needs a broad low coastal plain');
assert.ok(structures.find(s => s.kind === 'shops').w > metres(25), 'Retail strip must read at street scale');
console.log(`Eastbourne settlement PASS: ${homes.length} street-facing homes, clear buildings and measured profiles`);

// Single-sided baked paths must remain visible from above, including on a slope.
for (const b of [{ x: 800, z: 0 }, { x: 0, z: 800 }, { x: -400, z: -700 }]) {
  const group = new Group(), terrain = { heightAt: (x, z) => x * 0.02 + z * 0.01 };
  groundRibbon(group, terrain, { x: 0, z: 0 }, b, 60, 0xbbbbbb);
  const mesh = bakeStatic(group);
  mesh.updateMatrixWorld();
  const hit = new Raycaster(new Vector3(b.x / 2, 1000, b.z / 2), new Vector3(0, -1, 0)).intersectObject(mesh)[0];
  assert.ok(hit, 'Baked paths must face upward');
  assert.ok(Math.abs(hit.point.y - terrain.heightAt(b.x / 2, b.z / 2) - 3) < 0.01);
}
