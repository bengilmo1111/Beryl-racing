// Race HUD: current / last / best time, a lap count or route progress, and a
// "New best!" flash. Labels come from the active course (scene.def.hud). The
// whole HUD sits in an inverse-zoom layer so its screen-edge positions are
// unaffected by the following race camera.
//
// The top of the screen used to carry a permanent banner naming where you were
// driving to — TO THE SUMMIT, TO THE RSA. It was the first thing your eye hit
// every frame and it said the same thing every frame, which is the definition
// of clutter: you chose the course thirty seconds ago. What sits there now is
// the status line, which is empty until the game has something to tell you —
// off road, missed checkpoint, ease off for the bend — so text at the top of
// the screen always means something has changed. The standing facts it used to
// carry (which lap, how far along) moved into the timing panel, where they read
// alongside the clock they belong to.
import { formatTime, FONT, uiScale, isCompact, pinUiLayer } from './format.js';
import { COLORS } from '../config.js';

export class Hud {
  constructor(scene) {
    this.scene = scene;
    const panelStyle = { fontFamily: FONT, color: '#fff8e7' };
    this.hudCopy = (scene.def && scene.def.hud) || {};
    // Route progress, 0..1, or null on a course that does not measure it.
    this.progress = null;

    this.layer = scene.add.container(0, 0).setScrollFactor(0).setDepth(889);
    this.bg = scene.add.graphics();

    this.currentLabel = scene.add.text(0, 0, this.hudCopy.current || 'LAP TIME', {
      ...panelStyle,
      fontStyle: '700',
    });
    // Which lap, on a circuit. Sits alongside the panel's own label rather than
    // out in the middle of the screen, because it is a fact about the clock.
    this.lapChip = scene.add
      .text(0, 0, this.hudCopy.lapWord ? `${this.hudCopy.lapWord} 1` : '', {
        ...panelStyle,
        fontStyle: '700',
        color: '#ffd166',
      })
      .setVisible(!!this.hudCopy.lapWord);
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
    // Transient guidance, centred at the top. No panel behind it: a fixed-width
    // rounded rect cannot hold copy that runs from "EASE OFF · LEFT BEND" to
    // nothing at all. A chunky ink outline keeps it readable over sky, tarmac or
    // grass at any length — the same treatment the roadside arrows use.
    this.status = scene.add
      .text(0, 0, '', {
        ...panelStyle,
        fontStyle: '700',
        stroke: '#15314b',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setAlpha(0);

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
      this.lapChip,
      this.current,
      this.last,
      this.best,
      this.status,
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
    const statusSize = Math.round(24 * s);

    this.currentLabel.setFontSize(labelSize);
    this.lapChip.setFontSize(labelSize);
    this.current.setFontSize(bigSize);
    this.last.setFontSize(rowSize);
    this.best.setFontSize(rowSize);
    this.status.setFontSize(statusSize).setStroke('#15314b', Math.max(4, Math.round(8 * s)));
    this.flash.setFontSize(Math.round(64 * s)).setStroke('#15314b', Math.round(9 * s));

    const inX = Math.round(14 * s);
    const inY = Math.round(12 * s);
    const px = Math.round(16 * s);
    const py = Math.round(12 * s);
    this.currentLabel.setPosition(inX + px, inY + py);
    this.lapChip.setPosition(
      inX + px + this.currentLabel.width + Math.round(12 * s),
      inY + py
    );
    this.current.setPosition(inX + px, inY + py + labelSize + Math.round(6 * s));
    const rowsY = inY + py + labelSize + bigSize + Math.round(16 * s);
    this.last.setPosition(inX + px, rowsY);
    this.best.setPosition(inX + px, rowsY + rowSize + Math.round(6 * s));

    const headerW = this.currentLabel.width
      + (this.lapChip.visible ? Math.round(12 * s) + this.lapChip.width : 0);
    const panelW = Math.max(headerW, this.current.width, this.last.width, this.best.width) + px * 2;
    const panelH = rowsY + rowSize * 2 + Math.round(6 * s) + py - inY;
    this.panel = { x: inX, y: inY, w: panelW, h: panelH, px, py, s };

    this.drawPanel();

    // Centred at the top, on the optical line the old destination banner had.
    this.status.setPosition(w / 2, inY + py + statusSize / 2);
    this.flash.setPosition(w / 2, h * 0.4);
    this.pin();
  }

  drawPanel() {
    if (!this.panel) return;
    const { x, y, w, h, px, s } = this.panel;
    const radius = Math.round(16 * s);
    const barH = Math.round(7 * s);
    const hasBar = this.progress != null;
    const height = hasBar ? h + barH + Math.round(8 * s) : h;

    this.bg.clear();
    this.bg.fillStyle(COLORS.ink, 0.82);
    this.bg.lineStyle(Math.max(2, Math.round(2 * s)), 0xfff8e7, 0.3);
    this.bg.fillRoundedRect(x, y, w, height, radius);
    this.bg.strokeRoundedRect(x, y, w, height, radius);

    if (!hasBar) return;
    // How far along the route, for courses that know: a slim rail across the
    // foot of the panel. It replaces the percentage that used to be appended to
    // the destination banner, and unlike a number it can be read at a glance
    // without taking your eyes off the road.
    const barX = x + px;
    const barY = y + height - Math.round(10 * s) - barH;
    const barW = w - px * 2;
    const r = barH / 2;
    this.bg.fillStyle(0xfff8e7, 0.22);
    this.bg.fillRoundedRect(barX, barY, barW, barH, r);
    const filled = Math.max(barH, barW * Math.min(1, Math.max(0, this.progress)));
    this.bg.fillStyle(COLORS.sunshine, 1);
    this.bg.fillRoundedRect(barX, barY, filled, barH, r);
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
    if (!this.lapChip.visible) return;
    this.lapChip.setText(`${this.hudCopy.lapWord || 'LAP'} ${n}`);
    this.reposition();
  }

  // Route progress, 0..1. Redrawn only when it has visibly moved: this is
  // called several times a second and the panel is a Graphics rebuild.
  setProgress(fraction) {
    if (fraction == null) return;
    const next = Math.min(1, Math.max(0, fraction));
    if (this.progress != null && Math.abs(next - this.progress) < 0.002) return;
    this.progress = next;
    this.drawPanel();
  }

  // The top-centre line. Empty text clears it; anything else appears at once.
  // Deliberately not faded: this line carries warnings, several of which are
  // set and cleared a few times a second as the car wanders over the edge of
  // the road, and a warning that is still fading up when it is replaced is a
  // warning nobody reads.
  setStatus(text = '') {
    if (text === this.statusText) return;
    this.statusText = text;
    this.status.setText(text).setAlpha(text ? 1 : 0);
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

  clearMessage() {
    // Results panels intentionally retain a little transparency so the finish
    // location remains visible. Stop the celebration tween before clearing it,
    // otherwise its next tick can restore the giant message behind the panel.
    this.scene.tweens.killTweensOf(this.flash);
    this.flash.setText('').setAlpha(0);
  }
}
