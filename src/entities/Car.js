// Beryl. Arcade top-down handling: forgiving, not a sim.
import Phaser from 'phaser';
import { CAR } from '../config.js';

function approach(value, target, maxDelta) {
  if (value < target) return Math.min(value + maxDelta, target);
  if (value > target) return Math.max(value - maxDelta, target);
  return value;
}

export class Car {
  constructor(scene, x, y, rotation) {
    this.scene = scene;
    this.sprite = scene.add.sprite(x, y, 'beryl');
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setDepth(10);
    this.sprite.rotation = rotation;
    this.rotation = rotation;
    this.x = x;
    this.y = y;
    this.speed = 0;
    this.onTrack = true;
  }

  reset(x, y, rotation) {
    this.x = x;
    this.y = y;
    this.rotation = rotation;
    this.speed = 0;
    this.sync();
  }

  get forward() {
    // Sprite drawn nose-up: forward = (sin r, -cos r).
    return { x: Math.sin(this.rotation), y: -Math.cos(this.rotation) };
  }

  update(dt, input, onTrack) {
    this.onTrack = onTrack;
    const handbrake = !!input.handbrake;

    // Longitudinal control.
    if (input.throttle > 0) {
      this.speed += CAR.accel * dt;
    } else if (input.throttle < 0) {
      if (this.speed > 0) {
        this.speed -= CAR.brakeDecel * dt; // braking
      } else {
        this.speed -= CAR.reverseAccel * dt; // reversing
      }
    } else {
      this.speed = approach(this.speed, 0, CAR.coastDrag * dt);
    }

    // Surface limits.
    const maxV = onTrack ? CAR.maxSpeed : CAR.maxSpeed * CAR.grassMaxSpeedFactor;
    if (!onTrack && this.speed > maxV) {
      this.speed = approach(this.speed, maxV, CAR.grassDrag * dt);
    }
    if (handbrake) {
      this.speed = approach(this.speed, 0, CAR.handbrakeDrag * dt);
    }
    this.speed = Phaser.Math.Clamp(this.speed, -CAR.maxReverse, maxV);

    // Steering scales with speed so there's no pivoting on the spot; sign flips
    // when reversing so the wheel feels natural.
    const speedRatio = Phaser.Math.Clamp(Math.abs(this.speed) / CAR.maxSpeed, 0, 1);
    const effectiveness = CAR.lowSpeedTurn + (1 - CAR.lowSpeedTurn) * speedRatio;
    const dir = this.speed >= 0 ? 1 : -1;
    const boost = handbrake ? CAR.handbrakeTurnBoost : 1;
    this.rotation += input.steer * CAR.turnRate * effectiveness * dir * boost * dt;

    // Integrate.
    const f = this.forward;
    this.x += f.x * this.speed * dt;
    this.y += f.y * this.speed * dt;

    this.sync();
  }

  sync() {
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    this.sprite.rotation = this.rotation;
  }
}
