// Title screen: name, Beryl, Play button, fullscreen toggle, best-lap readout.
import Phaser from 'phaser';
import { COLORS, STORAGE_KEY } from '../config.js';
import { FONT, formatTime } from '../ui/format.js';
import { createFullscreenButton } from '../ui/fullscreen.js';
import { createSoundButton } from '../ui/soundButton.js';
import { startMusic, unlockAudio } from '../audio/sound.js';
import { addBerylPhoto } from '../art.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.cameras.main.setBackgroundColor('#246b45');
    // Grass backdrop.
    this.add.tileSprite(0, 0, w, h, 'grass').setOrigin(0).setScrollFactor(0);

    // Sky-ish banner behind the title.
    const banner = this.add.graphics();
    banner.fillStyle(COLORS.ink, 0.9);
    banner.fillRoundedRect(w / 2 - 320, h * 0.16, 640, 150, 28);

    this.add
      .text(w / 2, h * 0.16 + 44, 'BERYL', {
        fontFamily: FONT,
        fontSize: '84px',
        fontStyle: '700',
        color: '#2ec4d6',
      })
      .setOrigin(0.5, 0);
    this.add
      .text(w / 2, h * 0.16 + 118, 'RACING', {
        fontFamily: FONT,
        fontSize: '40px',
        fontStyle: '700',
        color: '#fff8e7',
      })
      .setOrigin(0.5, 0);

    // The real Beryl, parked and idling with a gentle bob.
    const beryl = addBerylPhoto(this, w / 2, h * 0.585, 500, 235);
    this.tweens.add({
      targets: beryl,
      y: beryl.y - 10,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    // Play button.
    const play = this.add
      .text(w / 2, h * 0.87, '▶  PLAY', {
        fontFamily: FONT,
        fontSize: '40px',
        fontStyle: '700',
        color: '#15314b',
        backgroundColor: '#ffd166',
        padding: { x: 34, y: 14 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    play.on('pointerover', () => play.setScale(1.06));
    play.on('pointerout', () => play.setScale(1));
    const start = () => {
      unlockAudio(this);
      startMusic(this);
      this.scene.start('Race');
    };
    play.on('pointerup', start);
    this.input.keyboard.once('keydown-ENTER', start);
    this.input.keyboard.once('keydown-SPACE', start);

    // Start music as soon as the player interacts (satisfies autoplay policy).
    const kick = () => {
      unlockAudio(this);
      startMusic(this);
    };
    this.input.once('pointerdown', kick);
    this.input.keyboard.once('keydown', kick);

    // Best lap so far.
    const best = Number(localStorage.getItem(STORAGE_KEY));
    if (best > 0) {
      this.add
        .text(w / 2, h * 0.78, `Best lap  ${formatTime(best)}`, {
          fontFamily: FONT,
          fontSize: '22px',
          fontStyle: '700',
          color: '#fff8e7',
        })
        .setOrigin(0.5);
    }

    this.add
      .text(w / 2, h - 14, 'Arrow keys / WASD to drive  •  a Gilmore Games production', {
        fontFamily: FONT,
        fontSize: '15px',
        color: '#fff8e7',
      })
      .setOrigin(0.5, 1)
      .setAlpha(0.75);

    createFullscreenButton(this);
    createSoundButton(this);
  }
}
