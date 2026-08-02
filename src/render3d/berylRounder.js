// A lower, rounder Morris Minor 1000 silhouette for Beryl.
//
// This keeps the render-only contract of the original model but rebuilds the
// visible shell around real Minor proportions: a low body wrapped around modest
// wheels, a long rounded bonnet, a rear-biased cabin, and a softly pinched boot.
// Colours deliberately remain identical to the established Beryl palette.
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
} from 'three';
import { C, lambert, basic } from './palette.js';

// Keep the gameplay footprint unchanged. Only the visible height and component
// proportions move closer to a real Morris Minor 1000.
export const BERYL = { width: 108.8, length: 217.6, height: 91 };

const W = BERYL.width;
const L = BERYL.length;
const WHEEL_R = W * 0.205;
const WHEEL_W = W * 0.15;
const AXLE_FRONT = -L * 0.31;
const AXLE_REAR = L * 0.255;
const AXLE_X = W * 0.425;

function box(w, h, d, x, y, z, material) {
  const mesh = new Mesh(new BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
}

// More cross-section points and more longitudinal stations than the previous
// shell. The result stays lightweight, but the eye reads continuous compound
// curves instead of an octagonal body with a separate block placed on top.
function roundedRing(station) {
  const { halfWidth: w, bottom, top } = station;
  const h = top - bottom;
  const crown = station.crown || 0;
  return [
    [-w * 0.60, bottom],
    [-w * 0.83, bottom + h * 0.06],
    [-w * 0.96, bottom + h * 0.18],
    [-w, bottom + h * 0.39],
    [-w * 0.99, bottom + h * 0.60],
    [-w * 0.91, bottom + h * 0.78],
    [-w * 0.73, bottom + h * 0.91],
    [-w * 0.40, top + crown * 0.60],
    [0, top + crown],
    [w * 0.40, top + crown * 0.60],
    [w * 0.73, bottom + h * 0.91],
    [w * 0.91, bottom + h * 0.78],
    [w * 0.99, bottom + h * 0.60],
    [w, bottom + h * 0.39],
    [w * 0.96, bottom + h * 0.18],
    [w * 0.83, bottom + h * 0.06],
    [w * 0.60, bottom],
  ];
}

function loftGeometry(stations) {
  const positions = [];
  const indices = [];
  const rings = stations.map(roundedRing);
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

function panel(points, material) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(points.flat(), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
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
    // Same colour constants as the existing model; only the normals change from
    // deliberately faceted to smooth so the new curves actually read as curves.
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

  // Low continuous body shell. The waist is about 13 units lower than the old
  // version, while the sill drops around the wheels so Beryl looks planted
  // rather than perched on an oversized undercarriage.
  chassis.add(loft([
    { z: -L * 0.50, halfWidth: W * 0.23, bottom: 25, top: 43, crown: 1 },
    { z: -L * 0.475, halfWidth: W * 0.35, bottom: 21, top: 49, crown: 1.5 },
    { z: -L * 0.425, halfWidth: W * 0.45, bottom: 17, top: 56, crown: 2 },
    { z: -L * 0.34, halfWidth: W * 0.50, bottom: 15, top: 60, crown: 2 },
    { z: -L * 0.23, halfWidth: W * 0.50, bottom: 14, top: 61, crown: 2 },
    { z: -L * 0.10, halfWidth: W * 0.50, bottom: 14, top: 61, crown: 2 },
    { z: L * 0.08, halfWidth: W * 0.50, bottom: 14, top: 62, crown: 2 },
    { z: L * 0.22, halfWidth: W * 0.495, bottom: 15, top: 61, crown: 2 },
    { z: L * 0.32, halfWidth: W * 0.47, bottom: 17, top: 59, crown: 2 },
    { z: L * 0.41, halfWidth: W * 0.41, bottom: 20, top: 55, crown: 1.5 },
    { z: L * 0.475, halfWidth: W * 0.32, bottom: 23, top: 49, crown: 1 },
    { z: L * 0.50, halfWidth: W * 0.22, bottom: 26, top: 44, crown: 1 },
  ], materials.body));

  // Separate rounded wings remain a Morris Minor cue, but are tucked into the
  // shell instead of sitting on it as four large bubbles.
  for (const sx of [-1, 1]) {
    chassis.add(ellipsoid(
      W * 0.205,
      16,
      L * 0.16,
      sx * W * 0.39,
      43,
      AXLE_FRONT - L * 0.01,
      materials.body
    ));
    chassis.add(ellipsoid(
      W * 0.19,
      14.5,
      L * 0.125,
      sx * W * 0.395,
      42,
      AXLE_REAR,
      materials.body
    ));
  }

  // A subtle crown, not a separate bonnet lump.
  chassis.add(ellipsoid(
    W * 0.29,
    4.5,
    L * 0.19,
    0,
    58,
    -L * 0.325,
    materials.body
  ));

  // One body-colour cabin shell gives the roof, pillars and glass surround a
  // single rounded silhouette. Windows are inset panels rather than a second
  // dark loft with a cap placed over it.
  chassis.add(loft([
    { z: -L * 0.19, halfWidth: W * 0.28, bottom: 58, top: 64, crown: 1 },
    { z: -L * 0.145, halfWidth: W * 0.36, bottom: 58, top: 76, crown: 2 },
    { z: -L * 0.085, halfWidth: W * 0.41, bottom: 58, top: 85, crown: 3 },
    { z: L * 0.015, halfWidth: W * 0.435, bottom: 58, top: 88, crown: 3 },
    { z: L * 0.14, halfWidth: W * 0.43, bottom: 58, top: 87, crown: 3 },
    { z: L * 0.245, halfWidth: W * 0.39, bottom: 58, top: 82, crown: 2.5 },
    { z: L * 0.32, halfWidth: W * 0.32, bottom: 58, top: 72, crown: 1.5 },
    { z: L * 0.355, halfWidth: W * 0.25, bottom: 57, top: 64, crown: 1 },
  ], materials.body));

  // Side glass follows the low belt line. The two-panel split and broad rear
  // window preserve the four-door Minor character from the chase camera.
  for (const sx of [-1, 1]) {
    const x = sx * W * 0.414;
    chassis.add(panel([
      [x, 63, -L * 0.125],
      [x, 80, -L * 0.095],
      [x, 82, L * 0.025],
      [x, 63, L * 0.025],
    ], materials.glass));
    chassis.add(panel([
      [x, 63, L * 0.065],
      [x, 82, L * 0.065],
      [x, 77, L * 0.245],
      [x, 62, L * 0.255],
    ], materials.glass));
  }

  const windscreen = box(W * 0.62, 17, 3.5, 0, 72, -L * 0.145, materials.glass);
  windscreen.rotation.x = -0.43;
  chassis.add(windscreen);

  const rearScreen = box(W * 0.57, 16, 3.5, 0, 70, L * 0.295, materials.glass);
  rearScreen.rotation.x = 0.48;
  chassis.add(rearScreen);

  for (const sx of [-1, 1]) {
    const x = sx * W * 0.418;
    const a = box(4.5, 20, 6, x, 70, -L * 0.135, materials.body);
    a.rotation.x = -0.34;
    chassis.add(a);
    chassis.add(box(5, 22, 6, x, 71, L * 0.045, materials.body));
    const c = box(4.5, 18, 6, x, 69, L * 0.27, materials.body);
    c.rotation.x = 0.35;
    chassis.add(c);
  }

  // Trim and lamps retain their established colours and identity details.
  chassis.add(buildBumper(W * 0.90, -L * 0.505, 27, materials.chrome));
  chassis.add(buildBumper(W * 0.90, L * 0.505, 27, materials.chrome));
  for (const sx of [-1, 1]) {
    chassis.add(box(6, 14, 6, sx * W * 0.29, 31, -L * 0.498, materials.chrome));
    chassis.add(box(6, 14, 6, sx * W * 0.29, 31, L * 0.498, materials.chrome));
  }

  const lampGeom = new CylinderGeometry(9.5, 9.5, 6, 16);
  lampGeom.rotateX(Math.PI / 2);
  for (const sx of [-1, 1]) {
    const lamp = new Mesh(lampGeom, materials.lamp);
    lamp.position.set(sx * W * 0.37, 50, -L * 0.452);
    chassis.add(lamp);
  }

  chassis.add(box(W * 0.28, 22, 4, 0, 41, -L * 0.488, materials.grille));
  for (const x of [-0.11, -0.055, 0, 0.055, 0.11]) {
    chassis.add(box(2, 20, 3, W * x, 41, -L * 0.491, materials.chrome));
  }

  const tailGeom = new CylinderGeometry(5.8, 5.8, 6, 14);
  tailGeom.rotateX(Math.PI / 2);
  for (const sx of [-1, 1]) {
    const tail = new Mesh(tailGeom, materials.accent);
    tail.position.set(sx * W * 0.34, 49, L * 0.472);
    chassis.add(tail);
  }

  chassis.add(box(W * 0.25, 9, 3, 0, 38, L * 0.498, materials.plate));

  for (const sx of [-1, 1]) {
    chassis.add(box(2.4, 2.5, L * 0.56, sx * W * 0.501, 49, -L * 0.015, materials.accent));
  }

  chassis.add(box(1.8, 1.8, L * 0.29, 0, 61.5, -L * 0.33, materials.chrome));
  chassis.add(box(W * 0.40, 1.8, 1.8, 0, 57, L * 0.405, materials.chrome));

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

// Body attitude, steering and wheel-spin behaviour remain exactly the existing
// implementation; only buildBeryl() changes the visible geometry.
export { updateBeryl } from './beryl.js';
