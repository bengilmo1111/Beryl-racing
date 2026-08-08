// Shared building blocks for the distant background bands.
//
// A parallax layer here is real geometry standing beyond the playable world, not
// a painted skybox: because the bands sit at genuinely different distances, the
// chase camera produces parallax for free with no per-frame background code.
//
// Everything built here is unfogged (`fog: false`) so it stays visible as the
// horizon instead of dissolving into the fog band a few hundred metres out. That
// is why the camera's far plane has to clear the whole world — see CAMERA_FAR in
// palette.js.
import {
  BufferGeometry,
  DodecahedronGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
} from 'three';

// A ridgeline: a strip standing on the ground plane whose top edge wanders.
//
// `along` is the axis the ridge runs down; `at` is its position on the other
// horizontal axis, which `driftAt` then wobbles so the band is not a dead
// straight wall. Eastbourne's harbour runs along Z beside a north-south road;
// Manfeild's ranges run along X behind a circuit that is wider than it is deep.
export function ridgeGeometry({
  along = 'z',
  at,
  start,
  end,
  segments,
  bottom,
  heightAt,
  driftAt,
}) {
  const positions = [];
  const indices = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const a = start + (end - start) * t;
    const p = at + driftAt(t);
    const top = heightAt(t);
    if (along === 'z') positions.push(p, bottom, a, p, top, a);
    else positions.push(a, bottom, p, a, top, p);

    if (i < segments) {
      const q = i * 2;
      const b = q + 1;
      const c = q + 2;
      const d = q + 3;
      indices.push(q, c, b, b, c, d);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

// DoubleSide because a ridge that drifts back and forth across its own axis
// would otherwise show holes wherever the strip turns away from the camera.
// frustumCulled off because these span the whole world as single meshes.
export function ridge(options, colour) {
  const mesh = new Mesh(
    ridgeGeometry(options),
    new MeshBasicMaterial({ color: colour, side: DoubleSide, fog: false })
  );
  mesh.frustumCulled = false;
  return mesh;
}

// A low-poly cloud: a row of squashed dodecahedra sharing one material.
export function addCloud(group, { x, y, z, scale, colour }) {
  const material = new MeshBasicMaterial({ color: colour, fog: false });
  const geometry = new DodecahedronGeometry(1, 0);
  const puffs = [
    [-0.95, -0.08, 0, 0.9],
    [-0.25, 0.12, 0, 1.2],
    [0.55, 0.02, 0, 1.0],
    [1.18, -0.12, 0, 0.72],
  ];

  for (const [ox, oy, oz, size] of puffs) {
    const puff = new Mesh(geometry, material);
    puff.position.set(x + ox * scale, y + oy * scale, z + oz * scale);
    puff.scale.set(scale * size, scale * size * 0.48, scale * size * 0.34);
    group.add(puff);
  }
}

// Mark a whole layer as scenery that nothing should ever raycast or collide
// against.
export function markDecorative(group) {
  group.traverse((object) => {
    object.userData.decorativeBackground = true;
  });
  return group;
}
