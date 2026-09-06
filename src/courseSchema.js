// What every number in a course definition *is*.
//
// This exists because one mistake has now been made six times, in six different
// files, and every one of them was found by looking at a screenshot rather than
// by any test. See docs/architecture/WORLD-SCALE.md for the full list. The shape
// is always identical:
//
//   A course is authored small and multiplied up by `lengthScale`. Some of its
//   numbers are places on the map and must be multiplied. Some are the sizes of
//   real things and must not. `{ x: 1480 }` and `{ roadWidth: 360 }` look
//   exactly alike to a scaling pass, and the pass was a hand-written list of
//   field names — so anything not on the list was silently skipped, and anything
//   wrongly on it was silently multiplied.
//
// Both failure modes are silent, which is the actual problem. A number in the
// wrong units does not throw; it just puts the beach 250 m out to sea.
//
// So: every numeric field in a course definition must be declared here, and the
// scaling pass **throws on any number it finds that is not**. Adding a field
// without deciding what kind of number it is is now a startup error rather than
// a bug someone spots in a screenshot three months later.
//
// This cannot catch coordinates authored in files the scaling pass never sees —
// that is what playtest/placement.mjs is for, which checks the *result* rather
// than the source.

// The kinds. The first two scale with the map; the rest do not.
export const KIND = {
  // A point on the map. Scales, because the map does.
  MAP: 'map',
  // A distance measured across the map — a river's half-width, an elevation, a
  // fog band. Scales, for the same reason.
  SPAN: 'span',
  // The size of a real thing. A road is two lanes wide and a house is nine
  // metres across in any world, so these must NOT scale. This is the kind that
  // has been got wrong most often, and it is the whole point of the exercise.
  SIZE: 'size',
  // 0..1 along something. Immune by construction, which is why so much of this
  // codebase has been moved to expressing positions this way.
  FRACTION: 'fraction',
  // Radians.
  ANGLE: 'angle',
  // An index or a count of things.
  COUNT: 'count',
  // Handled by scalePhysics, which works in multiples of top speed.
  PHYSICS: 'physics',
  // Not a quantity on the map at all: the scale factor itself, engine speeds in
  // rpm, anything measured in units the world does not have.
  META: 'meta',
};

const SCALED = new Set([KIND.MAP, KIND.SPAN]);
export function scales(kind) {
  return SCALED.has(kind);
}

// Every numeric path in a course definition.
//
// `[]` is an array element. `*` is any object key — used where the key is a
// name rather than a field, as in `layout.places.williamsPark`.
export const COURSE_SCHEMA = {
  // --- the course itself ---------------------------------------------------
  lengthScale: KIND.META,
  // Crankshaft speeds and cylinder counts. Nothing to do with the map.
  'engine.cylinders': KIND.COUNT,
  'engine.redline': KIND.META,
  'engine.idle': KIND.META,
  'world.width': KIND.MAP,
  'world.height': KIND.MAP,
  'physics.*': KIND.PHYSICS,

  // How far you can see, as a fraction of the world's diagonal.
  //
  // Absolute distances here are what put a white wall 155 m in front of the car
  // at Manfeild: 3200/9000 were tuned when that world was 3,540 x 1,920 and were
  // still 3200/9000 when it became 50,799 x 27,552. Fractions cannot go stale
  // that way, and — just as usefully — they are directly comparable with the
  // default in config.js, so "this course sees further than most" is legible
  // instead of being two numbers you have to divide by hand.
  'fogSpans.near': KIND.FRACTION,
  'fogSpans.far': KIND.FRACTION,

  // --- geometry ------------------------------------------------------------
  'geometry.anchors[].x': KIND.MAP,
  'geometry.anchors[].y': KIND.MAP,
  'geometry.branches[].anchors[].x': KIND.MAP,
  'geometry.branches[].anchors[].y': KIND.MAP,
  // A real width, in a world whose whole point is that the road stops being wide
  // relative to its own corners.
  'geometry.roadWidth': KIND.SIZE,
  'geometry.branches[].roadWidth': KIND.SIZE,
  'geometry.numCheckpoints': KIND.COUNT,
  'geometry.checkpointFractions[]': KIND.FRACTION,
  'geometry.surfaceBands[].until': KIND.FRACTION,
  'geometry.branches[].surfaceBands[].until': KIND.FRACTION,

  // Elevation scales with length, so the gradient stays what was authored.
  'geometry.elevation.profile[].at': KIND.FRACTION,
  'geometry.elevation.profile[].h': KIND.SPAN,
  'geometry.elevation.river.cp': KIND.COUNT,
  'geometry.elevation.river.halfWidth': KIND.SPAN,
  'geometry.elevation.river.halfLength': KIND.SPAN,
  'geometry.elevation.river.drop': KIND.SPAN,
  'geometry.elevation.sea[].x': KIND.MAP,
  'geometry.elevation.sea[].y': KIND.MAP,
  'geometry.elevation.sea[].w': KIND.SPAN,
  'geometry.elevation.sea[].h': KIND.SPAN,
  'geometry.elevation.sea[].cx': KIND.MAP,
  'geometry.elevation.sea[].cy': KIND.MAP,
  'geometry.elevation.sea[].halfW': KIND.SPAN,
  'geometry.elevation.sea[].halfL': KIND.SPAN,
  'geometry.elevation.sea[].angle': KIND.ANGLE,
  'geometry.elevation.sea[].level': KIND.SPAN,

  // --- layout --------------------------------------------------------------
  'layout.world.width': KIND.MAP,
  'layout.world.height': KIND.MAP,
  'layout.coastX': KIND.MAP,
  'layout.coastal[].from': KIND.FRACTION,
  'layout.coastal[].to': KIND.FRACTION,
  // A named place is a fraction along a road plus a setback in metres, and
  // deliberately nothing else — there is no `layout.places.*.x` here, so an
  // authored coordinate for a place is now a startup error rather than something
  // that quietly ends up 460 m from the road it was meant to be on.
  'layout.places.*.at': KIND.FRACTION,
  'layout.places.*.offsetMetres': KIND.SIZE,
  'layout.zones.*.x': KIND.MAP,
  'layout.zones.*.y': KIND.MAP,
  'layout.zones.*.w': KIND.SPAN,
  'layout.zones.*.h': KIND.SPAN,

  // --- decoration ----------------------------------------------------------
  // `[x, y, text]` triples, so both numeric slots are the same kind.
  'landmarks[][]': KIND.MAP,
  'arrows[].x': KIND.MAP,
  'arrows[].y': KIND.MAP,
  'arrows[].rot': KIND.ANGLE,
  // Checkpoint indices, not coordinates. Multiplying these is how Ōtaki's river
  // once ended up nowhere near its bridge.
  'scenery.riverCp': KIND.COUNT,
  'scenery.railwayCp': KIND.COUNT,
};

// Wildcard lookup: exact match first, then progressively replace object keys
// with `*`, from the most specific end.
const cache = new Map();
export function kindOf(path) {
  if (cache.has(path)) return cache.get(path);
  let found = COURSE_SCHEMA[path];
  if (found === undefined) {
    const parts = path.split('.');
    // Try replacing each single segment with '*', then give up. One wildcard is
    // enough for everything here and keeps the lookup honest — a pattern of
    // '*.*.*' would match essentially anything and defeat the point.
    for (let i = 0; i < parts.length && found === undefined; i += 1) {
      const candidate = parts.slice();
      candidate[i] = '*';
      found = COURSE_SCHEMA[candidate.join('.')];
    }
  }
  cache.set(path, found);
  return found;
}

// Walk every number in `node`, calling `visit(path, value, parent, key)`.
//
// Depth-first and in key order, so the traversal is deterministic — this runs at
// module load on data the whole simulation is built from.
//
// Each container is visited once. The caller multiplies numbers in place, so an
// object reachable by two paths would otherwise be scaled twice: `world:
// OTAKI_LAYOUT.world` instead of `{ ...OTAKI_LAYOUT.world }` is a one-character
// difference that would make the world 100 times too big. The definitions all
// spread today, which is luck rather than a rule — and "two copies of one
// rectangle scaled by two different code paths" is already on the record as the
// shape of the bug that put Ōtaki's farmhouses thousands of units from their own
// collision circles.
export function walkNumbers(node, visit, path = '', parent = null, key = null, seen = new Set()) {
  if (node == null) return;
  if (typeof node === 'number') {
    visit(path, node, parent, key);
    return;
  }
  if (typeof node !== 'object') return;
  if (seen.has(node)) return;
  seen.add(node);
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) {
      walkNumbers(node[i], visit, `${path}[]`, node, i, seen);
    }
    return;
  }
  for (const k of Object.keys(node)) {
    walkNumbers(node[k], visit, path ? `${path}.${k}` : k, node, k, seen);
  }
}

export class UndeclaredNumberError extends Error {
  constructor(path, value, courseId) {
    super(
      `Course "${courseId}" has an undeclared number at ${path} (= ${value}).\n\n`
      + 'Every number in a course definition must say what kind of number it is,\n'
      + 'because the scaling pass cannot tell a place from a size by looking:\n'
      + `  ${KIND.MAP}      a point on the map            — scales\n`
      + `  ${KIND.SPAN}     a distance across the map     — scales\n`
      + `  ${KIND.SIZE}     the size of a real thing      — does NOT scale\n`
      + `  ${KIND.FRACTION} 0..1 along something          — does NOT scale\n`
      + `  ${KIND.ANGLE}    radians                       — does NOT scale\n`
      + `  ${KIND.COUNT}    an index or a count           — does NOT scale\n\n`
      + `Add "${path}" to COURSE_SCHEMA in src/courseSchema.js.\n`
      + 'See docs/architecture/WORLD-SCALE.md for why this is an error and not a\n'
      + 'default.'
    );
    this.name = 'UndeclaredNumberError';
    this.path = path;
  }
}
