// Distant Eastbourne scenery arranged in depth bands.
//
// These are deliberately real pieces of 3D geometry rather than a painted
// skybox. The harbour ridge, headlands, inland bush and village roofline sit at
// different distances from the road, so the chase camera creates parallax for
// free as Beryl follows Marine Drive. Everything lives beyond the playable
// route, carries no collision, and uses a handful of flat-colour meshes.
import {
  BoxGeometry,
  ConeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
} from 'three';
import { WORLD } from '../../config.js';
import { addCloud, markDecorative, ridge } from './parallax.js';

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

function addRidges(group, sea) {
  const W = WORLD.width;
  const H = WORLD.height;
  const start = -H * 0.45;
  const end = H * 1.45;
  const bottom = sea - 80;

  // Across Wellington Harbour: a pale, low ridge and a darker nearer headland.
  // The uneven profiles keep the horizon hand-made rather than procedural.
  group.add(
    ridge(
      {
        at: -W * 0.3,
        start,
        end,
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
        at: W * 0.015,
        start,
        end,
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
        at: W * 0.95,
        start,
        end,
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
        at: W * 0.73,
        start,
        end,
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

  addCloud(group, { x: -W * 0.12, y: sea + 760, z: H * 0.18, scale: 105, colour: COLOUR.cloudWarm });
  addCloud(group, { x: W * 0.45, y: sea + 900, z: H * 0.42, scale: 82, colour: COLOUR.cloudShade });
  addCloud(group, { x: -W * 0.2, y: sea + 690, z: H * 0.72, scale: 118, colour: COLOUR.cloudWarm });
  addCloud(group, { x: W * 0.5, y: sea + 840, z: H * 1.02, scale: 92, colour: COLOUR.cloudShade });
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
  return markDecorative(group);
}
