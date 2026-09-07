import assert from 'node:assert/strict';
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
for (const s of homes) {
  assert.ok(s.frontage, 'Every home needs street access');
  const dx = s.frontage.x - s.x, dz = s.frontage.z - s.z;
  assert.ok((-Math.sin(s.yaw) * dx - Math.cos(s.yaw) * dz) / Math.hypot(dx, dz) > 0.99, 'Front door faces its access');
  for (const other of structures.filter(o => o !== s)) {
    // Inscribed circles must not overlap even after street-facing rotation.
    assert.ok(Math.hypot(s.x - other.x, s.z - other.z) > (Math.min(s.w, s.d) + Math.min(other.w, other.d)) / 2, 'Buildings must not overlap');
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
