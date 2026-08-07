// Baking a pile of static boxes into one mesh.
//
// A single Eastbourne villa is about twenty little boxes, each its own geometry
// and its own material — which is fine for seventeen of them and ruinous for two
// hundred and seventy. Putting the housing density back took the course from
// roughly 1,200 draw calls to 6,228, measured, and that is a number you feel on
// a phone long before you feel it on a laptop.
//
// Nothing about a house moves, so none of that per-mesh flexibility is being
// used for anything. This flattens a finished group into one indexed mesh whose
// colours travel in a vertex attribute instead of in materials. Two hundred and
// seventy houses become one draw call.
//
// The road and terrain already draw this way (`lambert(0xffffff, { vertexColors:
// true })`), so it is the existing idiom rather than a new one.
//
// What it cannot do, and deliberately does not try to: anything transparent
// (draw order stops being separable), anything textured, anything that needs to
// move or be hidden on its own afterwards, and InstancedMesh — which is already
// batched and is skipped rather than exploded into individual copies.
//
// The trade it makes is frustum culling: one mesh spanning four and a half
// kilometres of coast has a bounding sphere that is always on screen, so all of
// it is submitted every frame where individual houses behind you were not.
// Measured, that costs nothing here — scene triangles went 576,882 → 573,344
// across the change, because at this view distance almost everything was being
// drawn anyway. If a course ever gets dense enough for that to stop being true,
// the answer is to bake in chunks of a kilometre rather than to stop baking.
import { Mesh, BufferAttribute, Color } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { lambert } from './palette.js';

const scratch = new Color();

// Flatten `root` into a single Mesh. Returns null if there was nothing bakeable,
// so the caller can just fall back to adding the group as it was.
export function bakeStatic(root) {
  root.updateMatrixWorld(true);
  const parts = [];

  root.traverse((object) => {
    if (!object.isMesh || object.isInstancedMesh) return;
    const material = object.material;
    // One material per mesh only; a multi-material mesh has geometry groups that
    // would need splitting, and nothing here has one.
    if (Array.isArray(material) || !material.color || material.transparent) return;

    // Non-indexed throughout: mergeGeometries requires every input to agree, and
    // the roof geometries here are hand-built and unindexed while BoxGeometry is
    // indexed.
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    if (!geometry.attributes.normal) geometry.computeVertexNormals();

    // Only position, normal and colour survive. UVs differ between BoxGeometry
    // and the hand-built roofs and would block the merge, and nothing here is
    // textured.
    for (const name of Object.keys(geometry.attributes)) {
      if (name !== 'position' && name !== 'normal') geometry.deleteAttribute(name);
    }

    scratch.copy(material.color);
    const count = geometry.attributes.position.count;
    const colours = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      colours[i * 3] = scratch.r;
      colours[i * 3 + 1] = scratch.g;
      colours[i * 3 + 2] = scratch.b;
    }
    geometry.setAttribute('color', new BufferAttribute(colours, 3));
    parts.push(geometry);
  });

  if (!parts.length) return null;
  const merged = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  if (!merged) return null;

  const mesh = new Mesh(merged, lambert(0xffffff, { fog: true, vertexColors: true }));
  // Already in world space, and it never moves.
  mesh.matrixAutoUpdate = false;
  return mesh;
}
