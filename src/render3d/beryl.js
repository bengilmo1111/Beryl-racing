// Beryl, the family's turquoise Morris Minor 1000, as a low-poly shell.
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
  BufferGeometry,
  Float32BufferAttribute,
  DoubleSide,
  Vector3,
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
const WHEEL_W = W * 0.15;
const AXLE_FRONT = -L * 0.31;
const AXLE_REAR = L * 0.255;
const AXLE_X = W * 0.425;

// Widest half-width of the greenhouse. Cabin stations and the screens that span
// them are both expressed against this, so the roof and the glass in it stay in
// proportion when one of them is retuned.
const CABIN_HW = W * 0.465;
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
  // Mirror back down the other side, skipping the shared crown and sill points.
  for (let i = profile.length - 2; i >= 1; i -= 1) {
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

function loft(stations, material) {
  return new Mesh(loftGeometry(stations), material);
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
function sheet(rows, material) {
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
  return new Mesh(geometry, material);
}

function buildBumper(width, z, y, material) {
  const geometry = new CylinderGeometry(3.8, 3.8, width, 12);
  geometry.rotateZ(Math.PI / 2);
  const bumper = new Mesh(geometry, material);
  bumper.position.set(0, y, z);
  return bumper;
}

function buildWheel(materials) {
  const group = new Group();
  const hub = new Group();

  const tyreGeom = new CylinderGeometry(WHEEL_R, WHEEL_R, WHEEL_W, 18);
  tyreGeom.rotateZ(Math.PI / 2);
  hub.add(new Mesh(tyreGeom, materials.tyre));

  const wallGeom = new CylinderGeometry(
    WHEEL_R * 0.67,
    WHEEL_R * 0.67,
    WHEEL_W + 1.5,
    18
  );
  wallGeom.rotateZ(Math.PI / 2);
  hub.add(new Mesh(wallGeom, materials.whitewall));

  const dishGeom = new CylinderGeometry(
    WHEEL_R * 0.5,
    WHEEL_R * 0.5,
    WHEEL_W + 2,
    16
  );
  dishGeom.rotateZ(Math.PI / 2);
  hub.add(new Mesh(dishGeom, materials.body));

  const capGeom = new CylinderGeometry(
    WHEEL_R * 0.26,
    WHEEL_R * 0.26,
    WHEEL_W + 3,
    14
  );
  capGeom.rotateZ(Math.PI / 2);
  hub.add(new Mesh(capGeom, materials.chrome));

  group.add(hub);
  group.userData.hub = hub;
  return group;
}

export function buildBeryl() {
  const materials = {
    // Same colour constants as before; the normals are smooth rather than
    // faceted so the compound curves actually read as curves.
    body: lambert(C.berylBody, { flatShading: false }),
    glass: lambert(C.glass, { flatShading: false, side: DoubleSide }),
    chrome: lambert(C.chrome, { flatShading: false }),
    accent: lambert(C.red, { flatShading: false }),
    lamp: lambert(0xfff2c4, { flatShading: false }),
    tyre: lambert(0x181a1d, { flatShading: false }),
    whitewall: lambert(0xe9e9e2, { flatShading: false }),
    grille: lambert(0x3f474d, { flatShading: false }),
    plate: lambert(0xf2e3bd, { flatShading: false }),
  };

  const root = new Group();
  root.rotation.order = 'YXZ';
  const chassis = new Group();
  root.add(chassis);

  const body = BODY_STATIONS.map((s) => ({ ...s, profile: BODY_PROFILE }));
  const cabin = CABIN_STATIONS.map((s) => ({ ...s, profile: CABIN_PROFILE }));
  chassis.add(loft(body, materials.body));
  chassis.add(loft(cabin, materials.body));

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

  // A screen laid over the front or rear slope of the greenhouse. Only the z
  // range and the width are authored: the height at every point comes from the
  // shell, so the windscreen's rake *is* the shell's rake and cannot drift.
  const screen = (zFront, zRear, halfFront, halfRear) => {
    const steps = 6;
    const rows = [];
    for (let i = 0; i <= steps; i += 1) {
      const u = i / steps;
      const z = zFront + (zRear - zFront) * u;
      const half = halfFront + (halfRear - halfFront) * u;
      rows.push([-half, -half * 0.5, 0, half * 0.5, half].map((x) => {
        const n = topNormal(z, x);
        return [
          x + n[0] * GLASS_PROUD,
          cabinTop(z, x) + n[1] * GLASS_PROUD,
          z + n[2] * GLASS_PROUD,
        ];
      }));
    }
    chassis.add(sheet(rows, materials.glass));
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
      chassis.add(sheet(rows, materials.glass));
    }
  };

  // Rounded wings. The front pair are the car's full width and carry the
  // headlamps; the rear pair are low blisters on the flank. They are what makes
  // the narrow bonnet read as a Minor rather than as a slab.
  for (const sx of [-1, 1]) {
    chassis.add(ellipsoid(
      W * 0.155,
      16,
      L * 0.155,
      sx * W * 0.345,
      38,
      AXLE_FRONT - L * 0.005,
      materials.body
    ));
    chassis.add(ellipsoid(
      W * 0.13,
      14,
      L * 0.115,
      sx * W * 0.37,
      36,
      AXLE_REAR,
      materials.body
    ));
  }

  // Windscreen, then the two side windows, then the rear screen. The shell
  // between them is what the eye reads as the A, B and C pillars — they are not
  // separate meshes, which is why they can never float free of the roof.
  screen(-L * 0.156, -L * 0.092, CABIN_HW * 0.68, CABIN_HW * 0.64);

  sideGlass([
    { z: -L * 0.132, y: BELT },
    { z: -L * 0.102, y: 78 },
    { z: L * 0.026, y: 81 },
    { z: L * 0.026, y: BELT },
  ]);
  sideGlass([
    { z: L * 0.082, y: BELT },
    { z: L * 0.082, y: 81 },
    { z: L * 0.196, y: 78 },
    { z: L * 0.208, y: BELT - 1 },
  ]);

  screen(L * 0.248, L * 0.304, CABIN_HW * 0.68, CABIN_HW * 0.62);

  // Trim and lamps keep their established colours and identity details. Each is
  // hung off the shell it belongs to rather than a remembered coordinate.
  chassis.add(buildBumper(W * 0.90, -L * 0.505, 28, materials.chrome));
  chassis.add(buildBumper(W * 0.90, L * 0.505, 28, materials.chrome));
  for (const sx of [-1, 1]) {
    chassis.add(box(5, 12, 5, sx * W * 0.26, 32, -L * 0.498, materials.chrome));
    chassis.add(box(5, 12, 5, sx * W * 0.26, 32, L * 0.498, materials.chrome));
  }

  // Headlamps. Domes bulging out of the upper front of each wing, not discs cut
  // into it: the wings are rounded, so a flat lens either sinks inside or floats
  // clear of them, and the real car's lamps stand proud anyway.
  for (const sx of [-1, 1]) {
    chassis.add(ellipsoid(9, 8.5, 10, sx * W * 0.345, 46, -L * 0.415, materials.lamp));
  }

  // The grille: a chrome-framed panel of vertical bars between the wings, which
  // is the Minor's face.
  chassis.add(box(W * 0.30, 22, 4, 0, 36, -L * 0.482, materials.chrome));
  chassis.add(box(W * 0.26, 17, 4, 0, 36, -L * 0.485, materials.grille));
  for (const x of [-0.10, -0.05, 0, 0.05, 0.10]) {
    chassis.add(box(2, 15, 3, W * x, 36, -L * 0.488, materials.chrome));
  }

  for (const sx of [-1, 1]) {
    chassis.add(ellipsoid(5, 6, 5.5, sx * W * 0.30, 47, L * 0.462, materials.accent));
  }

  chassis.add(box(W * 0.25, 9, 3, 0, 36, L * 0.495, materials.plate));

  // The red pinstripe along the shoulder, just under the belt line, laid on the
  // body skin in short segments so it follows the flank as it tapers.
  const bodySkin = (z, y) => skinAt(stationAt(body, z), y);
  // It starts at the front door, not the bonnet: ahead of that the flank is the
  // wing, which stands proud of the skin the stripe is laid on, and the stripe
  // would hang in the valley between the two.
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

  // Bonnet centre strip and boot handle, seated on the body skin they run along.
  chassis.add(box(1.6, 1.6, L * 0.24, 0, topAt(stationAt(body, -L * 0.33), 0) + 0.4, -L * 0.33, materials.chrome));
  chassis.add(box(W * 0.30, 1.6, 1.6, 0, topAt(stationAt(body, L * 0.41), 0) + 0.4, L * 0.41, materials.chrome));

  const wheels = [];
  const layout = [
    { x: -AXLE_X, z: AXLE_FRONT, steers: true },
    { x: AXLE_X, z: AXLE_FRONT, steers: true },
    { x: -AXLE_X, z: AXLE_REAR, steers: false },
    { x: AXLE_X, z: AXLE_REAR, steers: false },
  ];
  for (const spec of layout) {
    const wheel = buildWheel(materials);
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

export function updateBeryl(rig, car, input, dt, ground = 0, grade = 0) {
  const { root, chassis, wheels, state } = rig;

  toThree(car.x, car.y, ground, _pos);
  root.position.copy(_pos);
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
  state.slope += (targetSlope - state.slope) * a;
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
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
