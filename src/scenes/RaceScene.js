import Phaser from 'phaser';
import { WORLD, TRACK, COLORS, STORAGE_KEY } from '../config.js';
import { getSelectedTrack } from '../tracks.js';
import { buildTrack, distanceToCenterline, surfaceAt } from '../track.js';
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
    this.captureRadius = TRACK.roadWidth * 0.85;

    // Solid scenery Beryl bumps into: each is a {x, y, r} collision circle.
    this.obstacles = [];

    // World + grass backdrop.
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    const ground = this.add.graphics().setDepth(0);
    ground.fillStyle(COLORS.hill, 1);
    ground.fillRect(0, 0, WORLD.width, WORLD.height);

    // Theme scenery drawn beneath the road.
    if (this.def.theme === 'eastbourne') this.drawEastbourneSetting();
    if (this.def.theme === 'otaki') this.drawOtakiSetting();

    this.scatterTrees();
    this.drawTrack();

    // Persistent vector skid layer. A world-sized RenderTexture would exceed
    // common mobile GPU texture limits on this long point-to-point course.
    this.skidMarks = this.add.graphics().setDepth(3);
    this.lastSkid = null;

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
    // Pull the camera back a little on small screens so there's enough track
    // visible ahead to actually race on a phone.
    this.baseZoom = isCompact(this) ? 0.64 : 0.82;
    this.cameras.main.setZoom(this.baseZoom);
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
    const fsBtn = createFullscreenButton(this);
    const sndBtn = createSoundButton(this);
    this.best = Number(localStorage.getItem(STORAGE_KEY)) || null;
    if (this.best) this.hud.setBest(this.best);

    // Render the UI through a dedicated camera that never scrolls or zooms. The
    // world camera follows Beryl and zooms, and a scrollFactor(0) HUD rendered
    // by that camera ends up with its input hit-areas stranded in world space
    // (they don't track the zoom), which made the on-screen buttons untappable.
    // A separate, unzoomed UI camera keeps the HUD in plain screen space for
    // both rendering AND input.
    this.uiObjects = [this.hud.layer, fsBtn, sndBtn];
    if (this.touch) this.uiObjects.push(this.touch.layer);
    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.cameras.main.ignore(this.uiObjects);
    this.uiCamera.ignore(this.children.list.filter((o) => !this.uiObjects.includes(o)));

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
    this.finished = false;
    this.wasOnTrack = true;

    this.input.keyboard.once('keydown-ESC', () => this.scene.start('Title'));
    this.startCountdown();
  }

  onResize() {
    // Keep the pull-back sensible if the device rotates or the window resizes.
    this.baseZoom = isCompact(this) ? 0.64 : 0.82;
    if (this.uiCamera) this.uiCamera.setSize(this.scale.width, this.scale.height);
  }

  // --- Track rendering -------------------------------------------------------

  drawTrack() {
    const { left, right } = this.track;

    // Darker run-off apron just outside the kerbs for depth. Drawn as strokes
    // instead of filled offset polygons so no self-intersecting fill can cut a
    // green stripe through the masked tarmac on tight curves.
    const apron = this.add.graphics().setDepth(0.5);
    apron.lineStyle(54, COLORS.deepHill, 0.95);
    apron.strokePoints(left, false);
    apron.strokePoints(right, false);

    // Draw the road as flat per-segment quads. The previous world-sized tiled
    // texture plus geometry mask made this long route run at single-digit FPS
    // on integrated/mobile GPUs. The low-contrast base is both clearer and far
    // cheaper; small surface detail can be added later as camera-local decals.
    const quads = [];
    const n = left.length;
    for (let i = 0; i < n - 1; i++) {
      const j = i + 1;
      quads.push([
        new Phaser.Geom.Point(left[i].x, left[i].y),
        new Phaser.Geom.Point(left[j].x, left[j].y),
        new Phaser.Geom.Point(right[j].x, right[j].y),
        new Phaser.Geom.Point(right[i].x, right[i].y),
      ]);
    }

    // Road fill. With per-segment surfaces (Ōtaki) each quad is tinted by its
    // surface — gravel warm grey-brown, sealed the usual tarmac — so the
    // gravel↔seal transition reads at a glance. Without surfaces it's one fill.
    const roadBase = this.add.graphics().setDepth(1);
    const surfaces = this.track.surfaces;
    if (surfaces) {
      for (let i = 0; i < quads.length; i++) {
        roadBase.fillStyle(surfaces[i] === 'gravel' ? COLORS.gravel : COLORS.tarmac, 1);
        roadBase.fillPoints(quads[i], true);
      }
    } else {
      roadBase.fillStyle(COLORS.tarmac, 1);
      for (const q of quads) roadBase.fillPoints(q, true);
    }

    if (this.def.theme === 'manfield') {
      // Purpose-built circuit: red/white rumble-strip kerbs, checkered start
      // line and subtle checkpoint markers.
      this.drawRumbleKerb(left);
      this.drawRumbleKerb(right);
      this.drawStartLine();
      this.drawCheckpointGates();
    } else {
      // Public coastal road: warm painted edges and a friendly start gantry,
      // with recognisable Eastbourne landmarks along the way.
      this.drawKerb(left);
      this.drawKerb(right);
      this.placeStartGantry();
      this.placeFinishAndLandmarks();
    }
  }

  // Red/white rumble-strip kerb for the Manfield circuit (closed loop, so the
  // final segment wraps back to the start).
  drawRumbleKerb(edge) {
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

  drawEastbourneSetting() {
    const water = this.add.graphics().setDepth(0.1);
    water.fillStyle(0x4fadd0, 1);
    water.fillRect(0, 0, 400, 4000);
    water.lineStyle(20, 0xffe2a6, 0.9);
    water.lineBetween(400, 0, 400, 4000);
    for (let y = 200; y < 3950; y += 150) {
      water.lineStyle(5, 0xb9e1e8, 0.35);
      water.lineBetween(40, y, 330, y + 25);
    }
    // A continuous seawall makes the harbour visible but unreachable.
    for (let y = 450; y < 4000; y += 50) this.obstacles.push({ x: 420, y, r: 32 });
  }

  // Ōtaki Rally placeholder scenery, all code-drawn (no PNG assets this pass):
  // a river + bridge and a railway crossing set across the road, plus a beach and
  // sea strip at the coastal finish. Positions come from the course def's
  // `scenery` block (checkpoint indices for the crossings, a rect for the beach).
  drawOtakiSetting() {
    const sc = this.def.scenery || {};
    const cps = this.track.checkpoints;

    // Beach + sea filling the NW corner, marking arrival at the coast.
    if (sc.beach) {
      const b = sc.beach;
      const g = this.add.graphics().setDepth(0.08);
      g.fillStyle(COLORS.sand, 1);
      g.fillRect(b.x, b.y, b.w, b.h);
      // Sea beyond the sand along the top/left edges.
      g.fillStyle(COLORS.river, 1);
      g.fillRect(b.x, b.y, b.w, 120);
      g.fillRect(b.x, b.y, 120, b.h);
    }

    // A band drawn perpendicular to the road at a checkpoint, extending well past
    // the kerbs. `depth` below the road makes it read as passing under a bridge.
    const bandAt = (cpIndex, half, length, depth, drawFn) => {
      const cp = cps[cpIndex];
      if (!cp) return;
      const nx = Math.cos(cp.angle + Math.PI / 2);
      const ny = Math.sin(cp.angle + Math.PI / 2); // across the road
      const ax = Math.cos(cp.angle);
      const ay = Math.sin(cp.angle); // along the road
      drawFn(cp, nx, ny, ax, ay, this.add.graphics().setDepth(depth), half, length);
    };

    // Ōtaki River: a broad blue-green band under the road (the road is the bridge).
    bandAt(sc.riverCp ?? 0, this.track.half, 260, 0.2, (cp, nx, ny, ax, ay, g, half, len) => {
      const w = half + 900; // reach well past both kerbs into the paddocks
      const p = (sx, sy) => new Phaser.Geom.Point(cp.x + nx * sx + ax * sy, cp.y + ny * sx + ay * sy);
      g.fillStyle(COLORS.river, 1);
      g.fillPoints([p(-w, -len / 2), p(w, -len / 2), p(w, len / 2), p(-w, len / 2)], true);
      // Pale banks along both river edges.
      g.lineStyle(10, 0xcfc19a, 0.8);
      g.strokePoints([p(-w, -len / 2), p(w, -len / 2)], false);
      g.strokePoints([p(-w, len / 2), p(w, len / 2)], false);
    });

    // Railway crossing: two rails + sleeper ticks across the road, above the
    // surface but below the car, plus a simple crossbuck marker beside the road.
    bandAt(sc.railwayCp ?? 0, this.track.half, 70, 2.2, (cp, nx, ny, ax, ay, g, half) => {
      const w = half + 26;
      const p = (sx, sy) => new Phaser.Geom.Point(cp.x + nx * sx + ax * sy, cp.y + ny * sx + ay * sy);
      // Sleepers.
      g.lineStyle(7, 0x7a5b3a, 0.9);
      for (let s = -w; s <= w; s += 26) g.strokePoints([p(s, -32), p(s, 32)], false);
      // Rails.
      g.lineStyle(5, 0x9099a0, 1);
      g.strokePoints([p(-w, -14), p(w, -14)], false);
      g.strokePoints([p(-w, 14), p(w, 14)], false);
      // Crossbuck 'X' just outside the road edge.
      const cb = this.add.text(cp.x + nx * (half + 60), cp.y + ny * (half + 60), '✕', {
        fontFamily: FONT, fontSize: '48px', fontStyle: '700', color: '#fff8e7',
        stroke: '#15314b', strokeThickness: 8,
      }).setOrigin(0.5).setDepth(7);
      void cb;
    });
  }

  // Roadside landmark labels, advance arrows and the finish marker — all driven
  // by the active course def so every sprint course supplies its own set.
  placeFinishAndLandmarks() {
    const labels = this.def.landmarks || [];
    for (const [x, y, text] of labels) {
      this.add.text(x, y, text, {
        fontFamily: FONT, fontSize: '34px', fontStyle: '700',
        color: '#fff8e7', backgroundColor: '#15314bcc', padding: { x: 14, y: 8 },
      }).setOrigin(0.5).setDepth(7);
    }
    const finish = this.track.checkpoints.at(-1);
    this.add.text(finish.x, finish.y + 190, this.def.finishLabel || 'FINISH', {
      fontFamily: FONT, fontSize: '42px', fontStyle: '700', color: '#15314b',
      backgroundColor: '#ffd166', padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setDepth(7);
    for (const a of this.def.arrows || []) {
      this.add.text(a.x, a.y, a.text, {
        fontFamily: FONT, fontSize: '44px', fontStyle: '700', color: '#fff8e7',
        stroke: '#15314b', strokeThickness: 8,
      }).setOrigin(0.5).setDepth(7).setRotation(a.rot || 0);
    }
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
      const bale = this.add
        .image(x, y, 'hay-bale')
        .setDepth(6)
        .setScale(Phaser.Math.FloatBetween(0.7, 1.0))
        .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
      this.obstacles.push({ x, y, r: bale.displayWidth * 0.42 });
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
    for (let i = 10; i < n - 10; i += 20) {
      const a = cl[i - 1];
      const b = cl[i + 1];
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
      const bx = cl[i].x + nx * off;
      const by = cl[i].y + ny * off;
      this.add
        .image(bx, by, 'tyre-barrier')
        .setDepth(6)
        .setScale(0.85)
        .setRotation(Math.atan2(ty, tx));
      // Solid tyre wall: two circles along the barrier's length so it blocks
      // more like the row of tyres it is, rather than a single point.
      const halfLen = 46;
      this.obstacles.push({ x: bx + tx * halfLen, y: by + ty * halfLen, r: 30 });
      this.obstacles.push({ x: bx - tx * halfLen, y: by - ty * halfLen, r: 30 });
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
    for (let i = 0; i < n - 1; i++) {
      const a = edge[i];
      const b = edge[i + 1];
      g.lineStyle(10, COLORS.cream, 0.95);
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
      // No trees in Wellington Harbour (Eastbourne's water strip on the left).
      if (this.def.theme === 'eastbourne' && x < 470 && y < 4050) continue;
      // No trees on Ōtaki Beach / sea (the NW corner).
      if (this.def.theme === 'otaki') {
        const b = this.def.scenery && this.def.scenery.beach;
        if (b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) continue;
      }
      const d = distanceToCenterline(x, y, this.track.centerline);
      if (d < TRACK.roadWidth / 2 + 90) continue; // keep clear of the track
      const key = Phaser.Utils.Array.GetRandom(variants);
      const t = this.add.image(x, y, key).setScale(Phaser.Math.FloatBetween(0.7, 1.4));
      layer.add(t);
      // Solid trunk/canopy: a collision circle a bit smaller than the sprite so
      // you bump the tree, not its transparent padding.
      this.obstacles.push({ x, y, r: t.displayWidth * 0.3 });
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
    // The countdown is screen-space UI: show it on the UI camera only.
    if (this.uiCamera) this.cameras.main.ignore(label);

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
    const surface = surfaceAt(this.car.x, this.car.y, this.track);

    this.car.update(dt, input, onTrack, surface);
    this.resolveObstacles();
    this.applyFx(onTrack, input, surface);

    if (this.engine) {
      const speedRatio = Math.abs(this.car.speed) / CAR.maxSpeed;
      this.engine.update(speedRatio, input.throttle, isMuted(this));
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
    // pootle and the fast circuit trigger skids/dust/shake at sensible paces.
    const fxSpeed = CAR.maxSpeed * 0.3;
    const shakeSpeed = CAR.maxSpeed * 0.6;

    // Skid marks when drifting or handbraking on tarmac.
    if (onTrack && (car.drifting || (input.handbrake && Math.abs(car.speed) > fxSpeed))) {
      this.skidMarks.lineStyle(7, 0x202124, 0.45);
      if (this.lastSkid) {
        this.skidMarks.lineBetween(this.lastSkid.left.x, this.lastSkid.left.y, axle.left.x, axle.left.y);
        this.skidMarks.lineBetween(this.lastSkid.right.x, this.lastSkid.right.y, axle.right.x, axle.right.y);
      }
      this.lastSkid = { left: { ...axle.left }, right: { ...axle.right } };
    } else {
      this.lastSkid = null;
    }

    // Smoke on drift; dusty puffs off-track, and kicked up on gravel at pace.
    if (car.drifting && onTrack) {
      this.smoke.emitParticleAt(axle.center.x, axle.center.y, 2);
    } else if ((!onTrack || surface === 'gravel') && Math.abs(car.speed) > fxSpeed) {
      this.dust.emitParticleAt(axle.center.x, axle.center.y, 1);
    }

    // Dynamic zoom: pull back with speed for a sense of pace.
    const speedRatio = Phaser.Math.Clamp(Math.abs(car.speed) / CAR.maxSpeed, 0, 1);
    const targetZoom = this.baseZoom - 0.12 * speedRatio;
    const cam = this.cameras.main;
    cam.setZoom(Phaser.Math.Linear(cam.zoom, targetZoom, 0.05));

    // A little kick when you drop onto the grass.
    if (this.wasOnTrack && !onTrack && Math.abs(car.speed) > shakeSpeed) {
      cam.shake(120, 0.006);
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
    this.uiObjects.push(panel);
    this.cameras.main.ignore(panel);
    this.uiCamera.ignore([]);
    void timeMs;
  }
}
