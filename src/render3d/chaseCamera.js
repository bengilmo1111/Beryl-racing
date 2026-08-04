// The chase camera: behind and above Beryl, trailing her through a drift.
import { PerspectiveCamera, Vector3 } from 'three';
import { CAR, WORLD } from '../config.js';
import { CAMERA_NEAR, cameraFarFor } from './palette.js';
import { alphaFor, angleDelta, forwardXZ, yawFor } from './coords.js';

// Beryl is 217.6 units long (~70 units per metre), which sets the scale of
// everything here. The compact/phone variant pulls in and widens out, the same
// trade the 2D camera made with its 0.64 vs 0.82 base zoom.
// Sat high enough to see over Beryl's roof: a chase camera shows far less of the
// route ahead than the old bird's-eye view did, so the rig buys back as much
// forward visibility as it can without losing the sense of sitting behind her.
const RIG = {
  desktop: { dist: 430, height: 235, lookAhead: 520, lookHeight: 40, fov: 55 },
  compact: { dist: 355, height: 215, lookAhead: 620, lookHeight: 40, fov: 68 },
};

// Speed effect, replacing the 2D `baseZoom - 0.12 * speedRatio` zoom-out. Split
// across FOV and distance so the car itself doesn't visibly warp at speed.
const FOV_GAIN = 0.14;
const DIST_GAIN = 0.1;

// Per-frame lerp alphas at 60fps (see alphaFor). Position matches the 2D
// camera's startFollow(0.16). Yaw is deliberately slower so the camera lags
// through a slide — that lag is what makes the handbrake read from behind.
const A_POS = 0.16;
const A_YAW = 0.09;
const A_LENS = 0.05;

// How much of the slope ahead the camera's aim follows. 1 tracks the hill
// exactly and loses the car off the bottom of the frame on a steep climb; 0
// stares at the horizon and hides the road. See the note where it is used.
const LOOK_SLOPE_FOLLOW = 0.45;

export class ChaseCamera {
  constructor(compact) {
    this.camera = new PerspectiveCamera(RIG.desktop.fov, 1, CAMERA_NEAR, cameraFarFor(WORLD));
    this.setCompact(compact);

    this.anchor = new Vector3();
    this.yaw = 0;
    this.fov = this.rig.fov;
    this.dist = this.rig.dist;
    this.primed = false;

    this._fwd = new Vector3();
    this._eye = new Vector3();
    this._look = new Vector3();
    this._shake = { remaining: 0, duration: 0, amplitude: 0 };
    // Shake jitter runs off a local PRNG, never Math.random: the global stream
    // is seeded by the playtest harness and is part of the determinism contract.
    this._seed = 0x9e3779b9;
  }

  setCompact(compact) {
    this.rig = compact ? RIG.compact : RIG.desktop;
  }

  // xorshift32, so camera shake can never perturb the seeded global RNG.
  _rand() {
    let x = this._seed;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this._seed = x >>> 0;
    return (this._seed / 0xffffffff) * 2 - 1;
  }

  shake(durationMs, amplitude) {
    this._shake.remaining = durationMs;
    this._shake.duration = durationMs;
    this._shake.amplitude = amplitude;
  }

  snap() {
    this.primed = false;
  }

  // `terrain` lifts the whole rig onto the hillside. Without it the camera stays
  // at sea level on a climb and ends up buried in the hill, or staring at open
  // sky on the way back down.
  update(car, dt, terrain = null) {
    const rig = this.rig;

    // Targets.
    const targetX = car.x;
    const targetZ = car.y;
    const targetGround = terrain ? terrain.heightAt(car.x, car.y) : 0;
    // Feed a little of the slide into the camera yaw so a drift shows Beryl's
    // flank rather than nailing the camera to her tail. Body heading, not
    // velocity heading — velocity heading swings wildly on the handbrake.
    const slip = Math.max(-1, Math.min(1, car.lateral / (CAR.driftLateral * 3)));
    const targetYaw = yawFor(car.rotation) + slip * 0.18;

    const speedRatio = Math.min(1, Math.abs(car.speed) / CAR.maxSpeed);
    const targetFov = rig.fov * (1 + FOV_GAIN * speedRatio);
    const targetDist = rig.dist * (1 + DIST_GAIN * speedRatio);

    if (!this.primed) {
      // First frame of a race, and every zero-delta harness render.
      this.anchor.set(targetX, targetGround, targetZ);
      this.yaw = targetYaw;
      this.fov = targetFov;
      this.dist = targetDist;
      this.primed = true;
    } else {
      const aPos = alphaFor(A_POS, dt);
      const aYaw = alphaFor(A_YAW, dt);
      const aLens = alphaFor(A_LENS, dt);
      this.anchor.x += (targetX - this.anchor.x) * aPos;
      this.anchor.z += (targetZ - this.anchor.z) * aPos;
      this.anchor.y += (targetGround - this.anchor.y) * aPos;
      // Via the shortest arc, or the camera whips the long way round at ±π.
      this.yaw += angleDelta(this.yaw, targetYaw) * aYaw;
      this.fov += (targetFov - this.fov) * aLens;
      this.dist += (targetDist - this.dist) * aLens;
    }

    // The camera's own forward, from its smoothed yaw. yawFor is its own
    // inverse, so this converts the camera yaw back into a game rotation.
    forwardXZ(yawFor(this.yaw), this._fwd);

    // The eye rides above whichever is higher: the ground under Beryl, or the
    // ground under the camera itself. On a steep climb the camera sits back down
    // the slope, so anchoring purely to her height would push it into the hill.
    const eyeX = this.anchor.x - this._fwd.x * this.dist;
    const eyeZ = this.anchor.z - this._fwd.z * this.dist;
    const eyeGround = terrain ? terrain.heightAt(eyeX, eyeZ) : 0;
    this._eye.set(eyeX, Math.max(this.anchor.y, eyeGround) + rig.height, eyeZ);

    // Aim at the road ahead rather than a fixed height, or a climb points the
    // camera at open sky and a descent buries it in the road.
    //
    // Only *partly* follow the slope, though. Tracking the look target all the
    // way up a 14% grade pitches the camera so far that Beryl slides off the
    // bottom of the frame — the road ahead is beautifully framed and the car
    // you're driving is gone. Splitting the difference keeps her seated in the
    // lower third while still opening up the climb.
    const lookX = this.anchor.x + this._fwd.x * rig.lookAhead;
    const lookZ = this.anchor.z + this._fwd.z * rig.lookAhead;
    const lookGround = terrain ? terrain.heightAt(lookX, lookZ) : 0;
    const followed = this.anchor.y + (lookGround - this.anchor.y) * LOOK_SLOPE_FOLLOW;
    this._look.set(lookX, followed + rig.lookHeight, lookZ);

    // Shake displaces eye and look together, so it reads as a jolt of the whole
    // rig rather than a pan.
    if (this._shake.remaining > 0 && dt > 0) {
      this._shake.remaining -= dt * 1000;
      const k = Math.max(0, this._shake.remaining / this._shake.duration);
      const a = this._shake.amplitude * k;
      const ox = this._rand() * a;
      const oy = this._rand() * a;
      const oz = this._rand() * a;
      this._eye.x += ox;
      this._eye.y += oy;
      this._eye.z += oz;
      this._look.x += ox;
      this._look.y += oy;
      this._look.z += oz;
    }

    this.camera.position.copy(this._eye);
    this.camera.lookAt(this._look);
    if (Math.abs(this.camera.fov - this.fov) > 0.01) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }
  }
}
