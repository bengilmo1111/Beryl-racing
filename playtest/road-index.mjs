// The road index must agree with a full scan exactly, not approximately.
//
// `distanceToCenterline` decides whether Beryl is on the road and whether a tree
// may be placed; `surfaceAt` decides sealed versus gravel. Both compare their
// result against a threshold, so a value that differs in the last bit is a
// different course and a different recorded baseline. This test is what lets the
// index be trusted, and it is why the linear scan is kept rather than deleted.
import assert from 'node:assert/strict';
import { TRACKS } from '../src/tracks.js';
import { applyTrack, TRACK } from '../src/config.js';
import { buildTrack, distanceToCenterline, linearDistanceToPolyline, surfaceAt } from '../src/track.js';

// A local PRNG: this must never touch the global stream the scenery placement
// is seeded from.
let seed = 0x9e3779b9;
function rand() {
  seed ^= seed << 13;
  seed >>>= 0;
  seed ^= seed >> 17;
  seed ^= seed << 5;
  seed >>>= 0;
  return seed / 0x100000000;
}

// What distanceToCenterline did before the index, kept here rather than in the
// shipping module so the comparison is against an independent implementation.
function linearDistanceToNetwork(px, py, roads) {
  let best = Infinity;
  for (const road of roads) {
    const d = linearDistanceToPolyline(px, py, road.centerline, road.closed);
    const adjusted = d + (TRACK.roadWidth / 2 - road.half);
    if (adjusted < best) best = adjusted;
  }
  return best;
}

function linearSurfaceAt(px, py, roads) {
  let best = Infinity;
  let type = null;
  for (const road of roads) {
    for (let i = 0; i < road.centerline.length; i++) {
      const dx = road.centerline[i].x - px;
      const dy = road.centerline[i].y - py;
      const d = dx * dx + dy * dy;
      if (d < best) {
        best = d;
        type = road.surfaces ? road.surfaces[i] : null;
      }
    }
  }
  return type;
}

const SAMPLES = 4000;
let checked = 0;

for (const def of TRACKS) {
  applyTrack(def);
  const track = buildTrack();
  const roads = track.roads;

  // Short branch streets stay on the full scan — indexing 40 samples costs more
  // than it saves. The equivalence checks below cover both paths either way.
  assert.ok(
    roads.some((r) => r.centerline.coarse),
    `${def.id}: the primary route must carry a coarse index`
  );

  // Points drawn three ways, because the failure modes differ: out in the world
  // where the cutoff is loose, hard against the carriageway where it is tight,
  // and exactly on a sample, where ties decide which surface wins.
  const cases = [];
  for (let i = 0; i < SAMPLES; i++) {
    cases.push([rand() * def.world.width, rand() * def.world.height]);
  }
  for (const road of roads) {
    for (let i = 0; i < SAMPLES; i++) {
      const p = road.centerline[Math.floor(rand() * road.centerline.length)];
      const spread = road.half * 3;
      cases.push([p.x + (rand() - 0.5) * spread, p.y + (rand() - 0.5) * spread]);
      cases.push([p.x, p.y]);
    }
  }

  for (const [px, py] of cases) {
    const fast = distanceToCenterline(px, py, track.centerline);
    const slow = linearDistanceToNetwork(px, py, roads);
    assert.equal(
      fast,
      slow,
      `${def.id}: distance mismatch at ${px},${py} — ${fast} vs ${slow}`
    );
    assert.equal(
      surfaceAt(px, py, track),
      linearSurfaceAt(px, py, roads),
      `${def.id}: surface mismatch at ${px},${py}`
    );
    checked++;
  }

  // Timing is reported, not asserted: it varies with the machine, and the point
  // of the index is that it stays ahead as the routes get longer. A course that
  // has gone *slower* is the signal worth seeing.
  const t0 = process.hrtime.bigint();
  for (const [px, py] of cases) distanceToCenterline(px, py, track.centerline);
  const t1 = process.hrtime.bigint();
  for (const [px, py] of cases) linearDistanceToNetwork(px, py, roads);
  const t2 = process.hrtime.bigint();
  const fastMs = Number(t1 - t0) / 1e6;
  const slowMs = Number(t2 - t1) / 1e6;

  const samples = roads.reduce((n, r) => n + r.centerline.length, 0);
  console.log(
    `road-index ${def.id}: PASS ${cases.length} points over ${samples} samples` +
    ` — ${fastMs.toFixed(0)}ms indexed vs ${slowMs.toFixed(0)}ms scanned` +
    ` (${(slowMs / fastMs).toFixed(1)}x)`
  );
}

console.log(`road-index: ${checked} points agreed exactly`);
