import assert from 'node:assert/strict';
import { Raycaster, Vector3 } from 'three';
import { TRACKS } from '../src/tracks.js';
import { applyTrack } from '../src/config.js';
import { buildTrack, distanceToCenterline } from '../src/track.js';
import { rsaArrival, inTriangle } from '../src/arrival.js';
import { RoadSurface, findJunctions } from '../src/roadSurface.js';
import { buildPavedAreas } from '../src/render3d/road.js';
import { buildStructures, structureObstacles } from '../src/structures.js';
import { metres } from '../src/scale.js';

const def = TRACKS.find(d => d.id === 'eastbourne-dash');
applyTrack(def);
const track = buildTrack(), arrival = rsaArrival(track), surface = new RoadSurface(track.roads);
const parking = buildPavedAreas(track);
parking.updateMatrixWorld();
// Sample the whole parking triangle, including the areas beyond the road edges.
const [a,b,c] = arrival.triangle;
for (let i = 1; i < 10; i++) for (let j = 1; i+j < 10; j++) {
  const x = a.x*i/10 + b.x*j/10 + c.x*(1-(i+j)/10);
  const y = a.y*i/10 + b.y*j/10 + c.y*(1-(i+j)/10);
  assert.equal(distanceToCenterline(x,y,track.centerline), 0);
  const hit = new Raycaster(new Vector3(x,10000,y), new Vector3(0,-1,0)).intersectObject(parking)[0];
  assert.ok(hit && Math.abs(hit.point.y-surface.heightAt(x,y)) < 0.02, 'Parking must support the visible car');
}
const finish = track.checkpoints.at(-1);
assert.ok(inTriangle(finish.x, finish.y, arrival.triangle));
const obstacles = structureObstacles(buildStructures(def, track));
assert.ok(obstacles.every(o => Math.hypot(o.x-finish.x,o.y-finish.y) > o.r+metres(4)), 'Arrival lane must clear the RSA');
// The final required pre-finish gate must precede the first alternative route.
const fork = track.roads.find(r=>r.id==='muritai-road').centerline[0];
const nearest = track.centerline.reduce((best,p,i)=> Math.hypot(p.x-fork.x,p.y-fork.y)<best.d ? {i,d:Math.hypot(p.x-fork.x,p.y-fork.y)} : best,{i:0,d:Infinity});
assert.ok(track.checkpoints.at(-2).index < nearest.i, 'No mandatory gate may force the waterfront choice');
for (const road of track.roads.slice(1)) for (const p of (road.id === 'marine-drive-north' ? [road.centerline.at(-1)] : [road.centerline[0],road.centerline.at(-1)])) {
  assert.ok(track.roads.some(r=>r!==road && r.centerline.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<r.half)), `${road.id} must connect at both ends`);
}
assert.ok(findJunctions(track.roads).every(j=>j.triangles.length), 'Junctions must use road triangles');
console.log('Eastbourne arrival PASS: paved support, clear finish, branch-safe gates and connected alternatives');
