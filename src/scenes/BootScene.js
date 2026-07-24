// Loads generated art + audio, plus a couple of procedural fx textures, then
// hands off to the title screen.
import Phaser from 'phaser';
import { drawPuff, drawSkid, preloadBerylPhoto } from '../art.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const B = import.meta.env.BASE_URL;
    // Beryl's real photo (used as the title-screen hero).
    preloadBerylPhoto(this);
    // Generated sprites and textures, resolved beneath the configured base path.
    this.load.image('beryl', `${B}assets/beryl.png`);
    this.load.image('tarmac', `${B}assets/tarmac.png`);
    this.load.image('grass', `${B}assets/grass.png`);
    this.load.image('tree-1', `${B}assets/tree-1.png`);
    this.load.image('tree-2', `${B}assets/tree-2.png`);
    this.load.image('tree-3', `${B}assets/tree-3.png`);
    this.load.image('tyre-barrier', `${B}assets/tyre-barrier.png`);
    this.load.image('hay-bale', `${B}assets/hay-bale.png`);
    this.load.image('start-gantry', `${B}assets/start-gantry.png`);
    // Background music.
    this.load.audio('music-race', `${B}assets/music-race.mp3`);
  }

  create() {
    // Skid marks and smoke stay procedural.
    drawPuff(this);
    drawSkid(this);

    // Hide the HTML loading splash now that textures are ready.
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.opacity = '0';
      setTimeout(() => loading.remove(), 400);
    }

    this.scene.start('Title');
  }
}
