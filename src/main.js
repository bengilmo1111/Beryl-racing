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
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
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
