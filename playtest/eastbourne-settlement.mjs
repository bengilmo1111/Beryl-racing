import assert from 'node:assert/strict';
import { Group, Raycaster, Vector3 } from 'three';
import { groundRibbon } from '../src/render3d/themes/eastbourne.js';
import { bakeStatic } from '../src/render3d/bake.js';
import { TRACKS } from '../src/tracks.js';
import { applyTrack, WORLD } from '../src/config.js';
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

// Paths must follow the actual triangular ground, including saddle cells.
// Bilinear endpoint panels left repeating green slits in PR #40 screenshots.
{
  const terrain = { describe: () => ({ cols: 2, rows: 2, cell: 100,
    minX: 0, minY: 0, grid: [0, 0, 0, 80] }) };
  const group = new Group();
  groundRibbon(group, terrain, { x: 20, z: 20 }, { x: 80, z: 80 }, 35, 0xbbbbbb);
  const mesh = bakeStatic(group); mesh.updateMatrixWorld();
  for (const x of [30, 45, 60, 70]) for (const z of [x - 8, x, x + 8]) {
    const hit = new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(mesh)[0];
    assert.ok(hit, 'Continuous footpath must cover both sides of a ground diagonal');
    assert.ok(Math.abs(hit.point.y - (Math.min(x, z) * 0.8 - 8 + 3)) < 0.002,
      'Footpath must follow the actual ground mesh without sinking');
  }
}

// Landmark placement follows the user's map and the actual start pose.
const home = homes.find(s => s.landmark === 'beryl-home');
assert.ok(home && home.variant === 'two-storey');
assert.ok(Math.hypot(home.x-track.start.x, home.z-track.start.y) < metres(20), 'Start outside the owner villa');
const { resolvePlaces } = await import('../src/places.js');
const { EASTBOURNE_LAYOUT } = await import('../src/eastbourneRoute.js');
const places = resolvePlaces(track, EASTBOURNE_LAYOUT.places);
const pavilion = structures.find(s => s.kind === 'pavilion');
assert.ok(Math.abs(Math.hypot(pavilion.x-places.wharf.x, pavilion.z-places.wharf.z) - metres(40)) < metres(0.1), 'Pavilion opposite wharf with the requested 40 m setback');
const shops = structures.find(s => s.kind === 'shops');
const { nearestRoadPose } = await import('../src/driveRoute.js');
assert.ok(nearestRoadPose({ roads: [track.roads[0]] }, shops.x, shops.z).distance < metres(25), 'Shops close to Marine Parade');

// Inspect actual rendered polygons: no park lawn or joining kerb may paint a road.
const { Terrain } = await import('../src/terrain.js');
const { RoadSurface, findJunctions } = await import('../src/roadSurface.js');
const { terrainPatchGeometry } = await import('../src/render3d/terrainPatch.js');
const { clearRoads } = await import('../src/render3d/roadDecoration.js');
const { buildKerbs, junctionMask } = await import('../src/render3d/road.js');
const terrain = new Terrain(track, WORLD, def);
const lawn = clearRoads(terrainPatchGeometry(terrain, {
  x: places.williamsPark.x, z: places.williamsPark.z, width: metres(38), depth: metres(65),
  yaw: places.williamsPark.facing, lift: 2,
}), track.roads);
let checked = 0;
function noRoadPaint(geometry, roads) {
  const surface = new RoadSurface(roads), p = geometry.attributes.position;
  for (let i = 0; i < p.count; i += 3) {
    // Interior samples avoid Float32 rounding on shared boundary vertices.
    const area = Math.abs((p.getX(i+1)-p.getX(i))*(p.getZ(i+2)-p.getZ(i))-(p.getZ(i+1)-p.getZ(i))*(p.getX(i+2)-p.getX(i)));
    if (area < 1) continue;
    for (const weights of [[1/3,1/3,1/3],[0.8,0.1,0.1],[0.1,0.8,0.1],[0.1,0.1,0.8]]) {
      const x = weights.reduce((v,w,k)=>v+w*p.getX(i+k),0), z = weights.reduce((v,w,k)=>v+w*p.getZ(i+k),0);
      assert.equal(surface.heightAt(x,z), null, 'Decoration must stay outside the other road surface'); checked++;
    }
  }
}
assert.ok(lawn.attributes.position.count > 0, 'Retain Williams Park lawn');
noRoadPaint(lawn, track.roads);
const junctions = findJunctions(track.roads);
for (const road of track.roads) for (const mesh of buildKerbs(road, 'eastbourne', junctionMask(junctions, road.centerline), track.roads)) {
  noRoadPaint(mesh.geometry, track.roads.filter(r => r !== road));
}
console.log(`Eastbourne landmarks PASS: start villa, beachfront shops, pavilion and ${checked} road-decoration samples`);
