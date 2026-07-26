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
    // Pack the course buttons into as few centred rows as fit the viewport at
    // full size, wrapping to a second row (and shrinking only if a row still
    // overflows) so several long course names stay tappable on a narrow phone.
    const gapAt = (fit) => Math.round(24 * s * fit);
    const sizeButtons = (fit) => {
      for (const { btn } of this.trackButtons) {
        btn
          .setFontSize(Math.round(26 * s * fit))
          .setPadding(Math.round(22 * s * fit), Math.round(12 * s * fit));
      }
    };
    const maxRowW = w * 0.94;
    sizeButtons(1);
    const naturalTotal =
      this.trackButtons.reduce((a, { btn }) => a + btn.width, 0) +
      gapAt(1) * (this.trackButtons.length - 1);
    const rowCount = Math.max(1, Math.ceil(naturalTotal / maxRowW));
    const perRow = Math.ceil(this.trackButtons.length / rowCount);
    const rows = [];
    for (let i = 0; i < this.trackButtons.length; i += perRow) {
      rows.push(this.trackButtons.slice(i, i + perRow));
    }
    const rowNatural = (row) =>
      row.reduce((a, { btn }) => a + btn.width, 0) + gapAt(1) * (row.length - 1);
    const fit = Math.min(1, maxRowW / Math.max(...rows.map(rowNatural)));
    sizeButtons(fit);
    const gap = gapAt(fit);
    const rowH = this.trackButtons[0].btn.height + Math.round(12 * s * fit);
    const topY = h * 0.7 - ((rows.length - 1) * rowH) / 2;
    rows.forEach((row, ri) => {
      const rowW = row.reduce((a, { btn }) => a + btn.width, 0) + gap * (row.length - 1);
      let x = w / 2 - rowW / 2;
      const y = topY + ri * rowH;
      for (const { btn } of row) {
        btn.setPosition(x + btn.width / 2, y);
        x += btn.width + gap;
      }
    });

    // Best-time readout, under the selector (kept clear of a wrapped 2nd row).
    const selectorBottom = topY + (rows.length - 1) * rowH + rowH / 2;
    this.bestText
      .setFontSize(Math.round(24 * s))
      .setPosition(w / 2, Math.max(h * 0.79, selectorBottom + 20 * s));

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
