// Roadside trees.
//
// Positions, variants and scales come from src/scenery.js, which is simulation
// rather than decoration — the same placement seeds the collision circles the
// car bumps into. Nothing here may consume the global RNG or reorder anything.
//
// The 2D build drew these as top-down canopy PNGs, which are unusable from a
// chase camera (you would be looking at a flat cut-out of a treetop). They are
// low-poly meshes now, instanced so 90 trees cost a handful of draw calls.
import {
  InstancedMesh,
  CylinderGeometry,
  ConeGeometry,
  IcosahedronGeometry,
  CircleGeometry,
  Object3D,
  Group,
} from 'three';
import { C, lambert, basic } from './palette.js';

// Distinct silhouettes, per docs/ART-DIRECTION.md §5.3 — the player should be
// able to tell them apart at a glance, not just see "a tree".
const VARIANTS = {
  'tree-1': { // broad, round pōhutukawa-ish
    canopy: () => new IcosahedronGeometry(0.5, 1),
    canopyScale: [1.05, 0.82, 1.05],
    heightFactor: 2.4,
    color: 0x3f9a4f,
  },
  'tree-2': { // tall dark shelter-belt conifer
    canopy: () => new ConeGeometry(0.5, 1, 9),
    canopyScale: [0.72, 1.5, 0.72],
    heightFactor: 3.4,
    color: 0x2f6d3d,
  },
  'tree-3': { // wide farm macrocarpa
    canopy: () => new ConeGeometry(0.5, 1, 10),
    canopyScale: [1.25, 0.85, 1.25],
    heightFactor: 2.1,
    color: 0x4e9b52,
  },
};

const TRUNK_COLOR = 0x6b4f34;

// A cheap deterministic hash so each tree gets its own yaw without touching
// Math.random — the global stream is seeded and part of the determinism
// contract (see src/scenery.js).
function hashAngle(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return (n - Math.floor(n)) * Math.PI * 2;
}

export function buildTrees(trees, terrain) {
  const group = new Group();
  if (!trees || !trees.length) return group;

  const byVariant = new Map();
  for (const tree of trees) {
    if (!byVariant.has(tree.variant)) byVariant.set(tree.variant, []);
    byVariant.get(tree.variant).push(tree);
  }

  const dummy = new Object3D();

  for (const [key, list] of byVariant) {
    const spec = VARIANTS[key] || VARIANTS['tree-1'];

    // Unit geometries, scaled per instance. Origins sit at each part's base so
    // instance scaling grows the tree upward out of the ground.
    const canopyGeom = spec.canopy();
    canopyGeom.scale(spec.canopyScale[0], spec.canopyScale[1], spec.canopyScale[2]);
    canopyGeom.translate(0, 0.5, 0);

    const trunkGeom = new CylinderGeometry(0.06, 0.09, 1, 6);
    trunkGeom.translate(0, 0.5, 0);

    const shadowGeom = new CircleGeometry(0.5, 12);
    shadowGeom.rotateX(-Math.PI / 2);

    const canopy = new InstancedMesh(canopyGeom, lambert(spec.color), list.length);
    const trunk = new InstancedMesh(trunkGeom, lambert(TRUNK_COLOR), list.length);
    const shadow = new InstancedMesh(
      shadowGeom,
      basic(0x000000, { transparent: true, opacity: 0.18, depthWrite: false, fog: true }),
      list.length
    );

    list.forEach((tree, i) => {
      const ground = terrain.heightAt(tree.x, tree.y);
      // Canopy diameter tracks the sprite width the collision radius is derived
      // from, so the trunk and lower canopy sit inside the circle you bump into —
      // what you hit is what you see.
      const width = tree.displayWidth;
      const height = width * spec.heightFactor;
      const yaw = hashAngle(tree.x, tree.y);

      dummy.position.set(tree.x, ground + height * 0.34, tree.y);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(width, height * 0.66, width);
      dummy.updateMatrix();
      canopy.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tree.x, ground, tree.y);
      dummy.scale.set(width, height * 0.4, width);
      dummy.updateMatrix();
      trunk.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tree.x, ground + 0.8, tree.y);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(width * 1.1, 1, width * 1.1);
      dummy.updateMatrix();
      shadow.setMatrixAt(i, dummy.matrix);
    });

    for (const mesh of [shadow, trunk, canopy]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      group.add(mesh);
    }
  }

  return group;
}

// Standalone authored models. Re-exporting them here makes the build parse and
// validate the library without changing any existing scenery placement.
export {
  NZ_TREE_CATALOG,
  buildNzTreeAsset,
  buildNzTreeShowcase,
  buildPohutukawa,
  buildTiKouka,
  buildKowhai,
  buildTotara,
  buildKanuka,
  buildRimu,
  buildNorfolkPine,
} from './models/nzTrees.js';
