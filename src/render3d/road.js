// The road surface, its kerbs and run-off apron, and the ground they sit on —
// all built from the geometry buildTrack() already produces. No new track maths
// lives here: `left` and `right` are the same offset polylines the 2D renderer
// filled as quads.
import { BufferGeometry, BufferAttribute, Mesh, PlaneGeometry, DoubleSide } from 'three';
import { WORLD } from '../config.js';
import { C, basic } from './palette.js';

// Strictly ordered so nothing z-fights: ground below the road, apron just above
// it, kerbs a real lip above that. The ground sits a clear 8 units down rather
// than hugging the road — that is 11cm at this scale, invisible to the player,
// but far enough outside the depth buffer's resolution at distance that the two
// surfaces can never argue about which is on top.
export const GROUND_Y = -8;
export const ROAD_Y = 0;
export const APRON_Y = 0.2;
export const KERB_Y = 5;

const KERB_WIDTH = 14;
const APRON_WIDTH = 54; // matches the 2D lineStyle(54, deepHill) run-off band

// Metres of road per texture repeat once a surface texture is dropped in. The
// UVs are generated now so that becomes a material swap rather than a rebuild.
const UV_REPEAT_LENGTH = 512;

// Build a strip between two parallel polylines, two triangles per sample pair.
//
// Non-indexed is deliberate: each quad's six vertices carry their own colour, so
// a surface change (gravel↔sealed, or a rumble strip's red↔white) stays a hard
// edge exactly as the 2D version drew it. An indexed mesh would share vertices
// between neighbouring quads and gradient the colour across a segment instead.
function buildRibbon(inner, outer, y, colorAt, closed) {
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

  const push = (point, u, v, col) => {
    positions[p] = point.x;
    positions[p + 1] = y;
    positions[p + 2] = point.y;
    // These strips are flat, so every normal points straight up. Setting them
    // explicitly means winding never has to be inferred, which is what makes the
    // DoubleSide fix below safe.
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

    push(i0, 0, v0, col);
    push(o0, 1, v0, col);
    push(o1, 1, v1, col);

    push(i0, 0, v0, col);
    push(o1, 1, v1, col);
    push(i1, 0, v1, col);
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

export function buildRoad(track) {
  const { left, right, surfaces, closed } = track;
  const colorAt = (i) => (surfaces && surfaces[i] === 'gravel' ? C.gravel : C.tarmac);
  return buildRibbon(left, right, ROAD_Y, colorAt, closed);
}

// Kerbs, in the two flavours the 2D game had: red/white rumble strips on the
// purpose-built circuit, warm painted edging on the public roads.
export function buildKerbs(track, theme) {
  const { left, right, centerline, closed } = track;
  const rumble = theme === 'manfield';
  // Alternating every 3 samples, matching the old drawRumbleKerb cadence.
  const colorAt = rumble ? (i) => (Math.floor(i / 3) % 2 === 0 ? C.red : C.white) : () => C.cream;

  return [left, right].map((edge) =>
    buildRibbon(edge, offsetOutward(edge, centerline, KERB_WIDTH), KERB_Y, colorAt, closed)
  );
}

// Darker run-off band outside each kerb, for depth against the grass.
export function buildApron(track) {
  const { left, right, centerline, closed } = track;
  const colorAt = () => C.deepHill;
  return [left, right].map((edge) =>
    buildRibbon(
      offsetOutward(edge, centerline, KERB_WIDTH),
      offsetOutward(edge, centerline, KERB_WIDTH + APRON_WIDTH),
      APRON_Y,
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
export function buildGround() {
  const span = Math.max(WORLD.width, WORLD.height) * 6;
  const geometry = new PlaneGeometry(span, span);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new Mesh(geometry, basic(C.hill, { fog: true }));
  mesh.position.set(WORLD.width / 2, GROUND_Y, WORLD.height / 2);
  mesh.frustumCulled = false;
  return mesh;
}
