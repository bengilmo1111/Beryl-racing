// The terrain height field.
//
// One grid, one query. Beryl's height, the chase camera, the physics grade, tree
// placement, skid decals and the ground mesh all read `heightAt()` from here.
// The road network is the landform's skeleton: primary and branch roads are all
// pinned into the same field so alternate streets neither float nor disappear.
import { remutakaRoadProfile, remutakaVisualHeight } from './remutakaTerrain.js';
import { metres } from './scale.js';

// Grid resolution, in world units per cell.
//
// This used to be a flat 120, which is right at the course sizes it was tuned
// against and quietly fatal once a route gets longer: the grid is sized from the
// world, so a route ten times longer at a fixed cell size is a hundred times the
// cells, three blur passes deep. Capping the *cell count* instead keeps the
// terrain the same relative resolution at any course size.
//
// The floor reproduces the old value exactly at today's world sizes — the
// largest is Ōtaki at 19,000 units, well under CELL_FLOOR * MAX_CELLS — so
// adopting this changes no terrain and moves no baseline.
const CELL_FLOOR = 120;
const MAX_CELLS = 300;
const BLUR_PASSES = 3;
const ROAD_PIN_FACTOR = 1.15;

function cellSizeFor(world) {
  return Math.max(CELL_FLOOR, Math.max(world.width, world.height) / MAX_CELLS);
}

// How far either side of Beryl the slope is measured, in world units — about a
// metre at 57.9 units/metre.
//
// This was `CELL * 0.5`, which was fine while the cell size was fixed and is a
// trap now that it is not: how steep a hill feels would have started depending
// on how big the course is. Grade is a property of the car on the road, so it is
// sampled at a car-sized distance. The value is what `CELL * 0.5` already came
// to, so no course changes today.
const GRADE_STEP = 60;

// Rolling relief, in metres of real-world size converted once. Deliberately
// gentle: this is the land between the road and the horizon having a shape, not
// dunes. Anything larger starts to read as terrain the car ought to be climbing,
// and it is not — the physics grid never sees it.
// 18 m peak-to-trough over a few hundred metres. Sounds like a lot on paper and
// reads as almost nothing: a 340 m wavelength at this height is a 5 degree
// slope, and a flat-lit green surface tilted 5 degrees barely shades at all. 9 m
// was genuinely invisible; 30 m turned the Kapiti plain into downland.
//
// The point of it is not the ground. It is that a hedgerow, a fence line or a
// row of trees standing on ground that has a shape reads as countryside, and the
// same objects on a plane read as objects on a plane. The horizon stops being a
// ruled line, which is most of the benefit.
const RELIEF_HEIGHT = metres(18);
// The ramp has to clear the carriageway and then get on with it. Tuned at 35 m
// to 260 m first, which put full effect beyond the fog and left every metre of
// ground the player can actually see perfectly flat — the whole visible verge
// sat inside the fade. The road is ~4 m of half-width and the height field pins
// about 8 m either side of it, so 10 m is already clear of the tarmac.
const RELIEF_START = metres(10);
const RELIEF_FULL = metres(80);
const RELIEF_SHORE_CLEAR = metres(12); // and none of it at the waterline

function smoothstep(edge0, edge1, x) {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0;
  let t = (x - edge0) / (edge1 - edge0);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return t * t * (3 - 2 * t);
}

// Value noise off a positional hash — never Math.random. The global stream is
// seeded by the playtest harness and its draw order is part of the determinism
// contract, so scenery placement would move if this drew from it. Same reasoning
// as `hashAngle` in render3d/trees.js.
function hash2(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function valueNoise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  const top = a + (b - a) * u;
  const bottom = c + (d - c) * u;
  return top + (bottom - top) * v;
}

// Three octaves, returning roughly -1..1. The longest wavelength does the work;
// the shorter two stop the hillsides reading as smooth blobs.
// Wavelengths have a floor set by the grid: cells are world-size derived and
// reach ~15 m on the longest course, so anything under about 70 m aliases into
// noise rather than resolving as a shape.
const OCTAVES = [
  { wavelength: metres(340), weight: 1.0 },
  { wavelength: metres(150), weight: 0.45 },
  { wavelength: metres(75), weight: 0.18 },
];
const OCTAVE_TOTAL = OCTAVES.reduce((sum, o) => sum + o.weight, 0);

function fbm(x, y) {
  let sum = 0;
  for (const { wavelength, weight } of OCTAVES) {
    sum += (valueNoise(x / wavelength, y / wavelength) - 0.5) * 2 * weight;
  }
  return sum / OCTAVE_TOTAL;
}

export class Terrain {
  constructor(track, world, def = null) {
    const roads = track.roads || [track];
    this.flat = !roads.some((road) => road.heights);
    if (this.flat) return;

    const CELL = cellSizeFor(world);
    this.cell = CELL;
    const pad = CELL * 8;
    this.minX = -pad;
    this.minY = -pad;
    this.cols = Math.ceil((world.width + pad * 2) / CELL) + 1;
    this.rows = Math.ceil((world.height + pad * 2) / CELL) + 1;

    const coast = (track.sea || []).find((s) => s.angle == null);
    this.seaLevel = coast ? coast.level : 0;

    // Flatten the road network into one nearest-sample search while preserving
    // each road's own width for pinning. Branch heights are derived from the
    // nearest primary sample in track.js, keeping the village roads on the same
    // low coastal shelf.
    const samples = [];
    for (const road of roads) {
      if (!road.heights) continue;
      for (let i = 0; i < road.centerline.length; i++) {
        samples.push({
          x: road.centerline[i].x,
          y: road.centerline[i].y,
          h: road.heights[i],
          index: i,
          pinRadiusSq: (road.half * 2 * ROAD_PIN_FACTOR) ** 2,
        });
      }
    }

    // The course is passed in rather than looked up. Terrain reaching into
    // tracks.js for the *selected* course would be a hidden global dependency —
    // and a wrong one the moment anything builds a Terrain for a course that is
    // not the selected one, which the harness is entitled to do.
    const remutaka = def?.theme === 'remutaka';
    const nearestSample = remutaka ? new Int32Array(this.cols * this.rows) : null;
    const grid = new Float32Array(this.cols * this.rows);
    const pinned = new Uint8Array(this.cols * this.rows);
    // How far each cell is from the nearest road sample. Only the relief pass
    // uses it, and only to fade itself out as it approaches the carriageway.
    const roadDistance = new Float32Array(this.cols * this.rows);
    const seas = (track.sea || []).map((s) => (
      s.angle != null
        ? { cx: s.cx, cy: s.cy, angle: s.angle, halfW: s.halfW, halfL: s.halfL, level: s.level }
        : {
            cx: s.x + s.w / 2,
            cy: s.y + s.h / 2,
            angle: 0,
            halfW: s.w / 2,
            halfL: s.h / 2,
            level: s.level,
          }
    ));

    for (let r = 0; r < this.rows; r++) {
      const wy = this.minY + r * CELL;
      for (let c = 0; c < this.cols; c++) {
        const wx = this.minX + c * CELL;
        let best = Infinity;
        let bestSample = samples[0];
        let bestSampleIndex = 0;
        for (let i = 0; i < samples.length; i++) {
          const sample = samples[i];
          const dx = sample.x - wx;
          const dy = sample.y - wy;
          const d = dx * dx + dy * dy;
          if (d < best) {
            best = d;
            bestSample = sample;
            bestSampleIndex = i;
          }
        }

        const k = r * this.cols + c;
        grid[k] = bestSample ? bestSample.h : 0;
        if (nearestSample) nearestSample[k] = bestSampleIndex;
        if (bestSample && best <= bestSample.pinRadiusSq) pinned[k] = 1;
        roadDistance[k] = Math.sqrt(best);

        // Water stays flat, but never overwrites a road or bridge cell.
        if (!pinned[k]) {
          for (const s of seas) {
            const dx = wx - s.cx;
            const dy = wy - s.cy;
            const cos = Math.cos(-s.angle);
            const sin = Math.sin(-s.angle);
            const lx = dx * cos - dy * sin;
            const ly = dx * sin + dy * cos;
            if (Math.abs(lx) <= s.halfW && Math.abs(ly) <= s.halfL) {
              grid[k] = s.level;
              pinned[k] = 1;
              break;
            }
          }
        }
      }
    }

    // Keep the original smooth nearest-road field as the physics truth. The
    // recorded climb depends on its grade, and an art pass must not silently
    // change Beryl's acceleration or the waypoint driver's finish state.
    this.physicsGrid = this.#blur(grid, pinned);
    this.grid = this.physicsGrid;

    if (remutaka) {
      const profile = remutakaRoadProfile(track);
      const visual = Float32Array.from(this.physicsGrid);
      for (let r = 0; r < this.rows; r++) {
        const wz = this.minY + r * CELL;
        for (let c = 0; c < this.cols; c++) {
          const k = r * this.cols + c;
          if (pinned[k]) continue;
          const wx = this.minX + c * CELL;
          const sample = samples[nearestSample[k]];
          const point = profile[sample?.index || 0];
          visual[k] = remutakaVisualHeight(point, wx, wz, this.physicsGrid[k], track.half);
        }
      }
      // One restrained smoothing pass joins the grid cells without sanding the
      // cliff back into the broad plateau this course used to have. Road cells
      // remain restored to their exact original heights by #blur.
      this.grid = this.#blur(visual, pinned, 1);
    }

    this.grid = this.#addRelief(this.grid, pinned, roadDistance);
  }

  // Gentle rolling relief, away from the road.
  //
  // The height field is built from the nearest road sample and then blurred, so
  // anywhere the course did not author a profile is dead flat — a single green
  // facet from the verge to the horizon. That was survivable when a world was
  // 15,000 units across and is not now they are ten times that.
  //
  // Visual only. `heightAt` reads this grid and every one of its callers is in
  // render3d/; the simulation's only reader of terrain is `gradeAlong`, which
  // reads `physicsGrid`. So this cannot change how a hill drives, and the
  // determinism baselines are what prove it — exactly the split the Remutaka
  // cliff treatment above already relies on.
  #addRelief(grid, pinned, roadDistance) {
    const out = Float32Array.from(grid);
    const sea = this.seaLevel || 0;
    for (let r = 0; r < this.rows; r++) {
      const wy = this.minY + r * this.cell;
      for (let c = 0; c < this.cols; c++) {
        const k = r * this.cols + c;
        if (pinned[k]) continue;
        const wx = this.minX + c * this.cell;

        // Nothing at the kerb, full effect a couple of hundred metres out, so
        // the carriageway stays exactly where `heights[]` puts it and the verge
        // does not step.
        const ramp = smoothstep(RELIEF_START, RELIEF_FULL, roadDistance[k]);
        if (ramp <= 0) continue;

        // And nothing at the waterline: relief that lifts a shore cell above
        // sea level shows green through the water plane drawn over it.
        const shore = smoothstep(sea, sea + RELIEF_SHORE_CLEAR, grid[k]);
        if (shore <= 0) continue;

        out[k] = grid[k] + fbm(wx, wy) * RELIEF_HEIGHT * ramp * shore;
      }
    }
    // One pass to take the corners off the cell-sized steps the noise leaves.
    return this.#blur(out, pinned, 1);
  }

  #blur(grid, pinned, passes = BLUR_PASSES) {
    const { cols, rows } = this;
    const original = Float32Array.from(grid);
    let src = grid;
    let dst = new Float32Array(cols * rows);
    for (let pass = 0; pass < passes; pass++) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let sum = 0;
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            const rr = r + dr;
            if (rr < 0 || rr >= rows) continue;
            for (let dc = -1; dc <= 1; dc++) {
              const cc = c + dc;
              if (cc < 0 || cc >= cols) continue;
              sum += src[rr * cols + cc];
              count++;
            }
          }
          dst[r * cols + c] = sum / count;
        }
      }
      const swap = src;
      src = dst;
      dst = swap;
    }
    for (let k = 0; k < src.length; k++) {
      if (pinned[k]) src[k] = original[k];
    }
    return src;
  }

  #at(grid, c, r) {
    const col = c < 0 ? 0 : c >= this.cols ? this.cols - 1 : c;
    const row = r < 0 ? 0 : r >= this.rows ? this.rows - 1 : r;
    return grid[row * this.cols + col];
  }

  #sample(grid, x, y) {
    const fx = (x - this.minX) / this.cell;
    const fy = (y - this.minY) / this.cell;
    const c0 = Math.floor(fx);
    const r0 = Math.floor(fy);
    const tx = fx - c0;
    const ty = fy - r0;
    const h00 = this.#at(grid, c0, r0);
    const h10 = this.#at(grid, c0 + 1, r0);
    const h01 = this.#at(grid, c0, r0 + 1);
    const h11 = this.#at(grid, c0 + 1, r0 + 1);
    const a = h00 + (h10 - h00) * tx;
    const b = h01 + (h11 - h01) * tx;
    return a + (b - a) * ty;
  }

  heightAt(x, y) {
    if (this.flat) return 0;
    return this.#sample(this.grid, x, y);
  }

  physicsHeightAt(x, y) {
    if (this.flat) return 0;
    return this.#sample(this.physicsGrid, x, y);
  }

  gradeAlong(x, y, fwdX, fwdY, step = GRADE_STEP) {
    if (this.flat) return 0;
    // Grade is intentionally sampled from the original field, not Remutaka's
    // exaggerated render terrain. The cliffs are visual geography; Beryl still
    // climbs the exact profile the deterministic simulation has always used.
    const ahead = this.physicsHeightAt(x + fwdX * step, y + fwdY * step);
    const behind = this.physicsHeightAt(x - fwdX * step, y - fwdY * step);
    return (ahead - behind) / (step * 2);
  }

  describe() {
    return {
      flat: this.flat,
      cols: this.cols,
      rows: this.rows,
      cell: this.cell,
      minX: this.minX,
      minY: this.minY,
      grid: this.grid,
    };
  }
}
