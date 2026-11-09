import { Group, Mesh, InstancedMesh, IcosahedronGeometry, CylinderGeometry, BoxGeometry,
  BufferGeometry, Float32BufferAttribute, Object3D } from 'three';
import { lambert, basic } from '../palette.js';
import { nearestRoadPose } from '../../driveRoute.js';
import { inWaterRegion } from '../../waterRegions.js';
import { cameraClearFoliage } from '../foliageVisibility.js';

// Photo-reference cues at driving scale: irregular roadside hedges, white
// delineators and broken surf. No RNG draws or independent building positions.
export function buildOtakiReferenceDetails(track, terrain) {
  const root = new Group();
  root.name = 'otaki-reference-roadside';
  const dummy = new Object3D();
  const hedges = [], markers = [];
  const end = track.checkpoints[5].index;
  for (let i = 12; i < end; i += 9) {
    const p = track.centerline[i], next = track.centerline[i + 1];
    const angle = Math.atan2(next.y - p.y, next.x - p.x);
    const nx = -Math.sin(angle), nz = Math.cos(angle);
    for (const side of [-1, 1]) {
      markers.push({ x: p.x + nx * side * (track.half + 65), z: p.y + nz * side * (track.half + 65) });
      if (i < end * .18 || Math.sin(i * .173 + side) < -.1) continue;
      const x = p.x + nx * side * (track.half + 540);
      const z = p.y + nz * side * (track.half + 540);
      const pose = nearestRoadPose(track, x, z);
      if (pose.distance < pose.road.half + 260 || inWaterRegion(track.sea, x, z, 180)) continue;
      hedges.push({ x, z, angle, h: 105 + 65 * (.5 + .5 * Math.sin(i * .37)) });
    }
  }
  const hedgeMesh = new InstancedMesh(new IcosahedronGeometry(1, 1),
    cameraClearFoliage(lambert(0x4f7946)), hedges.length * 2);
  hedges.forEach((p, i) => {
    for (let j = 0; j < 2; j++) {
      const x = p.x + Math.cos(p.angle) * (j - .5) * 180;
      const z = p.z + Math.sin(p.angle) * (j - .5) * 180;
      dummy.position.set(x, terrain.heightAt(x, z) + p.h * .48, z);
      dummy.rotation.set(0, -p.angle, 0);
      dummy.scale.set(180, p.h * .6, 120);
      dummy.updateMatrix(); hedgeMesh.setMatrixAt(i * 2 + j, dummy.matrix);
    }
  });
  hedgeMesh.name = 'otaki-broken-farm-hedges';
  hedgeMesh.frustumCulled = false;
  root.add(hedgeMesh);
  const posts = new InstancedMesh(new CylinderGeometry(4, 5, 46, 5), lambert(0xe7e9dc), markers.length);
  const reflectors = new InstancedMesh(new BoxGeometry(7, 8, 7), basic(0xa94c37), markers.length);
  markers.forEach((p, i) => {
    const h = terrain.heightAt(p.x, p.z);
    dummy.rotation.set(0, 0, -.07 * Math.sin(i)); dummy.scale.set(1, 1, 1);
    dummy.position.set(p.x, h + 23, p.z); dummy.updateMatrix(); posts.setMatrixAt(i, dummy.matrix);
    dummy.position.y = h + 38; dummy.updateMatrix(); reflectors.setMatrixAt(i, dummy.matrix);
  });
  for (const mesh of [posts, reflectors]) { mesh.frustumCulled = false; root.add(mesh); }
  return root;
}

export function buildOtakiSurf(layout, sea) {
  const root = new Group();
  root.name = 'otaki-surf-lines';
  const beach = layout.zones.beach, coast = layout.coastX;
  // Long, shallow parallel breakers like the supplied beach aerial. Short
  // gaps and different wavelengths stop them looking like painted lane lines.
  for (let row = 0; row < 4; row++) {
    const positions = [];
    const step = 180;
    for (let z = beach.y; z < beach.y + beach.h - step; z += step) {
      if (Math.sin(z * .0017 + row * 2) > .86) continue;
      const xAt = z => coast - 110 - row * 260 + Math.sin(z / 1100 + row) * 65;
      const width = row === 0 ? 65 : 22 + row * 4;
      const a = xAt(z), b = xAt(z + step);
      for (const p of [[a,z], [a-width,z], [b-width,z+step], [a,z], [b-width,z+step], [b,z+step]])
        positions.push(p[0], sea + 5 + row * .3, p[1]);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    root.add(new Mesh(geometry, basic(row ? 0xc8e9e4 : 0xeff6e7, { fog: true, side: 2 })));
  }
  return root;
}
