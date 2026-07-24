// Race HUD: current / last / best lap, lap counter, and a "New best!" flash.
import { formatTime, FONT } from './format.js';

export class Hud {
  constructor(scene) {
    this.scene = scene;

    const panelStyle = {
      fontFamily: FONT,
      color: '#fff8e7',
    };

    this.currentLabel = scene.add
      .text(20, 16, 'LAP TIME', { ...panelStyle, fontSize: '16px', fontStyle: '600' })
      .setScrollFactor(0)
      .setDepth(900);
    this.current = scene.add
      .text(20, 34, '00:00.000', { ...panelStyle, fontSize: '40px', fontStyle: '700' })
      .setScrollFactor(0)
      .setDepth(900);

    this.last = scene.add
      .text(20, 86, 'Last  --:--.---', { ...panelStyle, fontSize: '20px', fontStyle: '600' })
      .setScrollFactor(0)
      .setDepth(900);
    this.best = scene.add
      .text(20, 112, 'Best  --:--.---', {
        ...panelStyle,
        fontSize: '20px',
        fontStyle: '700',
        color: '#ffd166',
      })
      .setScrollFactor(0)
      .setDepth(900);

    this.lap = scene.add
      .text(scene.scale.width / 2, 16, 'LAP 1', {
        ...panelStyle,
        fontSize: '22px',
        fontStyle: '700',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(900);

    this.flash = scene.add
      .text(scene.scale.width / 2, scene.scale.height / 2 - 40, '', {
        fontFamily: FONT,
        fontSize: '56px',
        fontStyle: '700',
        color: '#ffd166',
        stroke: '#15314b',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(950)
      .setAlpha(0);

    scene.scale.on('resize', this.reposition, this);
    scene.events.once('shutdown', () => scene.scale.off('resize', this.reposition, this));
  }

  reposition() {
    this.lap.setPosition(this.scene.scale.width / 2, 16);
    this.flash.setPosition(this.scene.scale.width / 2, this.scene.scale.height / 2 - 40);
  }

  setCurrent(ms) {
    this.current.setText(formatTime(ms));
  }

  setLast(ms) {
    this.last.setText(`Last  ${formatTime(ms)}`);
  }

  setBest(ms) {
    this.best.setText(`Best  ${formatTime(ms)}`);
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
