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
export const BERYL = { width: 108.8, length: 217.6, height: 106 };

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
  bumper.position.set(0, 33, z);
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

  // Beryl's wheel centres are painted body colour with a small chrome hubcap in
  // the middle — clearly visible in the photo and a nicer detail than a plain
  // chrome disc.
  const dishGeom = new CylinderGeometry(WHEEL_R * 0.5, WHEEL_R * 0.5, WHEEL_W + 2, 12);
  dishGeom.rotateZ(Math.PI / 2);
  hub.add(new Mesh(dishGeom, materials.body));

  const capGeom = new CylinderGeometry(WHEEL_R * 0.26, WHEEL_R * 0.26, WHEEL_W + 3, 10);
  capGeom.rotateZ(Math.PI / 2);
  hub.add(new Mesh(capGeom, materials.chrome));

  group.add(hub);
  group.userData.hub = hub;
  return group;
}

export function buildBeryl() {
  const materials = {
    body: lambert(C.berylBody, { flatShading: true }),
    // The real Beryl is one colour all over — the photo shows the roof in the
    // same turquoise as the flanks, not the pale contrast roof the art notes
    // assumed. Lighting alone gives the roof its lift.
    roof: lambert(C.berylBody, { flatShading: true }),
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
  // Measured off public/assets/beryl-photo.png rather than guessed. On the real
  // car the glass band is only about 30% of her total height and the body side
  // below it is a deep 50%, with the wheels making up the rest. Earlier passes
  // had that backwards — a shallow body under an oversized bubble — which is
  // what kept reading as a low wedge instead of an upright little saloon.
  //
  // The waistline runs level from screen to boot; the bonnet sits just under it
  // and slopes gently down to a rounded nose.
  chassis.add(loft([
    { z: -L * 0.50, halfWidth: W * 0.30, bottom: 30, top: 56 },
    { z: -L * 0.455, halfWidth: W * 0.41, bottom: 25, top: 62 },
    { z: -L * 0.34, halfWidth: W * 0.49, bottom: 22, top: 68 },
    { z: -L * 0.20, halfWidth: W * 0.50, bottom: 22, top: 73 },
    { z: L * 0.10, halfWidth: W * 0.50, bottom: 22, top: 75 },
    { z: L * 0.30, halfWidth: W * 0.485, bottom: 23, top: 74 },
    { z: L * 0.44, halfWidth: W * 0.42, bottom: 26, top: 68 },
    { z: L * 0.50, halfWidth: W * 0.29, bottom: 30, top: 60 },
  ], materials.body));

  // Pronounced separate wings are one of the quickest Morris Minor tells. Low-
  // segment ellipsoids give a round impression while staying visibly low-poly.
  for (const sx of [-1, 1]) {
    chassis.add(ellipsoid(W * 0.22, 22, L * 0.17,
      sx * W * 0.375, 50, AXLE_FRONT - L * 0.015, materials.body));
    chassis.add(ellipsoid(W * 0.205, 20, L * 0.135,
      sx * W * 0.38, 49, AXLE_REAR, materials.body));
  }

  // A gently crowned bonnet keeps the nose from reading like a flat tabletop.
  // Sat just *into* the shell rather than proud of it: raised, it became a
  // separate lump on top of the car instead of the bonnet's centre spine.
  chassis.add(ellipsoid(W * 0.30, 7, L * 0.20,
    0, 62, -L * 0.325, materials.body, 12));

  // --- Cabin -----------------------------------------------------------------
  // The reference cabin spans almost half the car and sits slightly rearward.
  // The older version's short rectangular cabin was the main reason Beryl read
  // as a generic boxy car rather than a Minor.
  // The rear stations are held high deliberately. The first pass dropped the
  // back of the cabin to 76, which looks right in profile but is wrong from the
  // only angle that matters: the chase camera sits behind her, so a cabin that
  // tapers away rearward reads as a chopped roof and the car looks low-slung
  // rather than like an upright little Minor.
  // The greenhouse is the thing that makes her a Minor. In the photo it is tall,
  // upright and airy — roughly as much of her height as the body below it — and
  // nearly as wide as the body, with a long flattish roof. Earlier passes kept
  // making it a shallow bubble, which is what left her looking chopped.
  // Spans -0.16L to +0.35L, matching the photo's cabin at roughly half her
  // length and set slightly rearward, sitting on the 73-75 waistline.
  const cabinStations = [
    { z: -L * 0.175, halfWidth: W * 0.33, bottom: 73, top: 82 },
    { z: -L * 0.105, halfWidth: W * 0.405, bottom: 73, top: 100 },
    { z: L * 0.03, halfWidth: W * 0.435, bottom: 73, top: 106 },
    { z: L * 0.20, halfWidth: W * 0.425, bottom: 73, top: 105 },
    { z: L * 0.335, halfWidth: W * 0.35, bottom: 72, top: 92 },
  ];
  chassis.add(loft(cabinStations, materials.glass));

  // A proper solid roof, not a rim.
  //
  // The first pass capped the glass loft with a 9-unit lip, which left the whole
  // greenhouse reading as one dark wraparound band — from the chase camera she
  // looked chopped, or open-topped. A Morris Minor's tall body-coloured roof is
  // one of its most recognisable features, so it gets real depth here and the
  // glass is left as a band beneath it.
  chassis.add(loft(cabinStations.map((s) => ({
    z: s.z,
    halfWidth: s.halfWidth + W * 0.018,
    // Only the tall middle stations carry roof; the sloped ends stay glass so
    // the windscreen and rear screen still read as screens.
    bottom: s.top - Math.max(8, (s.top - 59) * 0.42),
    top: s.top + 2,
  })), materials.roof));

  // Body-colour pillars stop the glass envelope looking like one giant visor.
  //
  // Sized from the cabin loft rather than by hand: fixed-height boxes overshot
  // the roofline at the sloped ends and stuck out of her silhouette like roll-bar
  // struts. Interpolating the cabin's own profile keeps every pillar inside it.
  const cabinAt = (z) => {
    const st = cabinStations;
    if (z <= st[0].z) return st[0];
    if (z >= st[st.length - 1].z) return st[st.length - 1];
    for (let i = 1; i < st.length; i += 1) {
      if (z > st[i].z) continue;
      const a = st[i - 1];
      const b = st[i];
      const t = (z - a.z) / (b.z - a.z);
      return {
        halfWidth: a.halfWidth + (b.halfWidth - a.halfWidth) * t,
        bottom: a.bottom + (b.bottom - a.bottom) * t,
        top: a.top + (b.top - a.top) * t,
      };
    }
    return st[st.length - 1];
  };
  const pillar = (z, thickness, depth, tilt) => {
    const at = cabinAt(z);
    const height = Math.max(6, at.top - at.bottom - 4);
    for (const sx of [-1, 1]) {
      const p = box(thickness, height, depth, sx * at.halfWidth * 0.97,
        at.bottom + height / 2, z, materials.body);
      p.rotation.x = tilt;
      chassis.add(p);
    }
  };
  pillar(-L * 0.145, 5, 6, -0.3);
  // The four-door B-pillar: the photo shows a clear upright post splitting the
  // side glass in two, and it is the cue that stops her looking like a coupe.
  pillar(L * 0.05, 6, 7, 0);
  pillar(L * 0.285, 6, 8, 0.34);

  // Rear glass is the face seen most often by the chase camera, so reinforce it
  // as a broad sloped panel rather than leaving it implicit in the loft.
  const rearScreen = box(W * 0.58, 22, 4, 0, 88, L * 0.295, materials.glass);
  rearScreen.rotation.x = 0.5;
  chassis.add(rearScreen);

  // --- Chrome, lamps and recognisable face ----------------------------------
  chassis.add(buildBumper(W * 0.94, -L * 0.505, materials.chrome));
  chassis.add(buildBumper(W * 0.94, L * 0.505, materials.chrome));

  // Rounded bumper overriders add the tiny bit of period character that reads
  // clearly without requiring texture maps.
  for (const sx of [-1, 1]) {
    chassis.add(box(7, 18, 7, sx * W * 0.30, 38, -L * 0.497, materials.chrome));
    chassis.add(box(7, 18, 7, sx * W * 0.30, 38, L * 0.497, materials.chrome));
  }

  const lampGeom = new CylinderGeometry(10.5, 10.5, 7, 12);
  lampGeom.rotateX(Math.PI / 2);
  for (const sx of [-1, 1]) {
    const lamp = new Mesh(lampGeom, materials.lamp);
    lamp.position.set(sx * W * 0.385, 60, -L * 0.452);
    chassis.add(lamp);
  }

  // Dark inset grille with simple chrome vertical bars: recognisable as a Morris
  // front without chasing photo-real trim.
  chassis.add(box(W * 0.30, 26, 4, 0, 50, -L * 0.487, materials.grille));
  for (const x of [-0.12, -0.06, 0, 0.06, 0.12]) {
    chassis.add(box(2.2, 23, 3, W * x, 50, -L * 0.49, materials.chrome));
  }

  const tailGeom = new CylinderGeometry(6.5, 6.5, 7, 10);
  tailGeom.rotateX(Math.PI / 2);
  for (const sx of [-1, 1]) {
    const tail = new Mesh(tailGeom, materials.accent);
    tail.position.set(sx * W * 0.355, 60, L * 0.473);
    chassis.add(tail);
  }

  // Warm cream rear number plate; deliberately text-free at this scale.
  chassis.add(box(W * 0.27, 10, 3, 0, 47, L * 0.497, materials.plate));

  // Red side pinstripe — Beryl has one, and it reads even at speed.
  //
  // It has to sit ON the shoulder crease, which is where the loft is actually at
  // full width. The cross-section is an octagon that pulls in above the
  // shoulder, so a stripe placed up at the waistline (y 68) was hanging ~13
  // units outside the bodywork down the whole flank — from the chase camera it
  // read as a pair of red fins rather than a pinstripe.
  for (const sx of [-1, 1]) {
    chassis.add(box(2.5, 3, L * 0.56, sx * W * 0.503, 54, -L * 0.02, materials.accent));
  }

  // Bonnet and boot seams are cheap, readable cues to the classic three-box
  // shape when the camera climbs on a hill.
  chassis.add(box(2, 2, L * 0.30, 0, 66, -L * 0.33, materials.chrome));
  chassis.add(box(W * 0.44, 2, 2, 0, 67, L * 0.4, materials.chrome));

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
