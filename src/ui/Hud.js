// Race HUD: current / last / best lap, lap counter, and a "New best!" flash.
import { formatTime, FONT } from './format.js';

export class Hud {
  constructor(scene) {
    this.scene = scene;

    const panelStyle = {
      fontFamily: FONT,
      color: '#fff8e7',
    };

    this.panel = scene.add
      .rectangle(12, 10, 318, 142, 0x15314b, 0.78)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(890)
      .setStrokeStyle(2, 0xfff8e7, 0.28);

    this.currentLabel = scene.add
      .text(28, 22, 'LAP TIME', { ...panelStyle, fontSize: '20px', fontStyle: '700' })
      .setScrollFactor(0)
      .setDepth(900);
    this.current = scene.add
      .text(28, 46, '00:00.000', { ...panelStyle, fontSize: '46px', fontStyle: '700' })
      .setScrollFactor(0)
      .setDepth(900);

    this.last = scene.add
      .text(28, 100, 'LAST  --:--.---', { ...panelStyle, fontSize: '22px', fontStyle: '700' })
      .setScrollFactor(0)
      .setDepth(900);
    this.best = scene.add
      .text(28, 126, 'BEST  --:--.---', {
        ...panelStyle,
        fontSize: '22px',
        fontStyle: '700',
        color: '#ffd166',
      })
      .setScrollFactor(0)
      .setDepth(900);

    this.lapPanel = scene.add
      .rectangle(scene.scale.width / 2, 12, 150, 48, 0x15314b, 0.78)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(890)
      .setStrokeStyle(2, 0xfff8e7, 0.28);
    this.lap = scene.add
      .text(scene.scale.width / 2, 22, 'LAP 1', {
        ...panelStyle,
        fontSize: '28px',
        fontStyle: '700',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(900);

    this.flash = scene.add
      .text(scene.scale.width / 2, scene.scale.height / 2 - 40, '', {
        fontFamily: FONT,
        fontSize: '60px',
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
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const compact = w < 900;
    this.panel.setSize(compact ? 300 : 318, compact ? 132 : 142);
    this.current.setFontSize(compact ? 40 : 46);
    this.lapPanel.setPosition(w / 2, 12).setSize(compact ? 134 : 150, compact ? 44 : 48);
    this.lap.setPosition(w / 2, compact ? 21 : 22).setFontSize(compact ? 24 : 28);
    this.flash.setPosition(w / 2, h / 2 - 40);
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
