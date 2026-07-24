// Loads generated and procedural textures, then hands off to the title screen.
import Phaser from 'phaser';
import { drawGrass, drawPuff, preloadBerylPhoto } from '../art.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Beryl's real photo (used as the title-screen hero).
    preloadBerylPhoto(this);

    // Approved top-down Beryl sprite, resolved beneath the configured base path.
    this.load.image('beryl', `${import.meta.env.BASE_URL}assets/beryl.png`);
  }

  create() {
    drawGrass(this);
    drawPuff(this);

    // Hide the HTML loading splash now that textures are ready.
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.opacity = '0';
      setTimeout(() => loading.remove(), 400);
    }

    this.scene.start('Title');
  }
}
