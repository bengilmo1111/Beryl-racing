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
  InstancedMesh,
  Object3D,
  Group,
} from 'three';
import { lambert } from './palette.js';
import { metres } from '../scale.js';

const COLOUR = {
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

  return group;
}
