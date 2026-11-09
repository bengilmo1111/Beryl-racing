// Title screen: name, Beryl, a course selector, Play button, fullscreen toggle
// and best-time readout for the chosen course. Everything is laid out from the
// live viewport size (RESIZE scale mode) and reflows on resize / orientation
// change, so it fills the screen on any device instead of being letterboxed.
import Phaser from 'phaser';
import { readBestTime } from '../storage.js';
import { STORAGE_KEY } from '../config.js';
import { TRACKS, getSelectedTrack, getSelectedTrackId, setSelectedTrack } from '../tracks.js';
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
    this.cameras.main.setBackgroundColor('#f3eedf');

    // Touring-poster backdrop, redrawn for the viewport.
    this.backdrop = this.add.graphics();

    this.titleText = this.add
      .text(0, 0, 'BERYL', { fontFamily: FONT, fontStyle: '700', color: '#153e40' })
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
      .text(0, 0, 'PICK YOUR NEXT ADVENTURE', { fontFamily: FONT, fontStyle: '700', color: '#fff8e7' })
      .setOrigin(0.5)
      .setDepth(2)
      .setAlpha(0.85);
    this.trackButtons = TRACKS.map((def) => {
      const btn = this.add
        .text(0, 0, def.name, { fontFamily: FONT, fontStyle: '700', align: 'center' })
        .setOrigin(0.5)
        .setDepth(2)
        .setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => btn.setAlpha(0.85));
      btn.on('pointerout', () => btn.setAlpha(1));
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
      .text(0, 0, 'LET’S DRIVE  →', {
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
      .text(0, 0, 'WASD / arrows to drive  •  H to toot  •  Gilmore Games', {
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
    this.subtitleText.setText('RACING');

    const best = readBestTime(STORAGE_KEY);
    this.bestText.setText(best > 0 ? `${def.bestLabel}  ${formatTime(best)}` : 'A little car. A grand day out.');

    for (const { def: d, btn } of this.trackButtons) {
      const on = d.id === selId;
      btn.setColor(on ? '#153e40' : '#f3eedf');
      btn.setBackgroundColor(on ? '#c1e6d8' : '#244e50');
    }
  }

  layout() {
    const w = this.scale.width;
    const h = this.scale.height;
    const compact = h < 480;
    const s = Math.min(w / 1280, h / 720);
    const pad = Math.max(18, 36 * s);
    const stacked = w < h;
    const split = stacked ? w : w * 0.55;
    const panelY = stacked ? h * 0.44 : 0;
    const panelX = stacked ? pad : split + pad;
    const panelW = w - panelX - pad;
    const top = stacked ? panelY + pad : Math.max(64, h * 0.17);
    const bottom = h - Math.max(30, h * 0.065);
    const cx = panelX + panelW / 2;

    this.backdrop.clear();
    this.backdrop.fillStyle(0x153e40).fillRect(stacked ? 0 : split, panelY, stacked ? w : w - split, h - panelY);
    // Quiet touring-poster details frame the car without competing with it.
    this.backdrop.fillStyle(0xe4dfce).fillCircle(w * (stacked ? 0.5 : 0.25), h * (stacked ? 0.28 : 0.61), h * (stacked ? 0.14 : 0.30));
    this.backdrop.lineStyle(1, 0xc5c5ad).strokeCircle(w * (stacked ? 0.5 : 0.25), h * (stacked ? 0.28 : 0.61), h * (stacked ? 0.15 : 0.32));
    this.backdrop.fillStyle(0xd3a951).fillRect(pad, stacked ? 24 : h * 0.12, 34, 4);
    this.titleText.setOrigin(0, 0).setFontSize(Math.round(stacked ? Math.min(72, w * 0.15) : h * 0.155))
      .setPosition(pad, stacked ? 40 : h * 0.15);
    this.subtitleText.setOrigin(0, 0).setColor('#97752f')
      .setFontSize(Math.round(stacked ? 22 : h * 0.048)).setLetterSpacing(6)
      .setPosition(pad + 3, this.titleText.getBounds().bottom + 2);

    const photoW = split * 0.94;
    const photoH = h * (stacked ? 0.22 : 0.46);
    this.beryl.setVisible(true).setScale(Math.min(photoW / this.beryl.width, photoH / this.beryl.height));
    this.berylBaseY = h * (stacked ? 0.31 : 0.64);
    this.beryl.setPosition(split * 0.49, this.berylBaseY);

    this.selectorLabel.setOrigin(0, 0).setAlpha(1).setColor('#b7d4ca')
      .setFontSize(Math.max(11, Math.round(15 * s))).setLetterSpacing(2)
      .setPosition(panelX, top);
    const listTop = top + Math.max(25, 38 * s);
    const gap = Math.max(6, 10 * s);
    const playH = Math.max(43, 62 * s);
    const rowH = Math.min(70 * Math.max(0.7, s), (bottom - listTop - playH - Math.max(38, 56 * s) - gap * (this.trackButtons.length - 1)) / this.trackButtons.length);
    this.trackButtons.forEach(({ def, btn }, i) => {
      const selected = def.id === getSelectedTrackId();
      btn.setText(`${selected ? '●' : '○'}  ${def.name}`)
        .setOrigin(0, 0).setFontSize(Math.max(14, Math.round(22 * s)))
        .setPadding(Math.round(14 * Math.max(s, 0.6)), Math.max(5, Math.round(rowH * 0.17)))
        .setFixedSize(panelW, rowH).setAlign('left')
        .setPosition(panelX, listTop + i * (rowH + gap));
    });
    const listBottom = listTop + this.trackButtons.length * (rowH + gap) - gap;
    this.bestText.setFontSize(Math.max(11, Math.round(15 * s)))
      .setColor('#b7d4ca').setPosition(cx, listBottom + Math.max(14, 22 * s));
    this.play.setFontSize(Math.max(18, Math.round(26 * s))).setPadding(12, Math.max(8, 14 * s))
      .setFixedSize(panelW, playH).setPosition(cx, bottom - playH / 2);
    this.footer.setColor(stacked ? '#b7d4ca' : '#53625b').setAlpha(1)
      .setText(compact ? 'WASD / arrows • H to toot' : 'WASD / arrows to drive  •  H to toot  •  Gilmore Games')
      .setFontSize(Math.max(10, Math.round(13 * s)))
      .setPosition(split / 2, h - (stacked ? 8 : Math.max(12, 24 * s)));
  }

  update(time) {
    // Gentle idle bob, applied on top of the laid-out base position.
    if (this.beryl && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.beryl.y = this.berylBaseY + Math.sin(time / 900) * 2;
    }
  }
}
