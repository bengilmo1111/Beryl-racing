import assert from 'node:assert/strict';
import { TRACKS } from '../src/tracks.js';
import { applyTrack } from '../src/config.js';
import { buildTrack, distanceToCenterline } from '../src/track.js';
import { remutakaRoadProfile, remutakaVisualHeight } from '../src/remutakaTerrain.js';
import { remutakaBarriers, remutakaBankBarriers, bounceOffBarriers } from '../src/remutakaBarriers.js';
import { buildTraffic } from '../src/traffic.js';
import { crossesSummitFinish } from '../src/remutakaSummit.js';
import { RoadSurface } from '../src/roadSurface.js';
import { metres } from '../src/scale.js';
import { Raycaster, Vector3 } from 'three';
import { buildPavedAreas } from '../src/render3d/road.js';
applyTrack(TRACKS.find(t => t.id === 'remutaka'));
const track=buildTrack(), profile=remutakaRoadProfile(track), rails=remutakaBarriers(track);
for (const p of profile) {
  assert.equal(p.inside,1); assert.equal(p.outside,-1);
  const height = side => remutakaVisualHeight(p,p.x+p.nx*side*(track.half+400),p.z+p.nz*side*(track.half+400),p.h,track.half);
  assert.ok(height(1)>p.h+800 && height(-1)<p.h-800,'Steep bank right, drop left throughout');
}
const banks=remutakaBankBarriers(track);
assert.ok(banks.length > 0, 'Uphill bank must have a collision boundary');
for (let i=10;i<banks.length-2;i+=43) {
  const {a,b}=banks[i], dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
  const nx=-dy/len,ny=dx/len,mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
  const before={x:mx-nx*120,y:my-ny*120};
  const car={x:mx+nx*200,y:my+ny*200,vx:nx*300,vy:ny*300,
    forward:{x:dx/len,y:dy/len},collideRadius:45,axleOffset:40};
  assert.ok(bounceOffBarriers(car,[banks[i]],before),'Uphill bank must rebound Beryl');
}
// Actual rails: straight and angled impacts at slow and tunnelling speeds.
for (let i=10;i<rails.length-2;i+=43) {
  const {a,b}=rails[i], dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
  const nx=-dy/len,ny=dx/len, mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
  for (const speed of [20,200,2000]) {
    const before={x:mx+nx*120,y:my+ny*120};
    const car={x:mx-nx*speed,y:my-ny*speed,vx:-nx*300,vy:-ny*300,
      forward:{x:dx/len,y:dy/len},collideRadius:45,axleOffset:40};
    assert.ok(bounceOffBarriers(car,[rails[i]],before));
    assert.ok((car.x-mx)*nx+(car.y-my)*ny>=50.99);
    assert.ok(car.vx*nx+car.vy*ny>0,'Must rebound');
  }
}
for (let i=1;i<profile.length;i++) {
  const a=profile[i-1],b=profile[i];
  const car={x:b.x,y:b.z,forward:{x:b.tx,y:b.tz},vx:b.tx*1600,vy:b.tz*1600,collideRadius:45,axleOffset:65};
  assert.ok(!bounceOffBarriers(car,rails,{x:a.x,y:a.z}),'Rails must leave the whole through road clear');
}
const summit=track.summit, surface=new RoadSurface(track.roads);
const from=summit.point(0,-metres(2)),to=summit.point(0,metres(2));
assert.ok(crossesSummitFinish(track,from,to),'Through road must finish');
assert.ok(crossesSummitFinish(track,to,from));
assert.ok(crossesSummitFinish(track,summit.point(track.half+metres(8),-metres(2)),summit.point(track.half+metres(8),metres(2))), 'Car park must finish');
assert.ok(!crossesSummitFinish(track,summit.point(-track.half-metres(3),-metres(2)),summit.point(-track.half-metres(3),metres(2))),'Finish must not extend beyond road');
assert.ok(!crossesSummitFinish(track,summit.point(0,3000),summit.point(2000,3000)),'Grass cannot finish');
assert.ok(track.heights.at(-1)<summit.h-metres(10),'Road visibly descends after crest');
const car={...to,vx:0,vy:-200,forward:{x:Math.sin(summit.angle),y:-Math.cos(summit.angle)},collideRadius:45,axleOffset:40};
assert.ok(!bounceOffBarriers(car,rails,from),'Parking entrance must stay open');
const mesh=buildPavedAreas(track);mesh.updateMatrixWorld();
const [a,b,c]=summit.triangle;
for(let i=1;i<10;i++)for(let j=1;i+j<10;j++){
  const x=a.x*i/10+b.x*j/10+c.x*(1-(i+j)/10),y=a.y*i/10+b.y*j/10+c.y*(1-(i+j)/10);
  assert.equal(distanceToCenterline(x,y,track.centerline),0);
  assert.ok(Math.abs(surface.heightAt(x,y)-summit.h)<0.01);
  const hit=new Raycaster(new Vector3(x,20000,y),new Vector3(0,-1,0)).intersectObject(mesh)[0];
  assert.ok(hit && Math.abs(hit.point.y-summit.h)<0.02,'Visible parking must support car');
}
const traffic=buildTraffic(TRACKS.find(t => t.id === 'remutaka'),track);
assert.equal(traffic.cars.length,6,'Remutaka should inherit a light Morris Minor fleet');
console.log(`Remutaka PASS: ${profile.length} side profiles, ${rails.length} solid rails, ${banks.length} solid bank segments, full-width summit finish, traffic and descent`);
