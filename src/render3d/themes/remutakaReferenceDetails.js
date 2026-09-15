import {
  BoxGeometry,
  DodecahedronGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Mesh,
  Object3D,
  PlaneGeometry,
  Vector3,
} from 'three';
import { basic, lambert } from '../palette.js';
import { labelTexture } from '../textures.js';
import { remutakaVisualHeight, remutakaRoadProfile } from '../../remutakaTerrain.js';

const COLOUR = {
  rail: 0xd8dee2,
  railShade: 0x7b898e,
  post: 0xf4f0df,
  postPatch: 0x263238,
  bushDeep: 0x31573a,
  bushMid: 0x456c37,
  bushLight: 0x71934b,
};

function addDelineators(group, track, terrain, profile) {
  const samples = [];
  for (let i = Math.floor(profile.length * 0.1); i < profile.length - 4; i += 8) {
    const point = profile[i];
    // Inboard marker posts are the most useful because the exposed side already
    // has Armco reflectors. A few outboard posts remain early in the climb before
    // the barrier becomes continuous.
    samples.push({ point, side: point.inside });
    if (point.progress < 0.2) samples.push({ point, side: point.outside });
  }
  if (!samples.length) return;

  const unit = new BoxGeometry(1, 1, 1);
  const bodies = new InstancedMesh(unit, lambert(COLOUR.post), samples.length);
  const patches = new InstancedMesh(unit, basic(COLOUR.postPatch, { fog: true }), samples.length);
  const dummy = new Object3D();

  samples.forEach(({ point, side }, i) => {
    const offset = track.half + 72;
    const x = point.x + point.nx * side * offset;
    const z = point.z + point.nz * side * offset;
    const y = terrain.heightAt(x, z);
    const roadAngle = Math.atan2(point.tz, point.tx);

    dummy.position.set(x, y + 42, z);
    dummy.rotation.set(0, -roadAngle, 0);
    dummy.scale.set(12, 84, 9);
    dummy.updateMatrix();
    bodies.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x - point.nx * side * 3, y + 63, z - point.nz * side * 3);
    dummy.scale.set(14, 18, 4);
    dummy.updateMatrix();
    patches.setMatrixAt(i, dummy.matrix);
  });

  for (const mesh of [bodies, patches]) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    group.add(mesh);
  }
}

function addBushyBank(group, track, terrain, profile) {
  const bushes = [[], [], []];
  const start = 3;
  const end = profile.length - 3;

  for (let i = start; i < end; i += 4) {
    const point = profile[i];
    if (track.summit && Math.abs(i - track.summit.index) < 50) continue;
    // Dense overlapping crowns hide the old bare cut face. Deterministic trig
    // variation keeps the bush natural without touching gameplay RNG state.
    const strength = 0.75 + point.progress * 0.45;
    const count = 7;
    for (let r = 0; r < count; r += 1) {
      const phase = i * 1.73 + r * 4.1;
      const offset = track.half + 125 + r * 65 + Math.sin(phase) * 20;
      const along = Math.sin(phase * 0.7) * 55;
      const x = point.x + point.nx * point.inside * offset + point.tx * along;
      const z = point.z + point.nz * point.inside * offset + point.tz * along;
      const sx = 75 + (Math.sin(phase * 1.17) * 0.5 + 0.5) * 135;
      const sy = (140 + (Math.cos(phase * 0.91) * 0.5 + 0.5) * 120) * strength;
      const sz = 70 + (Math.sin(phase * 0.53 + 2) * 0.5 + 0.5) * 120;
      // Match the steep near-face mesh, not the coarser terrain grid.
      const farX = point.x + point.nx * (track.half + 450);
      const farZ = point.z + point.nz * (track.half + 450);
      const farHeight = remutakaVisualHeight(point, farX, farZ, point.h, track.half);
      const ground = offset < track.half + 450
        ? point.h - 8 + (farHeight - point.h + 8) * ((offset - track.half - 65) / 385)
        : terrain.heightAt(x, z);
      bushes[(i + r) % bushes.length].push({ x, z, y: ground + sy * 0.42, sx, sy, sz, yaw: phase * 0.23 });
    }
  }

  const geometry = new DodecahedronGeometry(1, 1);
  const dummy = new Object3D();
  const colours = [COLOUR.bushDeep, COLOUR.bushMid, COLOUR.bushLight];
  bushes.forEach((batch, colourIndex) => {
    const mesh = new InstancedMesh(geometry, lambert(colours[colourIndex], { flatShading: false }), batch.length);
    batch.forEach((bush, i) => {
      dummy.position.set(bush.x, bush.y, bush.z);
      dummy.rotation.set(0, bush.yaw, Math.sin(bush.yaw) * 0.08);
      dummy.scale.set(bush.sx, bush.sy, bush.sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    group.add(mesh);
  });
}

function addChevron(group, track, terrain, point) {
  const arrow = point.curvature > 0 ? '‹' : '›';
  const { texture } = labelTexture(arrow, {
    color: '#172d3e',
    background: '#f7c948',
    fontSize: 88,
  });
  const sign = new Group();
  const board = new Mesh(
    new PlaneGeometry(86, 86),
    basic(0xffffff, { map: texture, transparent: true, side: DoubleSide, fog: true })
  );
  board.position.y = 108;
  sign.add(board);

  const post = new Mesh(new BoxGeometry(9, 78, 9), lambert(COLOUR.railShade));
  post.position.y = 39;
  sign.add(post);

  const offset = track.half + 98;
  const x = point.x + point.nx * point.outside * offset;
  const z = point.z + point.nz * point.outside * offset;
  sign.position.set(x, terrain.heightAt(x, z), z);
  const roadAngle = Math.atan2(point.tz, point.tx);
  sign.rotation.y = Math.PI / 2 - roadAngle + Math.PI;
  group.add(sign);
}

function addSweeperChevrons(group, track, terrain, profile) {
  let last = -100;
  let added = 0;
  const end = Math.floor(profile.length * 0.58);
  for (let i = Math.floor(profile.length * 0.16); i < end && added < 10; i += 1) {
    const strength = Math.abs(profile[i].curvature);
    if (strength < 0.024 || i - last < 16) continue;
    let localMax = true;
    for (let j = Math.max(0, i - 4); j <= Math.min(profile.length - 1, i + 4); j += 1) {
      if (Math.abs(profile[j].curvature) > strength) {
        localMax = false;
        break;
      }
    }
    if (!localMax) continue;
    for (const delta of [-2, 2]) {
      const p = profile[Math.max(0, Math.min(profile.length - 1, i + delta))];
      if (p.outside === profile[i].outside) addChevron(group, track, terrain, p);
    }
    added += 2;
    last = i;
  }
}

export function buildRemutakaReferenceDetails(track, terrain) {
  const group = new Group();
  group.name = 'remutaka-video-reference-details';
  const profile = remutakaRoadProfile(track);
  if (!profile.length) return group;


  addDelineators(group, track, terrain, profile);
  addBushyBank(group, track, terrain, profile);
  addSweeperChevrons(group, track, terrain, profile);
  return group;
}
