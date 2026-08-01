// Distant Eastbourne scenery arranged in depth bands.
//
// These are deliberately real pieces of 3D geometry rather than a painted
// skybox. The harbour ridge, headlands, inland bush and village roofline sit at
// different distances from the road, so the chase camera creates parallax for
// free as Beryl follows Marine Drive. Everything lives beyond the playable
// route, carries no collision, and uses a handful of flat-colour meshes.
import {
  BoxGeometry,
  BufferGeometry,
  ConeGeometry,
  DodecahedronGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
} from 'three';
import { WORLD } from '../../config.js';

const COLOUR = {
  farHarbour: 0x86a9ad,
  harbourHeadland: 0x5f887d,
  farBush: 0x6f9567,
  nearBush: 0x3f6d4e,
  cloudWarm: 0xfff3da,
  cloudShade: 0xeadfc9,
  sun: 0xffd889,
  villaCream: 0xf2dfb7,
  villaWarm: 0xdcae84,
  roofRed: 0xa95f55,
  roofGreen: 0x557564,
};

function ridgeGeometry({ x, zStart, zEnd, segments, bottom, heightAt, driftAt }) {
  const positions = [];
  const indices = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const z = zStart + (zEnd - zStart) * t;
    const px = x + driftAt(t);
    const top = heightAt(t);
    positions.push(px, bottom, z, px, top, z);

    if (i < segments) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

function ridge(options, colour) {
  const material = new MeshBasicMaterial({
    color: colour,
    side: DoubleSide,
    fog: false,
  });
  const mesh = new Mesh(ridgeGeometry(options), material);
  mesh.frustumCulled = false;
  return mesh;
}

function addRidges(group, sea) {
  const W = WORLD.width;
  const H = WORLD.height;
  const zStart = -H * 0.45;
  const zEnd = H * 1.45;
  const bottom = sea - 80;

  // Across Wellington Harbour: a pale, low ridge and a darker nearer headland.
  // The uneven profiles keep the horizon hand-made rather than procedural.
  group.add(
    ridge(
      {
        x: -W * 0.3,
        zStart,
        zEnd,
        segments: 42,
        bottom,
        driftAt: (t) => Math.sin(t * Math.PI * 5.2) * 70 + Math.sin(t * Math.PI * 13) * 28,
        heightAt: (t) =>
          sea + 120 + Math.sin(t * Math.PI * 6.2 + 0.7) * 54 + Math.sin(t * Math.PI * 17) * 20,
      },
      COLOUR.farHarbour
    )
  );
  group.add(
    ridge(
      {
        x: W * 0.015,
        zStart,
        zEnd,
        segments: 46,
        bottom,
        driftAt: (t) => Math.sin(t * Math.PI * 7 + 1.8) * 92 + Math.sin(t * Math.PI * 15) * 35,
        heightAt: (t) =>
          sea + 185 + Math.sin(t * Math.PI * 7.4) * 82 + Math.sin(t * Math.PI * 19 + 0.3) * 28,
      },
      COLOUR.harbourHeadland
    )
  );

  // Inland: broad bush-covered hills in two stronger green bands. They run the
  // full course so Ferry Road, Days Bay, Rona Bay and the village feel like one
  // continuous coastal journey rather than separate arenas.
  group.add(
    ridge(
      {
        x: W * 0.95,
        zStart,
        zEnd,
        segments: 44,
        bottom: sea - 120,
        driftAt: (t) => Math.sin(t * Math.PI * 5.5 + 0.4) * 120,
        heightAt: (t) =>
          sea + 430 + Math.sin(t * Math.PI * 5.8 + 0.9) * 145 + Math.sin(t * Math.PI * 14) * 62,
      },
      COLOUR.farBush
    )
  );
  group.add(
    ridge(
      {
        x: W * 0.73,
        zStart,
        zEnd,
        segments: 48,
        bottom: sea - 100,
        driftAt: (t) => Math.sin(t * Math.PI * 8.2) * 95 + Math.sin(t * Math.PI * 21) * 24,
        heightAt: (t) =>
          sea + 315 + Math.sin(t * Math.PI * 8 + 1.1) * 120 + Math.sin(t * Math.PI * 23) * 45,
      },
      COLOUR.nearBush
    )
  );
}

function addCloud(group, x, y, z, scale, shaded = false) {
  const material = new MeshBasicMaterial({
    color: shaded ? COLOUR.cloudShade : COLOUR.cloudWarm,
    fog: false,
  });
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

function addSky(group, sea) {
  const W = WORLD.width;
  const H = WORLD.height;

  // A low-poly late-afternoon sun over the harbour. It is a sphere rather than
  // a camera-facing sprite, so it remains stable as the route curves inland.
  const sun = new Mesh(
    new SphereGeometry(92, 12, 8),
    new MeshBasicMaterial({ color: COLOUR.sun, fog: false })
  );
  sun.position.set(-W * 0.18, sea + 820, H * 0.48);
  group.add(sun);

  addCloud(group, -W * 0.12, sea + 760, H * 0.18, 105, false);
  addCloud(group, W * 0.45, sea + 900, H * 0.42, 82, true);
  addCloud(group, -W * 0.2, sea + 690, H * 0.72, 118, false);
  addCloud(group, W * 0.5, sea + 840, H * 1.02, 92, true);
}

function addVillageRoofline(group, sea) {
  const W = WORLD.width;
  const H = WORLD.height;
  const wallGeometries = [
    new BoxGeometry(105, 82, 86),
    new BoxGeometry(128, 96, 96),
    new BoxGeometry(92, 72, 78),
  ];
  const roofGeometries = [
    new ConeGeometry(82, 54, 4),
    new ConeGeometry(94, 58, 4),
    new ConeGeometry(72, 48, 4),
  ];
  const wallMaterials = [
    new MeshBasicMaterial({ color: COLOUR.villaCream, fog: false }),
    new MeshBasicMaterial({ color: COLOUR.villaWarm, fog: false }),
  ];
  const roofMaterials = [
    new MeshBasicMaterial({ color: COLOUR.roofRed, fog: false }),
    new MeshBasicMaterial({ color: COLOUR.roofGreen, fog: false }),
  ];

  // Modest, repeated roof shapes suggest the Eastbourne village and hillside
  // homes without reproducing every building or introducing modern signage.
  // The strip sits outside the world bounds, behind the inland bush layer.
  const count = 18;
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const variant = i % wallGeometries.length;
    const z = H * (0.2 + t * 0.78);
    const x = W * 0.81 + Math.sin(i * 1.7) * 80;
    const base = sea + 115 + Math.sin(i * 0.9) * 38;

    const wall = new Mesh(wallGeometries[variant], wallMaterials[i % wallMaterials.length]);
    wall.position.set(x, base, z);
    wall.rotation.y = (i % 3 - 1) * 0.08;
    group.add(wall);

    const roof = new Mesh(roofGeometries[variant], roofMaterials[i % roofMaterials.length]);
    roof.position.set(x, base + 64, z);
    roof.rotation.y = Math.PI * 0.25 + wall.rotation.y;
    roof.scale.z = 0.72;
    group.add(roof);
  }
}

export function buildEastbourneParallax(sea = 0) {
  const group = new Group();
  group.name = 'eastbourne-parallax-backgrounds';

  addRidges(group, sea);
  addVillageRoofline(group, sea);
  addSky(group, sea);

  // Background-only: never participate in raycasts or collision assumptions.
  group.traverse((object) => {
    object.userData.decorativeBackground = true;
  });
  return group;
}
