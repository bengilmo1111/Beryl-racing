// Title screen: name, Beryl, a course selector, Play button, fullscreen toggle
// and best-time readout for the chosen course. Everything is laid out from the
// live viewport size (RESIZE scale mode) and reflows on resize / orientation
// change, so it fills the screen on any device instead of being letterboxed.
import Phaser from 'phaser';
import { COLORS, STORAGE_KEY } from '../config.js';
import { TRACKS, getSelectedTrack, getSelectedTrackId, setSelectedTrack } from '../tracks.js';
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
      .text(0, 0, '', { fontFamily: FONT, fontStyle: '700', color: '#fff8e7' })
      .setOrigin(0.5)
      .setDepth(2);

    // The real Beryl, parked and idling with a gentle bob (see update()).
    this.beryl = addBerylPhoto(this, 0, 0, 500, 235).setDepth(2);
    this.berylBaseY = 0;

    // Course selector — a small heading plus one button per course.
    this.selectorLabel = this.add
      .text(0, 0, 'CHOOSE YOUR COURSE', { fontFamily: FONT, fontStyle: '700', color: '#fff8e7' })
      .setOrigin(0.5)
      .setDepth(2)
      .setAlpha(0.85);
    this.trackButtons = TRACKS.map((def) => {
      const btn = this.add
        .text(0, 0, def.name, { fontFamily: FONT, fontStyle: '700', align: 'center' })
        .setOrigin(0.5)
        .setDepth(2)
        .setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => btn.setScale(1.04));
      btn.on('pointerout', () => btn.setScale(1));
      btn.on('pointerup', () => this.selectTrack(def.id));
      return { def, btn };
    });

    // Best time so far, for the chosen course.
    this.bestText = this.add
      .text(0, 0, '', { fontFamily: FONT, fontStyle: '700', color: '#fff8e7' })
      .setOrigin(0.5)
      .setDepth(2);

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

    // Reflect whatever course is currently selected (restored from last time).
    this.refreshSelection();

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
  }

  selectTrack(id) {
    setSelectedTrack(id);
    this.refreshSelection();
    this.layout();
  }

  // Update the subtitle, best-time readout and button styling to match the
  // currently selected course.
  refreshSelection() {
    const def = getSelectedTrack();
    const selId = getSelectedTrackId();
    this.subtitleText.setText(def.name.toUpperCase());

    const best = Number(localStorage.getItem(STORAGE_KEY));
    this.bestText.setText(best > 0 ? `${def.bestLabel}  ${formatTime(best)}` : '');

    for (const { def: d, btn } of this.trackButtons) {
      const on = d.id === selId;
      btn.setColor(on ? '#15314b' : '#fff8e7');
      btn.setBackgroundColor(on ? '#ffd166' : '#15314bcc');
    }
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
    const bannerW = Math.min(w * 0.86, Math.max(this.titleText.width, this.subtitleText.width, 520 * s) + 120 * s);
    const bannerH = titleSize + subSize + 44 * s;
    const bannerX = w / 2;
    const bannerY = h * 0.06;
    this.banner.clear();
    this.banner.fillStyle(COLORS.ink, 0.9);
    this.banner.fillRoundedRect(bannerX - bannerW / 2, bannerY, bannerW, bannerH, 28 * s);
    this.titleText.setPosition(bannerX, bannerY + titleSize * 0.62);
    this.subtitleText.setPosition(bannerX, bannerY + titleSize + subSize * 0.5);

    // Beryl photo — sits in the middle band, scaled to the available space.
    const bannerBottom = bannerY + bannerH;
    const photoMaxW = Math.min(w * 0.72, 560 * s);
    const photoMaxH = h * 0.3;
    const bscale = Math.min(photoMaxW / this.beryl.width, photoMaxH / this.beryl.height);
    this.beryl.setScale(bscale);
    this.berylBaseY = (bannerBottom + h * 0.56) / 2;
    this.beryl.setPosition(w / 2, this.berylBaseY);

    // Course selector.
    this.selectorLabel.setFontSize(Math.round(18 * s)).setPosition(w / 2, h * 0.62);
    const btnSize = Math.round(26 * s);
    const gap = Math.round(24 * s);
    let total = 0;
    for (const { btn } of this.trackButtons) {
      btn.setFontSize(btnSize).setPadding(Math.round(22 * s), Math.round(12 * s));
      total += btn.width;
    }
    total += gap * (this.trackButtons.length - 1);
    let x = w / 2 - total / 2;
    const btnY = h * 0.7;
    for (const { btn } of this.trackButtons) {
      btn.setPosition(x + btn.width / 2, btnY);
      x += btn.width + gap;
    }

    // Best-time readout, under the selector.
    this.bestText.setFontSize(Math.round(24 * s)).setPosition(w / 2, h * 0.79);

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
