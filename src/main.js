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
new Phaser.Game(config);

// Silence unused import warnings in some bundlers while keeping palette handy.
void COLORS;
