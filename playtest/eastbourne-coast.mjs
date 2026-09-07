import assert from 'node:assert/strict';
import { Raycaster, Vector3 } from 'three';
import { TRACKS } from '../src/tracks.js';
import { applyTrack, WORLD } from '../src/config.js';
import { buildTrack } from '../src/track.js';
import { Terrain } from '../src/terrain.js';
import { eastbourneCoast } from '../src/coast.js';
import { coastalProfile, visualCoast } from '../src/coastalProfile.js';
import { seawallGeometry, shoreBandGeometry } from '../src/render3d/coastalGeometry.js';
import { groundColours } from '../src/render3d/ground.js';
import { metres } from '../src/scale.js';
const def = TRACKS.find(d => d.id === 'eastbourne-dash');
applyTrack(def);
const track = buildTrack(), terrain = new Terrain(track, WORLD, def);
const coast = eastbourneCoast(track), profile = coastalProfile(track);
const geometry = seawallGeometry(coast.wall, terrain), vertices = geometry.attributes.position;
for (let i = 0; i < coast.wall.length; i++) {
  assert.ok(Math.abs(vertices.getY(i * 4 + 2) - coast.wall[i].roadHeight - metres(0.8)) < 0.001,
    'Wall top must follow the road, not the coarse beach grid');
  assert.ok(vertices.getY(i * 4) < terrain.heightAt(coast.wall[i].x, coast.wall[i].z), 'Wall foundation must reach ground');
}
// Even a plot at sea level is grass if it lies inland of the wall.
const z = coast.wall[Math.floor(coast.wall.length / 2)].z;
const { wallX, shoreX } = profile(z);
const info = { cols: 1, rows: 1, cell: terrain.cell, minX: wallX + metres(15), minY: z, grid: new Float32Array([0]), coastalProfile: profile };
assert.deepEqual(groundColours(info, 'eastbourne', 0), groundColours(info, 'eastbourne', null));
info.minX = (shoreX + wallX) / 2;
assert.notDeepEqual(groundColours(info, 'eastbourne', 0), groundColours(info, 'eastbourne', null));
const band = shoreBandGeometry(visualCoast(track).points, metres(0.7));
for (let i = 0; i < band.attributes.normal.count; i++) assert.ok(band.attributes.normal.getY(i) > 0.99, 'Waterline faces up');
assert.equal(band.attributes.position.count, visualCoast(track).points.length * 2, 'Adjacent waterline spans share corners');
console.log('Eastbourne coast PASS: road-level wall, grounded foundations, inland grass and continuous waterline');
