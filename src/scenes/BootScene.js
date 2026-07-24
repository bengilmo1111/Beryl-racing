// Generates procedural textures, then hands off to the title screen.
import Phaser from 'phaser';
import { drawBeryl, drawGrass, drawPuff, preloadBerylPhoto } from '../art.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Beryl's real photo (used as the title-screen hero).
    preloadBerylPhoto(this);
  }

  create() {
    drawGrass(this);
    drawBeryl(this);
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
