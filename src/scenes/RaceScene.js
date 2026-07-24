import Phaser from 'phaser';
import { WORLD, TRACK, COLORS, STORAGE_KEY } from '../config.js';
import { buildTrack, distanceToCenterline } from '../track.js';
import { Car } from '../entities/Car.js';
import { Hud } from '../ui/Hud.js';
import { createFullscreenButton } from '../ui/fullscreen.js';
import { TouchControls, isTouchDevice } from '../ui/TouchControls.js';
import { createSoundButton } from '../ui/soundButton.js';
import { startMusic, unlockAudio, isMuted } from '../audio/sound.js';
import { EngineSound } from '../audio/EngineSound.js';
import { CAR } from '../config.js';
import { FONT } from '../ui/format.js';

export class RaceScene extends Phaser.Scene {
  constructor() {
    super('Race');
  }

  create() {
    this.track = buildTrack();
    this.captureRadius = TRACK.roadWidth * 0.85;

    // World + grass backdrop.
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.add.tileSprite(0, 0, WORLD.width, WORLD.height, 'grass').setOrigin(0).setDepth(0);

    this.scatterTrees();
    this.drawTrack();

    // Persistent skid-mark layer (above tarmac, below car).
    this.skidRT = this.add.renderTexture(0, 0, WORLD.width, WORLD.height).setOrigin(0).setDepth(3);

    // Drift smoke (white) and off-track dust (tan) — separate emitters so we
    // never have to retint at runtime.
    const puffCfg = {
      lifespan: 420,
      speed: { min: 8, max: 46 },
      scale: { start: 0.5, end: 1.1 },
      alpha: { start: 0.45, end: 0 },
      frequency: -1,
    };
    this.smoke = this.add.particles(0, 0, 'puff', puffCfg).setDepth(9);
    this.dust = this.add.particles(0, 0, 'puff', { ...puffCfg, tint: 0xcaa46a }).setDepth(9);

    // Beryl.
    const s = this.track.start;
    this.car = new Car(this, s.x, s.y, s.rotation);
    this.cameras.main.startFollow(this.car.sprite, true, 0.16, 0.16);
    this.baseZoom = 0.82;
    this.cameras.main.setZoom(this.baseZoom);

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

    // HUD + fullscreen + sound.
    this.hud = new Hud(this);
    createFullscreenButton(this);
    createSoundButton(this);
    this.best = Number(localStorage.getItem(STORAGE_KEY)) || null;
    if (this.best) this.hud.setBest(this.best);

    // Audio: make sure music is running, and start Beryl's engine idling.
    unlockAudio(this);
    startMusic(this);
    this.engine = new EngineSound(this.sound);
    this.events.once('shutdown', () => this.engine && this.engine.stop());

    // Lap state.
    this.lapNumber = 1;
    this.expected = 1;
    this.lapStartTime = 0;
    this.timing = false;
    this.wasOnTrack = true;

    this.input.keyboard.once('keydown-ESC', () => this.scene.start('Title'));
    this.startCountdown();
  }

  // --- Track rendering -------------------------------------------------------

  drawTrack() {
    const { left, right } = this.track;

    // Darker "run-off" apron just outside the kerbs for depth.
    const apron = this.add.graphics().setDepth(0.5);
    apron.fillStyle(0x3f8f4a, 1);
    apron.fillPoints(this.offsetLoop(left, 26), true);
    apron.fillStyle(COLORS.deepHill, 1);
    apron.fillPoints(this.offsetLoop(right, -26), true);

    // Tarmac: a tiled asphalt texture, masked to the road shape.
    const poly = [];
    for (const p of left) poly.push(p.x, p.y);
    for (let i = right.length - 1; i >= 0; i--) poly.push(right[i].x, right[i].y);
    const maskShape = this.make.graphics({ x: 0, y: 0, add: false });
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillPoints(this.toPoints(poly), true);
    const tarmac = this.add
      .tileSprite(0, 0, WORLD.width, WORLD.height, 'tarmac')
      .setOrigin(0)
      .setDepth(1);
    tarmac.setMask(maskShape.createGeometryMask());

    // Red/white rumble-strip kerbs on both edges.
    this.drawKerb(left);
    this.drawKerb(right);

    this.placeTyreBarriers();
    this.placeHayBales();
    this.drawCheckpointGates();
    this.placeStartGantry();
  }

  placeHayBales() {
    let placed = 0;
    let tries = 0;
    const half = this.track.half;
    while (placed < 11 && tries < 400) {
      tries++;
      const x = Phaser.Math.Between(120, WORLD.width - 120);
      const y = Phaser.Math.Between(120, WORLD.height - 120);
      const d = distanceToCenterline(x, y, this.track.centerline);
      // Just off the track, in the near grass band beyond the tyre barriers.
      if (d < half + 60 || d > half + 150) continue;
      this.add
        .image(x, y, 'hay-bale')
        .setDepth(6)
        .setScale(Phaser.Math.FloatBetween(0.7, 1.0))
        .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
      placed++;
    }
  }

  placeTyreBarriers() {
    const cl = this.track.centerline;
    const n = cl.length;
    let cx = 0;
    let cy = 0;
    for (const p of cl) {
      cx += p.x;
      cy += p.y;
    }
    cx /= n;
    cy /= n;
    const off = this.track.half + 30;
    for (let i = 0; i < n; i += 20) {
      const a = cl[(i - 1 + n) % n];
      const b = cl[(i + 1) % n];
      let tx = b.x - a.x;
      let ty = b.y - a.y;
      const L = Math.hypot(tx, ty) || 1;
      tx /= L;
      ty /= L;
      let nx = -ty;
      let ny = tx;
      // Point the normal outward (away from the track centre).
      if (nx * (cl[i].x - cx) + ny * (cl[i].y - cy) < 0) {
        nx = -nx;
        ny = -ny;
      }
      this.add
        .image(cl[i].x + nx * off, cl[i].y + ny * off, 'tyre-barrier')
        .setDepth(6)
        .setScale(0.85)
        .setRotation(Math.atan2(ty, tx));
    }
  }

  placeStartGantry() {
    const cp = this.track.checkpoints[0];
    // Depth 4: on the road surface (above tarmac/kerbs) but below the car, so
    // Beryl is always visible crossing the line.
    const gantry = this.add.image(cp.x, cp.y, 'start-gantry').setDepth(4);
    gantry.setRotation(cp.angle + Math.PI / 2);
    const span = this.track.half * 2 + 170; // road width + posts either side
    gantry.setScale(span / gantry.width);
  }

  drawKerb(edge) {
    const g = this.add.graphics().setDepth(2);
    const n = edge.length;
    for (let i = 0; i < n; i++) {
      const a = edge[i];
      const b = edge[(i + 1) % n];
      const red = Math.floor(i / 3) % 2 === 0;
      g.lineStyle(15, red ? COLORS.red : 0xffffff, 1);
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.strokePath();
    }
  }

  offsetLoop(edge, amount) {
    // Build a filled band `amount` px outside `edge` (sign chooses side).
    const n = edge.length;
    const outer = [];
    for (let i = 0; i < n; i++) {
      const prev = edge[(i - 1 + n) % n];
      const next = edge[(i + 1) % n];
      let tx = next.x - prev.x;
      let ty = next.y - prev.y;
      const len = Math.hypot(tx, ty) || 1;
      tx /= len;
      ty /= len;
      outer.push({ x: edge[i].x - ty * amount, y: edge[i].y + tx * amount });
    }
    const pts = [];
    for (const p of edge) pts.push(new Phaser.Geom.Point(p.x, p.y));
    for (let i = outer.length - 1; i >= 0; i--) pts.push(new Phaser.Geom.Point(outer[i].x, outer[i].y));
    return pts;
  }

  scatterTrees() {
    const variants = ['tree-1', 'tree-2', 'tree-3'];
    const layer = this.add.container(0, 0).setDepth(5);
    let placed = 0;
    let tries = 0;
    while (placed < 46 && tries < 600) {
      tries++;
      const x = Phaser.Math.Between(120, WORLD.width - 120);
      const y = Phaser.Math.Between(120, WORLD.height - 120);
      const d = distanceToCenterline(x, y, this.track.centerline);
      if (d < TRACK.roadWidth / 2 + 90) continue; // keep clear of the track
      const key = Phaser.Utils.Array.GetRandom(variants);
      const t = this.add.image(x, y, key).setScale(Phaser.Math.FloatBetween(0.7, 1.4));
      layer.add(t);
      placed++;
    }
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
    const nx = Math.cos(cp.angle + Math.PI / 2);
    const ny = Math.sin(cp.angle + Math.PI / 2);
    const ax = Math.cos(cp.angle);
    const ay = Math.sin(cp.angle);

    const g = this.add.graphics().setDepth(2.5);
    const cols = 10;
    const rows = 4;
    const cw = (half * 2) / cols;
    const cl = 16;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const black = (r + c) % 2 === 0;
        g.fillStyle(black ? 0x1b1b1b : 0xffffff, 1);
        const bx = cp.x - nx * half + nx * cw * c + ax * cl * (r - rows / 2);
        const by = cp.y - ny * half + ny * cw * c + ay * cl * (r - rows / 2);
        g.fillPoints(
          [
            new Phaser.Geom.Point(bx, by),
            new Phaser.Geom.Point(bx + nx * cw, by + ny * cw),
            new Phaser.Geom.Point(bx + nx * cw + ax * cl, by + ny * cw + ay * cl),
            new Phaser.Geom.Point(bx + ax * cl, by + ay * cl),
          ],
          true
        );
      }
    }
  }

  drawCheckpointGates() {
    const g = this.add.graphics().setDepth(2.4);
    const half = this.track.half;
    for (let i = 1; i < this.track.checkpoints.length; i++) {
      const cp = this.track.checkpoints[i];
      const nx = Math.cos(cp.angle + Math.PI / 2);
      const ny = Math.sin(cp.angle + Math.PI / 2);
      g.fillStyle(COLORS.sunshine, 0.9);
      g.fillCircle(cp.x - nx * half, cp.y - ny * half, 10);
      g.fillCircle(cp.x + nx * half, cp.y + ny * half, 10);
    }
  }

  // --- Flow ------------------------------------------------------------------

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
      this.tweens.add({ targets: label, scale: 1, duration: 200, ease: 'Back.out' });
      if (steps[i] === 'GO!') {
        label.setColor('#2ec4d6');
        this.timing = true;
        this.lapStartTime = this.time.now;
        this.tweens.add({ targets: label, alpha: 0, delay: 450, duration: 300, onComplete: () => label.destroy() });
        return;
      }
      i++;
      this.time.delayedCall(650, tick);
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

    const dist = distanceToCenterline(this.car.x, this.car.y, this.track.centerline);
    const onTrack = dist <= this.track.half;

    this.car.update(dt, input, onTrack);
    this.applyFx(onTrack, input);

    if (this.engine) {
      const speedRatio = Math.abs(this.car.speed) / CAR.maxSpeed;
      this.engine.update(speedRatio, input.throttle, isMuted(this));
    }

    if (this.timing) {
      this.hud.setCurrent(time - this.lapStartTime);
      this.checkLap();
    }
  }

  applyFx(onTrack, input) {
    const car = this.car;
    const axle = car.rearAxle();

    // Skid marks when drifting or handbraking on tarmac.
    if (onTrack && (car.drifting || (input.handbrake && Math.abs(car.speed) > 120))) {
      this.skidRT.draw('skid', axle.left.x, axle.left.y);
      this.skidRT.draw('skid', axle.right.x, axle.right.y);
    }

    // Smoke on drift, dusty puffs off-track.
    if (car.drifting && onTrack) {
      this.smoke.emitParticleAt(axle.center.x, axle.center.y, 2);
    } else if (!onTrack && Math.abs(car.speed) > 120) {
      this.dust.emitParticleAt(axle.center.x, axle.center.y, 1);
    }

    // Dynamic zoom: pull back with speed for a sense of pace.
    const speedRatio = Phaser.Math.Clamp(Math.abs(car.speed) / 940, 0, 1);
    const targetZoom = this.baseZoom - 0.12 * speedRatio;
    const cam = this.cameras.main;
    cam.setZoom(Phaser.Math.Linear(cam.zoom, targetZoom, 0.05));

    // A little kick when you drop onto the grass.
    if (this.wasOnTrack && !onTrack && Math.abs(car.speed) > 200) {
      cam.shake(120, 0.006);
    }
    this.wasOnTrack = onTrack;
  }

  checkLap() {
    const cps = this.track.checkpoints;
    const target = cps[this.expected];
    const d = Phaser.Math.Distance.Between(this.car.x, this.car.y, target.x, target.y);
    if (d > this.captureRadius) return;

    if (this.expected === 0) {
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
      this.cameras.main.flash(240, 255, 209, 102);
    } else {
      this.hud.showMessage('LAP COMPLETE', '#fff8e7');
    }

    this.lapNumber += 1;
    this.hud.setLap(this.lapNumber);
  }
}
