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

// The A-series, and what Manfeild has instead.
//
// `cylinders` is the whole difference in the note: a four-stroke fires once per
// cylinder every two revolutions, so a four gives two firing pulses per rev and
// a V8 gives four. Double the pulse rate at the same crank speed is exactly why
// one sounds thrashy and the other sounds like it is idling when it is not.
const DEFAULT_ENGINE = { cylinders: 4, idle: 800, redline: 4800 };
// A gear is left a little past its band and picked up a little before it, so a
// car sitting exactly on a shift point does not chatter between two gears.
const SHIFT_HYSTERESIS = 0.02;
// How long the note dips while the clutch is out.
const SHIFT_SECONDS = 0.28;

// Getting hold of a usable AudioContext, which is harder than it looks on a
// phone, and is why this was silent on Android while the music played fine.
//
// Two independent things go wrong, and both produce exactly that symptom:
//
//  1. Phaser picks its sound manager at boot and may land on
//     HTML5AudioSoundManager or NoAudioSoundManager, neither of which has a
//     `.context` at all. An mp3 still plays — that is an <audio> element — but
//     a synth has nothing to build on. Borrowing Phaser's context therefore
//     cannot be the only route to one.
//  2. Even with the WebAudio manager, mobile browsers start the context
//     *suspended* and only a user gesture may resume it. Phaser handles its own
//     unlocking internally, so the music comes good on the first touch; a
//     one-shot `resume()` at construction time runs before any touch has
//     happened, is rejected, and nothing ever tries again.
//
// So: take Phaser's context if it has one, make our own if it does not, and keep
// trying to resume on every gesture until it is actually running.
function acquireContext(soundManager) {
  if (soundManager && soundManager.context) {
    return { ctx: soundManager.context, owned: false };
  }
  const Ctor = typeof window !== 'undefined'
    && (window.AudioContext || window.webkitAudioContext);
  if (!Ctor) return { ctx: null, owned: false };
  try {
    return { ctx: new Ctor(), owned: true };
  } catch (error) {
    void error;
    return { ctx: null, owned: false };
  }
}

const GESTURES = ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'keydown', 'click'];

export class EngineSound {
  constructor(soundManager, engine = null) {
    this.engine = { ...DEFAULT_ENGINE, ...(engine || {}) };
    // Firings per crankshaft revolution: cylinders / 2 on a four-stroke.
    this.firingsPerRev = this.engine.cylinders / 2;
    // A big lazy V8 wants a fatter, lower body and less of the small-four
    // intake thrash, so the mix shifts with the engine rather than being tuned
    // once for the A-series and left.
    this.bigEngine = this.engine.cylinders > 6;

    const acquired = acquireContext(soundManager);
    this.ctx = acquired.ctx;
    this.ownsContext = acquired.owned;
    this.ok = !!this.ctx;
    // Why it is silent, if it is, in a form a human can read. This used to fail
    // completely silently: no context meant every update was a no-op with
    // nothing anywhere saying so.
    this.status = this.ok
      ? (acquired.owned ? 'ready (own context — Phaser has no WebAudio manager)' : 'ready')
      : 'no AudioContext available in this browser';
    if (!this.ok) return;

    const ctx = this.ctx;
    this.#keepTryingToResume();

    this.gear = 0;
    this.rpm = this.engine.idle;
    this.shiftUntil = 0;

    this.out = ctx.createGain();
    this.out.gain.value = 0.0001;
    this.out.connect(ctx.destination);

    // Body: the low thump of the firing pulses. A sawtooth an octave below the
    // firing frequency, kept muffled — this is the part you feel.
    this.body = ctx.createOscillator();
    this.body.type = 'sawtooth';
    this.bodyGain = ctx.createGain();
    this.bodyGain.gain.value = this.bigEngine ? 0.72 : 0.5;
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
    this.barkGain.gain.value = this.bigEngine ? 0.42 : 0.34;
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

  // Resume now, and again on every gesture until it takes.
  //
  // `resume()` on a suspended context is a promise that a mobile browser will
  // reject unless it is called from inside a user gesture, so the listeners are
  // the mechanism, not the fallback. They remove themselves once the context is
  // running so there is nothing left attached to the document afterwards.
  //
  // On `window` in the **capture** phase, not on the canvas and not bubbling.
  // Every touch on this game lands on a Phaser canvas that has its own input
  // handling, and a bubble-phase listener is one `stopPropagation()` away from
  // never being called. Capture runs top-down before the target sees the event,
  // so nothing underneath can take the gesture away from us — which matters, as
  // on a phone the gesture is the only chance there is.
  #keepTryingToResume() {
    if (!this.ctx) return;
    const tryResume = () => {
      if (!this.ctx || this.ctx.state === 'running') {
        this.#stopListening();
        return;
      }
      const attempt = this.ctx.resume();
      if (attempt && attempt.then) attempt.then(() => this.#stopListening(), () => {});
    };
    this._resumeHandler = tryResume;
    for (const target of this.#gestureTargets()) {
      for (const type of GESTURES) {
        target.addEventListener(type, tryResume, { passive: true, capture: true });
      }
    }
    tryResume();
  }

  #gestureTargets() {
    const targets = [];
    if (typeof window !== 'undefined') targets.push(window);
    if (typeof document !== 'undefined') targets.push(document);
    return targets;
  }

  #stopListening() {
    if (!this._resumeHandler) return;
    for (const target of this.#gestureTargets()) {
      for (const type of GESTURES) {
        target.removeEventListener(type, this._resumeHandler, { capture: true });
      }
    }
    this._resumeHandler = null;
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
    let rpm = this.engine.idle + (this.engine.redline - this.engine.idle) * through;

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

    const firing = (rpm / 60) * this.firingsPerRev;
    const glide = 0.055;
    this.body.frequency.setTargetAtTime(firing * 0.5, now, glide);
    this.bark.frequency.setTargetAtTime(firing, now, glide);
    this.whine.frequency.setTargetAtTime(firing * 2, now, glide);

    // Under load the bandpass opens and the whine comes up: more harmonics, more
    // effort. Off throttle it closes and she just burbles.
    this.barkFilter.frequency.setTargetAtTime(420 + firing * 3.2 + load * 900, now, glide);
    this.barkFilter.Q.setTargetAtTime(1.4 + load * 2.6, now, glide);
    this.bodyFilter.frequency.setTargetAtTime(160 + firing * 1.1, now, glide);
    const whine = this.bigEngine ? 0.35 : 1;
    this.whineGain.gain.setTargetAtTime(
      shifting ? 0.004 : (0.012 + load * 0.05 * (0.25 + through * 0.75)) * whine,
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
      cylinders: this.engine ? this.engine.cylinders : 0,
      contextState: this.ctx ? this.ctx.state : 'none',
      ownsContext: !!this.ownsContext,
      waitingForGesture: !!this._resumeHandler,
      gear: this.gear + 1,
      rpm: Math.round(this.rpm),
    };
  }

  stop() {
    if (!this.ok) return;
    this.#stopListening();
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
    // Only close a context we made. Phaser's belongs to Phaser, and the music is
    // still playing through it.
    if (this.ownsContext && this.ctx && this.ctx.close) {
      try {
        this.ctx.close();
      } catch (error) {
        void error;
      }
    }
    this.ok = false;
  }
}
