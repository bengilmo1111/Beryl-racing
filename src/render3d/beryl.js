// Beryl, the family's turquoise Morris Minor 1000, as a low-poly shell — and,
// since the road got busy, every other Minor on it too. They are the same car in
// different paint; see buildBeryl's options at the foot of the file.
//
// Render-only: nothing here is read by the simulation. The shape is built from
// two lofted shells — a low body and an upright greenhouse — and every piece of
// trim that has to sit *on* one of those shells asks the shell where its skin is
// rather than repeating a coordinate. That is the whole discipline of this file:
// a hard-coded window pinned to a shell that later moves becomes a pane floating
// in mid-air, and pillars pinned that way become aerials sticking out of a roof.
import {
  Group,
  Mesh,
  BoxGeometry,
  CylinderGeometry,
  CircleGeometry,
  SphereGeometry,
  Shape,
  ShapeGeometry,
  Color,
  BufferGeometry,
  Float32BufferAttribute,
  DoubleSide,
  Matrix4,
  Vector3,
  MeshPhongMaterial,
  TubeGeometry,
  TorusGeometry,
  CatmullRomCurve3,
} from 'three';
import { CAR } from '../config.js';
import { C, lambert, basic } from './palette.js';
import { toThree, yawFor, alphaFor } from './coords.js';

// The gameplay footprint is unchanged; height matches the real car's ratio.
// A Minor 1000 is 3759 mm long and 1524 mm tall, so 217.6 units of length wants
// about 88 units of height. The width is deliberately over scale — it is the
// collision box as much as the car.
export const BERYL = { width: 108.8, length: 217.6, height: 91 };

const W = BERYL.width;
const L = BERYL.length;
const WHEEL_R = W * 0.205;
const WHEEL_W = W * 0.12;
const AXLE_FRONT = -L * 0.31;
const AXLE_REAR = L * 0.255;
const AXLE_X = W * 0.425;

// Widest half-width of the greenhouse. Cabin stations and the screens that span
// them are both expressed against this, so the roof and the glass in it stay in
// proportion when one of them is retuned.
const CABIN_HW = W * 0.405;
// How far glass stands off the shell it is set into. Enough to beat depth
// fighting at chase distance, small enough to read as flush.
const GLASS_PROUD = 1.8;

// Cross-sections, as the right-hand half of a closed ring walked from sill to
// crown: `x` is a fraction of the station half-width, `y` a fraction of its
// height, and `c` a multiple of its centre crown added on top.
//
// The body is round-shouldered and tumbles home hard, which is what gives the
// wings and boot their bulge. The greenhouse carries its width much higher and
// tumbles home only gently, because a Minor's is an upright glasshouse, not a
// fastback bubble — using one profile for both was what made the cabin read as a
// dome with a dark band cut in it.
const BODY_PROFILE = [
  { x: 0.60, y: 0.00, c: 0 },
  { x: 0.83, y: 0.06, c: 0 },
  { x: 0.96, y: 0.18, c: 0 },
  { x: 1.00, y: 0.39, c: 0 },
  { x: 0.99, y: 0.60, c: 0 },
  { x: 0.91, y: 0.78, c: 0 },
  { x: 0.73, y: 0.91, c: 0 },
  { x: 0.40, y: 1.00, c: 0.6 },
  { x: 0.00, y: 1.00, c: 1 },
];

const CABIN_PROFILE = [
  { x: 0.72, y: 0.00, c: 0 },
  { x: 0.90, y: 0.10, c: 0 },
  { x: 0.98, y: 0.26, c: 0 },
  { x: 1.00, y: 0.48, c: 0 },
  { x: 0.99, y: 0.66, c: 0 },
  { x: 0.94, y: 0.80, c: 0 },
  { x: 0.82, y: 0.91, c: 0 },
  { x: 0.46, y: 1.00, c: 0.6 },
  { x: 0.00, y: 1.00, c: 1 },
];

// Low body shell: a long bonnet that is deliberately much narrower than the
// car — on a Minor the width at the front comes from the faired wings either
// side of it, not from the bonnet itself — a shoulder that runs level from the
// scuttle to the rear door, then a short rounded boot.
const BODY_STATIONS = [
  { z: -L * 0.500, halfWidth: W * 0.20, bottom: 27, top: 40, crown: 1 },
  { z: -L * 0.472, halfWidth: W * 0.29, bottom: 22, top: 45, crown: 1.5 },
  { z: -L * 0.430, halfWidth: W * 0.33, bottom: 19, top: 49, crown: 2 },
  { z: -L * 0.350, halfWidth: W * 0.355, bottom: 17, top: 53, crown: 2.5 },
  { z: -L * 0.250, halfWidth: W * 0.395, bottom: 16, top: 57, crown: 2.5 },
  { z: -L * 0.150, halfWidth: W * 0.465, bottom: 15, top: 60, crown: 2 },
  { z: -L * 0.040, halfWidth: W * 0.50, bottom: 14, top: 62, crown: 1.5 },
  { z: L * 0.080, halfWidth: W * 0.50, bottom: 14, top: 62, crown: 1.5 },
  { z: L * 0.200, halfWidth: W * 0.495, bottom: 15, top: 62, crown: 1.5 },
  { z: L * 0.300, halfWidth: W * 0.478, bottom: 17, top: 61, crown: 1.5 },
  { z: L * 0.390, halfWidth: W * 0.44, bottom: 20, top: 59, crown: 1.5 },
  { z: L * 0.465, halfWidth: W * 0.375, bottom: 23, top: 56, crown: 1 },
  { z: L * 0.500, halfWidth: W * 0.27, bottom: 26, top: 49, crown: 1 },
];

// Greenhouse. It springs from below the body shoulder so the two shells meet
// with no seam, climbs a steep windscreen, runs flat for a third of the car and
// drops down an upright rear screen. `bottom` is buried inside the body — the
// visible belt line is BELT, below.
// The greenhouse reaches nearly its full width at the scuttle and only its
// *height* climbs the windscreen — a cabin that narrows towards the front as
// well leaves the windscreen sitting on a ridge, with nothing wide enough
// underneath it to be a scuttle.
const CABIN_STATIONS = [
  { z: -L * 0.190, halfWidth: CABIN_HW * 0.80, bottom: 56, top: 59, crown: 0.3 },
  { z: -L * 0.160, halfWidth: CABIN_HW * 0.86, bottom: 56, top: 66, crown: 1 },
  { z: -L * 0.125, halfWidth: CABIN_HW * 0.92, bottom: 56, top: 78, crown: 2 },
  { z: -L * 0.090, halfWidth: CABIN_HW * 0.965, bottom: 56, top: 86, crown: 3 },
  { z: L * 0.030, halfWidth: CABIN_HW * 1.00, bottom: 56, top: 88, crown: 3 },
  { z: L * 0.150, halfWidth: CABIN_HW * 0.99, bottom: 56, top: 87, crown: 3 },
  { z: L * 0.240, halfWidth: CABIN_HW * 0.92, bottom: 56, top: 84, crown: 2.5 },
  { z: L * 0.305, halfWidth: CABIN_HW * 0.78, bottom: 56, top: 68, crown: 1.5 },
  { z: L * 0.350, halfWidth: CABIN_HW * 0.58, bottom: 55, top: 60, crown: 1 },
];

// Bottom of the side glass, just above the body shoulder.
const BELT = 64;

function box(w, h, d, x, y, z, material) {
  const mesh = new Mesh(new BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
}

function ring(station, profile) {
  const { halfWidth: w, bottom, top } = station;
  const h = top - bottom;
  const crown = station.crown || 0;
  const points = [];
  for (const p of profile) points.push([-p.x * w, bottom + p.y * h + p.c * crown]);
  // Mirror back down the other side, sharing the crown and closing across the flat sill.
  for (let i = profile.length - 2; i >= 0; i -= 1) {
    const p = profile[i];
    points.push([p.x * w, bottom + p.y * h + p.c * crown]);
  }
  return points;
}

// Where the skin of a station sits at a given height. This is the query that
// keeps glass and trim on the shell.
function skinAt(station, y) {
  const { halfWidth: w, bottom, top } = station;
  const h = top - bottom || 1;
  const crown = station.crown || 0;
  const heightOf = (p) => bottom + p.y * h + p.c * crown;
  const profile = station.profile;
  if (y <= heightOf(profile[0])) return profile[0].x * w;
  for (let i = 1; i < profile.length; i += 1) {
    const ya = heightOf(profile[i - 1]);
    const yb = heightOf(profile[i]);
    if (y > yb) continue;
    const t = yb === ya ? 0 : (y - ya) / (yb - ya);
    return (profile[i - 1].x + (profile[i].x - profile[i - 1].x) * t) * w;
  }
  return 0;
}

// Height of a station's skin directly above a lateral offset — the inverse of
// skinAt, and what lets a windscreen be laid *over* the front of the greenhouse
// instead of chording straight through it.
function topAt(station, x) {
  const { halfWidth: w, bottom, top } = station;
  const h = top - bottom || 1;
  const crown = station.crown || 0;
  const profile = station.profile;
  const heightOf = (p) => bottom + p.y * h + p.c * crown;
  const want = Math.abs(x);
  // Walk down from the crown. x grows on the way down until the widest point,
  // which is as far as a pane laid over the top can reach.
  for (let i = profile.length - 1; i > 0; i -= 1) {
    const xa = profile[i].x * w;
    const xb = profile[i - 1].x * w;
    if (xb <= xa) return heightOf(profile[i]);
    if (want > xb) continue;
    const t = (want - xa) / (xb - xa);
    return heightOf(profile[i]) + (heightOf(profile[i - 1]) - heightOf(profile[i])) * t;
  }
  return heightOf(profile[0]);
}

// A station interpolated between the authored ones, so trim can be hung
// anywhere along a shell rather than only where a station happens to be.
function stationAt(stations, z) {
  const first = stations[0];
  const last = stations[stations.length - 1];
  if (z <= first.z) return first;
  if (z >= last.z) return last;
  for (let i = 1; i < stations.length; i += 1) {
    const b = stations[i];
    if (z > b.z) continue;
    const a = stations[i - 1];
    const t = (z - a.z) / (b.z - a.z);
    const mix = (key) => a[key] + (b[key] - a[key]) * t;
    return {
      z,
      halfWidth: mix('halfWidth'),
      bottom: mix('bottom'),
      top: mix('top'),
      crown: mix('crown'),
      profile: a.profile,
    };
  }
  return last;
}

function loftGeometry(stations) {
  const positions = [];
  const indices = [];
  const rings = stations.map((station) => ring(station, station.profile));
  const ringSize = rings[0].length;

  for (let i = 0; i < stations.length; i += 1) {
    for (const [x, y] of rings[i]) positions.push(x, y, stations[i].z);
  }

  for (let i = 0; i < stations.length - 1; i += 1) {
    const a0 = i * ringSize;
    const b0 = (i + 1) * ringSize;
    for (let j = 0; j < ringSize; j += 1) {
      const next = (j + 1) % ringSize;
      const a = a0 + j;
      const b = a0 + next;
      const c = b0 + j;
      const d = b0 + next;
      indices.push(a, c, b, b, c, d);
    }
  }

  const frontCenter = positions.length / 3;
  const first = stations[0];
  positions.push(0, (first.bottom + first.top) / 2, first.z);
  const rearCenter = positions.length / 3;
  const lastIndex = stations.length - 1;
  const last = stations[lastIndex];
  positions.push(0, (last.bottom + last.top) / 2, last.z);

  for (let j = 0; j < ringSize; j += 1) {
    const next = (j + 1) % ringSize;
    indices.push(frontCenter, j, next);
    indices.push(rearCenter, lastIndex * ringSize + next, lastIndex * ringSize + j);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// An ellipsoid baked where it stands, as geometry rather than a mesh. The wings
// are scaled and shifted spheres whose wheel arches have to be cut out of them
// *in place* — clipping a unit sphere at the origin against an arch that is two
// thirds of a car length away removes nothing at all.
//
// Scale and offset go in as one composed matrix rather than as a scale pass
// followed by a translate pass. Positions are stored as float32, so two passes
// round twice and land a few millionths of a unit away from one pass — and a
// vertex that lands a few millionths the far side of one of wheelArches'
// forty-eight clip planes comes back as a different triangle.
const _bake = new Matrix4();
function ellipsoidGeometry(rx, ry, rz, x, y, z) {
  const geometry = new SphereGeometry(1, 16, 8);
  geometry.applyMatrix4(_bake.makeScale(rx, ry, rz).setPosition(x, y, z));
  return geometry;
}

// Subtract two convex axle tunnels from the shell. The old solid wing ellipsoids
// cut through the tyres and hubcaps; simply moving the wheels outward leaves a
// kart-like stance. Clip triangles at the actual wheel circles instead.
function wheelArches(geometry) {
  const source = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const p = source.attributes.position, n = source.attributes.normal;
  let triangles = [];
  for (let i = 0; i < p.count; i += 3) triangles.push([0, 1, 2].map(j => ({
    p: [p.getX(i+j), p.getY(i+j), p.getZ(i+j)],
    n: [n.getX(i+j), n.getY(i+j), n.getZ(i+j)],
  })));
  for (const axle of [AXLE_FRONT, AXLE_REAR]) {
    const out = [];
    for (const triangle of triangles) {
      let remaining = triangle;
      for (let i = 0; i < 24 && remaining.length; i++) {
        const angle = i / 24 * Math.PI * 2;
        const distance = v => (v.p[1] - WHEEL_R) * Math.cos(angle)
          + (v.p[2] - axle) * Math.sin(angle) - WHEEL_R * 1.09;
        const inside = [], outside = [];
        for (let j = 0; j < remaining.length; j++) {
          const a = remaining[j], b = remaining[(j + 1) % remaining.length];
          const da = distance(a), db = distance(b);
          (da <= 0 ? inside : outside).push(a);
          if ((da <= 0) !== (db <= 0)) {
            const t = da / (da - db);
            const v = { p: a.p.map((x, k) => x + (b.p[k] - x) * t),
              n: a.n.map((x, k) => x + (b.n[k] - x) * t) };
            inside.push(v); outside.push(v);
          }
        }
        for (let j = 1; j < outside.length - 1; j++) out.push([outside[0], outside[j], outside[j+1]]);
        remaining = inside;
      }
    }
    triangles = out;
  }
  const result = new BufferGeometry();
  result.setAttribute('position', new Float32BufferAttribute(triangles.flatMap(t => t.flatMap(v => v.p)), 3));
  result.setAttribute('normal', new Float32BufferAttribute(triangles.flatMap(t => t.flatMap(v => v.n)), 3));
  result.normalizeNormals();
  source.dispose();
  geometry.dispose();
  return result;
}

function ellipsoid(rx, ry, rz, x, y, z, material) {
  const mesh = new Mesh(new SphereGeometry(1, 16, 8), material);
  mesh.scale.set(rx, ry, rz);
  mesh.position.set(x, y, z);
  return mesh;
}

// A quad grid from rows of equal length. Glass is built this way rather than as
// single quads because a flat quad spanning a curved shell chords across it and
// sinks inside — which is exactly how a windscreen disappears.
function sheetGeometry(rows) {
  const positions = [];
  const indices = [];
  const cols = rows[0].length;
  for (const row of rows) for (const p of row) positions.push(p[0], p[1], p[2]);
  for (let r = 0; r < rows.length - 1; r += 1) {
    for (let c = 0; c < cols - 1; c += 1) {
      const a = r * cols + c;
      const b = a + 1;
      const d = (r + 1) * cols + c;
      const e = d + 1;
      indices.push(a, d, b, b, d, e);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function buildBumper(width, z, y, material) {
  const geometry = new CylinderGeometry(3.8, 3.8, width, 12);
  geometry.rotateZ(Math.PI / 2);
  const bumper = new Mesh(geometry, material);
  bumper.position.set(0, y, z);
  return bumper;
}

function buildWheel(materials, side, photoBody) {
  const group = new Group();
  const hub = new Group();

  const tyreGeom = new CylinderGeometry(WHEEL_R, WHEEL_R, WHEEL_W, photoBody ? 32 : 18);
  tyreGeom.rotateZ(Math.PI / 2);
  hub.add(new Mesh(tyreGeom, materials.tyre));

  const wallGeom = new CylinderGeometry(
    WHEEL_R * (photoBody ? 0.76 : 0.67),
    WHEEL_R * (photoBody ? 0.76 : 0.67),
    WHEEL_W + 1.5,
    photoBody ? 32 : 18
  );
  wallGeom.rotateZ(Math.PI / 2);
  hub.add(new Mesh(wallGeom, materials.whitewall));

  const dishGeom = new CylinderGeometry(
    WHEEL_R * (photoBody ? 0.57 : 0.5),
    WHEEL_R * (photoBody ? 0.57 : 0.5),
    WHEEL_W + 2,
    photoBody ? 32 : 16
  );
  dishGeom.rotateZ(Math.PI / 2);
  hub.add(new Mesh(dishGeom, materials.body));

  if (photoBody) {
    // Beryl's domed hubcaps catch the light around a little red Morris centre.
    const x = side * (WHEEL_W / 2 + 1);
    hub.add(ellipsoid(3, WHEEL_R * 0.43, WHEEL_R * 0.43, x, 0, 0, materials.chrome));
    hub.add(ellipsoid(0.5, 2.2, 2.2, x + side * 3, 0, 0, materials.accent));
  } else {
    const capGeom = new CylinderGeometry(
      WHEEL_R * 0.39,
      WHEEL_R * 0.39,
      WHEEL_W + 3,
      14
    );
    capGeom.rotateZ(Math.PI / 2);
    hub.add(new Mesh(capGeom, materials.chrome));
  }

  group.add(hub);
  group.userData.hub = hub;
  return group;
}

// Beryl's turquoise. Traffic Minors are handed a colour of their own; this is
// the one the car wears when nobody asks for anything else.
const TURQUOISE = 0x19bdd0;

// Every Minor on the road is the same car, and only the paint tells them apart.
// So the shape is built once and every mesh that wants it shares the geometry.
//
// That is not a micro-optimisation. wheelArches() clips each triangle of the
// shell and of all four wings against forty-eight planes, and a road with a
// dozen cars on it would otherwise pay that bill a dozen times over at the
// moment the course loads.
//
// The consequence is that these geometries outlive any one car, while the scene
// graph that holds them disposes everything it can reach when a race ends (see
// RaceWorld.destroy). resetBerylGeometry() below is how the two are kept
// honest, and skipping the call leaves the *next* race with empty husks.
const shapeCache = new Map();

function berylShapes(photoBody = false) {
  if (shapeCache.has(photoBody)) return shapeCache.get(photoBody);

  // The player keeps the real car's broad upright rear cabin and a continuous
  // sloping boot. Traffic retains its established lightweight silhouette.
  const rearBody = [
    { z: L * 0.300, halfWidth: W * 0.48, bottom: 17, top: 63, crown: 1.5 },
    { z: L * 0.390, halfWidth: W * 0.45, bottom: 19, top: 60, crown: 1.5 },
    { z: L * 0.465, halfWidth: W * 0.405, bottom: 21, top: 47, crown: 1 },
    { z: L * 0.505, halfWidth: W * 0.36, bottom: 23, top: 29, crown: 1 },
  ];
  const rearCabin = [
    { z: L * 0.240, halfWidth: CABIN_HW * 0.99, bottom: 56, top: 85, crown: 2.5 },
    { z: L * 0.305, halfWidth: CABIN_HW * 0.94, bottom: 56, top: 69, crown: 1.5 },
    { z: L * 0.350, halfWidth: CABIN_HW * 0.82, bottom: 55, top: 60, crown: 1 },
  ];
  const body = (photoBody ? [...BODY_STATIONS.slice(0, 9), ...rearBody] : BODY_STATIONS)
    .map((s) => ({ ...s, profile: BODY_PROFILE }));
  const cabin = (photoBody ? [...CABIN_STATIONS.slice(0, 6), ...rearCabin] : CABIN_STATIONS)
    .map((s) => ({ ...s, profile: CABIN_PROFILE }));

  if (photoBody) {
    // The bonnet stands above the wing tops. The boot, by contrast,
    // tucks between two proud rear wings.
    for (const [i, rise] of [8, 10, 10, 9, 6, 2].entries()) body[i].top += rise;
    for (const station of body) {
      station.halfWidth *= 1 - 0.09 * clamp((station.z / L - 0.15) / 0.15, 0, 1);
    }
  }

  const shell = wheelArches(loftGeometry(body));
  const greenhouse = loftGeometry(cabin);

  // Where the flank of the greenhouse is, at any point glass has to sit on it.
  const cabinSkin = (z, y) => skinAt(stationAt(cabin, z), y);

  // Height of the greenhouse's upper surface at a point, and the outward normal
  // there, by central difference. Lifting glass along the true local normal is
  // what stops it grazing the shell: a single offset per row leaves the outer
  // columns exactly coplanar, which is z-fighting, which is the torn shards a
  // windscreen turns into.
  const cabinTop = (z, x) => topAt(stationAt(cabin, z), x);
  const EPS = 0.8;
  const topNormal = (z, x) => {
    const nx = -(cabinTop(z, x + EPS) - cabinTop(z, x - EPS)) / (2 * EPS);
    const nz = -(cabinTop(z + EPS, x) - cabinTop(z - EPS, x)) / (2 * EPS);
    const len = Math.hypot(nx, 1, nz);
    return [nx / len, 1 / len, nz / len];
  };
  const flankNormal = (z, y) => {
    const ny = -(cabinSkin(z, y + EPS) - cabinSkin(z, y - EPS)) / (2 * EPS);
    const nz = -(cabinSkin(z + EPS, y) - cabinSkin(z - EPS, y)) / (2 * EPS);
    const len = Math.hypot(1, ny, nz);
    return [1 / len, ny / len, nz / len];
  };

  // The panes, and the chrome surrounds of the two screens. Collected rather
  // than added to a group, because the group is per car and these are not.
  const glass = [];
  const screenTrim = [];
  const sideSeals = [];
  const wipers = [];

  // A screen laid over the front or rear slope of the greenhouse. Only the z
  // range and the width are authored: the height at every point comes from the
  // shell, so the windscreen's rake *is* the shell's rake and cannot drift.
  const screen = (zFront, zRear, halfFront, halfRear) => {
    const steps = 6;
    const rows = [];
    for (let i = 0; i <= steps; i += 1) {
      const u = i / steps;
      const z = zFront + (zRear - zFront) * u;
      const half = (halfFront + (halfRear - halfFront) * u)
        * (0.88 + 0.12 * Math.sin(Math.PI * u));
      rows.push([-half, -half * 0.5, 0, half * 0.5, half].map((x) => {
        const n = topNormal(z, x);
        return [
          x + n[0] * GLASS_PROUD,
          cabinTop(z, x) + n[1] * GLASS_PROUD,
          z + n[2] * GLASS_PROUD,
        ];
      }));
    }
    glass.push(sheetGeometry(rows));
    if (photoBody && zFront < 0) {
      for (const side of [-1, 1]) {
        const edge = side < 0 ? 0 : 4;
        const mid = side < 0 ? 1 : 3;
        const pivot = new Vector3(...rows[0][mid]);
        const end = new Vector3(...rows[1][edge]).lerp(new Vector3(...rows[1][mid]), 0.12);
        const inner = new Vector3(...rows[1][mid]).lerp(new Vector3(...rows[1][2]), 0.6);
        for (const point of [pivot, end, inner]) point.z -= 0.75;
        wipers.push(new TubeGeometry(new CatmullRomCurve3([pivot, inner.clone().lerp(end, 0.58), end]),
          10, 0.36, 5));
        wipers.push(new TubeGeometry(new CatmullRomCurve3([inner, inner.clone().lerp(end, 0.5), end]),
          10, 0.55, 5));
      }
    }
    const outline = [...rows[0], ...rows.slice(1).map(r => r.at(-1)),
      ...rows.at(-1).slice(0, -1).reverse(), ...rows.slice(1, -1).reverse().map(r => r[0])];
    screenTrim.push(new TubeGeometry(new CatmullRomCurve3(
      outline.map(p => new Vector3(...p)), true), 48, 0.7, 5, true));
  };

  // A side window, as a bottom and top edge run along the cabin flank. Each
  // sample takes its lateral position from the flank, so the pane follows the
  // tumblehome instead of cutting a chord through it.
  const sideGlass = (corners) => {
    const steps = 6;
    const [frontLow, frontHigh, rearHigh, rearLow] = corners;
    for (const sx of [-1, 1]) {
      const rows = [[], [], []];
      for (let i = 0; i <= steps; i += 1) {
        const u = i / steps;
        const lerp = (a, b) => a + (b - a) * u;
        const low = { z: lerp(frontLow.z, rearLow.z), y: lerp(frontLow.y, rearLow.y) };
        const high = { z: lerp(frontHigh.z, rearHigh.z), y: lerp(frontHigh.y, rearHigh.y) };
        if (photoBody) {
          const corner = Math.abs(2 * u - 1) ** 6;
          low.y += 1.2 * corner;
          high.y -= 1.7 * corner;
        }
        const mid = { z: (low.z + high.z) / 2, y: (low.y + high.y) / 2 };
        for (const [row, p] of [[0, low], [1, mid], [2, high]]) {
          const n = flankNormal(p.z, p.y);
          rows[row].push([
            sx * (cabinSkin(p.z, p.y) + n[0] * GLASS_PROUD),
            p.y + n[1] * GLASS_PROUD,
            p.z + n[2] * GLASS_PROUD,
          ]);
        }
      }
      glass.push(sheetGeometry(rows));
      if (photoBody) {
        const edge = [...rows[0], rows[1].at(-1), ...rows[2].slice().reverse(), rows[1][0]];
        sideSeals.push(new TubeGeometry(new CatmullRomCurve3(
          edge.map(point => new Vector3(...point)), true), 48, 0.45, 5, true));
      }
    }
  };

  // Rounded wings. The front pair are the car's full width and carry the
  // headlamps; the rear pair are low blisters on the flank. They are what makes
  // the narrow bonnet read as a Minor rather than as a slab. Each is baked where
  // it sits and then has the wheel arch cut out of it, exactly as the shell does.
  const wings = [];
  for (const sx of [-1, 1]) {
    if (photoBody) {
      // A lamp-sized face at the nose widens into a deep arch, then tails
      // off against the front door. A sphere pinches shut at both ends.
      const stations = [
        [-0.473, 9.3, 30, 53.8], [-0.448, 12, 24, 55], [-0.39, 16, 17, 56],
        [-0.31, 18.5, 15, 57], [-0.22, 18, 15, 55], [-0.14, 15, 17, 51],
        [-0.08, 10, 21, 44], [-0.045, 3, 28, 36],
      ].map(([z, halfWidth, bottom, top]) =>
        ({ z: L * z, halfWidth, bottom, top, crown: 1, profile: BODY_PROFILE }));
      const wing = loftGeometry(stations).translate(sx * W * 0.35, 0, 0);
      wings.push(wheelArches(wing));
    } else wings.push(wheelArches(ellipsoidGeometry(
      W * 0.155,
      16,
      L * 0.155,
      sx * W * 0.345,
      38,
      AXLE_FRONT - L * 0.005
    )));
    if (photoBody) {
      // Each rear wing sweeps from the door to a low lamp-bearing tail.
      const rearWing = [
        [0.115, 5, 21, 35], [0.15, 11, 17, 47], [0.21, 16, 15, 55],
        [0.28, 16.5, 15, 58], [0.35, 16, 17, 56], [0.415, 15, 18, 51],
        [0.46, 12.5, 20, 44], [0.485, 10, 22, 36], [0.50, 6, 24, 29],
      ].map(([z, halfWidth, bottom, top]) =>
        ({ z: L * z, halfWidth, bottom, top, crown: 1, profile: BODY_PROFILE }));
      wings.push(wheelArches(loftGeometry(rearWing).translate(sx * W * 0.378, 0, 0)));
    } else {
      wings.push(wheelArches(ellipsoidGeometry(
        W * 0.15, 18, L * 0.15, sx * W * 0.36, 35, AXLE_REAR
      )));
    }
  }

  // Windscreen, then the two side windows, then the rear screen. The shell
  // between them is what the eye reads as the A, B and C pillars — they are not
  // separate meshes, which is why they can never float free of the roof.
  screen(-L * 0.156, -L * (photoBody ? 0.103 : 0.092), CABIN_HW * (photoBody ? 0.84 : 0.68), CABIN_HW * (photoBody ? 0.79 : 0.64));

  sideGlass([
    { z: -L * 0.132, y: BELT },
    { z: -L * 0.102, y: 78 },
    { z: L * 0.050, y: 81 },
    { z: L * 0.050, y: BELT },
  ]);
  sideGlass([
    { z: L * 0.072, y: BELT },
    { z: L * 0.072, y: 81 },
    { z: L * (photoBody ? 0.229 : 0.196), y: 78 },
    { z: L * (photoBody ? 0.253 : 0.208), y: BELT - 1 },
  ]);

  if (photoBody) screen(L * 0.254, L * 0.32, CABIN_HW * 0.79, CABIN_HW * 0.80);
  else screen(L * 0.248, L * 0.304, CABIN_HW * 0.68, CABIN_HW * 0.62);

  if (photoBody) {
    // Sky at the upper edge, darker cabin below. The gradient also makes
    // the edges of the curved screens legible in overcast course lighting.
    for (const pane of glass) {
      const positions = pane.attributes.position;
      const colours = [];
      const bottomTint = new Color(0x364c53);
      const skyTint = new Color(0xa6c5cc);
      const colour = new Color();
      for (let i = 0; i < positions.count; i++) {
        const t = clamp((positions.getY(i) - BELT) / 22, 0, 1);
        colour.copy(bottomTint).lerp(skyTint, t);
        colours.push(colour.r, colour.g, colour.b);
      }
      pane.setAttribute('color', new Float32BufferAttribute(colours, 3));
    }
  }

  // Beryl's number plate, as one mesh rather than a draw call per painted
  // square. Only she wears it — see `identity` in buildBeryl.
  const letters = ['110/101/110/101/110', '111/100/110/100/111',
    '110/101/110/101/101', '101/101/010/010/010', '100/100/100/100/111'];
  const ink = [];
  letters.forEach((glyph, i) => glyph.split('/').forEach((row, y) => {
    [...row].forEach((pixel, x) => {
      if (pixel !== '1') return;
      const px = (i * 4 + x - 9.5) * 1.2, py = 38.4 - y * 1.2;
      const z = L * 0.505 + 1.7, r = 0.425;
      ink.push(px-r, py-r, z, px+r, py-r, z, px-r, py+r, z,
        px-r, py+r, z, px+r, py-r, z, px+r, py+r, z);
    });
  }));
  const lettering = new BufferGeometry();
  lettering.setAttribute('position', new Float32BufferAttribute(ink, 3));
  lettering.computeVertexNormals();

  const shapes = { body, cabin, shell, greenhouse, wings, glass, screenTrim, sideSeals, wipers, lettering };
  shapeCache.set(photoBody, shapes);
  return shapes;
}

// Let the shared geometry go. The scene graph disposes everything it can reach
// when a race ends, and every car in it reaches all of the above, so the cache
// has to be dropped at the same moment — otherwise the next race hangs its
// meshes off buffers that have already been freed.
export function resetBerylGeometry() {
  shapeCache.clear();
}

// The Minor 1000 has a wide slatted opening beneath a high, rounded bonnet.
function addMinorFront(chassis, materials) {
  // The painted front panel and the ivory grille each have their own bead.
  // Both faces bow back towards the wings so the surround sits on the nose.
  const zAt = x => -L * 0.505 + 4 * (x / 35) ** 2;
  const surround = (half, bottom, top, offset, fill, edge) => {
    const shape = new Shape();
    shape.moveTo(-half * 0.80, bottom);
    shape.quadraticCurveTo(-half * 0.96, bottom, -half, top - 5);
    shape.quadraticCurveTo(-half * 1.02, top, -half * 0.7, top + 0.8);
    shape.quadraticCurveTo(0, top + 2.2, half * 0.7, top + 0.8);
    shape.quadraticCurveTo(half * 1.02, top, half, top - 5);
    shape.quadraticCurveTo(half * 0.96, bottom, half * 0.80, bottom);
    shape.closePath();
    const geometry = new ShapeGeometry(shape);
    geometry.rotateY(Math.PI);
    const vertices = geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) vertices.setZ(i, zAt(vertices.getX(i)) - offset);
    geometry.computeVertexNormals();
    chassis.add(new Mesh(geometry, fill));
    const points = shape.getPoints(8).slice(0, -1)
      .map(p => new Vector3(p.x, p.y, zAt(p.x) - offset - 0.5));
    chassis.add(new Mesh(new TubeGeometry(new CatmullRomCurve3(points, true),
      72, 0.65, 6, true), edge));
  };
  surround(35.5, 25, 42, 0, materials.body, materials.chrome);
  surround(28, 26.4, 38.8, 1.7, materials.grille, materials.whitewall);
  for (const [y, half] of [[28.5, 24], [31, 26], [33.5, 27], [36, 27], [38.5, 25]]) {
    const points = [-1, -0.5, 0, 0.5, 1].map(t =>
      new Vector3(t * half, y + 0.45 * (1 - t * t), zAt(t * half) - 2.8));
    chassis.add(new Mesh(new TubeGeometry(new CatmullRomCurve3(points), 12, 0.57, 5),
      materials.whitewall));
  }
  for (const x of [-9, 9]) {
    chassis.add(box(0.65, 12.3, 1, x, 33, zAt(x) - 2.15, materials.chrome));
  }

  const lens = new MeshPhongMaterial({ color: 0xe1eaeb, vertexColors: true, specular: 0xffffff, shininess: 95 });
  const amber = new MeshPhongMaterial({ color: 0xe48b28, shininess: 75 });
  for (const side of [-1, 1]) {
    const x = side * W * 0.366;
    chassis.add(ellipsoid(8.4, 7.6, 3.4, x, 47, -L * 0.473, materials.chrome));
    const headlight = ellipsoid(7.1, 6.4, 2.0, x, 47, -L * 0.481, lens);
    // The pressed lens catches the sky above a darker reflector. Tint the
    // moulded facets so the headlights read as glass even in diffuse light.
    const points = headlight.geometry.attributes.position;
    const colours = [];
    for (let i = 0; i < points.count; i++) {
      const height = points.getY(i);
      const tint = 0.46 + 0.42 * Math.abs(height) + 0.1 * Math.cos(25 * points.getX(i));
      colours.push(tint, tint, tint);
    }
    headlight.geometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
    chassis.add(headlight);
    const bezel = new Mesh(new TorusGeometry(7.15, 0.63, 8, 32), materials.chrome);
    bezel.scale.x = 1.10;
    bezel.position.set(x, 47, -L * 0.484);
    chassis.add(bezel);
    chassis.add(ellipsoid(3.9, 3.5, 2.2, x, 34.5, -L * 0.473, materials.chrome));
    chassis.add(ellipsoid(3.1, 2.8, 1.6, x, 34.5, -L * 0.481, amber));
    const guardX = side * W * 0.305;
    const guard = new CatmullRomCurve3([[19, -0.515], [23, -0.526], [28, -0.523], [32, -0.512]]
      .map(([y, z]) => new Vector3(guardX, y, L * z)));
    chassis.add(new Mesh(new TubeGeometry(guard, 12, 1.7, 8), materials.chrome));
  }
  // Small chrome flash at the leading end of the centre bonnet moulding.
  chassis.add(ellipsoid(3.6, 1.2, 1.3, 0, 47.3, -L * 0.501, materials.chrome));
  chassis.add(ellipsoid(1.1, 2.5, 1.4, 0, 48.8, -L * 0.499, materials.chrome));
}

// `bodyColor` paints the shell, the greenhouse, both pairs of wings and the
// wheel dishes: every panel the eye reads as the car's colour.
//
// `identity` is what makes a car *Beryl* rather than merely a Minor — her red
// pinstripe and her number plate. Traffic keeps the chrome, the grille and the
// lamps, because those are the model rather than the car; it gives up the two
// details that are hers, because a road full of Minors all wearing her plate
// would read worse than an empty one.
export function buildBeryl({ bodyColor = TURQUOISE, identity = true, photoBody = false } = {}) {
  const materials = {
    // A flat body colour under restrained sunlight highlights — the turquoise
    // default is photo-informed. Phong needs no environment map and keeps the
    // rounded body readable at chase distance.
    body: new MeshPhongMaterial({ color: bodyColor, specular: 0x88c9ce, shininess: 65 }),
    glass: new MeshPhongMaterial({ color: 0x426b78, specular: 0xb3d4dc, shininess: 90, side: DoubleSide }),
    chrome: new MeshPhongMaterial({ color: 0xdbe6e3, specular: 0xffffff, shininess: 100 }),
    accent: lambert(C.red, { flatShading: false }),
    lamp: lambert(0xfff2c4, { flatShading: false }),
    tyre: lambert(0x181a1d, { flatShading: false }),
    whitewall: lambert(0xe9e9e2, { flatShading: false }),
    grille: lambert(0x3f474d, { flatShading: false }),
    plate: lambert(0x20292c, { flatShading: false }),
  };

  const { body, cabin, shell, greenhouse, wings, glass, screenTrim, sideSeals, wipers, lettering } = berylShapes(photoBody);

  if (photoBody) {
    materials.glass.color.setHex(0xffffff);
    materials.glass.vertexColors = true;
  }

  const root = new Group();
  root.rotation.order = 'YXZ';
  const chassis = new Group();
  root.add(chassis);

  const bodyMesh = new Mesh(shell, materials.body);
  bodyMesh.name = 'body-shell';
  chassis.add(bodyMesh);
  const cabinMesh = new Mesh(greenhouse, materials.body);
  cabinMesh.name = 'cabin-shell';
  chassis.add(cabinMesh);
  for (const wing of wings) {
    const mesh = new Mesh(wing, materials.body);
    mesh.name = 'wing';
    chassis.add(mesh);
  }
  for (const wiper of wipers) chassis.add(new Mesh(wiper, materials.grille));
  for (const seal of sideSeals) chassis.add(new Mesh(seal, materials.grille));
  for (const pane of glass) {
    const mesh = new Mesh(pane, materials.glass);
    if (pane === glass.at(-1)) mesh.name = 'rear-window';
    chassis.add(mesh);
  }
  for (const [i, surround] of screenTrim.entries()) {
    const mesh = new Mesh(surround, materials.chrome);
    mesh.name = i === 1 ? 'rear-window-seal' : 'front-window-trim';
    chassis.add(mesh);
  }

  // Trim and lamps keep their established colours and identity details. Each is
  // hung off the shell it belongs to rather than a remembered coordinate.
  if (photoBody) {
    const curve = new CatmullRomCurve3([-1, -0.85, -0.5, 0, 0.5, 0.85, 1].map(t =>
      new Vector3(t * W * 0.485, 23, -L * 0.516 + 14 * Math.abs(t) ** 4)));
    chassis.add(new Mesh(new TubeGeometry(curve, 28, 3, 8), materials.chrome));
  } else chassis.add(buildBumper(W * 0.90, -L * 0.505, 28, materials.chrome));
  chassis.add(buildBumper(W * 0.90, L * 0.505, 28, materials.chrome));
  for (const sx of [-1, 1]) {
    if (!photoBody) chassis.add(box(5, 12, 5, sx * W * 0.26, 32, -L * 0.498, materials.chrome));
    chassis.add(box(5, 12, 5, sx * W * 0.26, 32, L * 0.498, materials.chrome));
  }

  if (photoBody) {
    addMinorFront(chassis, materials);
  } else {
    for (const sx of [-1, 1]) {
      chassis.add(ellipsoid(9, 8.5, 10, sx * W * 0.345, 46, -L * 0.415, materials.lamp));
    }
    chassis.add(box(W * 0.30, 22, 4, 0, 36, -L * 0.482, materials.chrome));
    chassis.add(box(W * 0.26, 17, 4, 0, 36, -L * 0.485, materials.grille));
    for (const x of [-0.10, -0.05, 0, 0.05, 0.10]) {
      chassis.add(box(2, 15, 3, W * x, 36, -L * 0.488, materials.chrome));
    }
  }

  for (const sx of [-1, 1]) {
    chassis.add(ellipsoid(5, 6, 5.5, sx * W * 0.30, 47, L * 0.462, materials.accent));
  }

  // Every Minor carries a plate; only Beryl's has her letters on it.
  const rearPlate = box(W * 0.29, 10, 3, 0, 36, L * 0.505, materials.plate);
  rearPlate.name = 'generic-rear-plate';
  chassis.add(rearPlate);
  if (identity) {
    const text = new Mesh(lettering, materials.chrome);
    text.name = 'generic-rear-lettering';
    chassis.add(text);
  }

  const bodySkin = (z, y) => skinAt(stationAt(body, z), y);
  // Door handles, seated on the flank they open.
  for (const sx of [-1, 1]) {
    for (const z of [L * 0.012, L * 0.205]) {
      chassis.add(box(2, 2.5, 10, sx * (bodySkin(z, 54) + 0.7), 54, z, materials.chrome));
    }
  }
  // The red pinstripe along the shoulder, just under the belt line, laid on the
  // body skin in short segments so it follows the flank as it tapers.
  //
  if (photoBody) {
    const join = lambert(0x186477);
    for (const side of [-1, 1]) {
      const trace = (points, radius, material) => {
        chassis.add(new Mesh(new TubeGeometry(new CatmullRomCurve3(points),
          32, radius, 5), material));
      };
      const flank = (z, y) => new Vector3(side * (bodySkin(z, y) + 0.75), y, z);
      for (const [top, bottom] of [[-0.146, -0.12], [0.06, 0.06], [0.25, 0.137]]) {
        trace([57, 48, 35, 24, 20].map(y =>
          flank(L * (bottom + (top - bottom) * (y - 20) / 37), y)), 0.34, join);
      }
      // Fixed front quarterlight seen just ahead of the winding window.
      trace([65, 72, 78.5].map(y => new Vector3(
        side * (skinAt(stationAt(cabin, -0.059 * L), y) + GLASS_PROUD + 0.3),
        y, -0.059 * L)), 0.65, materials.chrome);
      if (identity) {
        const stripe = [-0.30, -0.25, -0.15, -0.04, 0.08, 0.20, 0.25]
          .map(z => flank(z * L, 55));
        trace(stripe, 0.58, materials.accent);
      }
    }
    const spine = body.slice(0, 6).map(station =>
      new Vector3(0, topAt(station, 0) + 0.35, station.z));
    chassis.add(new Mesh(new TubeGeometry(new CatmullRomCurve3(spine), 22, 0.6, 5), materials.chrome));
  } else if (identity) {
    const STRIPE_Y = 55;
    for (const sx of [-1, 1]) {
      for (const z of [-L * 0.07, L * 0.04, L * 0.15, L * 0.25]) {
        chassis.add(box(
          1.8, 1.8, L * 0.115,
          sx * (bodySkin(z, STRIPE_Y) + 0.5), STRIPE_Y, z,
          materials.accent
        ));
      }
    }
  }

  // Bonnet centre strip and boot handle, seated on the body skin they run along.
  if (!photoBody) chassis.add(box(1.6, 1.6, L * 0.24, 0, topAt(stationAt(body, -L * 0.33), 0) + 0.4, -L * 0.33, materials.chrome));
  chassis.add(box(W * 0.30, 1.6, 1.6, 0, topAt(stationAt(body, L * 0.41), 0) + 0.4, L * 0.41, materials.chrome));

  const wheels = [];
  const layout = [
    { x: -AXLE_X, z: AXLE_FRONT, steers: true },
    { x: AXLE_X, z: AXLE_FRONT, steers: true },
    { x: -AXLE_X, z: AXLE_REAR, steers: false },
    { x: AXLE_X, z: AXLE_REAR, steers: false },
  ];
  for (const spec of layout) {
    if (photoBody) {
      // Close the inboard end of the arch so road markings cannot show
      // through the sliver of clearance around the tyre.
      const liner = new Mesh(new CircleGeometry(WHEEL_R * 1.11, 24, 0, Math.PI), materials.tyre);
      liner.rotation.y = Math.sign(spec.x) * Math.PI / 2;
      liner.position.set(spec.x - Math.sign(spec.x) * WHEEL_W, WHEEL_R, spec.z);
      chassis.add(liner);
    }
    const wheel = buildWheel(materials, Math.sign(spec.x), photoBody);
    wheel.position.set(spec.x, WHEEL_R, spec.z);
    wheel.userData.steers = spec.steers;
    root.add(wheel);
    wheels.push(wheel);
  }

  const shadowGeom = new CircleGeometry(W * 0.59, 24);
  shadowGeom.rotateX(-Math.PI / 2);
  shadowGeom.scale(1, 1, L / W * 0.84);
  const shadow = new Mesh(shadowGeom, basic(0x000000, {
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    fog: true,
  }));
  shadow.position.y = 0.6;
  root.add(shadow);

  return {
    root,
    chassis,
    wheels,
    shadow,
    state: { roll: 0, pitch: 0, slope: 0, steer: 0, lastSpeed: 0 },
  };
}

// Visual-only body attitude, driven entirely from state the simulation already
// computes. None of this writes back into the car.
const MAX_ROLL = 0.1;
const MAX_PITCH = 0.035;
const MAX_STEER = 0.42;
const _pos = new Vector3();
const _wheelPos = new Vector3();

export function updateBeryl(rig, car, input, dt, ground = 0, grade = 0, surfaceHeight = null) {
  const { root, chassis, wheels, state } = rig;

  toThree(car.x, car.y, ground, _pos);
  root.position.copy(_pos);
  // Pitch around the car's local axle, then yaw into its heading. XYZ pitched
  // around world X, so an east/west-facing car rolled sideways into the road.
  root.rotation.order = 'YXZ';
  root.rotation.y = yawFor(car.rotation);

  const a = alphaFor(0.2, dt);

  // Roll outward through a corner. car.lateral is negative when the tail slides
  // outward in a right-hander, so the sign is intentionally inverted here.
  const targetRoll = -clamp(car.lateral / (CAR.driftLateral * 2.5), -1, 1) * MAX_ROLL;
  state.roll += (targetRoll - state.roll) * a;

  // Nose rises under power and dives under braking.
  const accel = dt > 0 ? (car.speed - state.lastSpeed) / dt : 0;
  state.lastSpeed = car.speed;
  const targetPitch = clamp(accel / CAR.accel, -1, 1) * MAX_PITCH;
  state.pitch += (targetPitch - state.pitch) * a;

  // Terrain grade tilts the whole car so the wheels and shell remain together.
  const targetSlope = Math.atan(grade);
  // The contact plane must not lag behind a crest; only suspension motion eases.
  state.slope = targetSlope;
  root.rotation.x = state.slope;

  chassis.rotation.z = state.roll;
  chassis.rotation.x = state.pitch;

  const targetSteer = -(input ? input.steer : 0) * MAX_STEER;
  state.steer += (targetSteer - state.steer) * a;
  const spin = (car.speed / WHEEL_R) * dt;
  for (const wheel of wheels) {
    if (wheel.userData.steers) wheel.rotation.y = state.steer;
    wheel.userData.hub.rotation.x += spin;
  }
  if (surfaceHeight) {
    // At a crest the front and rear axles need not lie on the centre tangent.
    // Resolve visual wheel contact against the actual surface instead of
    // burying the wheels while the suspension pitch catches up.
    root.updateMatrixWorld(true);
    let lift = 0;
    for (const wheel of wheels) {
      wheel.getWorldPosition(_wheelPos);
      lift = Math.max(lift, surfaceHeight(_wheelPos.x, _wheelPos.z) + WHEEL_R - _wheelPos.y);
    }
    root.position.y += lift + 0.5;
  }
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
