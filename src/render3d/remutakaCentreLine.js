import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Mesh,
} from 'three';
import { basic } from './palette.js';

// Remutaka is a no-passing mountain road. The yellow centre markings are one of
// the strongest cues in the reference footage, and the generic dashed cream
// line made the level read like an invented country road.
const LINE_WIDTH = 8;
const LINE_OFFSET = 10;
const LINE_Y = 0.46;
const YELLOW = 0xf2c230;

function inParking(track, i) {
  if (!track.pavedAreas?.length) return false;
  const p = track.centerline[i];
  const sameSide = (a, b, c, x, y) => {
    const cross = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
    return cross;
  };
  return track.pavedAreas.some(([a, b, c]) => {
    const d1 = sameSide(a, b, c, p.x, p.y);
    const d2 = sameSide(b, c, a, p.x, p.y);
    const d3 = sameSide(c, a, b, p.x, p.y);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
  });
}

export function buildRemutakaCentreLine(track, skipAt = null) {
  const { centerline, left, surfaces, closed, heights } = track;
  const n = centerline.length;
  const segments = closed ? n : n - 1;
  const positions = [];
  const normals = [];

  const normalAt = (i) => {
    const nx = left[i].x - centerline[i].x;
    const nz = left[i].y - centerline[i].y;
    const len = Math.hypot(nx, nz) || 1;
    return { x: nx / len, z: nz / len };
  };
  const heightAt = (i) => (heights ? heights[i] : 0) + LINE_Y;

  const push = (x, z, y) => {
    positions.push(x, y, z);
    normals.push(0, 1, 0);
  };

  const emitLine = (i, j, lateral) => {
    const a = centerline[i];
    const b = centerline[j];
    const na = normalAt(i);
    const nb = normalAt(j);
    const ha = heightAt(i);
    const hb = heightAt(j);
    const half = LINE_WIDTH / 2;

    const aCentreX = a.x + na.x * lateral;
    const aCentreZ = a.y + na.z * lateral;
    const bCentreX = b.x + nb.x * lateral;
    const bCentreZ = b.y + nb.z * lateral;

    const a0x = aCentreX - na.x * half;
    const a0z = aCentreZ - na.z * half;
    const a1x = aCentreX + na.x * half;
    const a1z = aCentreZ + na.z * half;
    const b0x = bCentreX - nb.x * half;
    const b0z = bCentreZ - nb.z * half;
    const b1x = bCentreX + nb.x * half;
    const b1z = bCentreZ + nb.z * half;

    push(a0x, a0z, ha);
    push(a1x, a1z, ha);
    push(b1x, b1z, hb);
    push(a0x, a0z, ha);
    push(b1x, b1z, hb);
    push(b0x, b0z, hb);
  };

  for (let i = 0; i < segments; i += 1) {
    const j = (i + 1) % n;
    if (surfaces && surfaces[i] === 'gravel') continue;
    if (skipAt && skipAt(i)) continue;
    if (inParking(track, i)) continue;
    emitLine(i, j, -LINE_OFFSET);
    emitLine(i, j, LINE_OFFSET);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));

  const mesh = new Mesh(geometry, basic(YELLOW, { side: DoubleSide, fog: true }));
  mesh.name = 'remutaka-double-yellow-centre-line';
  mesh.frustumCulled = false;
  return mesh;
}
