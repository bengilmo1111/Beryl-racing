// Beryl's engine: a 948cc BMC A-series, synthesised.
//
// The character of this engine is that it **revs hard and does not go fast**.
// It is always busy, it is always working, and you hear every gearchange. That
// is the whole personality of driving a Morris Minor, and it is the one thing a
// synth driven by road speed alone can never produce — road speed rises once,
// smoothly, over a whole course, so the note just slides upward for two minutes
// and tells you nothing.
//
// So this models the thing that actually makes the noise: crankshaft speed.
// Revs sweep up through a gear, drop when it shifts, and sweep again. On a climb
// she sits at high revs going nowhere, which is exactly right.
//
// Determinism: constructed only when not harnessed (see RaceScene), because
// AudioContext runs on wall-clock time. Nothing here is read by the simulation.

// Gear ratios as fractions of top speed. Four speeds, first is short and third
// is long, as the real box is.
// A Minor's box, as fractions of top speed: first runs out around 30 km/h,
// second around 50, third around 75. Deliberately a little short of the real
// ratios so you hear all three changes rather than spending the first half of a
// course in top.
const GEARS = [0.0, 0.22, 0.42, 0.68];
const IDLE_RPM = 800;
const REDLINE_RPM = 4800;
// A gear is left a little past its band and picked up a little before it, so a
// car sitting exactly on a shift point does not chatter between two gears.
const SHIFT_HYSTERESIS = 0.02;
// How long the note dips while the clutch is out.
const SHIFT_SECONDS = 0.28;

// A four-stroke four fires twice per crankshaft revolution.
const FIRINGS_PER_REV = 2;

export class EngineSound {
  constructor(soundManager) {
    this.ctx = soundManager && soundManager.context ? soundManager.context : null;
    this.ok = !!this.ctx;
    // Why it is silent, if it is, in a form a human can read. This used to fail
    // completely silently: no context meant every update was a no-op with
    // nothing anywhere saying so.
    this.status = this.ok ? 'ready' : 'no AudioContext — Phaser has no WebAudio manager';
    if (!this.ok) return;

    const ctx = this.ctx;
    if (ctx.state === 'suspended') ctx.resume();

    this.gear = 0;
    this.rpm = IDLE_RPM;
    this.shiftUntil = 0;

    this.out = ctx.createGain();
    this.out.gain.value = 0.0001;
    this.out.connect(ctx.destination);

    // Body: the low thump of the firing pulses. A sawtooth an octave below the
    // firing frequency, kept muffled — this is the part you feel.
    this.body = ctx.createOscillator();
    this.body.type = 'sawtooth';
    this.bodyGain = ctx.createGain();
    this.bodyGain.gain.value = 0.5;
    this.bodyFilter = ctx.createBiquadFilter();
    this.bodyFilter.type = 'lowpass';
    this.bodyFilter.frequency.value = 220;
    this.bodyFilter.Q.value = 3;
    this.body.connect(this.bodyGain).connect(this.bodyFilter).connect(this.out);

    // Bark: the firing frequency itself through a resonant bandpass that opens
    // with load. This is the part that sounds like it is working hard.
    this.bark = ctx.createOscillator();
    this.bark.type = 'sawtooth';
    this.barkGain = ctx.createGain();
    this.barkGain.gain.value = 0.34;
    this.barkFilter = ctx.createBiquadFilter();
    this.barkFilter.type = 'bandpass';
    this.barkFilter.frequency.value = 600;
    this.barkFilter.Q.value = 1.6;
    this.bark.connect(this.barkGain).connect(this.barkFilter).connect(this.out);

    // Intake whine: a quiet square an octave up, which is what gives a small
    // four its thrashiness near the redline.
    this.whine = ctx.createOscillator();
    this.whine.type = 'square';
    this.whineGain = ctx.createGain();
    this.whineGain.gain.value = 0.0;
    this.whine.connect(this.whineGain).connect(this.out);

    this.body.start();
    this.bark.start();
    this.whine.start();
  }

  // Crankshaft speed from road speed, by working out which gear she must be in.
  //
  // Hysteresis is applied against the *current* gear so a steady speed on a
  // shift point stays put rather than oscillating.
  #updateGear(speedRatio, now) {
    let gear = this.gear;
    const bias = SHIFT_HYSTERESIS;
    while (gear < GEARS.length - 1 && speedRatio > GEARS[gear + 1] + bias) gear += 1;
    while (gear > 0 && speedRatio < GEARS[gear] - bias) gear -= 1;
    if (gear !== this.gear) {
      this.gear = gear;
      this.shiftUntil = now + SHIFT_SECONDS;
    }
    const low = GEARS[gear];
    const high = gear < GEARS.length - 1 ? GEARS[gear + 1] : 1;
    const through = high > low ? (speedRatio - low) / (high - low) : 0;
    return Math.min(1, Math.max(0, through));
  }

  // speedRatio 0..1; throttle -1..1; grade is ∂h/∂s along the heading, positive
  // uphill; muted boolean.
  update(speedRatio, throttle, muted, grade = 0) {
    if (!this.ok) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const r = Math.max(0, Math.min(1, speedRatio));

    const through = this.#updateGear(r, now);
    let rpm = IDLE_RPM + (REDLINE_RPM - IDLE_RPM) * through;

    // The dip while the clutch is out. Revs fall away and pick the new gear up.
    const shifting = now < this.shiftUntil;
    if (shifting) rpm *= 0.62;
    this.rpm = rpm;

    // Load: what she is being asked to do, not how fast she is going. Throttle
    // and gradient both count, which is why she sounds like she is struggling
    // on the Remutaka climb at a steady speed — the single most characterful
    // thing this car does, and something road speed alone cannot express.
    const climb = Math.max(0, Math.min(1, grade * 6));
    const load = Math.max(0, Math.min(1, (throttle > 0 ? throttle : 0) * 0.7 + climb * 0.6));

    const firing = (rpm / 60) * FIRINGS_PER_REV;
    const glide = 0.055;
    this.body.frequency.setTargetAtTime(firing * 0.5, now, glide);
    this.bark.frequency.setTargetAtTime(firing, now, glide);
    this.whine.frequency.setTargetAtTime(firing * 2, now, glide);

    // Under load the bandpass opens and the whine comes up: more harmonics, more
    // effort. Off throttle it closes and she just burbles.
    this.barkFilter.frequency.setTargetAtTime(420 + firing * 3.2 + load * 900, now, glide);
    this.barkFilter.Q.setTargetAtTime(1.4 + load * 2.6, now, glide);
    this.bodyFilter.frequency.setTargetAtTime(160 + firing * 1.1, now, glide);
    this.whineGain.gain.setTargetAtTime(
      shifting ? 0.004 : 0.012 + load * 0.05 * (0.25 + through * 0.75),
      now,
      glide
    );

    // Audible on a laptop speaker, which the old 0.05-to-0.18 range was not: a
    // 46 Hz sawtooth under a 0.5-volume music bed is felt on headphones and gone
    // on anything else.
    let volume = 0.16 + load * 0.2 + through * 0.1;
    if (shifting) volume *= 0.55;
    if (muted) volume = 0;
    this.out.gain.setTargetAtTime(Math.max(volume, 0.0001), now, 0.05);
  }

  // What the engine thinks it is doing, for the HUD and for diagnosing silence.
  describe() {
    return {
      ok: this.ok,
      status: this.status,
      contextState: this.ctx ? this.ctx.state : 'none',
      gear: this.gear + 1,
      rpm: Math.round(this.rpm),
    };
  }

  stop() {
    if (!this.ok) return;
    for (const osc of [this.body, this.bark, this.whine]) {
      try {
        osc.stop();
      } catch (error) {
        void error; // already stopped
      }
    }
    try {
      this.out.disconnect();
    } catch (error) {
      void error;
    }
    this.ok = false;
  }
}
