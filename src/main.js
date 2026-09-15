import Phaser from 'phaser';
import { DESIGN } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { RaceScene } from './scenes/RaceScene.js';
import { installViewport } from './viewport.js';

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

const harnessRequested = new URLSearchParams(window.location.search).get('harness') === '1';

function createGame(gameConfig = config) {
  const game = new Phaser.Game(gameConfig);

  // How big the playfield is, and which way up the phone is: see
  // src/viewport.js, which owns both. The harness drives time itself and would
  // deadlock on a paused scene, so it gets the sizing without the pausing.
  installViewport(game, { guardOrientation: !harnessRequested });

  // A small diagnostics hook for automated playtesting.
  window.__BERYL_GAME__ = game;
  return game;
}

if (!harnessRequested) createGame();

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
