// What the ground is made of, per course.
//
// Every course drew its terrain in one flat `C.hill` green. That is the single
// biggest reason all four looked like the same road: Ōtaki's dry summer
// farmland, Eastbourne's harbour edge and Remutaka's bush floor were the same
// emerald, so the only thing distinguishing one course from another was the
// shape of the corners. The art briefs each name a ground colour and none of
// them is this one — Ōtaki asks for "dry straw-green and ochre under high
// summer sun", Eastbourne for a coastal edge, Remutaka for bush.
//
// So the ground gets a palette per course, and within a course it varies: real
// country is a patchwork of paddocks at different stages of grazing and drying,
// and one unbroken colour to the horizon is the thing that reads as "computer
// game" faster than any amount of missing detail.
//
// Two frequencies do that. A coarse one the size of a paddock, and a finer one
// inside it. Both come from a positional hash rather than `Math.random`: the
// global stream is seeded and its draw order is part of the determinism
// contract, so anything in the render layer that draws from it moves every tree
// on the course. This is render-side only — the physics reads
// `terrain.physicsGrid` through `gradeAlong` and never sees any of this.
import { Color } from 'three';

// Paddock-sized, then a finer patch inside it. In metres via the caller, which
// passes units — a paddock is a paddock whatever the world is scaled to.
const PADDOCK_SCALE = 2600;
const PATCH_SCALE = 780;

// Per-course ground.
//
// `base` and `alt` are the two ends of the patchwork; the noise mixes between
// them. `shore` is blended in near sea level where a course has a coast, which
// is what turns the last few metres before the water into beach rather than
// lawn running into the sea.
const GROUNDS = {
  // Wellington Harbour's eastern bays: bright coastal grass on the flat, going
  // darker and bluer up the bush hillside behind, and sand at the water.
  eastbourne: {
    base: 0x6ea84f,
    alt: 0x5c9748,
    high: 0x2f6b43,
    shore: 0xe4d3a6,
  },
  // Kāpiti in February. Grazed-off straw and ochre with greener ground along
  // the shelter belts and the river — the brief's "dry straw-green and ochre
  // under high summer sun", which is what actually distinguishes the Ōtaki
  // flats from a hill road in the bush.
  otaki: {
    base: 0xb6b063,
    alt: 0x9fa855,
    high: 0x7f9a55,
    shore: 0xe8d9ab,
  },
  // The forest park floor: deep, cool and shaded, with the cut banks and slip
  // faces the hill road exposes coming through browner higher up.
  remutaka: {
    base: 0x3f7a45,
    alt: 0x356b3d,
    high: 0x6a6d47,
    shore: null,
  },
  // A circuit is mown. It is the one course whose ground genuinely is uniform,
  // so it gets a much tighter spread rather than the same patchwork.
  manfield: {
    base: 0x74ab55,
    alt: 0x6ba04f,
    high: 0x74ab55,
    shore: null,
  },
};

const DEFAULT = GROUNDS.eastbourne;

// A stable 0..1 from a position. Same input, same answer, forever, and no
// relationship at all to the seeded RNG.
function hash2(x, z) {
  const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

// Smoothed hash: the raw one is white noise and would look like static at this
// scale. Bilinear between lattice points with a smoothstep gives soft blotches
// the size of the lattice, which is what a paddock boundary looks like from a
// car.
function noise(x, z, scale) {
  const px = x / scale;
  const pz = z / scale;
  const x0 = Math.floor(px);
  const z0 = Math.floor(pz);
  const fx = px - x0;
  const fz = pz - z0;
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const a = hash2(x0, z0);
  const b = hash2(x0 + 1, z0);
  const c = hash2(x0, z0 + 1);
  const d = hash2(x0 + 1, z0 + 1);
  return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sz;
}

const scratchA = new Color();
const scratchB = new Color();

// Colours for one terrain grid, as a Float32Array of r,g,b per vertex.
//
// `heightRange` decides where `high` takes over from the patchwork, so a course
// with real relief gets bush or bracken up the slopes and grass on the flat
// without anyone authoring a contour.
export function groundColours(info, theme, seaLevel = null) {
  const { cols, rows, cell, minX, minY, grid } = info;
  const plan = GROUNDS[theme] || DEFAULT;

  let lowest = Infinity;
  let highest = -Infinity;
  for (let i = 0; i < grid.length; i += 1) {
    if (grid[i] < lowest) lowest = grid[i];
    if (grid[i] > highest) highest = grid[i];
  }
  const span = highest - lowest;

  const base = new Color(plan.base);
  const alt = new Color(plan.alt);
  const high = new Color(plan.high);
  const shore = plan.shore != null ? new Color(plan.shore) : null;

  const colours = new Float32Array(cols * rows * 3);
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const idx = r * cols + c;
      const x = minX + c * cell;
      const z = minY + r * cell;
      const h = grid[idx];

      // Paddock patchwork.
      const coarse = noise(x, z, PADDOCK_SCALE);
      const fine = noise(x + 1000, z - 1000, PATCH_SCALE);
      const mix = Math.min(1, Math.max(0, coarse * 0.72 + fine * 0.28));
      scratchA.copy(base).lerp(alt, mix);

      // Height. Only where a course has enough relief for it to mean anything —
      // below about 30 units of range the "hillside" is noise and tinting it
      // would just add a stain.
      if (span > 30) {
        const up = Math.min(1, Math.max(0, (h - lowest) / span));
        // Squared, so the flat stays flat-coloured and the change arrives up
        // the slope rather than as a gradient over the whole course.
        scratchA.lerp(high, up * up * 0.85);
      }

      // The last few metres before the water. Sand, not lawn.
      if (shore && seaLevel != null) {
        const above = h - seaLevel;
        if (above < BEACH_HEIGHT) {
          const t = Math.min(1, Math.max(0, 1 - above / BEACH_HEIGHT));
          scratchA.lerp(scratchB.copy(shore), t * t);
        }
      }

      colours[idx * 3] = scratchA.r;
      colours[idx * 3 + 1] = scratchA.g;
      colours[idx * 3 + 2] = scratchA.b;
    }
  }
  return colours;
}

// How far above the water the sand reaches.
//
// This is doing real work at Eastbourne: the ground ramps from the road down to
// sea level across the beach, and that ramp *is* the beach — there is no sand
// ribbon laid over it any more.
//
// It has to stay below the height of the road's own coastal shelf (~204 units).
// At 300 it caught the shelf too, and the pinned corridor between Marine Drive
// and Marine Parade — 150 m of ordinary land between two roads — came out as one
// enormous beach with the harbour somewhere beyond it.
const BEACH_HEIGHT = 150;

// The single colour for a course with no height grid at all, so the flat quad
// under Manfeild is at least the right green.
export function groundBase(theme) {
  return new Color((GROUNDS[theme] || DEFAULT).base);
}

// The run-off band beside the seal.
//
// It exists for legibility — a darker strip either side tells you where the road
// edge is at mobile scale — and it used to be one fixed deep green everywhere.
// Against Ōtaki's ochre that stopped reading as a verge and started reading as a
// green stripe painted down the course, which is worse than not having one.
//
// So it is the course's own ground, darkened. The legibility contrast against
// tarmac is preserved because it is a *relative* darkening, and it now belongs
// to the place it is in.
const VERGE_DARKEN = 0.62;
export function vergeColour(theme) {
  return new Color((GROUNDS[theme] || DEFAULT).base).multiplyScalar(VERGE_DARKEN);
}

// What the foliage is doing in each place.
//
// The three tree variants carry one authored colour each, which meant a
// macrocarpa shelter belt on the Ōtaki flats in February was the same emerald as
// a stand of bush in the Remutaka forest park. Once the ground went dry ochre
// that stopped being merely wrong and started being loud: forest-green canopies
// over straw paddocks.
//
// Each variant keeps its own colour and is pulled part of the way towards the
// course's, so a conifer still reads darker than a pōhutukawa — the silhouette
// and the relative tone survive, and only the overall cast moves.
const FOLIAGE = {
  eastbourne: { tint: 0x4f9a57, mix: 0.3 },
  otaki: { tint: 0x8b9450, mix: 0.5 },
  remutaka: { tint: 0x2b6236, mix: 0.45 },
  manfield: { tint: 0x5d9349, mix: 0.3 },
};

export function foliageTint(theme, base) {
  const plan = FOLIAGE[theme];
  const colour = new Color(base);
  if (!plan) return colour;
  return colour.lerp(new Color(plan.tint), plan.mix);
}

// Beside a gravel road there is no mown verge — there is the dust the road
// throws onto it. Warmer and paler than the seal's, which is what makes the
// unsealed section read as unsealed from a distance.
export function dustColour(theme) {
  const ground = new Color((GROUNDS[theme] || DEFAULT).base);
  return ground.lerp(new Color(0xbba887), 0.62).multiplyScalar(0.9);
}
