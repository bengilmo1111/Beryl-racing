import { remutakaRoadProfile } from './remutakaTerrain.js';

// The visible rail and bank collision follow the outside of the widened
// summit shoulders, keeping all furniture out of the carriageway.
export function remutakaBarriers(track) {
  const profile = remutakaRoadProfile(track);
  const posts = profile.map(p => {
    const offset = track.half + 65 + (track.summit?.leftWidth || 0) * p.summitOpen;
    return { x: p.x - p.nx * offset, y: p.z - p.nz * offset, h: p.h };
  });
  return posts.slice(0, -1).map((a, i) => ({ a, b: posts[i + 1] }));
}

export function remutakaBankBarriers(track) {
  const profile = remutakaRoadProfile(track);
  const points = profile.filter((p, i) => i % 3 === 0 || i === profile.length - 1).map(p => {
    const offset = track.half + 50 + (track.summit?.rightWidth || 0) * p.summitOpen;
    return { x: p.x + p.nx * offset, y: p.z + p.nz * offset, h: p.h };
  });
  return points.slice(0, -1).map((a, i) => ({ a, b: points[i + 1] }));
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
