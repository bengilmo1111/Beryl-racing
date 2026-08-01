import { Box3 } from 'three';
import {
  NZ_TREE_CATALOG,
  buildNzTreeAsset,
} from '../src/render3d/models/nzTrees.js';

function triangleCount(root) {
  let triangles = 0;
  root.traverse((object) => {
    const geometry = object.geometry;
    if (!geometry) return;
    if (geometry.index) triangles += geometry.index.count / 3;
    else {
      const positions = geometry.getAttribute('position');
      if (positions) triangles += positions.count / 3;
    }
  });
  return triangles;
}

function dispose(root) {
  root.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) if (material) material.dispose();
  });
}

for (const [id, spec] of Object.entries(NZ_TREE_CATALOG)) {
  for (let variant = 0; variant < spec.variants; variant++) {
    const tree = buildNzTreeAsset(id, { variant });
    tree.updateMatrixWorld(true);

    const metadata = tree.userData.treeAsset;
    if (!metadata || metadata.id !== id || metadata.variant !== variant) {
      throw new Error(`${id} variant ${variant}: missing or incorrect tree metadata`);
    }

    const bounds = new Box3().setFromObject(tree);
    const values = [bounds.min.x, bounds.min.y, bounds.min.z, bounds.max.x, bounds.max.y, bounds.max.z];
    if (values.some((value) => !Number.isFinite(value))) {
      throw new Error(`${id} variant ${variant}: non-finite geometry bounds`);
    }
    // A slanted cylinder's circular foot extends a few units below its authored
    // endpoint. Treat that as a buried root flare, while still catching models
    // whose actual geometry is substantially displaced below ground.
    if (bounds.min.y < -24) {
      throw new Error(`${id} variant ${variant}: geometry falls too far below its ground origin (${bounds.min.y})`);
    }

    const height = bounds.max.y - bounds.min.y;
    if (height < spec.nominalHeight * 0.65 || height > spec.nominalHeight * 1.55) {
      throw new Error(`${id} variant ${variant}: height ${height.toFixed(1)} is inconsistent with nominal ${spec.nominalHeight}`);
    }

    const triangles = triangleCount(tree);
    if (triangles <= 0 || triangles > 9000) {
      throw new Error(`${id} variant ${variant}: unexpected triangle count ${triangles}`);
    }

    console.log(`${id} v${variant}: ${height.toFixed(1)} units, ${Math.round(triangles)} triangles`);
    dispose(tree);
  }
}
