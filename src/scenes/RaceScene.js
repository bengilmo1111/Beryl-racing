import Phaser from 'phaser';
import { WORLD, TRACK, COLORS, STORAGE_KEY } from '../config.js';
import { buildTrack, distanceToCenterline } from '../track.js';
import { Car } from '../entities/Car.js';
import { Hud } from '../ui/Hud.js';
import { createFullscreenButton } from '../ui/fullscreen.js';
import { TouchControls, isTouchDevice } from '../ui/TouchControls.js';
import { FONT } from '../ui/format.js';

export class RaceScene extends Phaser.Scene {
  constructor() {
    super('Race');
  }

  create() {
    this.track = buildTrack();
    this.captureRadius = TRACK.roadWidth * 0.9;

    // World + grass backdrop.
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.physics && this.physics.world && this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this.add.tileSprite(0, 0, WORLD.width, WORLD.height, 'grass').setOrigin(0);

    this.drawTrack();

    // Beryl.
    const s = this.track.start;
    this.car = new Car(this, s.x, s.y, s.rotation);
    this.cameras.main.startFollow(this.car.sprite, true, 0.12, 0.12);
    this.cameras.main.setZoom(0.95);

    // Input.
    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });
    this.touch = isTouchDevice() ? new TouchControls(this) : null;

    // HUD + fullscreen.
    this.hud = new Hud(this);
    createFullscreenButton(this);
    this.best = Number(localStorage.getItem(STORAGE_KEY)) || null;
    if (this.best) this.hud.setBest(this.best);

    // Lap state.
    this.lapNumber = 1;
    this.expected = 1; // next checkpoint index required
    this.lapStartTime = 0;
    this.timing = false;

    // ESC / back to title.
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('Title'));

    this.startCountdown();
  }

  drawTrack() {
    const g = this.add.graphics();
    const { left, right, centerline } = this.track;

    // Tarmac fill: left edge forward, right edge back.
    const poly = [];
    for (const p of left) poly.push(p.x, p.y);
    for (let i = right.length - 1; i >= 0; i--) poly.push(right[i].x, right[i].y);
    g.fillStyle(COLORS.tarmac, 1);
    g.fillPoints(this.toPoints(poly), true);

    // Kerb edges.
    g.lineStyle(6, COLORS.cream, 0.9);
    g.strokePoints(this.closed(left), true);
    g.strokePoints(this.closed(right), true);

    // Dashed centre line.
    g.lineStyle(4, COLORS.sunshine, 0.5);
    for (let i = 0; i < centerline.length; i += 6) {
      const a = centerline[i];
      const b = centerline[(i + 3) % centerline.length];
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.strokePath();
    }
    g.setDepth(1);

    this.drawStartLine();
    this.drawCheckpointGates();
  }

  toPoints(flat) {
    const pts = [];
    for (let i = 0; i < flat.length; i += 2) pts.push(new Phaser.Geom.Point(flat[i], flat[i + 1]));
    return pts;
  }

  closed(arr) {
    const pts = arr.map((p) => new Phaser.Geom.Point(p.x, p.y));
    pts.push(new Phaser.Geom.Point(arr[0].x, arr[0].y));
    return pts;
  }

  drawStartLine() {
    const cp = this.track.checkpoints[0];
    const half = this.track.half;
    // Perpendicular (across the road) unit vector.
    const nx = Math.cos(cp.angle + Math.PI / 2);
    const ny = Math.sin(cp.angle + Math.PI / 2);
    // Along-track unit vector.
    const ax = Math.cos(cp.angle);
    const ay = Math.sin(cp.angle);

    const g = this.add.graphics().setDepth(2);
    const cols = 8; // squares across
    const rows = 3; // squares along track
    const cw = (half * 2) / cols;
    const cl = 14; // square length along track
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const black = (r + c) % 2 === 0;
        g.fillStyle(black ? 0x1b1b1b : 0xffffff, 1);
        const baseX = cp.x - nx * half + nx * cw * c + ax * cl * (r - rows / 2);
        const baseY = cp.y - ny * half + ny * cw * c + ay * cl * (r - rows / 2);
        g.fillPoints(
          [
            new Phaser.Geom.Point(baseX, baseY),
            new Phaser.Geom.Point(baseX + nx * cw, baseY + ny * cw),
            new Phaser.Geom.Point(baseX + nx * cw + ax * cl, baseY + ny * cw + ay * cl),
            new Phaser.Geom.Point(baseX + ax * cl, baseY + ay * cl),
          ],
          true
        );
      }
    }
  }

  drawCheckpointGates() {
    const g = this.add.graphics().setDepth(2);
    const half = this.track.half;
    for (let i = 1; i < this.track.checkpoints.length; i++) {
      const cp = this.track.checkpoints[i];
      const nx = Math.cos(cp.angle + Math.PI / 2);
      const ny = Math.sin(cp.angle + Math.PI / 2);
      // Faint gate line + posts.
      g.lineStyle(4, COLORS.sky, 0.35);
      g.beginPath();
      g.moveTo(cp.x - nx * half, cp.y - ny * half);
      g.lineTo(cp.x + nx * half, cp.y + ny * half);
      g.strokePath();
      g.fillStyle(COLORS.sky, 0.8);
      g.fillCircle(cp.x - nx * half, cp.y - ny * half, 7);
      g.fillCircle(cp.x + nx * half, cp.y + ny * half, 7);
    }
  }

  startCountdown() {
    const w = this.scale.width;
    const h = this.scale.height;
    const label = this.add
      .text(w / 2, h / 2 - 30, '3', {
        fontFamily: FONT,
        fontSize: '120px',
        fontStyle: '700',
        color: '#ffd166',
        stroke: '#15314b',
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1200);

    const steps = ['3', '2', '1', 'GO!'];
    let i = 0;
    const tick = () => {
      label.setText(steps[i]).setScale(0.6);
      this.tweens.add({ targets: label, scale: 1, duration: 220, ease: 'Back.out' });
      if (steps[i] === 'GO!') {
        label.setColor('#2ec4d6');
        this.timing = true;
        this.lapStartTime = this.time.now;
        this.tweens.add({ targets: label, alpha: 0, delay: 500, duration: 300, onComplete: () => label.destroy() });
        return;
      }
      i++;
      this.time.delayedCall(800, tick);
    };
    tick();
  }

  readInput() {
    if (!this.timing) return { steer: 0, throttle: 0, handbrake: false };
    const k = this.keys;
    let steer = 0;
    if (k.left.isDown || k.a.isDown) steer -= 1;
    if (k.right.isDown || k.d.isDown) steer += 1;
    let throttle = 0;
    if (k.up.isDown || k.w.isDown) throttle = 1;
    else if (k.down.isDown || k.s.isDown) throttle = -1;
    let handbrake = k.space.isDown;

    if (this.touch) {
      const t = this.touch.getInput();
      steer = Phaser.Math.Clamp(steer + t.steer, -1, 1);
      if (throttle === 0) throttle = t.throttle;
      handbrake = handbrake || t.handbrake;
    }
    return { steer, throttle, handbrake };
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    const input = this.readInput();

    // On-track test.
    const dist = distanceToCenterline(this.car.x, this.car.y, this.track.centerline);
    const onTrack = dist <= this.track.half;

    this.car.update(dt, input, onTrack);

    if (this.timing) {
      this.hud.setCurrent(time - this.lapStartTime);
      this.checkLap();
    }
  }

  checkLap() {
    const cps = this.track.checkpoints;
    const target = cps[this.expected];
    const d = Phaser.Math.Distance.Between(this.car.x, this.car.y, target.x, target.y);
    if (d > this.captureRadius) return;

    if (this.expected === 0) {
      // Crossed the start/finish gate after all checkpoints -> lap done.
      this.completeLap();
      this.expected = 1;
    } else {
      this.expected = (this.expected + 1) % cps.length;
    }
  }

  completeLap() {
    const now = this.time.now;
    const lapMs = now - this.lapStartTime;
    this.lapStartTime = now;
    this.hud.setLast(lapMs);

    if (!this.best || lapMs < this.best) {
      this.best = lapMs;
      localStorage.setItem(STORAGE_KEY, String(Math.floor(lapMs)));
      this.hud.setBest(lapMs);
      this.hud.showMessage('NEW BEST LAP!', '#ffd166');
    } else {
      this.hud.showMessage('LAP COMPLETE', '#fff8e7');
    }

    this.lapNumber += 1;
    this.hud.setLap(this.lapNumber);
  }
}
