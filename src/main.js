import Phaser from 'phaser';
import { DESIGN, COLORS } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { RaceScene } from './scenes/RaceScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#246b45',
  scale: {
    // RESIZE: the canvas always fills the whole viewport, so there are no
    // letterbox bars squashing the game into the middle of the screen. Scenes
    // read this.scale.width/height and lay themselves out responsively, and the
    // race camera renders the world at any aspect ratio. DESIGN is kept as a
    // reference resolution for scaling UI (see ui/format.js scaleFactor).
    mode: Phaser.Scale.RESIZE,
    width: DESIGN.width,
    height: DESIGN.height,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  render: {
    antialias: true,
    roundPixels: false,
  },
  scene: [BootScene, TitleScene, RaceScene],
};

// eslint-disable-next-line no-new
const game = new Phaser.Game(config);

// A small diagnostics hook for automated playtesting. It lets the
// smoke test inspect the active scene and drive checkpoints without coupling
// production gameplay code to a testing framework.
window.__BERYL_GAME__ = game;

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

// Silence unused import warnings in some bundlers while keeping palette handy.
void COLORS;
