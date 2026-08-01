import Phaser from 'phaser';
import { DESIGN } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { RaceScene } from './scenes/RaceScene.js';

// Phaser now draws only the HUD, touch controls and overlays — the world is a
// Three.js canvas underneath (see src/render3d/). That is why this is CANVAS
// rather than AUTO: a Canvas2D overlay keeps the page to a single WebGL context
// instead of two, which matters most in headless CI, where SwiftShader has
// already produced black captures once (see progress.md 2026-07-28). A few dozen
// text and rounded-rect draws per frame is nothing for Canvas2D, and toDataURL
// on a 2D canvas is far more reliable for playtest screenshots.
//
// Switch to Phaser.AUTO here if the overlay ever needs WebGL-only features.
const RENDERER_TYPE = Phaser.CANVAS;

const config = {
  type: RENDERER_TYPE,
  parent: 'game',
  // The world shows through from the Three canvas below, so no background fill.
  // TitleScene sets its own camera background, since it has no 3D behind it.
  transparent: true,
  scale: {
    // RESIZE: the canvas always fills the whole viewport, so there are no
    // letterbox bars squashing the game into the middle of the screen. Scenes
    // read this.scale.width/height and lay themselves out responsively, and the
    // race camera renders the world at any aspect ratio. DESIGN is kept as a
    // reference resolution for scaling UI (see ui/format.js scaleFactor).
    mode: Phaser.Scale.RESIZE,
    width: DESIGN.width,
    height: DESIGN.height,
    // Fullscreen the whole container, not just Phaser's canvas.
    //
    // Left unset, Phaser creates its own wrapper div and moves *only* its canvas
    // into it (see ScaleManager.getFullscreenTarget). The Three.js canvas is a
    // sibling, so it gets left behind outside the fullscreen element — the HUD
    // and buttons keep working while the entire world goes black. Pointing at
    // #game takes both canvases in together.
    fullscreenTarget: 'game',
  },
  render: {
    antialias: true,
    roundPixels: false,
  },
  scene: [BootScene, TitleScene, RaceScene],
};

function createGame(gameConfig = config) {
  const game = new Phaser.Game(gameConfig);

  // A small diagnostics hook for automated playtesting.
  window.__BERYL_GAME__ = game;
  return game;
}

const harnessRequested = new URLSearchParams(window.location.search).get('harness') === '1';
if (!harnessRequested) createGame();

// Mobile rotation fix.
//
// In RESIZE mode Phaser continuously sizes the canvas to its parent element
// (#game). #game is `position: fixed; inset: 0`, so it should always match the
// viewport — but on some mobile browsers a fixed element keeps its old
// portrait width across a portrait→landscape rotation until something forces a
// reflow. Phaser dutifully follows that stale width, so the game stays stuck at
// half width until you tap something (e.g. fullscreen), which triggers the
// reflow. window.innerWidth / visualViewport DO report the new size correctly,
// so we drive #game's size from them explicitly (an explicit width/height wins
// over `inset: 0`), which Phaser then picks up on its next step — no tap needed.
const gameEl = document.getElementById('game');

function fitParentToViewport() {
  if (!gameEl) return;
  const vv = window.visualViewport;
  const w = Math.round(vv && vv.width ? vv.width : window.innerWidth);
  const h = Math.round(vv && vv.height ? vv.height : window.innerHeight);
  if (w > 0 && h > 0) {
    gameEl.style.width = `${w}px`;
    gameEl.style.height = `${h}px`;
  }
}

// Re-fit now, on every resize, and — crucially — several times after an
// orientation change, because the corrected viewport size can land a few
// hundred milliseconds after the event fires.
fitParentToViewport();
window.addEventListener('resize', fitParentToViewport);
window.addEventListener('orientationchange', () => {
  fitParentToViewport();
  [50, 150, 300, 500, 800].forEach((t) => setTimeout(fitParentToViewport, t));
});
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', fitParentToViewport);
}

// Keep the player path synchronous and unchanged. The harness is a separate
// chunk and is loaded only when explicitly requested.
if (harnessRequested) {
  import('./harness/index.js')
    .then(({ startHarness }) => startHarness({ Phaser, config, createGame }))
    .catch((error) => {
      console.error('[harness] failed to start', error);
      throw error;
    });
}
