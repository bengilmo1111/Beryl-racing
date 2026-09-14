import { remutakaRoadProfile } from './remutakaTerrain.js';
import { metres } from './scale.js';

// Rendering and collisions consume exactly these segments, including the open
// entrance and the two outer edges of the summit parking triangle.
export function remutakaBarriers(track) {
  const profile = remutakaRoadProfile(track), segments = [];
  const summit = track.summit;
  const posts = profile.map(p => ({ x: p.x - p.nx * (track.half + 65),
    y: p.z - p.nz * (track.half + 65), h: p.h }));
  for (let i = 0; i < posts.length - 1; i++) {
    const a = posts[i], b = posts[i + 1];
    if (summit) {
      const along = p => (p.x - summit.origin.x)*Math.cos(summit.angle)
        + (p.y - summit.origin.y)*Math.sin(summit.angle);
      if (Math.min(along(a), along(b)) < metres(23) && Math.max(along(a), along(b)) > -metres(23)
        && Math.abs(i - summit.index) < 80) continue;
    }
    segments.push({ a, b });
  }
  if (summit) {
    const [a,b,c] = summit.triangle;
    segments.push({a,b}, {a:b,b:c});
  }
  return segments;
}

// Sweep the nose and tail across each rail's plane. A fast frame cannot jump
// through a thin beam. Keep tangential speed and rebound 25% of the impact.
export function bounceOffBarriers(car, segments, before = car) {
  let hit = false;
  const radius = car.collideRadius + 6;
  const f = car.forward;
  for (const {a,b} of segments) {
    const dx = b.x-a.x, dy = b.y-a.y, length = Math.hypot(dx,dy);
    if (!length) continue;
    const tx=dx/length, ty=dy/length;
    for (const sign of [1,-1]) {
      const ox=f.x*car.axleOffset*sign, oy=f.y*car.axleOffset*sign;
      const sx=before.x+ox-a.x, sy=before.y+oy-a.y;
      const ex=car.x+ox-a.x, ey=car.y+oy-a.y;
      const d0=-ty*sx+tx*sy, d1=-ty*ex+tx*ey;
      const side=d0 >= 0 ? 1 : -1;
      if (d1*side >= radius) continue;
      const t=d0*side > radius ? (d0*side-radius)/((d0-d1)*side) : 1;
      const along=(sx+(ex-sx)*t)*tx+(sy+(ey-sy)*t)*ty;
      if (along < -radius || along > length+radius) continue;
      const nx=-ty*side, ny=tx*side;
      car.x += nx*(radius-d1*side);
      car.y += ny*(radius-d1*side);
      const vn=car.vx*nx+car.vy*ny;
      if (vn < 0) { car.vx -= 1.25*vn*nx; car.vy -= 1.25*vn*ny; }
      hit=true;
    }
  }
  return hit;
}
