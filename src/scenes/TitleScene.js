// Title screen: name, Beryl, a course selector, Play button, fullscreen toggle
// and best-time readout for the chosen course. Everything is laid out from the
// live viewport size (RESIZE scale mode) and reflows on resize / orientation
// change, so it fills the screen on any device instead of being letterboxed.
import Phaser from 'phaser';
import { readBestTime } from '../storage.js';
import { installJourneyEntry, showRouteBook } from '../journey/ui.js';
import { COLORS, STORAGE_KEY } from '../config.js';
import { TRACKS, getSelectedTrack, getSelectedTrackId, setSelectedTrack } from '../tracks.js';
import { FONT, formatTime, uiScale } from '../ui/format.js';
import { createFullscreenButton } from '../ui/fullscreen.js';
import { createSoundButton } from '../ui/soundButton.js';
import { iconRowSpan } from '../ui/iconButton.js';
import { startMusic, unlockAudio } from '../audio/sound.js';
import { addBerylPhoto } from '../art.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(data = {}) {
    this.journeyDialog = null;
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
      if (this.journeyDialog) return;
      this.game.registry.remove('__journeyChapter');
      unlockAudio(this);
      startMusic(this);
      this.scene.start('Race');
    };
    this.play.on('pointerup', start);
    this.input.keyboard.on('keydown-ENTER', start);
    this.input.keyboard.on('keydown-SPACE', start);
    this.events.once('shutdown', () => {
      this.input.keyboard.off('keydown-ENTER', start);
      this.input.keyboard.off('keydown-SPACE', start);
    });

    // Start music as soon as the player interacts (satisfies autoplay policy).
    const kick = () => {
      unlockAudio(this);
      startMusic(this);
    };
    this.input.once('pointerdown', kick);
    this.input.keyboard.once('keydown', kick);

    this.footer = this.add
      .text(0, 0, 'Arrow keys / WASD  •  H for the horn  •  a Gilmore Games production', {
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

    this.journeyEntry = installJourneyEntry(this);
    if (data.openJourney) showRouteBook(this);
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

    const best = readBestTime(STORAGE_KEY);
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
    const titleSize = Math.round((h < 480 ? 76 : 92) * s);
    const subSize = Math.round(42 * s);
    this.titleText.setFontSize(titleSize);
    this.subtitleText.setFontSize(subSize);

    // Banner sized to hold both lines, centred near the top. It is centred, so
    // the room it has is bounded by whichever side is busier: the fullscreen
    // and sound buttons sit in the top-right corner, and on a narrow phone the
    // banner would otherwise run underneath them.
    const bannerW = Math.min(
      w * 0.86,
      w - iconRowSpan(this, 2) * 2,
      Math.max(this.titleText.width, this.subtitleText.width, 520 * s) + 120 * s
    );
    const bannerH = this.titleText.height + this.subtitleText.height + 24 * s;
    const bannerX = w / 2;
    const bannerY = h * 0.06;
    this.banner.clear();
    this.banner.fillStyle(COLORS.ink, 0.9);
    this.banner.fillRoundedRect(bannerX - bannerW / 2, bannerY, bannerW, bannerH, 28 * s);
    this.titleText.setPosition(bannerX, bannerY + 8 * s + this.titleText.height / 2);
    this.subtitleText.setPosition(bannerX, this.titleText.getBounds().bottom + 2 * s + this.subtitleText.height / 2);

    // Beryl photo — sits in the middle band, scaled to the available space.
    const bannerBottom = bannerY + bannerH;
    const photoMaxW = Math.min(w * 0.72, 560 * s);
    const photoMaxH = h * (h < 480 ? 0.18 : 0.23);
    const bscale = Math.min(photoMaxW / this.beryl.width, photoMaxH / this.beryl.height);
    this.beryl.setScale(bscale);
    this.berylBaseY = (bannerBottom + h * (h < 480 ? 0.45 : 0.5)) / 2;
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

    // Short screens need a single stack: independently positioned percentages
    // collide as soon as the course selector wraps or a saved time appears.
    this.journeyEntry.style.top = '';
    this.beryl.setVisible(true);
    if (h < 480) {
      this.play.setPadding(Math.round(40 * s), 8);
      const playY = this.footer.getBounds().top - 6 - this.play.height / 2;
      this.play.setY(playY);
      const bestY = this.play.getBounds().top - 7 - this.bestText.height / 2;
      this.bestText.setY(bestY);
      const bottom = this.bestText.getBounds().top - 10;
      rows.forEach((row, ri) => {
        const y = bottom - this.trackButtons[0].btn.height / 2 - (rows.length - 1 - ri) * rowH;
        row.forEach(({ btn }) => btn.setY(y));
      });
      const firstTop = rows[0][0].btn.getBounds().top;
      this.selectorLabel.setY(firstTop - 7 - this.selectorLabel.height / 2);
      const entryTop = this.selectorLabel.getBounds().top - 8 - this.journeyEntry.offsetHeight;
      this.journeyEntry.style.top = `${entryTop}px`;

      // Preserve the car where there is room; the narrow two-row layout uses
      // that space for the controls instead.
      const photoRoom = entryTop - bannerBottom - 16;
      this.beryl.setVisible(photoRoom >= 32);
      if (photoRoom >= 32) {
        this.beryl.setScale(Math.min(bscale, photoRoom / this.beryl.height));
        this.berylBaseY = (bannerBottom + entryTop) / 2;
      }
    }
  }

  update(time) {
    // Gentle idle bob, applied on top of the laid-out base position.
    if (this.beryl) this.beryl.y = this.berylBaseY + Math.sin(time / 600) * 8;
  }
}
