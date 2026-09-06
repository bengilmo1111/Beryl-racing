// Tyre marks, as a ring-buffer ribbon laid on the road.
//
// Fixed capacity, oldest quads overwritten. The 2D version appended to a Phaser
// Graphics for the whole race and never freed anything — a long run on Remutaka
// accumulated vertices until the end.
import { BufferGeometry, BufferAttribute, Mesh, DoubleSide } from 'three';
import { basic } from '../palette.js';

const MAX_QUADS = 2000; // ~1000 per rear wheel
const LIFT = 1.5; // above the road, below the kerb lip
const WIDTH_FADE = 0.45; // matches the 2D lineStyle(7, 0x202124, 0.45)

export class SkidRibbon {
  constructor(terrain) {
    this.terrain = terrain;
    this.cursor = 0;
    this.used = 0;

    const positions = new Float32Array(MAX_QUADS * 6 * 3);
    const geometry = new BufferGeometry();
    this.attr = new BufferAttribute(positions, 3);
    this.attr.setUsage(35048); // DynamicDraw
    geometry.setAttribute('position', this.attr);
    geometry.setDrawRange(0, 0);

    this.mesh = new Mesh(
      geometry,
      basic(0x202124, {
        transparent: true,
        opacity: WIDTH_FADE,
        depthWrite: false,
        side: DoubleSide,
        fog: true,
      })
    );
    // One mesh spanning the whole course, and its bounds change constantly.
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
  }

  // Lay one quad between the previous rear-axle pair and the current one. Called
  // from RaceScene.applyFx during update(), which is a pure data write — no draw
  // happens here, so headless simulation stays draw-free.
  add(from, to) {
    const p = this.attr.array;
    const base = this.cursor * 18;
    const h = this.terrain;

    // Two triangles: prev-left, prev-right, cur-right / prev-left, cur-right,
    // cur-left. Each corner is lifted onto whatever the ground is doing there,
    // so marks follow the camber of a hill instead of hovering flat above it.
    const corners = [
      from.left, from.right, to.right,
      from.left, to.right, to.left,
    ];
    for (let i = 0; i < 6; i++) {
      const c = corners[i];
      const k = base + i * 3;
      p[k] = c.x;
      p[k + 1] = h.heightAt(c.x, c.y) + LIFT;
      p[k + 2] = c.y;
    }

    this.cursor = (this.cursor + 1) % MAX_QUADS;
    if (this.used < MAX_QUADS) this.used++;
    this.attr.needsUpdate = true;
    this.mesh.geometry.setDrawRange(0, this.used * 6);
  }
}
