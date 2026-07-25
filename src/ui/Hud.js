// Race HUD: current / last / best time, progress readout, and a "New best!"
// flash. Labels come from the active course (scene.def.hud). The whole HUD sits
// in an inverse-zoom layer so its screen-edge positions are unaffected by the
// following race camera.
import { formatTime, FONT, uiScale, isCompact, pinUiLayer } from './format.js';
import { COLORS } from '../config.js';

export class Hud {
  constructor(scene) {
    this.scene = scene;
    const panelStyle = { fontFamily: FONT, color: '#fff8e7' };
    this.hudCopy = (scene.def && scene.def.hud) || {};

    this.layer = scene.add.container(0, 0).setScrollFactor(0).setDepth(889);
    this.bg = scene.add.graphics();

    this.currentLabel = scene.add.text(0, 0, this.hudCopy.current || 'LAP TIME', {
      ...panelStyle,
      fontStyle: '700',
    });
    this.current = scene.add.text(0, 0, '00:00.000', {
      ...panelStyle,
      fontStyle: '700',
    });
    this.last = scene.add.text(0, 0, 'LAST  --:--.---', {
      ...panelStyle,
      fontStyle: '700',
    });
    this.best = scene.add.text(0, 0, 'BEST  --:--.---', {
      ...panelStyle,
      fontStyle: '700',
      color: '#ffd166',
    });
    this.lap = scene.add
      .text(0, 0, this.hudCopy.progress || '', { ...panelStyle, fontStyle: '700' })
      .setOrigin(0.5);

    this.flash = scene.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontStyle: '700',
        color: '#ffd166',
        stroke: '#15314b',
        strokeThickness: 9,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.layer.add([
      this.bg,
      this.currentLabel,
      this.current,
      this.last,
      this.best,
      this.lap,
      this.flash,
    ]);

    this.pin = () => pinUiLayer(scene, this.layer);
    scene.scale.on('resize', this.reposition, this);
    scene.events.on('postupdate', this.pin);
    scene.events.once('shutdown', () => {
      scene.scale.off('resize', this.reposition, this);
      scene.events.off('postupdate', this.pin);
    });
    this.reposition();
  }

  reposition() {
    const scene = this.scene;
    const w = scene.scale.width;
    const h = scene.scale.height;
    const rawScale = uiScale(scene, 0.7, 1.1);
    const s = isCompact(scene) ? Math.max(rawScale, 0.84) : rawScale;

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

    const inX = Math.round(14 * s);
    const inY = Math.round(12 * s);
    const px = Math.round(16 * s);
    const py = Math.round(12 * s);
    this.currentLabel.setPosition(inX + px, inY + py);
    this.current.setPosition(inX + px, inY + py + labelSize + Math.round(6 * s));
    const rowsY = inY + py + labelSize + bigSize + Math.round(16 * s);
    this.last.setPosition(inX + px, rowsY);
    this.best.setPosition(inX + px, rowsY + rowSize + Math.round(6 * s));

    const panelW = Math.max(this.current.width, this.last.width, this.best.width) + px * 2;
    const panelH = rowsY + rowSize * 2 + Math.round(6 * s) + py - inY;

    const lapPanelW = Math.round(150 * s);
    const lapPanelH = lapSize + py * 2;
    const lapX = w / 2;
    const lapY = inY;
    this.lap.setPosition(lapX, lapY + lapPanelH / 2);

    this.bg.clear();
    this.bg.fillStyle(COLORS.ink, 0.82);
    this.bg.lineStyle(Math.max(2, Math.round(2 * s)), 0xfff8e7, 0.3);
    this.bg.fillRoundedRect(inX, inY, panelW, panelH, Math.round(16 * s));
    this.bg.strokeRoundedRect(inX, inY, panelW, panelH, Math.round(16 * s));
    this.bg.fillRoundedRect(
      lapX - lapPanelW / 2,
      lapY,
      lapPanelW,
      lapPanelH,
      Math.round(14 * s)
    );
    this.bg.strokeRoundedRect(
      lapX - lapPanelW / 2,
      lapY,
      lapPanelW,
      lapPanelH,
      Math.round(14 * s)
    );

    this.flash.setPosition(w / 2, h * 0.4);
    this.pin();
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
    this.lap.setText(`${this.hudCopy.lapWord || 'LAP'} ${n}`);
  }

  showMessage(text, color = '#ffd166') {
    this.flash.setText(text).setColor(color).setAlpha(1).setScale(0.7);
    this.scene.tweens.add({
      targets: this.flash,
      scale: 1,
      duration: 260,
      ease: 'Back.out',
    });
    this.scene.tweens.add({
      targets: this.flash,
      alpha: 0,
      delay: 1400,
      duration: 500,
    });
  }
}
