// The WebGL renderer and its canvas, as a module singleton.
//
// Deliberately NOT per-scene. The results panel's "RACE AGAIN" calls
// scene.restart(), and changing course calls scene.start('Title') — both fire a
// scene shutdown. A renderer created per race would leak one WebGL context per
// retry and walk into Chromium's ~16-context cap, and the mobile playtest
// journey exercises retry every run.
import { WebGLRenderer } from 'three';

let renderer = null;
let canvas = null;
const lastSize = { w: 0, h: 0, cw: '', ch: '' };

export function getRenderer(harnessed = false) {
  if (renderer) return { renderer, canvas };

  canvas = document.createElement('canvas');
  canvas.id = 'game3d';
  // The Phaser canvas on top owns all pointer input; this one must never
  // intercept a tap meant for the touch controls.
  canvas.style.pointerEvents = 'none';

  renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    // This canvas is the bottom layer and draws the sky, so it is opaque.
    alpha: false,
    powerPreference: 'default',
    // Headless readback for playtest screenshots is flaky without this. Only
    // enabled under the harness, since it costs a little on real devices.
    preserveDrawingBuffer: harnessed,
  });

  const parent = document.getElementById('game');
  // Insert before Phaser's canvas so the world paints underneath the HUD.
  if (parent) parent.prepend(canvas);

  return { renderer, canvas };
}

export function showCanvas(visible) {
  if (canvas) canvas.style.display = visible ? 'block' : 'none';
}

// Mirror the Phaser canvas rather than re-deriving the viewport.
//
// Phaser's canvas is already the authority in every mode we care about: Scale
// RESIZE (players), Scale NONE at 1280x720 (the deterministic harness, which
// never emits a resize event), fullscreen, and the mobile-rotation fix in
// main.js. Reading its size covers all four with one mechanism.
//
// Cheap property reads only — this runs every rendered frame, so no
// getBoundingClientRect and no layout thrash.
export function syncSize(phaserCanvas, camera) {
  if (!renderer || !phaserCanvas) return;
  const w = phaserCanvas.width;
  const h = phaserCanvas.height;
  const cw = phaserCanvas.style.width;
  const ch = phaserCanvas.style.height;
  if (w === lastSize.w && h === lastSize.h && cw === lastSize.cw && ch === lastSize.ch) return;
  if (w === 0 || h === 0) return;

  // Phaser's canvas dimensions are already backing-store pixels (it has applied
  // devicePixelRatio itself), so we must not apply DPR a second time.
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  canvas.style.width = cw;
  canvas.style.height = ch;
  if (camera) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  lastSize.w = w;
  lastSize.h = h;
  lastSize.cw = cw;
  lastSize.ch = ch;
}

export function getCanvas() {
  return canvas;
}
