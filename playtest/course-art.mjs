import assert from 'node:assert/strict';
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { buildGarageBay } from '../src/render3d/themes/manfeild.js';
import { guardrailPosts } from '../src/render3d/themes/remutaka.js';
import { streetFace } from '../src/render3d/themes/otaki.js';
import { terrainPatchGeometry } from '../src/render3d/terrainPatch.js';
import { GROUND_Y } from '../src/render3d/road.js';
import { TRACKS } from '../src/tracks.js';
import { applyTrack, WORLD } from '../src/config.js';
import { buildTrack } from '../src/track.js';
import { Terrain } from '../src/terrain.js';
import { remutakaRoadProfile } from '../src/remutakaTerrain.js';

const garage = buildGarageBay(); garage.updateMatrixWorld();
for (const z of [-50, 0, 50]) for (const x of [-85, -50, 0, 50, 85]) {
  const hit = new Raycaster(new Vector3(x, 300, z), new Vector3(0, -1, 0)).intersectObject(garage)[0];
  assert.ok(hit && hit.point.y > 112, 'Garage roof must cover its full footprint');
}
for (const side of [-1, 1]) {
  assert.ok(new Raycaster(new Vector3(0, 120, side * 250), new Vector3(0, 0, -side)).intersectObject(garage).length, 'Both garage gables must close the attic');
}
const def = TRACKS.find(d => d.id === 'remutaka'); applyTrack(def);
const track = buildTrack(), terrain = new Terrain(track, WORLD, def);
const posts = guardrailPosts(track, terrain, remutakaRoadProfile(track));
assert.ok(posts.length > 50);
for (const p of posts) { assert.equal(p.y, p.point.h); assert.ok(p.groundY <= terrain.heightAt(p.x, p.z)); }
for (const yaw of [0, 0.7, 2]) for (const side of [-1, 1]) {
  assert.equal(streetFace({ x: 0, z: 0, yaw }, { centerline: [{ x: Math.sin(yaw) * side * 100, y: Math.cos(yaw) * side * 100 }] }), side);
}
// A saddle-shaped cell differs from bilinear terrain sampling. Every point of
// the patch must sit on the rendered triangular surface, including after yaw.
const fake = { describe: () => ({ cols: 2, rows: 2, cell: 100, minX: 0, minY: 0, grid: [0, 0, 0, 80] }) };
const mesh = new Mesh(terrainPatchGeometry(fake, { x: 50, z: 50, width: 70, depth: 70, yaw: 0.3, lift: 2 }), new MeshBasicMaterial());
mesh.updateMatrixWorld();
for (const x of [30, 45, 65]) for (const z of [30, 55, 65]) {
  const hit = new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(mesh)[0];
  assert.ok(hit, 'Crop patch must face upward');
  assert.ok(Math.abs(hit.point.y - (Math.min(x, z) * 0.8 + GROUND_Y + 2)) < 0.001, 'Crop patch must follow ground triangles exactly');
}
console.log('Course art PASS: closed garage roofs, road-level rails, street-facing facades and grounded crop plots');
