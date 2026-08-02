// Directional distant scenery for the Ōtaki Forks-to-coast course.
//
// The two ends of this level need opposite horizons. Looking inland toward the
// Forks should mean driving into high, steep, bush-covered ranges; approaching
// the beach should open into low Tasman sea and sky. These bands are fixed in
// world space on the appropriate sides of the map, so the contrast follows both
// position and heading without a camera-facing skybox or a hard background swap.
//
// As with Eastbourne's parallax, these are real meshes at several depths. The
// chase camera therefore gets natural parallax while the player moves and turns.
// Everything is decorative, unfogged and outside the driveable world.
import {
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SphereGeometry,
} from 'three';
import { WORLD } from '../../config.js';
import { addCloud, markDecorative, ridge } from './parallax.js';

const COLOUR = {
  ocean: 0x69aec4,
  oceanNear: 0x78b9ca,
  horizon: 0xa9cbd4,
  horizonHaze: 0xc4d9dc,
  farRange: 0x6d8f7e,
  middleRange: 0x4f775d,
  nearRange: 0x315c43,
  cloudWarm: 0xfff2d8,
  cloudShade: 0xe2e7de,
  sun: 0xffd487,
};

function addCoastalHorizon(group, sea) {
  const W = WORLD.width;
  const H = WORLD.height;

  // The foreground beach mesh only needs to cover the playable shore. This
  // much larger, slightly lower plane carries the water to the camera horizon,
  // especially on the final northward run where open sea must sit dead ahead.
  const ocean = new Mesh(
    new PlaneGeometry(W * 1.45, H * 2.05),
    new MeshBasicMaterial({ color: COLOUR.ocean, fog: false, side: DoubleSide })
  );
  ocean.geometry.rotateX(-Math.PI / 2);
  ocean.position.set(-W * 0.27, sea + 0.4, H * 0.22);
  ocean.frustumCulled = false;
  group.add(ocean);

  // Two very low north-facing bands make a clean, flat water/sky break. They
  // deliberately contain no island or headland: the finish should feel exposed
  // to the Tasman rather than framed by another wall of land.
  group.add(
    ridge(
      {
        along: 'x',
        at: -H * 0.28,
        start: -W * 0.82,
        end: W * 0.43,
        segments: 30,
        bottom: sea - 90,
        driftAt: (t) => Math.sin(t * Math.PI * 3.2) * 16,
        heightAt: (t) => sea + 34 + Math.sin(t * Math.PI * 5.5) * 5,
      },
      COLOUR.oceanNear
    )
  );
  group.add(
    ridge(
      {
        along: 'x',
        at: -H * 0.52,
        start: -W * 0.9,
        end: W * 0.48,
        segments: 28,
        bottom: sea - 110,
        driftAt: (t) => Math.sin(t * Math.PI * 2.1 + 0.4) * 12,
        heightAt: (t) => sea + 74 + Math.sin(t * Math.PI * 4.2) * 7,
      },
      COLOUR.horizon
    )
  );
  group.add(
    ridge(
      {
        along: 'x',
        at: -H * 0.7,
        start: -W,
        end: W * 0.55,
        segments: 24,
        bottom: sea - 130,
        driftAt: () => 0,
        heightAt: () => sea + 118,
      },
      COLOUR.horizonHaze
    )
  );
}

function addInlandRanges(group, sea) {
  const W = WORLD.width;
  const H = WORLD.height;
  const start = -H * 0.32;
  const end = H * 1.34;

  // Three ranges sit progressively farther east of the Forks. Their tall,
  // irregular profiles are intentionally much more vertical than the low coast
  // horizon. When the player turns back inland, the road appears to run straight
  // into dense Tararua foothills rather than toward an empty sky colour.
  group.add(
    ridge(
      {
        at: W * 1.14,
        start,
        end,
        segments: 42,
        bottom: sea - 100,
        driftAt: (t) => Math.sin(t * Math.PI * 4.2 + 0.7) * 260,
        heightAt: (t) =>
          sea + 1050 + Math.sin(t * Math.PI * 4.6) * 270 + Math.sin(t * Math.PI * 11.5) * 95,
      },
      COLOUR.farRange
    )
  );
  group.add(
    ridge(
      {
        at: W * 1.075,
        start,
        end,
        segments: 48,
        bottom: sea - 120,
        driftAt: (t) =>
          Math.sin(t * Math.PI * 5.8 + 1.2) * 210 + Math.sin(t * Math.PI * 14) * 55,
        heightAt: (t) =>
          sea + 1320 + Math.sin(t * Math.PI * 6.1 + 0.2) * 330 + Math.sin(t * Math.PI * 17) * 120,
      },
      COLOUR.middleRange
    )
  );
  group.add(
    ridge(
      {
        at: W * 1.02,
        start,
        end,
        segments: 54,
        bottom: sea - 140,
        driftAt: (t) =>
          Math.sin(t * Math.PI * 7.4) * 155 + Math.sin(t * Math.PI * 19.5 + 0.5) * 42,
        heightAt: (t) =>
          sea + 1580 + Math.sin(t * Math.PI * 7.7 + 0.8) * 390 + Math.sin(t * Math.PI * 22) * 145,
      },
      COLOUR.nearRange
    )
  );
}

function addSky(group, sea) {
  const W = WORLD.width;
  const H = WORLD.height;

  // Low western sun and sparse sea clouds keep the coast broad and airy. The
  // inland side gets only one higher shaded cloud so the mountain silhouette
  // remains the dominant read when facing the Forks.
  const sun = new Mesh(
    new SphereGeometry(115, 12, 8),
    new MeshBasicMaterial({ color: COLOUR.sun, fog: false })
  );
  sun.position.set(-W * 0.18, sea + 930, H * 0.04);
  group.add(sun);

  addCloud(group, {
    x: -W * 0.12,
    y: sea + 820,
    z: H * 0.12,
    scale: 120,
    colour: COLOUR.cloudWarm,
  });
  addCloud(group, {
    x: W * 0.22,
    y: sea + 1020,
    z: -H * 0.08,
    scale: 92,
    colour: COLOUR.cloudShade,
  });
  addCloud(group, {
    x: W * 1.02,
    y: sea + 1850,
    z: H * 0.45,
    scale: 105,
    colour: COLOUR.cloudShade,
  });
}

export function buildOtakiParallax(sea = 0) {
  const group = new Group();
  group.name = 'otaki-directional-parallax-backgrounds';

  addCoastalHorizon(group, sea);
  addInlandRanges(group, sea);
  addSky(group, sea);

  return markDecorative(group);
}
