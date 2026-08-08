// Beryl. Arcade top-down handling with drift: she carries a velocity vector, so
// the sideways component can slide. Grip on that component is high on tarmac and
// drops on the handbrake, which is what makes her drift.
import Phaser from 'phaser';
import { CAR, WORLD } from '../config.js';

// Fraction of top speed above which a sideways slide counts as a drift. Matched
// to the `CAR.maxSpeed * 0.3` gate applyFx already uses for handbrake skids, so
// the two ways of laying a skid mark now agree with each other.
const DRIFT_SPEED = 0.3;

function approach(value, target, maxDelta) {
  if (value < target) return Math.min(value + maxDelta, target);
  if (value > target) return Math.max(value - maxDelta, target);
  return value;
}

export class Car {
  constructor(scene, x, y, rotation) {
    this.scene = scene;
    // Made, not added. Beryl is drawn as a mesh on the 3D canvas now, but this
    // sprite still defines her collision footprint, and those numbers are pinned
    // by the determinism baselines: collideRadius 54.4, axleOffset 60.928,
    // boundsMargin 108.8, all derived below from beryl.png's 128x256 at 0.85
    // scale. Keeping the real texture-backed object is what guarantees they stay
    // exactly what they were; it simply never joins the display list.
    this.sprite = scene.make.sprite({ x, y, key: 'beryl', add: false });
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setDepth(10);
    this.sprite.rotation = rotation;
    this.rotation = rotation;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.speed = 0; // forward speed, for HUD/steering/camera
    this.lateral = 0; // sideways speed, for drift fx
    this.drifting = false;
    this.onTrack = true;
    // Sprite is ~256px long; scale so Beryl reads well on the road. Doubled
    // (0.425 → 0.85) so she takes up noticeably more of the lane.
    this.sprite.setScale(0.85);

    // Collision model: Beryl is long, so she's approximated by two circles (one
    // at the nose, one at the tail) for obstacle collisions, plus a bounds
    // margin that keeps her whole body inside the world so she never drives off
    // into the void.
    this.collideRadius = this.sprite.displayWidth * 0.5;
    this.axleOffset = this.sprite.displayHeight * 0.28;
    this.boundsMargin = Math.max(this.sprite.displayWidth, this.sprite.displayHeight) / 2;
  }

  reset(x, y, rotation) {
    this.x = x;
    this.y = y;
    this.rotation = rotation;
    this.vx = 0;
    this.vy = 0;
    this.speed = 0;
    this.sync();
  }

  get forward() {
    return { x: Math.sin(this.rotation), y: -Math.cos(this.rotation) };
  }

  // `grade` is the slope along Beryl's heading as a rise-over-run ratio, positive
  // uphill. Flat courses pass 0 and take no extra arithmetic at all — see the
  // guard below, which is what keeps Manfield's recorded baselines untouched.
  update(dt, input, onTrack, surface, grade = 0) {
    this.onTrack = onTrack;
    const handbrake = !!input.handbrake;

    // Body basis: forward (nose) and right (passenger side).
    const sinr = Math.sin(this.rotation);
    const cosr = Math.cos(this.rotation);
    const fwdX = sinr;
    const fwdY = -cosr;
    const rightX = cosr;
    const rightY = sinr;

    // Split velocity into forward / sideways components.
    let vForward = this.vx * fwdX + this.vy * fwdY;
    let vLateral = this.vx * rightX + this.vy * rightY;

    // Throttle / brake / reverse along the forward axis.
    if (input.throttle > 0) {
      vForward += CAR.accel * dt;
    } else if (input.throttle < 0) {
      if (vForward > 0) vForward -= CAR.brakeDecel * dt;
      else vForward -= CAR.reverseAccel * dt;
    } else {
      vForward = approach(vForward, 0, CAR.coastDrag * dt);
    }

    // Gravity along the slope. Climbs bleed speed, descents give it back — this
    // is the whole point of the hill climb: a slow car labouring up a steep road.
    if (grade !== 0) {
      let pull = CAR.gravity * grade;
      if (pull > 0) {
        // The hill never wins. Capping the climb penalty below Beryl's own
        // acceleration guarantees full throttle always nets forward progress, so
        // she crawls and strains up the switchbacks but is never stopped dead by
        // them — which matters for a family game, and keeps the playtest bots
        // able to summit.
        const cap = CAR.accel * (CAR.maxClimbPenalty != null ? CAR.maxClimbPenalty : 0.78);
        if (pull > cap) pull = cap;
      }
      vForward -= pull * dt;
    }

    // Surface speed cap (soft pull-back if over).
    let maxV = onTrack ? CAR.maxSpeed : CAR.maxSpeed * CAR.grassMaxSpeedFactor;
    // Running downhill earns a little over the flat top speed. Without this the
    // hard clamp below swallows every metre gravity gives back and a descent
    // feels identical to the flat.
    if (grade < 0 && CAR.downhillOverspeed) {
      const over = Math.min(1, -grade / 0.15);
      maxV *= 1 + CAR.downhillOverspeed * over;
    }
    if (vForward > maxV) {
      vForward = approach(vForward, maxV, (onTrack ? CAR.overspeedDrag : CAR.grassDrag) * dt);
    }
    vForward = Phaser.Math.Clamp(vForward, -CAR.maxReverse, maxV);
    this.speed = vForward;

    // Steering: scales with speed, flips when reversing, sharper mid-drift.
    const speedRatio = Phaser.Math.Clamp(Math.abs(vForward) / CAR.maxSpeed, 0, 1);
    const effectiveness = CAR.lowSpeedTurn + (1 - CAR.lowSpeedTurn) * speedRatio;
    // Steering only inverts once she is genuinely reversing. Taking the raw sign
    // of vForward makes this chatter whenever speed hovers around zero: a car
    // nudged back and forth — stopped on a hill, or resting against scenery —
    // gets its steering flipped every few frames and jitters on the spot instead
    // of turning, unable to point itself anywhere. A small deadband makes a
    // stationary car steer consistently forwards.
    const dir = vForward < -CAR.maxSpeed * 0.01 ? -1 : 1;
    const driftBoost = handbrake ? CAR.driftTurnBoost : 1;
    this.rotation += input.steer * CAR.turnRate * effectiveness * dir * driftBoost * dt;

    // Sideways grip: bleed lateral velocity toward zero. Low grip => slide.
    // On-road grip can vary by surface — gravel (if the course defines it) is
    // looser than sealed. Off-road grass and the handbrake override as before.
    let grip;
    if (onTrack) {
      grip = surface === 'gravel' && CAR.gripGravel != null ? CAR.gripGravel : CAR.gripNormal;
    } else {
      grip = CAR.gripGrass;
    }
    if (handbrake) grip = CAR.gripDrift;
    const k = Math.min(grip * dt, 1);
    vLateral -= vLateral * k;

    // Recombine and integrate.
    this.vx = fwdX * vForward + rightX * vLateral;
    this.vy = fwdY * vForward + rightY * vLateral;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Keep Beryl inside the world so she can't disappear off the edge. Stop the
    // velocity component that pushes into the wall, but let her steer away.
    const m = this.boundsMargin;
    if (this.x < m) {
      this.x = m;
      if (this.vx < 0) this.vx = 0;
    } else if (this.x > WORLD.width - m) {
      this.x = WORLD.width - m;
      if (this.vx > 0) this.vx = 0;
    }
    if (this.y < m) {
      this.y = m;
      if (this.vy < 0) this.vy = 0;
    } else if (this.y > WORLD.height - m) {
      this.y = WORLD.height - m;
      if (this.vy > 0) this.vy = 0;
    }

    this.lateral = vLateral;
    // Fast enough for a slide to read as a slide, expressed against this
    // course's top speed rather than as a fixed number of units per second.
    //
    // It used to be a hard-coded 140, which is 88% of Eastbourne's top speed,
    // 78% of Remutaka's, 68% of Ōtaki's — and 8% of Manfeild's. So drifting was
    // unreachable on three courses and permanent on the fourth, and since this
    // flag is what gates skid marks and tyre smoke, three of the four courses
    // silently had no drift FX at all.
    //
    // Read only by applyFx (see RaceScene): nothing here feeds back into the
    // simulation, which is why this can be corrected without moving a baseline.
    this.drifting =
      Math.abs(vLateral) > CAR.driftLateral && Math.abs(vForward) > CAR.maxSpeed * DRIFT_SPEED;

    this.sync();
  }

  // Nose and tail collision points in world space (for obstacle collisions).
  collisionPoints() {
    const f = this.forward;
    return [
      { x: this.x + f.x * this.axleOffset, y: this.y + f.y * this.axleOffset },
      { x: this.x - f.x * this.axleOffset, y: this.y - f.y * this.axleOffset },
    ];
  }

  // Rear axle position in world space (for skid marks / smoke).
  rearAxle() {
    const back = 42 * this.sprite.scaleY; // ~ distance from centre to rear wheels
    const half = 30 * this.sprite.scaleX;
    const fwd = this.forward;
    const rx = Math.cos(this.rotation);
    const ry = Math.sin(this.rotation);
    const cx = this.x - fwd.x * back;
    const cy = this.y - fwd.y * back;
    return {
      left: { x: cx - rx * half, y: cy - ry * half },
      right: { x: cx + rx * half, y: cy + ry * half },
      center: { x: cx, y: cy },
    };
  }

  sync() {
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    this.sprite.rotation = this.rotation;
  }
}
