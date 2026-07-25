// Title screen: name, Beryl, Play button, fullscreen toggle, best-lap readout.
// Everything is laid out from the live viewport size (RESIZE scale mode) and
// reflows on resize / orientation change, so it fills the screen on any device
// instead of being letterboxed into the middle.
import Phaser from 'phaser';
import { COLORS, STORAGE_KEY } from '../config.js';
import { FONT, formatTime, uiScale } from '../ui/format.js';
import { createFullscreenButton } from '../ui/fullscreen.js';
import { createSoundButton } from '../ui/soundButton.js';
import { startMusic, unlockAudio } from '../audio/sound.js';
import { addBerylPhoto } from '../art.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this.cameras.main.setBackgroundColor('#246b45');

    // Full-bleed grass backdrop.
    this.grass = this.add.tileSprite(0, 0, 10, 10, 'grass').setOrigin(0).setScrollFactor(0);

    // Banner behind the title (rounded, redrawn on layout).
    this.banner = this.add.graphics().setDepth(1);

    this.titleText = this.add
      .text(0, 0, 'BERYL', { fontFamily: FONT, fontStyle: '700', color: '#2ec4d6' })
      .setOrigin(0.5)
      .setDepth(2);
    this.subtitleText = this.add
      .text(0, 0, 'EASTBOURNE POOTLE', { fontFamily: FONT, fontStyle: '700', color: '#fff8e7' })
      .setOrigin(0.5)
      .setDepth(2);

    // The real Beryl, parked and idling with a gentle bob (see update()).
    this.beryl = addBerylPhoto(this, 0, 0, 500, 235).setDepth(2);
    this.berylBaseY = 0;

    // Best lap so far.
    this.bestText = this.add
      .text(0, 0, '', { fontFamily: FONT, fontStyle: '700', color: '#fff8e7' })
      .setOrigin(0.5)
      .setDepth(2);
    const best = Number(localStorage.getItem(STORAGE_KEY));
    if (best > 0) this.bestText.setText(`Eastbourne best  ${formatTime(best)}`);

    // Play button — big, friendly, easy to tap.
    this.play = this.add
      .text(0, 0, '▶  PLAY', {
        fontFamily: FONT,
        fontStyle: '700',
        color: '#15314b',
        backgroundColor: '#ffd166',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });
    this.play.on('pointerover', () => this.play.setScale(1.06));
    this.play.on('pointerout', () => this.play.setScale(1));
    this.play.on('pointerdown', () => this.play.setScale(0.96));
    const start = () => {
      unlockAudio(this);
      startMusic(this);
      this.scene.start('Race');
    };
    this.play.on('pointerup', start);
    this.input.keyboard.once('keydown-ENTER', start);
    this.input.keyboard.once('keydown-SPACE', start);

    // Start music as soon as the player interacts (satisfies autoplay policy).
    const kick = () => {
      unlockAudio(this);
      startMusic(this);
    };
    this.input.once('pointerdown', kick);
    this.input.keyboard.once('keydown', kick);

    this.footer = this.add
      .text(0, 0, 'Arrow keys / WASD or on-screen controls  •  a Gilmore Games production', {
        fontFamily: FONT,
        color: '#fff8e7',
        align: 'center',
      })
      .setOrigin(0.5, 1)
      .setDepth(2)
      .setAlpha(0.8);

    createFullscreenButton(this);
    createSoundButton(this);

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
  }

  layout() {
    const w = this.scale.width;
    const h = this.scale.height;
    const s = uiScale(this);

    this.grass.setSize(w, h);

    // Title text sizes scale with the viewport.
    const titleSize = Math.round(92 * s);
    const subSize = Math.round(42 * s);
    this.titleText.setFontSize(titleSize);
    this.subtitleText.setFontSize(subSize);

    // Banner sized to hold both lines, centred near the top.
    const bannerW = Math.min(w * 0.86, Math.max(this.titleText.width, 520 * s) + 120 * s);
    const bannerH = titleSize + subSize + 44 * s;
    const bannerX = w / 2;
    const bannerY = h * 0.08;
    this.banner.clear();
    this.banner.fillStyle(COLORS.ink, 0.9);
    this.banner.fillRoundedRect(bannerX - bannerW / 2, bannerY, bannerW, bannerH, 28 * s);
    this.titleText.setPosition(bannerX, bannerY + titleSize * 0.62);
    this.subtitleText.setPosition(bannerX, bannerY + titleSize + subSize * 0.5);

    // Beryl photo — sits in the middle band, scaled to the available space.
    const bannerBottom = bannerY + bannerH;
    const photoMaxW = Math.min(w * 0.8, 640 * s);
    const photoMaxH = h * 0.4;
    const bscale = Math.min(photoMaxW / this.beryl.width, photoMaxH / this.beryl.height);
    this.beryl.setScale(bscale);
    this.berylBaseY = (bannerBottom + h * 0.72) / 2;
    this.beryl.setPosition(w / 2, this.berylBaseY);

    // Best lap readout, just under Beryl.
    this.bestText.setFontSize(Math.round(24 * s)).setPosition(w / 2, h * 0.78);

    // Play button — generous tap target.
    const playSize = Math.round(44 * s);
    this.play
      .setFontSize(playSize)
      .setPadding(Math.round(40 * s), Math.round(18 * s))
      .setPosition(w / 2, h * 0.9);

    this.footer.setFontSize(Math.round(15 * s)).setPosition(w / 2, h - 12 * s);
  }

  update(time) {
    // Gentle idle bob, applied on top of the laid-out base position.
    if (this.beryl) this.beryl.y = this.berylBaseY + Math.sin(time / 600) * 8;
  }
}
