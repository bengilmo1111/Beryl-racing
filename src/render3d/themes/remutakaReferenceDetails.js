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
import { remutakaRoadProfile } from '../../remutakaTerrain.js';

const COLOUR = {
  rail: 0xd8dee2,
  railShade: 0x7b898e,
  post: 0xf4f0df,
  postPatch: 0x263238,
  rock: 0x746d64,
};

function addEarlyGuardrail(group, track, terrain, profile) {
  const start = Math.floor(profile.length * 0.07);
  const end = Math.floor(profile.length * 0.205);
  const posts = [];

  for (let i = start; i < end; i += 3) {
    const point = profile[i];
    const offset = track.half + 105;
    const x = point.x + point.nx * point.outside * offset;
    const z = point.z + point.nz * point.outside * offset;
    posts.push({
      x,
      z,
      roadY: point.h,
      groundY: Math.min(point.h, terrain.heightAt(x, z)),
    });
  }
  if (posts.length < 2) return;

  const unit = new BoxGeometry(1, 1, 1);
  const postMesh = new InstancedMesh(unit, lambert(COLOUR.railShade), posts.length);
  const beamMesh = new InstancedMesh(unit, lambert(COLOUR.rail), posts.length - 1);
  const dummy = new Object3D();
  const localX = new Vector3(1, 0, 0);
  const direction = new Vector3();

  posts.forEach((post, i) => {
    const height = post.roadY + 70 - post.groundY;
    dummy.position.set(post.x, post.groundY + height / 2, post.z);
    dummy.quaternion.identity();
    dummy.scale.set(12, height, 12);
    dummy.updateMatrix();
    postMesh.setMatrixAt(i, dummy.matrix);
  });

  for (let i = 0; i < posts.length - 1; i += 1) {
    const a = posts[i];
    const b = posts[i + 1];
    const dx = b.x - a.x;
    const dy = b.roadY - a.roadY;
    const dz = b.z - a.z;
    const distance = Math.hypot(dx, dy, dz);
    dummy.position.set(
      (a.x + b.x) / 2,
      (a.roadY + b.roadY) / 2 + 58,
      (a.z + b.z) / 2
    );
    direction.set(dx, dy, dz).normalize();
    dummy.quaternion.setFromUnitVectors(localX, direction);
    dummy.scale.set(distance + 8, 14, 12);
    dummy.updateMatrix();
    beamMesh.setMatrixAt(i, dummy.matrix);
  }

  for (const mesh of [postMesh, beamMesh]) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    group.add(mesh);
  }
}

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

function addRockCuts(group, track, terrain, profile) {
  const rocks = [];
  const start = Math.floor(profile.length * 0.17);
  const end = Math.floor(profile.length * 0.9);

  for (let i = start; i < end; i += 5) {
    const point = profile[i];
    // More exposed rock as the climb gets steeper. Deterministic trig variation
    // keeps the wall irregular without touching the seeded gameplay RNG.
    const strength = 0.45 + point.progress * 0.8;
    const count = (i % 15 === 0) ? 2 : 1;
    for (let r = 0; r < count; r += 1) {
      const phase = i * 1.73 + r * 4.1;
      const offset = track.half + 185 + (Math.sin(phase) * 0.5 + 0.5) * 230;
      const along = Math.sin(phase * 0.7) * 55;
      const x = point.x + point.nx * point.inside * offset + point.tx * along;
      const z = point.z + point.nz * point.inside * offset + point.tz * along;
      const sx = 65 + (Math.sin(phase * 1.17) * 0.5 + 0.5) * 110;
      const sy = (90 + (Math.cos(phase * 0.91) * 0.5 + 0.5) * 210) * strength;
      const sz = 48 + (Math.sin(phase * 0.53 + 2) * 0.5 + 0.5) * 90;
      const ground = terrain.heightAt(x, z);
      rocks.push({ x, z, y: ground + sy * 0.22, sx, sy, sz, yaw: phase * 0.23 });
    }
  }
  if (!rocks.length) return;

  const geometry = new DodecahedronGeometry(1, 0);
  const mesh = new InstancedMesh(geometry, lambert(COLOUR.rock), rocks.length);
  const dummy = new Object3D();
  rocks.forEach((rock, i) => {
    dummy.position.set(rock.x, rock.y, rock.z);
    dummy.rotation.set(0, rock.yaw, Math.sin(rock.yaw) * 0.12);
    dummy.scale.set(rock.sx, rock.sy, rock.sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  group.add(mesh);
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

  addEarlyGuardrail(group, track, terrain, profile);
  addDelineators(group, track, terrain, profile);
  addRockCuts(group, track, terrain, profile);
  addSweeperChevrons(group, track, terrain, profile);
  return group;
}
