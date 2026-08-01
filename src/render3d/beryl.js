// Beryl herself: a low-poly 1960s Morris Minor 1000, built in code.
//
// No binary model, deliberately — she stays editable in the repo, has no art
// pipeline to block on, and costs nothing to download. buildBeryl() returns a
// small handle ({ root, chassis, wheels, shadow }) so a glTF model can later
// replace the contents of `chassis` and re-bind four wheel nodes without
// anything else in render3d/ changing.
//
// Identity comes before detail (docs/ART-DIRECTION.md §2.1/§3.1): turquoise body,
// lighter roof, chrome bumpers and hubcaps, round headlights, a red side
// pinstripe, and whitewall tyres. Those are the things that make her read as
// Beryl at a glance from behind.
import {
  Group,
  Mesh,
  BoxGeometry,
  CylinderGeometry,
  CircleGeometry,
  Vector3,
} from 'three';
import { CAR } from '../config.js';
import { C, lambert, basic } from './palette.js';
import { toThree, yawFor, alphaFor } from './coords.js';

// Locked to the collision footprint in Car.js: beryl.png is 128x256 at scale
// 0.85, so she is 108.8 wide and 217.6 long. Height is chosen to match a real
// Morris Minor's proportions, gently squatter per the art direction.
export const BERYL = { width: 108.8, length: 217.6, height: 104 };

const W = BERYL.width;
const L = BERYL.length;

const WHEEL_R = 30;
const WHEEL_W = 22;
const AXLE_FRONT = -L * 0.31;
const AXLE_REAR = L * 0.32;
const AXLE_X = W * 0.44;

// Forward is -Z (see coords.js), so the nose is at negative z throughout.
function box(w, h, d, x, y, z, material) {
  const mesh = new Mesh(new BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
}

function buildWheel(materials) {
  // A wheel group so steering (yaw) and rolling (spin) stay independent: the
  // group yaws, the hub inside it spins.
  const group = new Group();
  const hub = new Group();

  // CylinderGeometry runs along Y; rotate it onto X so the wheel rolls about
  // the car's lateral axis, which makes hub.rotation.x the spin.
  const tyreGeom = new CylinderGeometry(WHEEL_R, WHEEL_R, WHEEL_W, 16);
  tyreGeom.rotateZ(Math.PI / 2);
  hub.add(new Mesh(tyreGeom, materials.tyre));

  // Whitewall ring, proud of the tyre on both faces. Non-negotiable identity.
  const wallGeom = new CylinderGeometry(WHEEL_R * 0.68, WHEEL_R * 0.68, WHEEL_W + 1.5, 16);
  wallGeom.rotateZ(Math.PI / 2);
  hub.add(new Mesh(wallGeom, materials.whitewall));

  const capGeom = new CylinderGeometry(WHEEL_R * 0.34, WHEEL_R * 0.34, WHEEL_W + 2.5, 12);
  capGeom.rotateZ(Math.PI / 2);
  hub.add(new Mesh(capGeom, materials.chrome));

  group.add(hub);
  group.userData.hub = hub;
  return group;
}

export function buildBeryl() {
  const materials = {
    body: lambert(C.berylBody),
    roof: lambert(C.berylRoof),
    glass: lambert(C.glass),
    chrome: lambert(C.chrome),
    accent: lambert(C.red),
    lamp: lambert(0xfff2c4),
    tyre: lambert(0x181a1d),
    whitewall: lambert(0xe9e9e2),
  };

  const root = new Group();
  // Yaw first, then pitch about the already-yawed lateral axis. The default XYZ
  // order applies pitch in world space, which shears the car sideways as soon as
  // she is both turned and on a slope.
  root.rotation.order = 'YXZ';
  const chassis = new Group();
  root.add(chassis);

  // --- Body ------------------------------------------------------------------
  // Main tub, sitting on the axles.
  chassis.add(box(W * 0.92, 40, L * 0.86, 0, 46, 4, materials.body));
  // Bonnet and boot, lower than the tub so the cabin reads as a separate volume.
  chassis.add(box(W * 0.86, 26, L * 0.3, 0, 50, -L * 0.4, materials.body));
  chassis.add(box(W * 0.86, 24, L * 0.22, 0, 50, L * 0.42, materials.body));
  // Front wings, a touch proud of the bonnet — the Minor's defining curve,
  // simplified to two blocks carrying the headlights.
  chassis.add(box(W * 0.2, 30, L * 0.34, -W * 0.4, 54, -L * 0.36, materials.body));
  chassis.add(box(W * 0.2, 30, L * 0.34, W * 0.4, 54, -L * 0.36, materials.body));

  // --- Cabin -----------------------------------------------------------------
  const cabinTop = 92;
  chassis.add(box(W * 0.8, 30, L * 0.36, 0, cabinTop, L * 0.04, materials.roof));
  // Glass: a band around the cabin, inset so the roof reads as a shell over it.
  chassis.add(box(W * 0.74, 24, L * 0.34, 0, 72, L * 0.04, materials.glass));
  // Windscreen and rear screen, sloped.
  const screen = box(W * 0.72, 26, 5, 0, 74, -L * 0.14, materials.glass);
  screen.rotation.x = -0.32;
  chassis.add(screen);
  const rear = box(W * 0.72, 24, 5, 0, 74, L * 0.22, materials.glass);
  rear.rotation.x = 0.34;
  chassis.add(rear);

  // --- Chrome and lamps ------------------------------------------------------
  chassis.add(box(W * 0.96, 10, 8, 0, 38, -L * 0.49, materials.chrome));
  chassis.add(box(W * 0.96, 10, 8, 0, 38, L * 0.49, materials.chrome));

  const lampGeom = new CylinderGeometry(11, 11, 8, 12);
  lampGeom.rotateX(Math.PI / 2);
  for (const sx of [-1, 1]) {
    const lamp = new Mesh(lampGeom, materials.lamp);
    lamp.position.set(sx * W * 0.4, 58, -L * 0.44);
    chassis.add(lamp);
  }
  const tailGeom = new CylinderGeometry(7, 7, 8, 10);
  tailGeom.rotateX(Math.PI / 2);
  for (const sx of [-1, 1]) {
    const tail = new Mesh(tailGeom, materials.accent);
    tail.position.set(sx * W * 0.36, 58, L * 0.47);
    chassis.add(tail);
  }

  // Red side pinstripe — Beryl has one, and it reads even at speed.
  for (const sx of [-1, 1]) {
    chassis.add(box(3, 5, L * 0.62, sx * W * 0.465, 44, 4, materials.accent));
  }

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
  const shadowGeom = new CircleGeometry(W * 0.62, 20);
  shadowGeom.rotateX(-Math.PI / 2);
  shadowGeom.scale(1, 1, L / W * 0.86);
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
