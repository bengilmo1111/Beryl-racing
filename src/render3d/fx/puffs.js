// Drift smoke and off-road dust, as a pooled sprite system.
//
// Same emission gates, lifespan, speeds, scale ramp and alpha ramp as the 2D
// Phaser emitters, so the feel carries over unchanged.
import { Sprite, SpriteMaterial, CanvasTexture, SRGBColorSpace } from 'three';

const POOL = 120;
const LIFESPAN = 0.42; // seconds — the 2D emitters used 420ms
const SPEED_MIN = 8;
const SPEED_MAX = 46;
const SCALE_START = 0.5;
const SCALE_END = 1.1;
const ALPHA_START = 0.45;
const BASE_SIZE = 48;

// The same concentric-alpha-circle recipe as art.js drawPuff. Phaser's WebGL
// texture belongs to the other canvas's context and cannot be shared across it,
// so the recipe is duplicated rather than the texture.
function puffTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = BASE_SIZE;
  canvas.height = BASE_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let r = BASE_SIZE / 2; r > 0; r -= 2) {
    ctx.beginPath();
    ctx.arc(BASE_SIZE / 2, BASE_SIZE / 2, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export class PuffPool {
  constructor(scene3d, terrain) {
    this.terrain = terrain;
    const map = puffTexture();
    this.map = map;

    // One material per particle, not one per kind. Each puff fades on its own
    // schedule, and opacity lives on the material — sharing one would make every
    // particle in flight fade in lockstep with the youngest.
    this.items = [];
    for (let i = 0; i < POOL; i++) {
      const material = new SpriteMaterial({
        map, transparent: true, depthWrite: false, fog: true,
      });
      const sprite = new Sprite(material);
      sprite.visible = false;
      scene3d.add(sprite);
      this.items.push({ sprite, material, life: 0, vx: 0, vy: 0, vz: 0, size: 1 });
    }
    this.next = 0;
    // Jitter runs off a local PRNG, never Math.random. The global stream is
    // seeded by the playtest harness and is part of the determinism contract, so
    // an effect must never draw from it.
    this.seed = 0x1a2b3c4d;
  }

  #rand() {
    let x = this.seed;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.seed = x >>> 0;
    return this.seed / 0xffffffff;
  }

  emit(kind, at, count) {
    const ground = this.terrain.heightAt(at.x, at.y);
    for (let i = 0; i < count; i++) {
      const item = this.items[this.next];
      this.next = (this.next + 1) % POOL;
      const angle = this.#rand() * Math.PI * 2;
      const speed = SPEED_MIN + this.#rand() * (SPEED_MAX - SPEED_MIN);
      item.life = LIFESPAN;
      item.vx = Math.cos(angle) * speed;
      item.vz = Math.sin(angle) * speed;
      item.vy = speed * 0.35;
      item.size = BASE_SIZE;
      // Tan for off-road dust, white for drift smoke — the same split the 2D
      // build got from two separately tinted emitters.
      item.material.color.set(kind === 'dust' ? 0xcaa46a : 0xffffff);
      item.sprite.position.set(at.x, ground + 16, at.y);
      item.sprite.visible = true;
    }
  }

  update(dt) {
    if (dt <= 0) return;
    for (const item of this.items) {
      if (item.life <= 0) continue;
      item.life -= dt;
      if (item.life <= 0) {
        item.sprite.visible = false;
        continue;
      }
      const t = 1 - item.life / LIFESPAN;
      item.sprite.position.x += item.vx * dt;
      item.sprite.position.y += item.vy * dt;
      item.sprite.position.z += item.vz * dt;
      const scale = (SCALE_START + (SCALE_END - SCALE_START) * t) * item.size;
      item.sprite.scale.set(scale, scale, 1);
      item.material.opacity = ALPHA_START * (1 - t);
    }
  }
}
