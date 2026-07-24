// Title screen: name, Beryl, Play button, fullscreen toggle, best-lap readout.
import Phaser from 'phaser';
import { COLORS, STORAGE_KEY } from '../config.js';
import { FONT, formatTime } from '../ui/format.js';
import { createFullscreenButton } from '../ui/fullscreen.js';

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

    // Beryl, parked and idling with a gentle bob.
    const beryl = this.add.sprite(w / 2, h * 0.58, 'beryl').setScale(1.1);
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
      .text(w / 2, h * 0.8, '▶  PLAY', {
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
    const start = () => this.scene.start('Race');
    play.on('pointerup', start);
    this.input.keyboard.once('keydown-ENTER', start);
    this.input.keyboard.once('keydown-SPACE', start);

    // Best lap so far.
    const best = Number(localStorage.getItem(STORAGE_KEY));
    if (best > 0) {
      this.add
        .text(w / 2, h * 0.9, `Best lap  ${formatTime(best)}`, {
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
  }
}
