import Phaser from 'phaser';
import { WORLD, TRACK, COLORS, STORAGE_KEY } from '../config.js';
import { getSelectedTrack } from '../tracks.js';
import { buildTrack, distanceToCenterline, surfaceAt } from '../track.js';
import { scatterScenery } from '../scenery.js';
import { buildStructures, structureObstacles } from '../structures.js';
import { eastbourneCoast } from '../coast.js';
import { metres } from '../scale.js';
import { Terrain } from '../terrain.js';
import { Car } from '../entities/Car.js';
import { Hud } from '../ui/Hud.js';
import { createFullscreenButton } from '../ui/fullscreen.js';
import { TouchControls, isTouchDevice } from '../ui/TouchControls.js';
import { createSoundButton } from '../ui/soundButton.js';
import { startMusic, unlockAudio, isMuted } from '../audio/sound.js';
import { EngineSound } from '../audio/EngineSound.js';
import { CAR } from '../config.js';
import { FONT, uiScale, isCompact } from '../ui/format.js';

export class RaceScene extends Phaser.Scene {
  constructor() {
    super('Race');
  }

  create() {
    // Which course are we driving? Everything themed keys off this.
    this.def = getSelectedTrack();
    this.mode = this.def.mode; // 'circuit' (laps) | 'sprint' (one run)

    this.track = buildTrack();
    // Checkpoint capture tolerance. Generous relative to the road width so a
    // wide slide or a cut corner at the faster speeds still registers the gate —
    // checkpoints are spaced far enough apart (~1000px+) that this never trips
    // the next gate early.
    this.captureRadius = TRACK.roadWidth * 1.25;

    // The height field. Flat courses build nothing and answer 0, so they take no
    // extra work and — critically — no extra arithmetic in the physics step.
    this.terrain = new Terrain(this.track, WORLD, this.def);

    // Solid scenery Beryl bumps into: each is a {x, y, r} collision circle.
    //
    // Order matters and is fixed: resolveObstacles() walks this list every frame
    // and resolves contacts in order, so shuffling it moves recorded finish
    // positions. Seawall, then buildings, then the seeded scatter.
    this.obstacles = [];
    if (this.def.theme === 'eastbourne') this.placeSeawall();
    // Buildings are solid. Their footprints come from src/structures.js rather
    // than from the render themes, so what you can see and what you can hit are
    // the same list — render3d/ is a lazily-loaded chunk the simulation must not
    // depend on, which is exactly how the two drift apart.
    this.structures = buildStructures(this.def, this.track);
    for (const o of structureObstacles(this.structures)) this.obstacles.push(o);
    this.scenery = scatterScenery(this.track, this.def);
    for (const o of this.scenery.obstacles) this.obstacles.push(o);

    this.lastSkid = null;

    // Beryl.
    const s = this.track.start;
    this.car = new Car(this, s.x, s.y, s.rotation);
    this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.onResize, this));

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

    // There used to be a second, unzoomed UI camera here. It existed only
    // because the world camera followed Beryl and zoomed, which stranded the
    // HUD's input hit-areas out in world space and made the on-screen buttons
    // untappable. The world now lives on the Three.js canvas, so this scene's
    // display list is nothing but UI and cameras.main never scrolls or zooms —
    // screen space and world space are the same thing again.

    // Audio follows wall-clock AudioContext time, so deterministic harness runs
    // leave it disabled. The normal player path is unchanged.
    const harnessed = !!this.game.registry.get('__harness');
    if (!harnessed) {
      unlockAudio(this);
      startMusic(this);
    }
    this.engine = harnessed ? null : new EngineSound(this.sound, this.def.engine);
    this.events.once('shutdown', () => this.engine && this.engine.stop());
    // Silent audio used to be undiagnosable: EngineSound would find no
    // AudioContext, set ok = false, and every update after that was a no-op with
    // nothing anywhere saying so. Now it says so, and `window.__berylAudio()`
    // reports gear, revs and the context state from the console.
    if (this.engine) {
      if (!this.engine.ok) console.warn(`Beryl engine sound off: ${this.engine.status}`);
      window.__berylAudio = () => ({ ...this.engine.describe(), muted: isMuted(this) });
      // ...and `?audio=debug` puts the same readout on the screen, because a
      // console is not a thing you have on a phone, and every report of silence
      // so far has had to be diagnosed by guessing at which of several things
      // went wrong. Off unless asked for, so it costs the player nothing.
      if (new URLSearchParams(window.location.search).get('audio') === 'debug') {
        this.audioReadout = this.add.text(12, this.scale.height - 26, '', {
          fontFamily: 'monospace', fontSize: '13px', color: '#ffe08a',
          backgroundColor: '#00000099', padding: { x: 6, y: 3 },
        }).setScrollFactor(0).setDepth(1000);
      }
    }

    // Lap state.
    this.lapNumber = 1;
    this.expected = 1;
    this.lapStartTime = 0;
    this.lastCompletionTimeMs = null;
    this.timing = false;
    this.finished = false;
    this.wasOnTrack = true;

    // The 3D view of everything above. It reads car and track state and draws;
    // it never writes back into the simulation.
    //
    // Fetched from the registry rather than imported: BootScene dynamic-imports
    // the module so three.js lands in its own chunk, and a static import here
    // would drag it straight back into the default one.
    const render3d = this.game.registry.get('__render3d');
    this.world3d = render3d.createRaceWorld(this);

    this.input.keyboard.once('keydown-ESC', () => this.scene.start('Title'));
    this.startCountdown();
  }

  onResize() {
    // Keep the camera pull-back sensible if the device rotates or resizes.
    if (this.world3d) this.world3d.setCompact(isCompact(this));
  }

  // --- Collision-only setpieces ----------------------------------------------
  //
  // The visuals for these live in src/render3d/. What stays here is the part the
  // simulation reads: the obstacle circles. Their positions and push order are
  // unchanged from the 2D build, because resolveObstacles() walks this list
  // every frame and the determinism baselines are pinned to it.

  // Eastbourne's seawall, which makes the harbour visible but unreachable.
  //
  // Built by walking the line src/coast.js derives from the road itself, which
  // is also what the theme draws the wall from — so what you see and what you
  // hit are the same wall. It has been wrong twice: first derived from fractions
  // of the world (which landed near the drawn edging by luck, not agreement),
  // then from an authored shoreline that the rescale left hundreds of metres out
  // to sea.
  placeSeawall() {
    // The same walk render3d/themes/eastbourne.js draws the wall from, so what
    // stops the car and what the player sees it stop against are one polyline.
    const { wall } = eastbourneCoast(this.track);
    // Overlapping circles, so there is no gap to slip through. A metre and a
    // half of radius at two metres of spacing: the old wall was 0.55 m circles
    // every 0.86 m, which is four thousand obstacles to build one fence.
    const r = metres(1.5);
    const step = metres(2);
    for (let i = 0; i < wall.length - 1; i += 1) {
      const a = wall[i];
      const b = wall[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const steps = Math.max(1, Math.round(Math.hypot(dx, dz) / step));
      for (let s = 0; s < steps; s += 1) {
        const t = s / steps;
        this.obstacles.push({ x: a.x + dx * t, y: a.z + dz * t, r });
      }
    }
  }


  startCountdown() {
    const w = this.scale.width;
    const h = this.scale.height;
    const s = uiScale(this, 0.7, 1.15);
    const label = this.add
      .text(w / 2, h * 0.42, '3', {
        fontFamily: FONT,
        fontSize: `${Math.round(120 * s)}px`,
        fontStyle: '700',
        color: '#ffd166',
        stroke: '#15314b',
        strokeThickness: Math.round(10 * s),
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1200);

    // A course can say something about itself before the flag drops. Manfeild
    // uses it to explain why a 1959 Morris Minor is about to do 220 km/h, which
    // is a question the player would otherwise reasonably ask.
    //
    // It sits above the count rather than replacing it, and fades with it, so
    // nobody has to read it twice.
    if (this.def.intro) {
      const intro = this.add
        .text(w / 2, h * 0.26, this.def.intro, {
          fontFamily: FONT,
          fontSize: `${Math.round(34 * s)}px`,
          fontStyle: '700',
          color: '#fff8e7',
          stroke: '#15314b',
          strokeThickness: Math.round(8 * s),
          align: 'center',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1200)
        .setScale(0.85);
      this.tweens.add({ targets: intro, scale: 1, duration: 320, ease: 'Back.out' });
      this.tweens.add({
        targets: intro,
        alpha: 0,
        delay: 2400,
        duration: 400,
        onComplete: () => intro.destroy(),
      });
    }

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
    if (this.harnessInput) {
      return {
        steer: this.harnessInput.steer,
        throttle: this.harnessInput.throttle - this.harnessInput.brake,
        handbrake: false,
      };
    }
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
    if (this.harnessRenderOnly) return;
    const dt = Math.min(delta / 1000, 0.05);
    const input = this.readInput();
    // Stashed for the 3D layer, which steers Beryl's front wheels with it. Read
    // only for rendering — this has no effect on the simulation.
    this.lastInput = input;

    const dist = distanceToCenterline(this.car.x, this.car.y, this.track.centerline);
    const onTrack = dist <= this.track.half;
    const surface = surfaceAt(this.car.x, this.car.y, this.track);

    // Slope along Beryl's heading. Flat courses return a hard 0, which the guard
    // in Car.update uses to skip the gravity term entirely.
    const f = this.car.forward;
    const grade = this.terrain.gradeAlong(this.car.x, this.car.y, f.x, f.y);

    this.car.update(dt, input, onTrack, surface, grade);
    this.resolveObstacles();
    this.applyFx(onTrack, input, surface);

    if (this.engine) {
      // Grade goes in as well as speed and throttle. It is computed above for
      // the physics anyway, and it is what lets her sound like she is labouring
      // up the Remutaka climb at a steady speed — see the note in EngineSound.
      const speedRatio = Math.abs(this.car.speed) / CAR.maxSpeed;
      this.engine.update(speedRatio, input.throttle, isMuted(this), grade);
      if (this.audioReadout) {
        const d = this.engine.describe();
        this.audioReadout.setText(
          `${d.status} | ctx ${d.contextState}${d.waitingForGesture ? ' (waiting for a touch)' : ''}`
          + ` | ${d.cylinders}cyl gear ${d.gear} ${d.rpm}rpm${isMuted(this) ? ' | MUTED' : ''}`
        );
        this.audioReadout.setY(this.scale.height - 26);
      }
    }

    if (this.timing) {
      this.hud.setCurrent(time - this.lapStartTime);
      this.checkLap();
    }
  }

  // Push Beryl out of any scenery she's overlapping and kill the velocity that
  // drove her in, so she bumps and slides along trees, tyres and bales instead
  // of driving through them.
  resolveObstacles() {
    const car = this.car;
    const cr = car.collideRadius;
    const f = car.forward;
    const ax = f.x * car.axleOffset;
    const ay = f.y * car.axleOffset;
    const offsets = [
      [ax, ay],
      [-ax, -ay],
    ];
    for (const o of this.obstacles) {
      const min = o.r + cr;
      const min2 = min * min;
      for (const off of offsets) {
        const px = car.x + off[0];
        const py = car.y + off[1];
        const dx = px - o.x;
        const dy = py - o.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min2 || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const nx = dx / d;
        const ny = dy / d;
        car.x += nx * (min - d);
        car.y += ny * (min - d);
        const vn = car.vx * nx + car.vy * ny;
        if (vn < 0) {
          car.vx -= vn * nx;
          car.vy -= vn * ny;
        }
      }
    }
    car.sync();
  }

  applyFx(onTrack, input, surface) {
    const car = this.car;
    const axle = car.rearAxle();
    // Speed gates scale with the course's top speed, so both the slow coastal
    // dash and the fast circuit trigger skids/dust/shake at sensible paces.
    const fxSpeed = CAR.maxSpeed * 0.3;
    const shakeSpeed = CAR.maxSpeed * 0.6;

    // Skid marks when drifting or handbraking on tarmac. This only decides
    // *where* a mark belongs; the 3D layer owns how it is drawn. Note this is a
    // pure data write inside update(), so headless simulation stays draw-free.
    if (onTrack && (car.drifting || (input.handbrake && Math.abs(car.speed) > fxSpeed))) {
      if (this.lastSkid && this.world3d) {
        this.world3d.addSkid(this.lastSkid, axle);
      }
      this.lastSkid = { left: { ...axle.left }, right: { ...axle.right } };
    } else {
      this.lastSkid = null;
    }

    // Smoke on drift; dusty puffs off-track, and kicked up on gravel at pace.
    if (this.world3d) {
      if (car.drifting && onTrack) {
        this.world3d.emitSmoke(axle.center, 2);
      } else if ((!onTrack || surface === 'gravel') && Math.abs(car.speed) > fxSpeed) {
        this.world3d.emitDust(axle.center, 1);
      }
    }

    // Speed now widens the chase camera's FOV and pulls it back, in place of the
    // old top-down zoom-out (see render3d/chaseCamera.js).

    // A little kick when you drop onto the grass. The old 2D shake amplitude was
    // a fraction of the viewport; the 3D equivalent is in world units.
    if (this.wasOnTrack && !onTrack && Math.abs(car.speed) > shakeSpeed && this.world3d) {
      this.world3d.shake(120, 2.4);
    }
    this.wasOnTrack = onTrack;
  }

  checkLap() {
    const cps = this.track.checkpoints;
    const target = cps[this.expected];
    const d = Phaser.Math.Distance.Between(this.car.x, this.car.y, target.x, target.y);
    if (d > this.captureRadius) return;

    if (this.mode === 'circuit') {
      // Closed loop: gate 0 is the start/finish line. Crossing it after all the
      // ordered gates records a lap and starts the next one.
      if (this.expected === 0) {
        this.recordLap();
        this.expected = 1;
      } else {
        this.expected = (this.expected + 1) % cps.length;
      }
    } else {
      // Open route: reaching the final gate ends the run.
      if (this.expected === cps.length - 1) this.finishSprint();
      else this.expected += 1;
    }
  }

  // Circuit: record a completed lap and keep racing (no results overlay).
  recordLap() {
    const now = this.time.now;
    const lapMs = now - this.lapStartTime;
    this.lastCompletionTimeMs = lapMs;
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

  // Sprint: crossing the finish ends the run and shows the results overlay.
  finishSprint() {
    if (this.finished) return;
    this.finished = true;
    this.timing = false;
    const now = this.time.now;
    const lapMs = now - this.lapStartTime;
    this.lastCompletionTimeMs = lapMs;
    this.lapStartTime = now;
    this.hud.setLast(lapMs);

    if (!this.best || lapMs < this.best) {
      this.best = lapMs;
      localStorage.setItem(STORAGE_KEY, String(Math.floor(lapMs)));
      this.hud.setBest(lapMs);
      this.hud.showMessage('NEW BEST TIME!', '#ffd166');
      this.cameras.main.flash(240, 255, 209, 102);
    } else {
      this.hud.showMessage('RUN COMPLETE', '#fff8e7');
    }

    this.time.delayedCall(700, () => this.showResults(lapMs));
  }

  showResults(timeMs) {
    const w = this.scale.width;
    const h = this.scale.height;
    const copy = this.def.results || {
      title: 'RUN COMPLETE!',
      message: 'Nicely done.',
      retryLabel: '↻  RACE AGAIN',
    };
    const panel = this.add.container(w / 2, h / 2).setDepth(1400);
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.ink, 0.96);
    bg.lineStyle(5, COLORS.sunshine, 1);
    bg.fillRoundedRect(-310, -200, 620, 400, 30);
    bg.strokeRoundedRect(-310, -200, 620, 400, 30);
    const title = this.add.text(0, -135, copy.title, {
      fontFamily: FONT, fontSize: '48px', fontStyle: '700', color: '#ffd166',
    }).setOrigin(0.5);
    const message = this.add.text(0, -68, copy.message, {
      fontFamily: FONT, fontSize: '25px', color: '#fff8e7', align: 'center',
    }).setOrigin(0.5);
    const time = this.add.text(0, -8, this.hud.current.text, {
      fontFamily: FONT, fontSize: '42px', fontStyle: '700', color: '#2ec4d6',
    }).setOrigin(0.5);
    const retry = this.add.text(0, 80, copy.retryLabel, {
      fontFamily: FONT, fontSize: '30px', fontStyle: '700', color: '#15314b',
      backgroundColor: '#ffd166', padding: { x: 28, y: 14 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    retry.on('pointerup', () => this.scene.restart());
    const change = this.add.text(0, 152, 'CHANGE COURSE', {
      fontFamily: FONT, fontSize: '22px', fontStyle: '700', color: '#fff8e7',
      backgroundColor: '#15314bcc', padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    change.on('pointerup', () => this.scene.start('Title'));
    panel.add([bg, title, message, time, retry, change]);
    void timeMs;
  }
}
