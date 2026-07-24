// Race HUD: current / last / best lap, lap counter, and a "New best!" flash.
// Rounded panels that scale with the viewport so they stay readable and
// well-proportioned on phones as well as desktops.
import { formatTime, FONT, uiScale } from './format.js';
import { COLORS } from '../config.js';

export class Hud {
  constructor(scene) {
    this.scene = scene;

    const panelStyle = { fontFamily: FONT, color: '#fff8e7' };

    // Rounded background panels are drawn on a graphics layer (redrawn on
    // resize); text sits on top.
    this.bg = scene.add.graphics().setScrollFactor(0).setDepth(889);

    this.currentLabel = scene.add
      .text(0, 0, 'LAP TIME', { ...panelStyle, fontStyle: '700' })
      .setScrollFactor(0)
      .setDepth(900);
    this.current = scene.add
      .text(0, 0, '00:00.000', { ...panelStyle, fontStyle: '700' })
      .setScrollFactor(0)
      .setDepth(900);

    this.last = scene.add
      .text(0, 0, 'LAST  --:--.---', { ...panelStyle, fontStyle: '700' })
      .setScrollFactor(0)
      .setDepth(900);
    this.best = scene.add
      .text(0, 0, 'BEST  --:--.---', { ...panelStyle, fontStyle: '700', color: '#ffd166' })
      .setScrollFactor(0)
      .setDepth(900);

    this.lap = scene.add
      .text(0, 0, 'LAP 1', { ...panelStyle, fontStyle: '700' })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(900);

    this.flash = scene.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontStyle: '700',
        color: '#ffd166',
        stroke: '#15314b',
        strokeThickness: 9,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(950)
      .setAlpha(0);

    scene.scale.on('resize', this.reposition, this);
    scene.events.once('shutdown', () => scene.scale.off('resize', this.reposition, this));
    this.reposition();
  }

  reposition() {
    const scene = this.scene;
    const w = scene.scale.width;
    const h = scene.scale.height;
    const s = uiScale(scene, 0.7, 1.1);
    const pad = Math.round(12 * s);

    // Font sizes.
    const labelSize = Math.round(20 * s);
    const bigSize = Math.round(46 * s);
    const rowSize = Math.round(22 * s);
    const lapSize = Math.round(28 * s);

    this.currentLabel.setFontSize(labelSize);
    this.current.setFontSize(bigSize);
    this.last.setFontSize(rowSize);
    this.best.setFontSize(rowSize);
    this.lap.setFontSize(lapSize);
    this.flash.setFontSize(Math.round(64 * s)).setStroke('#15314b', Math.round(9 * s));

    // Lap-time panel, top-left.
    const inX = Math.round(16 * s);
    const inY = Math.round(14 * s);
    const px = Math.round(16 * s);
    const py = Math.round(12 * s);
    this.currentLabel.setPosition(inX + px, inY + py);
    this.current.setPosition(inX + px, inY + py + labelSize + Math.round(6 * s));
    const rowsY = inY + py + labelSize + bigSize + Math.round(16 * s);
    this.last.setPosition(inX + px, rowsY);
    this.best.setPosition(inX + px, rowsY + rowSize + Math.round(6 * s));

    const panelW =
      Math.max(this.current.width, this.last.width, this.best.width) + px * 2;
    const panelH = rowsY + rowSize * 2 + Math.round(6 * s) + py - inY;

    // Lap counter panel, top-centre.
    const lapPanelW = Math.round(150 * s);
    const lapPanelH = lapSize + py * 2;
    const lapX = w / 2;
    const lapY = inY;
    this.lap.setPosition(lapX, lapY + lapPanelH / 2);

    // Draw both rounded panels.
    this.bg.clear();
    this.bg.fillStyle(COLORS.ink, 0.78);
    this.bg.lineStyle(Math.max(2, Math.round(2 * s)), 0xfff8e7, 0.28);
    this.bg.fillRoundedRect(inX, inY, panelW, panelH, Math.round(16 * s));
    this.bg.strokeRoundedRect(inX, inY, panelW, panelH, Math.round(16 * s));
    this.bg.fillRoundedRect(lapX - lapPanelW / 2, lapY, lapPanelW, lapPanelH, Math.round(14 * s));
    this.bg.strokeRoundedRect(lapX - lapPanelW / 2, lapY, lapPanelW, lapPanelH, Math.round(14 * s));

    this.flash.setPosition(w / 2, h * 0.4);
  }

  setCurrent(ms) {
    this.current.setText(formatTime(ms));
  }

  setLast(ms) {
    this.last.setText(`LAST  ${formatTime(ms)}`);
  }

  setBest(ms) {
    this.best.setText(`BEST  ${formatTime(ms)}`);
  }

  setLap(n) {
    this.lap.setText(`LAP ${n}`);
  }

  showMessage(text, color = '#ffd166') {
    this.flash.setText(text).setColor(color).setAlpha(1).setScale(0.7);
    this.scene.tweens.add({ targets: this.flash, scale: 1, duration: 260, ease: 'Back.out' });
    this.scene.tweens.add({ targets: this.flash, alpha: 0, delay: 1400, duration: 500 });
  }
}
