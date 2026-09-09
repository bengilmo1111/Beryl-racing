import { CanvasTexture, CylinderGeometry, DoubleSide, Group, Mesh, PlaneGeometry, SRGBColorSpace } from 'three';
import { basic, lambert } from '../palette.js';
import { metres } from '../../scale.js';

// Code-drawn Blue Ensign: Union Jack canton and four red, white-bordered
// five-point Southern Cross stars. Canvas avoids a remote asset dependency.
export function buildNewZealandFlagpole() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);
  ctx.fillStyle = '#00247d'; ctx.fillRect(0, 0, 512, 256);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 256, 128); ctx.clip();
  const line = (x1,y1,x2,y2,width,colour) => {
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
    ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.stroke();
  };
  line(0,0,256,128,26,'white'); line(0,128,256,0,26,'white');
  // Counterchanged red diagonal arms leave a broader white edge above the
  // diagonal next to the hoist, as on the Union Flag.
  line(0,4,128,68,9,'#cc142b'); line(128,60,256,124,9,'#cc142b');
  line(0,124,128,60,9,'#cc142b'); line(128,68,256,4,9,'#cc142b');
  line(128,0,128,128,43,'white'); line(0,64,256,64,43,'white');
  line(128,0,128,128,26,'#cc142b'); line(0,64,256,64,26,'#cc142b');
  ctx.restore();
  const star = (x,y,r,colour) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI/2 + i*Math.PI/5, radius = i%2 ? r*0.382 : r;
      const px = x+Math.cos(a)*radius, py = y+Math.sin(a)*radius;
      if (i) ctx.lineTo(px,py); else ctx.moveTo(px,py);
    }
    ctx.closePath(); ctx.fillStyle = colour; ctx.fill();
  };
  for (const [x,y,r] of [[384,49,18],[326,113,18],[435,98,15],[384,205,21]]) {
    star(x,y,r,'white'); star(x,y,r*0.72,'#cc142b');
  }
  const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace;
  const root = new Group(); root.name = 'rsa-new-zealand-flagpole';
  const pole = new Mesh(new CylinderGeometry(metres(0.055), metres(0.10), metres(8), 10), lambert(0xf0eee5));
  pole.position.y = metres(4); root.add(pole);
  const foot = new Mesh(new CylinderGeometry(metres(0.35), metres(0.45), metres(0.25), 10), lambert(0x999991));
  foot.position.y = metres(0.125); root.add(foot);
  const geometry = new PlaneGeometry(metres(3.6), metres(1.8), 24, 8);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = (p.getX(i) + metres(1.8)) / metres(3.6);
    p.setXYZ(i, p.getX(i) + metres(1.83), p.getY(i) + metres(6.9) - metres(0.12)*t,
      Math.sin(t*Math.PI*2.5)*metres(0.17)*t);
  }
  geometry.computeVertexNormals();
  root.add(new Mesh(geometry, basic(0xffffff, { map, side: DoubleSide, fog: true })));
  return root;
}
