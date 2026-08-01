// The road surface, its kerbs and run-off apron, and the ground they sit on —
// all built from the geometry buildTrack() already produces. No new track maths
// lives here: `left` and `right` are the same offset polylines the 2D renderer
// filled as quads.
import { BufferGeometry, BufferAttribute, Mesh, PlaneGeometry, DoubleSide } from 'three';
import { WORLD } from '../config.js';
import { C, basic, lambert } from './palette.js';

// Strictly ordered so nothing z-fights: ground below the road, apron just above
// it, kerbs a real lip above that. The ground sits a clear 8 units down rather
// than hugging the road — that is 11cm at this scale, invisible to the player,
// but far enough outside the depth buffer's resolution at distance that the two
// surfaces can never argue about which is on top.
export const GROUND_Y = -8;
export const ROAD_Y = 0;
export const APRON_Y = 0.2;
export const CENTRE_LINE_Y = 0.4;
export const KERB_Y = 5;

const KERB_WIDTH = 14;
const APRON_WIDTH = 54; // matches the 2D lineStyle(54, deepHill) run-off band

// Centre line markings. At ~59 units/metre these are a 15cm-wide stripe in a
// 2.2m-on/3.2m-off cadence — a touch fatter and tighter than the real thing, so
// the dashes still resolve individually at chase-camera distance instead of
// strobing into a dotted blur.
const CENTRE_LINE_WIDTH = 9;
const DASH_LENGTH = 130;
const DASH_GAP = 190;
const DASH_PERIOD = DASH_LENGTH + DASH_GAP;

// Metres of road per texture repeat once a surface texture is dropped in. The
// UVs are generated now so that becomes a material swap rather than a rebuild.
const UV_REPEAT_LENGTH = 512;

// Build a strip between two parallel polylines, two triangles per sample pair.
//
// Non-indexed is deliberate: each quad's six vertices carry their own colour, so
// a surface change (gravel↔sealed, or a rumble strip's red↔white) stays a hard
// edge exactly as the 2D version drew it. An indexed mesh would share vertices
// between neighbouring quads and gradient the colour across a segment instead.
// `y` is either a constant height or a per-sample lookup (i) => height, which is
// how the elevated courses lift the road onto the hillside.
function buildRibbon(inner, outer, y, colorAt, closed) {
  const heightAt = typeof y === 'function' ? y : () => y;
  const n = inner.length;
  const segments = closed ? n : n - 1;

  const positions = new Float32Array(segments * 6 * 3);
  const normals = new Float32Array(segments * 6 * 3);
  const colors = new Float32Array(segments * 6 * 3);
  const uvs = new Float32Array(segments * 6 * 2);

  let p = 0;
  let c = 0;
  let t = 0;
  let arc = 0;

  const push = (point, u, v, col, h) => {
    positions[p] = point.x;
    positions[p + 1] = h;
    positions[p + 2] = point.y;
    // Straight up. These strips are unlit (see the material note below), so the
    // normals are never shaded with — they exist only so nothing downstream has
    // to infer them from the winding, which is what makes DoubleSide safe here.
    normals[p] = 0;
    normals[p + 1] = 1;
    normals[p + 2] = 0;
    p += 3;
    colors[c] = col.r;
    colors[c + 1] = col.g;
    colors[c + 2] = col.b;
    c += 3;
    uvs[t] = u;
    uvs[t + 1] = v;
    t += 2;
  };

  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % n;
    const i0 = inner[i];
    const i1 = inner[j];
    const o0 = outer[i];
    const o1 = outer[j];
    const col = colorAt(i);

    const segLen = Math.hypot(i1.x - i0.x, i1.y - i0.y);
    const v0 = arc / UV_REPEAT_LENGTH;
    const v1 = (arc + segLen) / UV_REPEAT_LENGTH;
    arc += segLen;

    const h0 = heightAt(i);
    const h1 = heightAt(j);

    push(i0, 0, v0, col, h0);
    push(o0, 1, v0, col, h0);
    push(o1, 1, v1, col, h1);

    push(i0, 0, v0, col, h0);
    push(o1, 1, v1, col, h1);
    push(i1, 0, v1, col, h1);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));

  // DoubleSide matters. track.js offsets each centreline sample by ±half along
  // its own normal, which self-intersects wherever a bend is tighter than half
  // the road width — the Remutaka hairpins at roadWidth 150 do exactly that. The
  // overlap produces back-facing triangles; drawing both sides makes the fold
  // invisible instead of a hole. (In 2D the same overlap was the "green stripe
  // through the tarmac" bug the old comments refer to.)
  //
  // Unlit, deliberately. These are flat horizontal surfaces, so a Lambert
  // material would shade every triangle by the same constant anyway — all it
  // adds is a lighting rig standing between the authored palette and what the
  // player sees, which had COLORS.tarmac reading as near-black. Basic gives the
  // exact colour from config.js, which is what "recognition before detail" in
  // docs/ART-DIRECTION.md asks for. Meshes with real form (Beryl, trees) are lit
  // normally — that is where shading actually carries information.
  const material = basic(0xffffff, { vertexColors: true, side: DoubleSide, fog: true });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false; // one mesh spanning the whole world
  return mesh;
}

// Offset a polyline sideways, away from the centreline it was derived from.
function offsetOutward(edge, centerline, amount) {
  const out = [];
  for (let i = 0; i < edge.length; i++) {
    let nx = edge[i].x - centerline[i].x;
    let ny = edge[i].y - centerline[i].y;
    const len = Math.hypot(nx, ny) || 1;
    nx /= len;
    ny /= len;
    out.push({ x: edge[i].x + nx * amount, y: edge[i].y + ny * amount });
  }
  return out;
}

// Per-sample height for one of the road strips, at a fixed offset above the road
// surface. Flat courses collapse to a constant.
function heightsFor(track, offset) {
  if (!track.heights) return offset;
  return (i) => track.heights[i] + offset;
}

export function buildRoad(track) {
  const { left, right, surfaces, closed } = track;
  const colorAt = (i) => (surfaces && surfaces[i] === 'gravel' ? C.gravel : C.tarmac);
  return buildRibbon(left, right, heightsFor(track, ROAD_Y), colorAt, closed);
}

// Kerbs, in the two flavours the 2D game had: red/white rumble strips on the
// purpose-built circuit, warm painted edging on the public roads.
export function buildKerbs(track, theme) {
  const { left, right, centerline, closed } = track;
  const rumble = theme === 'manfield';
  // Alternating every 3 samples, matching the old drawRumbleKerb cadence.
  const colorAt = rumble ? (i) => (Math.floor(i / 3) % 2 === 0 ? C.red : C.white) : () => C.cream;

  return [left, right].map((edge) =>
    buildRibbon(
      edge,
      offsetOutward(edge, centerline, KERB_WIDTH),
      heightsFor(track, KERB_Y),
      colorAt,
      closed
    )
  );
}

// Dashed centre line down the sealed road.
//
// Built by walking the centreline and clipping each segment against the dash
// cadence, rather than by dropping a dash at every Nth sample. Samples are
// evenly spaced in *parameter*, not in distance — a long straight anchor span
// and a tight hairpin produce very differently sized steps — so per-sample
// dashes would stretch and bunch with the curvature. Clipping against
// accumulated arc length keeps every dash the same length on the ground.
//
// Skipped on gravel, where there is no seal to paint, and on the circuit, which
// has racing kerbs instead (see buildKerbs).
export function buildCentreLine(track) {
  const { centerline, left, surfaces, closed, heights } = track;
  const n = centerline.length;
  const segments = closed ? n : n - 1;

  const positions = [];
  const normals = [];
  const uvs = [];

  // Unit normal pointing to the left edge, which is the direction track.js
  // already offset that polyline along.
  const normalAt = (i) => {
    const nx = left[i].x - centerline[i].x;
    const ny = left[i].y - centerline[i].y;
    const len = Math.hypot(nx, ny) || 1;
    return { x: nx / len, y: ny / len };
  };
  const heightAt = (i) => (heights ? heights[i] : 0) + CENTRE_LINE_Y;

  const half = CENTRE_LINE_WIDTH / 2;
  const push = (px, pz, h, u, v) => {
    positions.push(px, h, pz);
    normals.push(0, 1, 0);
    uvs.push(u, v);
  };

  // One dash quad, spanning parameter t0..t1 of the segment i→j.
  const emit = (i, j, t0, t1) => {
    const a = centerline[i];
    const b = centerline[j];
    const na = normalAt(i);
    const nb = normalAt(j);
    const ha = heightAt(i);
    const hb = heightAt(j);

    const at = (t) => ({
      x: a.x + (b.x - a.x) * t,
      z: a.y + (b.y - a.y) * t,
      nx: na.x + (nb.x - na.x) * t,
      nz: na.y + (nb.y - na.y) * t,
      h: ha + (hb - ha) * t,
    });

    const p0 = at(t0);
    const p1 = at(t1);
    push(p0.x - p0.nx * half, p0.z - p0.nz * half, p0.h, 0, 0);
    push(p0.x + p0.nx * half, p0.z + p0.nz * half, p0.h, 1, 0);
    push(p1.x + p1.nx * half, p1.z + p1.nz * half, p1.h, 1, 1);
    push(p0.x - p0.nx * half, p0.z - p0.nz * half, p0.h, 0, 0);
    push(p1.x + p1.nx * half, p1.z + p1.nz * half, p1.h, 1, 1);
    push(p1.x - p1.nx * half, p1.z - p1.nz * half, p1.h, 0, 1);
  };

  let arc = 0;
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % n;
    const segLen = Math.hypot(centerline[j].x - centerline[i].x, centerline[j].y - centerline[i].y);
    if (segLen <= 0) continue;

    if (!(surfaces && surfaces[i] === 'gravel')) {
      const end = arc + segLen;
      // Every dash window that overlaps this segment, clipped to it. Usually one
      // or none, but a long segment can span several.
      for (let k = Math.floor(arc / DASH_PERIOD); k * DASH_PERIOD < end; k++) {
        const dStart = Math.max(arc, k * DASH_PERIOD);
        const dEnd = Math.min(end, k * DASH_PERIOD + DASH_LENGTH);
        if (dEnd > dStart) emit(i, j, (dStart - arc) / segLen, (dEnd - arc) / segLen);
      }
    }
    arc += segLen;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));

  // Unlit and DoubleSide for the same reasons the road itself is — see
  // buildRibbon. One mesh for every dash on the course, so one draw call.
  const mesh = new Mesh(geometry, basic(C.cream, { side: DoubleSide, fog: true }));
  mesh.frustumCulled = false;
  return mesh;
}

// Darker run-off band outside each kerb, for depth against the grass.
export function buildApron(track) {
  const { left, right, centerline, closed } = track;
  const colorAt = () => C.deepHill;
  return [left, right].map((edge) =>
    buildRibbon(
      offsetOutward(edge, centerline, KERB_WIDTH),
      offsetOutward(edge, centerline, KERB_WIDTH + APRON_WIDTH),
      heightsFor(track, APRON_Y),
      colorAt,
      closed
    )
  );
}

// One big untessellated quad. There is no per-vertex terrain detail to carry, so
// subdividing it would only cost vertices.
//
// Sized well past the world rather than snugly around it: the camera can see
// past a world-sized plane when the car is near an edge, and a visible plane
// edge at the horizon instantly reads as "the ground has run out". Big enough
// that fog always saturates to sky before the edge could come into view.
export function buildGround(terrain) {
  const info = terrain && terrain.describe();

  // Elevated courses get a real surface built from the same height grid the
  // physics reads, so what the player drives on and what they see are the same
  // data. Flat courses keep the single cheap quad.
  if (info && !info.flat) return buildTerrainMesh(info);

  const span = Math.max(WORLD.width, WORLD.height) * 6;
  const geometry = new PlaneGeometry(span, span);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new Mesh(geometry, basic(C.hill, { fog: true }));
  mesh.position.set(WORLD.width / 2, GROUND_Y, WORLD.height / 2);
  mesh.frustumCulled = false;
  return mesh;
}

// The height grid as a lit mesh. Lit, unlike the road: this one has real form,
// so shading is doing actual work — it is what makes a hillside read as a
// hillside rather than a flat green field.
function buildTerrainMesh(info) {
  const { cols, rows, cell, minX, minY, grid } = info;
  const positions = new Float32Array(cols * rows * 3);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = (r * cols + c) * 3;
      positions[k] = minX + c * cell;
      positions[k + 1] = grid[r * cols + c] + GROUND_Y;
      positions[k + 2] = minY + r * cell;
    }
  }

  const quads = (cols - 1) * (rows - 1);
  const indices = new Uint32Array(quads * 6);
  let t = 0;
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c;
      const b = a + 1;
      const d = a + cols;
      const e = d + 1;
      indices[t++] = a; indices[t++] = d; indices[t++] = e;
      indices[t++] = a; indices[t++] = e; indices[t++] = b;
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  // Indexed, so shared vertices average into a smooth hillside rather than
  // showing every grid facet.
  geometry.computeVertexNormals();

  const mesh = new Mesh(geometry, lambert(C.hill, { fog: true }));
  mesh.frustumCulled = false;
  return mesh;
}
