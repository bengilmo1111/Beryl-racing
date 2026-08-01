// The terrain height field.
//
// One grid, one query. Beryl's height, the chase camera, the physics grade, tree
// placement, skid decals and the ground mesh all read `heightAt()` from here.
// The road network is the landform's skeleton: primary and branch roads are all
// pinned into the same field so alternate streets neither float nor disappear.

const CELL = 120;
const BLUR_PASSES = 3;
const ROAD_PIN_FACTOR = 1.15;

export class Terrain {
  constructor(track, world) {
    const roads = track.roads || [track];
    this.flat = !roads.some((road) => road.heights);
    if (this.flat) return;

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
          pinRadiusSq: (road.half * 2 * ROAD_PIN_FACTOR) ** 2,
        });
      }
    }

    const grid = new Float32Array(this.cols * this.rows);
    const pinned = new Uint8Array(this.cols * this.rows);
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
        for (const sample of samples) {
          const dx = sample.x - wx;
          const dy = sample.y - wy;
          const d = dx * dx + dy * dy;
          if (d < best) {
            best = d;
            bestSample = sample;
          }
        }

        const k = r * this.cols + c;
        grid[k] = bestSample ? bestSample.h : 0;
        if (bestSample && best <= bestSample.pinRadiusSq) pinned[k] = 1;

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

    this.grid = this.#blur(grid, pinned);
  }

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

  gradeAlong(x, y, fwdX, fwdY, step = CELL * 0.5) {
    if (this.flat) return 0;
    const ahead = this.heightAt(x + fwdX * step, y + fwdY * step);
    const behind = this.heightAt(x - fwdX * step, y - fwdY * step);
    return (ahead - behind) / (step * 2);
  }

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
