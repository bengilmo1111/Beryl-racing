// Loads generated art + audio, plus a couple of procedural fx textures, then
// hands off to the title screen.
import Phaser from 'phaser';
import { drawPuff, preloadBerylPhoto } from '../art.js';
import { acquireContext } from '../audio/context.js';
import { primeSamples } from '../audio/samples.js';
import { MUSIC_ASSETS } from '../audio/sound.js';

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
    this.load.image('grass', `${B}assets/grass.png`);
    this.load.image('tree-1', `${B}assets/tree-1.png`);
    this.load.image('tree-2', `${B}assets/tree-2.png`);
    this.load.image('tree-3', `${B}assets/tree-3.png`);
    this.load.image('start-gantry', `${B}assets/start-gantry.png`);
    // The original cue is the title/fallback music. Current courses each preload
    // their own cue so switching tracks is immediate when a race begins.
    for (const { key, path } of MUSIC_ASSETS) this.load.audio(key, `${B}${path}`);
  }

  async create() {
    // Smoke/dust puffs stay procedural.
    drawPuff(this);

    // Beryl's own recordings — engine front, engine rear, horn. Fetched and
    // decoded here, during the splash, rather than by the race: decoding works
    // happily on a context that is still suspended, and a race that starts on a
    // network round-trip starts with the synth and switches under the player.
    //
    // Not under the harness, which disables audio outright so that AudioContext
    // (wall-clock) can never reach a deterministic run.
    if (!this.game.registry.get('__harness')) {
      const { ctx } = acquireContext(this.sound);
      primeSamples(ctx);
    }

    // Pull the 3D renderer in as its own chunk, during the loading splash. Doing
    // it here rather than in RaceScene.create() is deliberate: that method is
    // synchronous and the playtest harness spins on the countdown starting
    // immediately, so it cannot afford to await anything. Every path into a race
    // — player and harness alike — goes through Boot, so by the time
    // RaceScene.create() runs this import has always resolved.
    // Stashed on the registry rather than re-imported by RaceScene: a static
    // import there would pull three.js back into the default chunk.
    this.game.registry.set('__render3d', await import('../render3d/index.js'));

    // Hide the HTML loading splash now that textures are ready.
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.opacity = '0';
      setTimeout(() => loading.remove(), 400);
    }

    this.scene.start('Title');
  }
}
