// Remutaka Hill Road: a carriageway cut into a mountain side.
//
// The defining composition is deliberately asymmetric. On the inboard side a
// rock-and-bush bank rises almost vertically beside Beryl; beyond the opposite
// shoulder the land falls away hard into a broad valley. Silver guardrail and
// early chevrons make the exposed edge legible before the player reaches it.
import {
  BoxGeometry,
  BufferGeometry,
  DodecahedronGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Mesh,
  Object3D,
  PlaneGeometry,
} from 'three';
import { WORLD } from '../../config.js';
import { basic, lambert } from '../palette.js';
import { labelTexture } from '../textures.js';
import { addCloud, markDecorative, ridge } from './parallax.js';
import { remutakaRoadProfile } from '../../remutakaTerrain.js';

const COLOUR = {
  rail: 0xd8dee2,
  railShade: 0x87959a,
  reflector: 0xfff8e7,
  reflectorRed: 0xe84a5f,
  rock: 0x81776a,
  rockLight: 0x9a8d7d,
  scrub: 0x2f7046,
  scrubLight: 0x477f50,
  dropFace: 0x24553b,
  farRange: 0x9ab1a5,
  middleRange: 0x6f9476,
  nearRange: 0x3e714f,
  valleyFar: 0xa9bbb0,
  valleyNear: 0x7f9e84,
  cloud: 0xf6f2df,
  cloudShade: 0xdce6e3,
};

function addSideFace(group, track, terrain, profile, sideKey, nearOffset, farOffset, colour) {
  const positions = [];
  const normals = [];

  const push = (x, y, z) => {
    positions.push(x, y, z);
    // The geometry is lit for form, but a stable upward/outward normal is more
    // readable than noisy per-quad faceting on a long low-poly road cut.
    normals.push(0, 0.72, 0.68);
  };

  for (let i = Math.floor(profile.length * 0.14); i < profile.length - 1; i += 2) {
    const j = Math.min(profile.length - 1, i + 2);
    const a = profile[i];
    const b = profile[j];
    const sideA = a[sideKey];
    const sideB = b[sideKey];
    if (sideA !== sideB) continue;

    const an = {
      x: a.x + a.nx * sideA * nearOffset,
      z: a.z + a.nz * sideA * nearOffset,
    };
    const af = {
      x: a.x + a.nx * sideA * farOffset,
      z: a.z + a.nz * sideA * farOffset,
    };
    const bn = {
      x: b.x + b.nx * sideB * nearOffset,
      z: b.z + b.nz * sideB * nearOffset,
    };
    const bf = {
      x: b.x + b.nx * sideB * farOffset,
      z: b.z + b.nz * sideB * farOffset,
    };

    const any = terrain.heightAt(an.x, an.z) + 3;
    const afy = terrain.heightAt(af.x, af.z) + 3;
    const bny = terrain.heightAt(bn.x, bn.z) + 3;
    const bfy = terrain.heightAt(bf.x, bf.z) + 3;

    push(an.x, any, an.z);
    push(af.x, afy, af.z);
    push(bf.x, bfy, bf.z);
    push(an.x, any, an.z);
    push(bf.x, bfy, bf.z);
    push(bn.x, bny, bn.z);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  const mesh = new Mesh(geometry, lambert(colour, { side: DoubleSide, fog: true }));
  mesh.frustumCulled = false;
  group.add(mesh);
}

function guardrailPosts(track, terrain, profile) {
  const posts = [];
  let section = 0;
  let previousSide = null;

  for (let i = Math.floor(profile.length * 0.2); i < profile.length - 2;) {
    const p = profile[i];
    if (previousSide != null && p.outside !== previousSide) section += 1;
    previousSide = p.outside;

    const offset = track.half + 105;
    const x = p.x + p.nx * p.outside * offset;
    const z = p.z + p.nz * p.outside * offset;
    posts.push({ x, z, y: terrain.heightAt(x, z), section, p });

    // Denser posts where the road becomes exposed and technical.
    i += p.progress > 0.55 ? 2 : 3;
  }
  return posts;
}

function addGuardrail(group, track, terrain, profile) {
  const posts = guardrailPosts(track, terrain, profile);
  if (!posts.length) return;

  const beams = [];
  for (let i = 0; i < posts.length - 1; i += 1) {
    const a = posts[i];
    const b = posts[i + 1];
    const distance = Math.hypot(b.x - a.x, b.z - a.z);
    if (a.section === b.section && distance < 240) beams.push({ a, b, distance });
  }

  const unitBox = new BoxGeometry(1, 1, 1);
  const postMesh = new InstancedMesh(unitBox, lambert(COLOUR.railShade), posts.length);
  const beamMesh = new InstancedMesh(unitBox, lambert(COLOUR.rail), beams.length);
  const reflectorCount = Math.ceil(posts.length / 3);
  const reflectorMesh = new InstancedMesh(unitBox, basic(COLOUR.reflector, { fog: true }), reflectorCount);
  const redMesh = new InstancedMesh(unitBox, basic(COLOUR.reflectorRed, { fog: true }), reflectorCount);
  const dummy = new Object3D();

  posts.forEach((post, i) => {
    dummy.position.set(post.x, post.y + 35, post.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(12, 70, 12);
    dummy.updateMatrix();
    postMesh.setMatrixAt(i, dummy.matrix);
  });

  beams.forEach((beam, i) => {
    const dx = beam.b.x - beam.a.x;
    const dz = beam.b.z - beam.a.z;
    dummy.position.set(
      (beam.a.x + beam.b.x) / 2,
      (beam.a.y + beam.b.y) / 2 + 58,
      (beam.a.z + beam.b.z) / 2
    );
    dummy.rotation.set(0, Math.atan2(-dz, dx), 0);
    dummy.scale.set(beam.distance + 8, 14, 12);
    dummy.updateMatrix();
    beamMesh.setMatrixAt(i, dummy.matrix);
  });

  let reflector = 0;
  for (let i = 0; i < posts.length; i += 3) {
    const post = posts[i];
    const inward = -post.p.outside;
    const x = post.x + post.p.nx * inward * 8;
    const z = post.z + post.p.nz * inward * 8;
    const yaw = Math.atan2(-post.p.tz, post.p.tx);

    dummy.position.set(x, post.y + 76, z);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(18, 15, 5);
    dummy.updateMatrix();
    reflectorMesh.setMatrixAt(reflector, dummy.matrix);

    dummy.position.set(
      post.x + post.p.nx * post.p.outside * 8,
      post.y + 76,
      post.z + post.p.nz * post.p.outside * 8
    );
    dummy.updateMatrix();
    redMesh.setMatrixAt(reflector, dummy.matrix);
    reflector += 1;
  }

  for (const mesh of [postMesh, beamMesh, reflectorMesh, redMesh]) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    group.add(mesh);
  }
}

function addRockCut(group, track, terrain, profile) {
  const rocksA = [];
  const rocksB = [];
  const scrub = [];

  for (let i = Math.floor(profile.length * 0.22); i < profile.length; i += 5) {
    const p = profile[i];
    const drama = 0.35 + p.progress * 0.9;
    const offset = track.half + 330 + (i % 3) * 115;
    const x = p.x + p.nx * p.inside * offset;
    const z = p.z + p.nz * p.inside * offset;
    const height = 95 + 135 * drama + (i % 4) * 28;
    const rock = {
      x,
      z,
      y: terrain.heightAt(x, z) + height * 0.18,
      sx: 92 + (i % 5) * 18,
      sy: height,
      sz: 62 + (i % 4) * 15,
      yaw: (i * 1.71) % Math.PI,
    };
    (i % 2 ? rocksA : rocksB).push(rock);

    if (i % 10 === 0) {
      const bushOffset = offset + 230;
      const bx = p.x + p.nx * p.inside * bushOffset;
      const bz = p.z + p.nz * p.inside * bushOffset;
      scrub.push({
        x: bx,
        z: bz,
        y: terrain.heightAt(bx, bz) + 70,
        sx: 135 + (i % 4) * 22,
        sy: 125 + p.progress * 95,
        sz: 125 + (i % 3) * 26,
        yaw: (i * 0.93) % Math.PI,
      });
    }
  }

  const dummy = new Object3D();
  const addInstances = (items, geometry, material) => {
    if (!items.length) return;
    const mesh = new InstancedMesh(geometry, material, items.length);
    items.forEach((item, i) => {
      dummy.position.set(item.x, item.y, item.z);
      dummy.rotation.set(0, item.yaw, 0);
      dummy.scale.set(item.sx, item.sy, item.sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    group.add(mesh);
  };

  addInstances(rocksA, new DodecahedronGeometry(1, 0), lambert(COLOUR.rock));
  addInstances(rocksB, new DodecahedronGeometry(1, 0), lambert(COLOUR.rockLight));
  addInstances(scrub, new IcosahedronGeometry(1, 0), lambert(COLOUR.scrub));
}

function addChevron(group, track, terrain, profile, index) {
  const point = profile[index];
  const arrow = point.curvature > 0 ? '‹' : '›';
  const { texture } = labelTexture(arrow, {
    color: '#15314b',
    background: '#ffd166',
    fontSize: 88,
  });

  const sign = new Group();
  const board = new Mesh(
    new PlaneGeometry(90, 90),
    basic(0xffffff, { map: texture, transparent: true, side: DoubleSide, fog: true })
  );
  board.position.y = 112;
  sign.add(board);

  const post = new Mesh(new BoxGeometry(10, 82, 10), lambert(COLOUR.railShade));
  post.position.y = 41;
  sign.add(post);

  const offset = track.half + 92;
  const x = point.x + point.nx * point.outside * offset;
  const z = point.z + point.nz * point.outside * offset;
  sign.position.set(x, terrain.heightAt(x, z), z);
  const roadAngle = Math.atan2(point.tz, point.tx);
  sign.rotation.y = Math.PI / 2 - roadAngle + Math.PI;
  group.add(sign);
}

function addHairpinChevrons(group, track, terrain, profile) {
  const candidates = [];
  let last = -100;
  for (let i = Math.floor(profile.length * 0.5); i < profile.length - 7; i += 1) {
    const strength = Math.abs(profile[i].curvature);
    if (strength < 0.045 || i - last < 16) continue;
    let localMax = true;
    for (let j = Math.max(0, i - 5); j <= Math.min(profile.length - 1, i + 5); j += 1) {
      if (Math.abs(profile[j].curvature) > strength) {
        localMax = false;
        break;
      }
    }
    if (!localMax) continue;
    candidates.push(i);
    last = i;
  }

  for (const index of candidates.slice(0, 9)) {
    for (const delta of [-4, 0, 4]) {
      const i = Math.max(0, Math.min(profile.length - 1, index + delta));
      if (profile[i].outside === profile[index].outside) addChevron(group, track, terrain, profile, i);
    }
  }
}

function addDistantRanges(root) {
  const W = WORLD.width;
  const H = WORLD.height;
  const ranges = new Group();
  ranges.name = 'remutaka-directional-ranges';

  // East / summit side: tall, close and irregular. From Te Mārua the road runs
  // toward these walls; at the upper switchbacks they loom above the cut bank.
  const east = [
    { at: W + 5600, height: 1500, colour: COLOUR.farRange, phase: 0.4, drift: 420 },
    { at: W + 3300, height: 1850, colour: COLOUR.middleRange, phase: 1.5, drift: 330 },
    { at: W + 1450, height: 2250, colour: COLOUR.nearRange, phase: 2.4, drift: 250 },
  ];
  east.forEach((band, layer) => {
    ranges.add(ridge({
      along: 'z',
      at: band.at,
      start: -H * 0.35,
      end: H * 1.35,
      segments: 64,
      bottom: -1450,
      driftAt: (t) =>
        Math.sin(t * Math.PI * (4.1 + layer * 1.8) + band.phase) * band.drift +
        Math.sin(t * Math.PI * 17 + layer) * 65,
      heightAt: (t) =>
        band.height +
        Math.sin(t * Math.PI * (4.7 + layer * 1.4) + band.phase) * band.height * 0.24 +
        Math.sin(t * Math.PI * 15 + layer) * band.height * 0.09,
    }, band.colour));
  });

  // West / valley side: low aerial-perspective ridges rather than another wall.
  // Turning back through a hairpin therefore opens a large amount of sky above
  // the guardrail, which is the visual cue that there is a long way down.
  const west = [
    { at: -5200, height: 430, colour: COLOUR.valleyFar, phase: 0.8 },
    { at: -2500, height: 680, colour: COLOUR.valleyNear, phase: 2.1 },
  ];
  west.forEach((band, layer) => {
    ranges.add(ridge({
      along: 'z',
      at: band.at,
      start: -H * 0.3,
      end: H * 1.3,
      segments: 48,
      bottom: -1500,
      driftAt: (t) => Math.sin(t * Math.PI * (3.2 + layer) + band.phase) * 210,
      heightAt: (t) =>
        band.height + Math.sin(t * Math.PI * (4.5 + layer) + band.phase) * band.height * 0.22,
    }, band.colour));
  });

  // Low end caps keep the terrain skirt from becoming the horizon without
  // enclosing the road in four equally high generic walls.
  ranges.add(ridge({
    along: 'x', at: -2600, start: -W * 0.25, end: W * 1.25, segments: 52,
    bottom: -1500,
    driftAt: (t) => Math.sin(t * Math.PI * 4.3) * 160,
    heightAt: (t) => 520 + Math.sin(t * Math.PI * 5.2 + 0.6) * 120,
  }, COLOUR.valleyFar));
  ranges.add(ridge({
    along: 'x', at: H + 2900, start: -W * 0.25, end: W * 1.25, segments: 52,
    bottom: -1500,
    driftAt: (t) => Math.sin(t * Math.PI * 3.7 + 1.2) * 190,
    heightAt: (t) => 760 + Math.sin(t * Math.PI * 4.8 + 1.5) * 170,
  }, COLOUR.middleRange));

  addCloud(ranges, {
    x: W * 0.78,
    y: 2350,
    z: H * 0.18,
    scale: 115,
    colour: COLOUR.cloud,
  });
  addCloud(ranges, {
    x: W * 0.22,
    y: 1500,
    z: H * 0.72,
    scale: 90,
    colour: COLOUR.cloudShade,
  });

  root.add(markDecorative(ranges));
}

export function buildRemutaka(track, def, terrain) {
  const group = new Group();
  group.name = 'remutaka-cliff-road-environment';
  const profile = remutakaRoadProfile(track);

  // The terrain mesh already carries the large cross-section. These overlays
  // give its two sides different material language: exposed rock uphill, dark
  // bush descending into the valley.
  addSideFace(group, track, terrain, profile, 'inside', track.half + 150, track.half + 520, COLOUR.rock);
  addSideFace(group, track, terrain, profile, 'outside', track.half + 165, track.half + 760, COLOUR.dropFace);
  addRockCut(group, track, terrain, profile);
  addGuardrail(group, track, terrain, profile);
  addHairpinChevrons(group, track, terrain, profile);
  addDistantRanges(group);

  return group;
}
