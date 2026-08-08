// Directional distant scenery for the Ōtaki Forks-to-coast course.
//
// The two ends of this level need opposite horizons. Looking inland toward the
// Forks should mean driving into high, steep, bush-covered ranges; approaching
// the beach should open into low Tasman sea and sky.
//
// The geometry stays fixed in world space, so it still produces real parallax,
// but the two directional groups cross-fade by position and heading. That last
// part matters: an earlier fixed-only version left the tops of the eastern ranges
// visible above fogged terrain while driving west, as a broken strip of floating
// fragments. The ranges now appear when Beryl actually turns inland, while the
// sea horizon grows in only as she approaches and faces the coast.
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

  // Three very low north-facing bands make a clean, flat water/sky break. They
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

  // One high shaded cloud belongs to the inland group, so it fades with the
  // range rather than hanging over an otherwise empty western horizon.
  addCloud(group, {
    x: W * 1.02,
    y: sea + 1850,
    z: H * 0.45,
    scale: 105,
    colour: COLOUR.cloudShade,
  });
}

function setFadeable(group) {
  group.traverse((object) => {
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material) continue;
      material.transparent = true;
      material.opacity = 0;
      material.depthWrite = false;
    }
  });
  group.visible = false;
}

function setOpacity(group, opacity) {
  group.visible = opacity > 0.015;
  if (!group.visible) return;
  group.traverse((object) => {
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (material) material.opacity = opacity;
    }
  });
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function facing(car, targetX, targetZ) {
  const dx = targetX - car.x;
  const dz = targetZ - car.y;
  const length = Math.hypot(dx, dz) || 1;
  const dot = car.forward.x * (dx / length) + car.forward.y * (dz / length);
  return smoothstep(-0.08, 0.72, dot);
}

export function buildOtakiParallax(sea = 0) {
  const root = new Group();
  root.name = 'otaki-directional-parallax-backgrounds';

  const coast = new Group();
  coast.name = 'otaki-open-coast-background';
  addCoastalHorizon(coast, sea);
  setFadeable(coast);
  root.add(coast);

  const mountains = new Group();
  mountains.name = 'otaki-forks-mountain-background';
  addInlandRanges(mountains, sea);
  setFadeable(mountains);
  root.add(mountains);

  root.userData.otakiParallax = {
    coast,
    mountains,
    coastOpacity: 0,
    mountainOpacity: 0,
  };

  return markDecorative(root);
}

// Render-only directional blend. `car.forward` is already the authoritative
// body heading used by the camera; this never touches simulation state or RNG.
export function updateOtakiParallax(root, car, dt) {
  const state = root?.userData?.otakiParallax;
  if (!state || !car) return;

  const W = WORLD.width;
  const H = WORLD.height;
  const westwardProgress = 1 - car.x / W;

  // The open horizon is only useful in the lower flats/town/coast half. The
  // target sits north-west of the finish, matching the last road segment so the
  // sea remains straight ahead rather than slipping to the side at the line.
  const coastPosition = smoothstep(0.38, 0.88, westwardProgress);
  const coastFacing = facing(car, -W * 0.18, -H * 0.45);
  const targetCoast = coastPosition * coastFacing;

  // The range can be seen from the coast when the player turns back inland, and
  // becomes more imposing as the Forks get closer. Heading is the hard gate that
  // prevents its peaks showing as fragments during the normal coastward run.
  const inlandPosition = 0.68 + 0.32 * smoothstep(0.38, 0.94, car.x / W);
  const inlandFacing = facing(car, W * 1.12, H * 0.2);
  const targetMountains = inlandPosition * inlandFacing;

  // About a third of a second to settle: enough to avoid a pop through a bend,
  // quick enough that turning the car around clearly changes the horizon.
  const alpha = dt > 0 ? 1 - Math.pow(0.003, dt / 0.34) : 1;
  state.coastOpacity += (targetCoast - state.coastOpacity) * alpha;
  state.mountainOpacity += (targetMountains - state.mountainOpacity) * alpha;

  setOpacity(state.coast, state.coastOpacity);
  setOpacity(state.mountains, state.mountainOpacity);
}
