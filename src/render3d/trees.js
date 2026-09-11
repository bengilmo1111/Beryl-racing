// Roadside trees.
//
// Positions, variants and scales come from src/scenery.js, which is simulation
// rather than decoration — the same placement seeds the collision circles the
// car bumps into. Nothing here may consume the global RNG or reorder anything.
//
// The 2D build drew these as top-down canopy PNGs, which are unusable from a
// chase camera (you would be looking at a flat cut-out of a treetop). They are
// low-poly meshes now, instanced so a thousand trees cost a handful of draw
// calls.
import {
  InstancedMesh,
  CylinderGeometry,
  ConeGeometry,
  IcosahedronGeometry,
  CircleGeometry,
  Object3D,
  Group,
  Color,
} from 'three';
import { C, lambert, basic } from './palette.js';
import { foliageTint } from './ground.js';

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
function hashUnit(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function hashAngle(x, y) {
  return hashUnit(x, y) * Math.PI * 2;
}

// Remutaka's seeded scenery is also gameplay: changing the number or placement
// of trees changes collision circles and therefore deterministic replays. The
// real-road video, though, has long exposed stretches of low wind-cut vegetation
// rather than a continuous wall of mature trees. Solve that here, render-only:
// keep every tree/collider exactly where simulation put it, but deterministically
// render many of them as scrubby saplings. No RNG is consumed and obstacle
// fingerprints stay unchanged.
function remutakaVisualScale(tree) {
  const h = hashUnit(tree.x * 0.031, tree.y * 0.017);
  if (h < 0.58) return 0.24 + h * 0.34;       // low scrub / saplings
  return 0.72 + (h - 0.58) * 0.52;            // scattered mature trees
}

const tint = new Color();

export function buildTrees(trees, terrain, theme = null) {
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

    const canopyBase = foliageTint(theme, spec.color);
    const canopy = new InstancedMesh(canopyGeom, lambert(canopyBase), list.length);
    const trunk = new InstancedMesh(trunkGeom, lambert(TRUNK_COLOR), list.length);
    const shadow = new InstancedMesh(
      shadowGeom,
      basic(0x000000, { transparent: true, opacity: 0.18, depthWrite: false, fog: true }),
      list.length
    );

    list.forEach((tree, i) => {
      const ground = terrain.heightAt(tree.x, tree.y);
      // Canopy width is a real size now, authored per species in src/scenery.js,
      // and the collision circle is the trunk rather than a fraction of the
      // canopy. So what you hit is the trunk you can see standing under it,
      // instead of a bumper the width of the branches.
      const themeScale = theme === 'eastbourne'
        ? 0.85
        : theme === 'remutaka'
          ? remutakaVisualScale(tree)
          : 1;
      const width = tree.canopyWidth * themeScale;
      const heightFactor = theme === 'eastbourne'
        ? 1.05
        : theme === 'remutaka'
          ? spec.heightFactor * 0.9
          : spec.heightFactor;
      const height = width * heightFactor;
      const yaw = hashAngle(tree.x, tree.y);

      dummy.position.set(tree.x, ground + height * 0.34, tree.y);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(width, height * 0.66, width);
      dummy.updateMatrix();
      canopy.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tree.x, ground, tree.y);
      // On Eastbourne and Remutaka the trunk should represent the actual
      // collision circle, not balloon and shrink with decorative canopy scale.
      // This is particularly important for Remutaka's render-only saplings.
      const trunkWidth = (theme === 'eastbourne' || theme === 'remutaka')
        ? tree.trunkRadius / 0.09
        : width;
      dummy.scale.set(trunkWidth, height * 0.4, trunkWidth);
      dummy.updateMatrix();
      trunk.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tree.x, ground + 0.8, tree.y);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(width * 1.1, 1, width * 1.1);
      dummy.updateMatrix();
      shadow.setMatrixAt(i, dummy.matrix);

      // A shade lighter or darker per tree. A stand of a hundred canopies in one
      // flat colour reads as a texture rather than as trees, and this is the
      // cheapest possible cure — the same positional hash the yaw uses, so it
      // costs nothing and touches no RNG.
      const shade = 0.86 + hashUnit(tree.x * 0.7, tree.y * 0.7) * 0.28;
      canopy.setColorAt(i, tint.copy(canopyBase).multiplyScalar(shade));
    });
    if (canopy.instanceColor) canopy.instanceColor.needsUpdate = true;

    for (const mesh of [shadow, trunk, canopy]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      group.add(mesh);
    }
  }

  return group;
}

// The species library in models/nzTrees.js is deliberately NOT re-exported here.
//
// It was, to "make the build parse and validate" it — but the validator
// (scripts/validate-nz-tree-models.mjs) imports it directly, so re-exporting
// only pulled ~500 lines of unused builders into the shipped bundle. Nothing
// renders from it yet: the roadside scatter needs 90 trees in a handful of draw
// calls, which is what the InstancedMesh above delivers, and the library builds
// a full Group per tree. Wiring it into the scatter is a real piece of work
// (instancing per species, or a much smaller tree count), not an import swap.
