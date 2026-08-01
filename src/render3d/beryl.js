// Beryl herself: a deliberately low-poly, cartoon 1960s Morris Minor 1000.
//
// The proportions below were retuned from the supplied Morris Minor model rather
// than importing its 11 MB FBX and 4K PBR textures. The reference body measures
// roughly 7.51 : 2.95 : 2.45 (length : width : body height), with a wheelbase of
// about 56% of its length and the cabin biased slightly rearward. Beryl keeps the
// game's compact collision footprint and a cuter stance, but now follows those
// characteristic relationships instead of reading as stacked boxes.
//
// buildBeryl() still returns the same small handle ({ root, chassis, wheels,
// shadow }), so the render layer and deterministic simulation remain unchanged.
import {
  Group,
  Mesh,
  BoxGeometry,
  CylinderGeometry,
  CircleGeometry,
  SphereGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  Vector3,
} from 'three';
import { CAR } from '../config.js';
import { C, lambert, basic } from './palette.js';
import { toThree, yawFor, alphaFor } from './coords.js';

// Locked to the collision footprint in Car.js: beryl.png is 128x256 at scale
// 0.85, so she is 108.8 wide and 217.6 long. The visible shell is lower than the
// old code-built car: closer to the reference model's squat height/width ratio,
// while still exaggerated enough to feel friendly at gameplay scale.
export const BERYL = { width: 108.8, length: 217.6, height: 96 };

const W = BERYL.width;
const L = BERYL.length;

// The reference model's wheel radius is about 20% of body width. Beryl's is kept
// a little larger for cartoon readability, but no longer overwhelms the body.
const WHEEL_R = W * 0.235;
const WHEEL_W = W * 0.185;
const AXLE_FRONT = -L * 0.31;
const AXLE_REAR = L * 0.255;
const AXLE_X = W * 0.435;

// Forward is -Z (see coords.js), so the nose is at negative z throughout.
function box(w, h, d, x, y, z, material) {
  const mesh = new Mesh(new BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
}

// A tiny hand-authored loft is enough to capture the Minor's rounded shoulders,
// tapered nose and boot, and faceted handmade feel. Each station is a rounded
// octagonal cross-section; eight sides are intentionally visible rather than
// smoothed away into a generic glossy car.
function loftGeometry(stations) {
  const positions = [];
  const indices = [];
  const ringSize = 8;

  for (const station of stations) {
    const h = station.top - station.bottom;
    const w = station.halfWidth;
    const ring = [
      [-w * 0.72, station.bottom],
      [-w, station.bottom + h * 0.24],
      [-w, station.bottom + h * 0.66],
      [-w * 0.58, station.top],
      [w * 0.58, station.top],
      [w, station.bottom + h * 0.66],
      [w, station.bottom + h * 0.24],
      [w * 0.72, station.bottom],
    ];
    for (const [x, y] of ring) positions.push(x, y, station.z);
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
      // The cross-section runs clockwise when viewed from +Z. This winding gives
      // the tube outward-facing normals as stations move from nose to tail.
      indices.push(a, c, b, b, c, d);
    }
  }

  // Close the nose and tail so bright road colour never shows through them.
  const frontCenter = positions.length / 3;
  positions.push(0, (stations[0].bottom + stations[0].top) / 2, stations[0].z);
  const rearCenter = positions.length / 3;
  const last = stations.length - 1;
  positions.push(0, (stations[last].bottom + stations[last].top) / 2, stations[last].z);
  for (let j = 0; j < ringSize; j += 1) {
    const next = (j + 1) % ringSize;
    indices.push(frontCenter, j, next);
    indices.push(rearCenter, last * ringSize + next, last * ringSize + j);
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

function ellipsoid(rx, ry, rz, x, y, z, material, segments = 10) {
  const mesh = new Mesh(new SphereGeometry(1, segments, 6), material);
  mesh.scale.set(rx, ry, rz);
  mesh.position.set(x, y, z);
  return mesh;
}

function buildBumper(width, z, material) {
  const geometry = new CylinderGeometry(4.4, 4.4, width, 8);
  geometry.rotateZ(Math.PI / 2);
  const bumper = new Mesh(geometry, material);
  bumper.position.set(0, 34, z);
  return bumper;
}

function buildWheel(materials) {
  // A wheel group so steering (yaw) and rolling (spin) stay independent: the
  // group yaws, the hub inside it spins.
  const group = new Group();
  const hub = new Group();

  // CylinderGeometry runs along Y; rotate it onto X so the wheel rolls about
  // the car's lateral axis, which makes hub.rotation.x the spin.
  const tyreGeom = new CylinderGeometry(WHEEL_R, WHEEL_R, WHEEL_W, 14);
  tyreGeom.rotateZ(Math.PI / 2);
  hub.add(new Mesh(tyreGeom, materials.tyre));

  // Whitewall ring, proud of the tyre on both faces. Non-negotiable identity.
  const wallGeom = new CylinderGeometry(WHEEL_R * 0.67, WHEEL_R * 0.67, WHEEL_W + 1.5, 14);
  wallGeom.rotateZ(Math.PI / 2);
  hub.add(new Mesh(wallGeom, materials.whitewall));

  const capGeom = new CylinderGeometry(WHEEL_R * 0.34, WHEEL_R * 0.34, WHEEL_W + 2.5, 10);
  capGeom.rotateZ(Math.PI / 2);
  hub.add(new Mesh(capGeom, materials.chrome));

  group.add(hub);
  group.userData.hub = hub;
  return group;
}

export function buildBeryl() {
  const materials = {
    body: lambert(C.berylBody, { flatShading: true }),
    roof: lambert(C.berylRoof, { flatShading: true }),
    glass: lambert(C.glass, { flatShading: true }),
    chrome: lambert(C.chrome, { flatShading: true }),
    accent: lambert(C.red, { flatShading: true }),
    lamp: lambert(0xfff2c4, { flatShading: true }),
    tyre: lambert(0x181a1d, { flatShading: true }),
    whitewall: lambert(0xe9e9e2, { flatShading: true }),
    grille: lambert(0x3f474d, { flatShading: true }),
    plate: lambert(0xf2e3bd, { flatShading: true }),
  };

  const root = new Group();
  // Yaw first, then pitch about the already-yawed lateral axis. The default XYZ
  // order applies pitch in world space, which shears the car sideways as soon as
  // she is both turned and on a slope.
  root.rotation.order = 'YXZ';
  const chassis = new Group();
  root.add(chassis);

  // --- Rounded body shell ----------------------------------------------------
  // Longitudinal stations follow the supplied model's silhouette: the nose
  // tapers, the front wings reach full width early, the doors stay broad, and
  // the boot pinches back in. Height is deliberately compressed for Beryl's
  // friendly, slightly squashed character.
  chassis.add(loft([
    { z: -L * 0.50, halfWidth: W * 0.31, bottom: 31, top: 47 },
    { z: -L * 0.465, halfWidth: W * 0.40, bottom: 28, top: 56 },
    { z: -L * 0.35, halfWidth: W * 0.50, bottom: 26, top: 66 },
    { z: -L * 0.18, halfWidth: W * 0.49, bottom: 26, top: 63 },
    { z: L * 0.14, halfWidth: W * 0.49, bottom: 26, top: 62 },
    { z: L * 0.30, halfWidth: W * 0.48, bottom: 27, top: 61 },
    { z: L * 0.44, halfWidth: W * 0.43, bottom: 29, top: 54 },
    { z: L * 0.50, halfWidth: W * 0.31, bottom: 33, top: 45 },
  ], materials.body));

  // Pronounced separate wings are one of the quickest Morris Minor tells. Low-
  // segment ellipsoids give a round impression while staying visibly low-poly.
  for (const sx of [-1, 1]) {
    chassis.add(ellipsoid(W * 0.22, 19, L * 0.17,
      sx * W * 0.375, 43, AXLE_FRONT - L * 0.015, materials.body));
    chassis.add(ellipsoid(W * 0.205, 17, L * 0.135,
      sx * W * 0.38, 42, AXLE_REAR, materials.body));
  }

  // A gently crowned bonnet keeps the nose from reading like a flat tabletop.
  chassis.add(ellipsoid(W * 0.31, 10, L * 0.19,
    0, 61, -L * 0.335, materials.body, 12));

  // --- Cabin -----------------------------------------------------------------
  // The reference cabin spans almost half the car and sits slightly rearward.
  // The older version's short rectangular cabin was the main reason Beryl read
  // as a generic boxy car rather than a Minor.
  const cabinStations = [
    { z: -L * 0.18, halfWidth: W * 0.32, bottom: 59, top: 73 },
    { z: -L * 0.115, halfWidth: W * 0.375, bottom: 59, top: 87 },
    { z: L * 0.015, halfWidth: W * 0.39, bottom: 59, top: 94 },
    { z: L * 0.17, halfWidth: W * 0.37, bottom: 59, top: 92 },
    { z: L * 0.285, halfWidth: W * 0.32, bottom: 58, top: 76 },
  ];
  chassis.add(loft(cabinStations, materials.glass));

  // A thin pale roof cap lets the dark glass remain a continuous readable band.
  chassis.add(loft(cabinStations.map((s) => ({
    z: s.z,
    halfWidth: s.halfWidth + W * 0.018,
    bottom: s.top - 7,
    top: s.top + 2,
  })), materials.roof));

  // Body-colour pillars stop the glass envelope looking like one giant visor.
  for (const sx of [-1, 1]) {
    const aPillar = box(5, 31, 6, sx * W * 0.345, 74, -L * 0.145, materials.body);
    aPillar.rotation.x = -0.34;
    chassis.add(aPillar);

    chassis.add(box(5, 31, 6, sx * W * 0.385, 74, L * 0.055, materials.body));

    const cPillar = box(6, 31, 7, sx * W * 0.34, 74, L * 0.245, materials.body);
    cPillar.rotation.x = 0.34;
    chassis.add(cPillar);
  }

  // Rear glass is the face seen most often by the chase camera, so reinforce it
  // as a broad sloped panel rather than leaving it implicit in the loft.
  const rearScreen = box(W * 0.60, 22, 4, 0, 75, L * 0.272, materials.glass);
  rearScreen.rotation.x = 0.48;
  chassis.add(rearScreen);

  // --- Chrome, lamps and recognisable face ----------------------------------
  chassis.add(buildBumper(W * 0.94, -L * 0.505, materials.chrome));
  chassis.add(buildBumper(W * 0.94, L * 0.505, materials.chrome));

  // Rounded bumper overriders add the tiny bit of period character that reads
  // clearly without requiring texture maps.
  for (const sx of [-1, 1]) {
    chassis.add(box(7, 16, 7, sx * W * 0.31, 39, -L * 0.50, materials.chrome));
    chassis.add(box(7, 16, 7, sx * W * 0.31, 39, L * 0.50, materials.chrome));
  }

  const lampGeom = new CylinderGeometry(10.5, 10.5, 7, 12);
  lampGeom.rotateX(Math.PI / 2);
  for (const sx of [-1, 1]) {
    const lamp = new Mesh(lampGeom, materials.lamp);
    lamp.position.set(sx * W * 0.37, 57, -L * 0.46);
    chassis.add(lamp);
  }

  // Dark inset grille with simple chrome vertical bars: recognisable as a Morris
  // front without chasing photo-real trim.
  chassis.add(box(W * 0.34, 23, 4, 0, 47, -L * 0.492, materials.grille));
  for (const x of [-0.12, -0.06, 0, 0.06, 0.12]) {
    chassis.add(box(2.2, 20, 3, W * x, 47, -L * 0.495, materials.chrome));
  }

  const tailGeom = new CylinderGeometry(6.5, 6.5, 7, 10);
  tailGeom.rotateX(Math.PI / 2);
  for (const sx of [-1, 1]) {
    const tail = new Mesh(tailGeom, materials.accent);
    tail.position.set(sx * W * 0.35, 52, L * 0.477);
    chassis.add(tail);
  }

  // Warm cream rear number plate; deliberately text-free at this scale.
  chassis.add(box(W * 0.27, 10, 3, 0, 43, L * 0.501, materials.plate));

  // Red side pinstripe — Beryl has one, and it reads even at speed.
  for (const sx of [-1, 1]) {
    chassis.add(box(3, 4.5, L * 0.65, sx * W * 0.493, 45, L * 0.015, materials.accent));
  }

  // Bonnet and boot seams are cheap, readable cues to the classic three-box
  // shape when the camera climbs on a hill.
  chassis.add(box(2, 2, L * 0.29, 0, 69, -L * 0.335, materials.chrome));
  chassis.add(box(W * 0.52, 2, 2, 0, 62, L * 0.39, materials.chrome));

  // --- Wheels ----------------------------------------------------------------
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

  // --- Contact shadow --------------------------------------------------------
  // A flat disc rather than a shadow map: cheaper, kinder to SwiftShader in CI,
  // and enough to stop her looking like she is hovering.
  const shadowGeom = new CircleGeometry(W * 0.61, 20);
  shadowGeom.rotateX(-Math.PI / 2);
  shadowGeom.scale(1, 1, L / W * 0.84);
  const shadow = new Mesh(shadowGeom, basic(0x000000, {
    transparent: true, opacity: 0.22, depthWrite: false, fog: true,
  }));
  shadow.position.y = 0.6;
  root.add(shadow);

  return {
    root,
    chassis,
    wheels,
    shadow,
    // Render-only animation state. None of this is ever read by the simulation.
    state: { roll: 0, pitch: 0, slope: 0, steer: 0, lastSpeed: 0 },
  };
}

// Visual-only body attitude, driven entirely from state the simulation already
// computes. Nothing here writes back into the car.
const MAX_ROLL = 0.1; // ~5.7°, the "noticeable body lean" the art direction asks for
const MAX_PITCH = 0.035;
const MAX_STEER = 0.42;
const _pos = new Vector3();

export function updateBeryl(rig, car, input, dt, ground = 0, grade = 0) {
  const { root, chassis, wheels, state } = rig;

  toThree(car.x, car.y, ground, _pos);
  root.position.copy(_pos);
  root.rotation.y = yawFor(car.rotation);

  const a = alphaFor(0.2, dt);

  // Roll. car.lateral is velocity along the body's right axis, which goes
  // negative as she slides outward through a right-hander — so negating it tips
  // the body outward, the way a real car leans.
  //
  // Acceptance criterion if this is ever retuned: in a right-hand corner the
  // body must lean LEFT (outward), never into the turn.
  const targetRoll = -clamp(car.lateral / (CAR.driftLateral * 2.5), -1, 1) * MAX_ROLL;
  state.roll += (targetRoll - state.roll) * a;

  // Pitch: nose up under power, dive under brakes. Positive rotation about X
  // lifts the nose (which sits at -Z).
  const accel = dt > 0 ? (car.speed - state.lastSpeed) / dt : 0;
  state.lastSpeed = car.speed;
  const targetPitch = clamp(accel / CAR.accel, -1, 1) * MAX_PITCH;
  state.pitch += (targetPitch - state.pitch) * a;

  // The slope she is standing on tilts the WHOLE car, wheels included, so it
  // goes on the root rather than the chassis. Pitching only the body leaves the
  // wheels lying flat while the shell tips over them, which reads as the car
  // coming apart on every gradient. Positive rotation about X lifts the nose,
  // and the nose is at -Z, so an uphill grade adds directly.
  const targetSlope = Math.atan(grade);
  state.slope += (targetSlope - state.slope) * a;
  root.rotation.x = state.slope;

  chassis.rotation.z = state.roll;
  chassis.rotation.x = state.pitch;

  // Front wheels follow the steering input; all four roll with road speed.
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
