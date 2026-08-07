// Roadside furniture: the things that make a road read as a road through
// somewhere, rather than tarmac laid on a lawn.
//
// Positions come from src/scenery.js, like the trees, so a prop and its
// collision circle — where it has one — can never disagree. Nothing here
// consumes the global RNG.
//
// All instanced. A fence is one post mesh and one wire mesh repeated a few
// hundred times, not a few hundred objects, so the cost of lining a four
// kilometre road is a handful of draw calls.
import {
  BoxGeometry,
  CylinderGeometry,
  ConeGeometry,
  IcosahedronGeometry,
  InstancedMesh,
  Object3D,
  Group,
} from 'three';
import { lambert } from './palette.js';
import { metres } from '../scale.js';

const COLOUR = {
  scrub: 0x4a7a48,
  scrubDry: 0x8a9152,
  rock: 0x8d8a83,
  bale: 0xd9c98a,
  baleEnd: 0xc4b06d,
  gateRail: 0xb9bcb4,
  boxPost: 0x7d6448,
  box: 0xd6584f,
  post: 0x7d6448,
  wire: 0x9aa0a2,
  pole: 0x6f5a44,
  crossarm: 0x5d4b39,
  shelter: 0x2c5738,
  shelterTrunk: 0x4a3a2c,
};

const POST_SPACING = metres(3.2);
const POST_HEIGHT = metres(1.15);
const POST_RADIUS = metres(0.06);
const WIRE_COUNT = 3;

const POLE_HEIGHT = metres(8.2);
const POLE_RADIUS = metres(0.14);
const CROSSARM_SPAN = metres(2.1);

const BELT_SPACING = metres(4.4);
const BELT_HEIGHT = metres(12);
const BELT_WIDTH = metres(5.2);

// Count first, then fill: an InstancedMesh needs its capacity up front, and
// walking the list twice is cheaper than growing an array of matrices.
function countPosts(props) {
  let posts = 0;
  let wires = 0;
  for (const p of props) {
    if (p.kind !== 'fence') continue;
    posts += Math.max(1, Math.round(p.length / POST_SPACING));
    wires += 1;
  }
  return { posts, wires };
}

function countBelt(props) {
  let trees = 0;
  for (const p of props) {
    if (p.kind !== 'shelterBelt') continue;
    trees += Math.max(2, Math.round(p.length / BELT_SPACING));
  }
  return trees;
}

// One instanced mesh per kind, built from whatever is in the list. Returns null
// when the course has none of them, so a theme that wants no bales pays nothing.
function instanced(props, kind, geometry, material, count = 1) {
  const list = props.filter((p) => p.kind === kind);
  if (!list.length) return null;
  return { list, mesh: new InstancedMesh(geometry, material, list.length * count) };
}

export function buildProps(props, terrain) {
  const group = new Group();
  group.name = 'roadside-props';
  if (!props || !props.length) return group;

  const dummy = new Object3D();
  const ground = (x, z) => (terrain ? terrain.heightAt(x, z) : 0);

  // --- fences ---------------------------------------------------------------
  const { posts: postCount, wires: wireCount } = countPosts(props);
  if (postCount) {
    const postGeom = new CylinderGeometry(POST_RADIUS, POST_RADIUS * 1.15, POST_HEIGHT, 5);
    postGeom.translate(0, POST_HEIGHT / 2, 0);
    const posts = new InstancedMesh(postGeom, lambert(COLOUR.post), postCount);

    const wireGeom = new BoxGeometry(1, metres(0.03), metres(0.03));
    const wires = new InstancedMesh(wireGeom, lambert(COLOUR.wire), wireCount * WIRE_COUNT);

    let p = 0;
    let w = 0;
    for (const prop of props) {
      if (prop.kind !== 'fence') continue;
      const n = Math.max(1, Math.round(prop.length / POST_SPACING));
      const dx = Math.cos(prop.yaw);
      const dz = Math.sin(prop.yaw);
      for (let i = 0; i < n; i++) {
        const t = (i / n - 0.5) * prop.length;
        const x = prop.x + dx * t;
        const z = prop.y + dz * t;
        dummy.position.set(x, ground(x, z), z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        posts.setMatrixAt(p++, dummy.matrix);
      }
      for (let k = 0; k < WIRE_COUNT; k++) {
        const height = POST_HEIGHT * (0.42 + k * 0.24);
        dummy.position.set(prop.x, ground(prop.x, prop.y) + height, prop.y);
        dummy.rotation.set(0, -prop.yaw, 0);
        dummy.scale.set(prop.length, 1, 1);
        dummy.updateMatrix();
        wires.setMatrixAt(w++, dummy.matrix);
      }
    }
    for (const mesh of [posts, wires]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      group.add(mesh);
    }
  }

  // --- power poles ----------------------------------------------------------
  const poleProps = props.filter((p) => p.kind === 'pole');
  if (poleProps.length) {
    const poleGeom = new CylinderGeometry(POLE_RADIUS * 0.8, POLE_RADIUS, POLE_HEIGHT, 6);
    poleGeom.translate(0, POLE_HEIGHT / 2, 0);
    const poles = new InstancedMesh(poleGeom, lambert(COLOUR.pole), poleProps.length);

    const armGeom = new BoxGeometry(CROSSARM_SPAN, metres(0.12), metres(0.12));
    const arms = new InstancedMesh(armGeom, lambert(COLOUR.crossarm), poleProps.length);

    poleProps.forEach((prop, i) => {
      const y = ground(prop.x, prop.y);
      dummy.position.set(prop.x, y, prop.y);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      poles.setMatrixAt(i, dummy.matrix);

      dummy.position.set(prop.x, y + POLE_HEIGHT * 0.88, prop.y);
      dummy.rotation.set(0, -prop.yaw, 0);
      dummy.updateMatrix();
      arms.setMatrixAt(i, dummy.matrix);
    });
    for (const mesh of [poles, arms]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      group.add(mesh);
    }
  }

  // --- shelter belts --------------------------------------------------------
  //
  // Drawn as a close row of individual crowns rather than one long box: from the
  // road the silhouette is what reads, and a row of overlapping cones has a
  // lumpy top where a box has a straight one.
  const beltCount = countBelt(props);
  if (beltCount) {
    const crownGeom = new ConeGeometry(0.5, 1, 7);
    crownGeom.translate(0, 0.5, 0);
    const crowns = new InstancedMesh(crownGeom, lambert(COLOUR.shelter), beltCount);
    const trunkGeom = new CylinderGeometry(metres(0.2), metres(0.28), 1, 5);
    trunkGeom.translate(0, 0.5, 0);
    const trunks = new InstancedMesh(trunkGeom, lambert(COLOUR.shelterTrunk), beltCount);

    let b = 0;
    for (const prop of props) {
      if (prop.kind !== 'shelterBelt') continue;
      const n = Math.max(2, Math.round(prop.length / BELT_SPACING));
      const dx = Math.cos(prop.yaw);
      const dz = Math.sin(prop.yaw);
      for (let i = 0; i < n; i++) {
        const t = (i / (n - 1) - 0.5) * prop.length;
        const x = prop.x + dx * t;
        const z = prop.y + dz * t;
        const y = ground(x, z);
        // A deterministic wobble so the top is not a ruled line.
        const wave = 0.86 + 0.14 * Math.sin(i * 1.7 + prop.x * 0.001);
        dummy.rotation.set(0, i * 0.7, 0);
        dummy.position.set(x, y + BELT_HEIGHT * wave * 0.24, z);
        dummy.scale.set(BELT_WIDTH, BELT_HEIGHT * wave * 0.82, BELT_WIDTH);
        dummy.updateMatrix();
        crowns.setMatrixAt(b, dummy.matrix);

        dummy.rotation.set(0, 0, 0);
        dummy.position.set(x, y, z);
        dummy.scale.set(1, BELT_HEIGHT * wave * 0.26, 1);
        dummy.updateMatrix();
        trunks.setMatrixAt(b, dummy.matrix);
        b++;
      }
    }
    for (const mesh of [trunks, crowns]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      group.add(mesh);
    }
  }

  // --- low cover: flax, tussock, gorse --------------------------------------
  //
  // A squashed icosahedron is a poor flax bush up close and an excellent one at
  // forty metres, which is the only distance it is ever seen from. This is the
  // thing that stops the ground between the trees reading as mown lawn.
  const scrub = instanced(
    props, 'scrub',
    new IcosahedronGeometry(metres(1.15), 0),
    lambert(COLOUR.scrub)
  );
  if (scrub) {
    scrub.list.forEach((p, i) => {
      const y = ground(p.x, p.y);
      dummy.position.set(p.x, y + metres(0.55) * p.size, p.y);
      dummy.rotation.set(0, p.yaw, 0);
      dummy.scale.set(p.size, p.size * 0.75, p.size);
      dummy.updateMatrix();
      scrub.mesh.setMatrixAt(i, dummy.matrix);
    });
    scrub.mesh.instanceMatrix.needsUpdate = true;
    scrub.mesh.frustumCulled = false;
    group.add(scrub.mesh);
  }

  // --- boulders and slip debris ---------------------------------------------
  const rocks = instanced(
    props, 'rock',
    new IcosahedronGeometry(metres(0.9), 0),
    lambert(COLOUR.rock)
  );
  if (rocks) {
    rocks.list.forEach((p, i) => {
      const y = ground(p.x, p.y);
      dummy.position.set(p.x, y + metres(0.3) * p.size, p.y);
      dummy.rotation.set(p.yaw * 0.3, p.yaw, p.yaw * 0.2);
      dummy.scale.set(p.size, p.size * 0.7, p.size * 0.85);
      dummy.updateMatrix();
      rocks.mesh.setMatrixAt(i, dummy.matrix);
    });
    rocks.mesh.instanceMatrix.needsUpdate = true;
    rocks.mesh.frustumCulled = false;
    group.add(rocks.mesh);
  }

  // --- round bales ----------------------------------------------------------
  const baleGeom = new CylinderGeometry(metres(0.75), metres(0.75), metres(1.2), 10);
  baleGeom.rotateZ(Math.PI / 2);
  const bales = instanced(props, 'bale', baleGeom, lambert(COLOUR.bale));
  if (bales) {
    bales.list.forEach((p, i) => {
      dummy.position.set(p.x, ground(p.x, p.y) + metres(0.75), p.y);
      dummy.rotation.set(0, p.yaw, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      bales.mesh.setMatrixAt(i, dummy.matrix);
    });
    bales.mesh.instanceMatrix.needsUpdate = true;
    bales.mesh.frustumCulled = false;
    group.add(bales.mesh);
  }

  // --- farm gates and letterboxes -------------------------------------------
  //
  // Three meshes to a gate: the rails, the post the box sits on, and the box.
  // A gap in a fence is just a gap; a gate and a letterbox beside it is somebody
  // living there.
  const gateProps = props.filter((p) => p.kind === 'gate');
  if (gateProps.length) {
    const railGeom = new BoxGeometry(metres(3.6), metres(0.09), metres(0.09));
    const rails = new InstancedMesh(railGeom, lambert(COLOUR.gateRail), gateProps.length * 3);
    const postGeom = new CylinderGeometry(metres(0.07), metres(0.07), metres(1.1), 5);
    postGeom.translate(0, metres(0.55), 0);
    const boxPosts = new InstancedMesh(postGeom, lambert(COLOUR.boxPost), gateProps.length);
    const boxGeom = new BoxGeometry(metres(0.42), metres(0.28), metres(0.3));
    const boxes = new InstancedMesh(boxGeom, lambert(COLOUR.box), gateProps.length);

    let r = 0;
    gateProps.forEach((p, i) => {
      const y = ground(p.x, p.y);
      for (let k = 0; k < 3; k++) {
        dummy.position.set(p.x, y + metres(0.35 + k * 0.32), p.y);
        dummy.rotation.set(0, -p.yaw, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        rails.setMatrixAt(r++, dummy.matrix);
      }
      // The box stands just to one side of the gate, on the road edge.
      const bx = p.x + Math.cos(p.yaw) * metres(2.6);
      const bz = p.y + Math.sin(p.yaw) * metres(2.6);
      const by = ground(bx, bz);
      dummy.position.set(bx, by, bz);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      boxPosts.setMatrixAt(i, dummy.matrix);
      dummy.position.set(bx, by + metres(1.2), bz);
      dummy.rotation.set(0, -p.yaw, 0);
      dummy.updateMatrix();
      boxes.setMatrixAt(i, dummy.matrix);
    });
    for (const mesh of [rails, boxPosts, boxes]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      group.add(mesh);
    }
  }

  return group;
}
