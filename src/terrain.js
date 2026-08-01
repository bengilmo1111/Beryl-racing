// The terrain height field.
//
// One grid, one query. Beryl's height, the chase camera, the physics grade, tree
// placement, skid decals and the ground mesh all read `heightAt()` from here.
//
// That single-source rule is the whole design. The obvious alternative — road
// height while on the road, terrain height once you leave it — steps at the
// boundary and floats the car in mid-air the moment she slides off a switchback,
// which on a hill climb is most of the time.
//
// The height field is built from the road rather than authored separately: each
// cell takes the height of its nearest centreline sample, then a few blur passes
// soften the Voronoi seams into a hillside. The road is the landform's skeleton,
// which is why this reads naturally without any per-course "which side is the
// hill" authoring, and why stacked switchback legs automatically terrace.
//
// This module is pure geometry over the track data. It reads no Phaser and no
// global RNG, so it can never perturb the seeded scenery placement.

const CELL = 120; // world units between grid samples
const BLUR_PASSES = 3;
// Cells this close to the centreline are pinned to exact road height after
// blurring, so the road stays embedded in the terrain instead of hovering above
// a smoothed approximation of itself.
const ROAD_PIN_FACTOR = 1.15;

export class Terrain {
  // `track` is buildTrack()'s output; `world` is the live WORLD config.
  constructor(track, world) {
    this.flat = !track.heights;
    if (this.flat) return;

    // Pad well past the world so the camera never looks over the edge.
    const pad = CELL * 8;
    this.minX = -pad;
    this.minY = -pad;
    this.cols = Math.ceil((world.width + pad * 2) / CELL) + 1;
    this.rows = Math.ceil((world.height + pad * 2) / CELL) + 1;

    // The coastline level, for water planes to sit on. Carved regions like a
    // river carry their own level and are not the sea.
    const coast = (track.sea || []).find((s) => s.angle == null);
    this.seaLevel = coast ? coast.level : 0;
    const cl = track.centerline;
    const heights = track.heights;
    const n = cl.length;
    const pinRadius = track.half * 2 * ROAD_PIN_FACTOR;
    const pinRadiusSq = pinRadius * pinRadius;

    const grid = new Float32Array(this.cols * this.rows);
    const pinned = new Uint8Array(this.cols * this.rows);
    // Water sits at a fixed level, not at whatever height the nearest bit of
    // road happens to be. Without this, Eastbourne's harbour ends up buried
    // inside the Ferry Road hill (every cell out in the water takes its height
    // from a road sample 200 units up the slope), and Ōtaki's river disappears
    // under the bridge it is supposed to run beneath.
    //
    // Regions are oriented rectangles so a river can cut across the road at an
    // angle. Axis-aligned coasts are just the angle-0 case.
    const seas = (track.sea || []).map((s) => (
      s.angle != null
        ? { cx: s.cx, cy: s.cy, angle: s.angle, halfW: s.halfW, halfL: s.halfL, level: s.level }
        : {
            cx: s.x + s.w / 2, cy: s.y + s.h / 2, angle: 0,
            halfW: s.w / 2, halfL: s.h / 2, level: s.level,
          }
    ));

    // Nearest centreline sample per cell. O(cells x samples), once at race
    // creation — a few million operations on the largest course.
    for (let r = 0; r < this.rows; r++) {
      const wy = this.minY + r * CELL;
      for (let c = 0; c < this.cols; c++) {
        const wx = this.minX + c * CELL;
        let best = Infinity;
        let bestIdx = 0;
        for (let i = 0; i < n; i++) {
          const dx = cl[i].x - wx;
          const dy = cl[i].y - wy;
          const d = dx * dx + dy * dy;
          if (d < best) { best = d; bestIdx = i; }
        }
        const k = r * this.cols + c;
        grid[k] = heights[bestIdx];
        if (best <= pinRadiusSq) pinned[k] = 1;

        // Sea wins over road height, but never over the road itself — the
        // coast road runs along the shoreline and must stay where it is.
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
              // Pinned so the blur softens the *land* falling toward the shore
              // while the water itself stays dead flat.
              pinned[k] = 1;
              break;
            }
          }
        }
      }
    }

    this.grid = this.#blur(grid, pinned);
  }

  // Box blur, then restore the pinned cells. Blurring first and re-stamping
  // after is what keeps the hillside smooth right up to a road that stays
  // exactly where the road mesh puts it.
  #blur(grid, pinned) {
    const { cols, rows } = this;
    const original = Float32Array.from(grid);
    let src = grid;
    let dst = new Float32Array(cols * rows);
    for (let pass = 0; pass < BLUR_PASSES; pass++) {
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

  #at(c, r) {
    const col = c < 0 ? 0 : c >= this.cols ? this.cols - 1 : c;
    const row = r < 0 ? 0 : r >= this.rows ? this.rows - 1 : r;
    return this.grid[row * this.cols + col];
  }

  // Bilinear sample. Flat courses answer 0 without touching a grid.
  heightAt(x, y) {
    if (this.flat) return 0;
    const fx = (x - this.minX) / CELL;
    const fy = (y - this.minY) / CELL;
    const c0 = Math.floor(fx);
    const r0 = Math.floor(fy);
    const tx = fx - c0;
    const ty = fy - r0;
    const h00 = this.#at(c0, r0);
    const h10 = this.#at(c0 + 1, r0);
    const h01 = this.#at(c0, r0 + 1);
    const h11 = this.#at(c0 + 1, r0 + 1);
    const a = h00 + (h10 - h00) * tx;
    const b = h01 + (h11 - h01) * tx;
    return a + (b - a) * ty;
  }

  // Slope along a heading, as a rise-over-run ratio: positive is uphill.
  //
  // A central difference over a step comfortably larger than the car keeps this
  // stable — sampling tighter than the grid spacing just reads bilinear facets
  // and makes the gravity term chatter.
  gradeAlong(x, y, fwdX, fwdY, step = CELL * 0.5) {
    if (this.flat) return 0;
    const ahead = this.heightAt(x + fwdX * step, y + fwdY * step);
    const behind = this.heightAt(x - fwdX * step, y - fwdY * step);
    return (ahead - behind) / (step * 2);
  }

  // Grid geometry, for building the ground mesh from the same data.
  describe() {
    return {
      flat: this.flat,
      cols: this.cols,
      rows: this.rows,
      cell: CELL,
      minX: this.minX,
      minY: this.minY,
      grid: this.grid,
    };
  }
}
