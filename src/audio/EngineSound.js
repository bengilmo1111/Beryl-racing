// Beryl's engine: a 948cc BMC A-series, recorded and played back.
//
// The character of this engine is that it **revs hard and does not go fast**.
// It is always busy, it is always working, and you hear every gearchange. That
// is the whole personality of driving a Morris Minor, and it is the one thing a
// note driven by road speed alone can never produce — road speed rises once,
// smoothly, over a whole course, so the pitch just slides upward for two
// minutes and tells you nothing.
//
// So this models the thing that actually makes the noise: crankshaft speed.
// Revs sweep up through a gear, drop when it shifts, and sweep again. On a climb
// she sits at high revs going nowhere, which is exactly right.
//
// What comes out of the speaker is then the real car — two loops cut from
// recordings made at the front and the rear of her, pitched to that crank speed
// (see engineVoices.js). The synth those recordings replaced is still here and
// still plays the V8, because there is no recording of a Morris Minor with a V8
// in it.
//
// Determinism: constructed only when not harnessed (see RaceScene), because
// AudioContext runs on wall-clock time. Nothing here is read by the simulation.
import { acquireContext, resumeOnGesture } from './context.js';
import { loadSample, ENGINE_FRONT, ENGINE_REAR } from './samples.js';
import { RecordedVoice, SynthVoice } from './engineVoices.js';

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
// a V8 gives four.
//
// `recorded` is whether this is Beryl. Only she was recorded, so only she can
// be played back; anything else falls to the synth, which can play an engine
// that does not exist. Manfeild's course definition turns it off.
const DEFAULT_ENGINE = { cylinders: 4, idle: 800, redline: 4800, recorded: true };
// A gear is left a little past its band and picked up a little before it, so a
// car sitting exactly on a shift point does not chatter between two gears.
const SHIFT_HYSTERESIS = 0.02;
// How long the note dips while the clutch is out.
const SHIFT_SECONDS = 0.28;
// Long enough not to click, short enough that nobody hears the handover if the
// recordings arrive after the race has started.
const VOICE_CROSSFADE = 0.12;

export class EngineSound {
  constructor(soundManager, engine = null) {
    this.engine = { ...DEFAULT_ENGINE, ...(engine || {}) };
    // Firings per crankshaft revolution: cylinders / 2 on a four-stroke.
    this.firingsPerRev = this.engine.cylinders / 2;

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
    this.resume = resumeOnGesture(ctx);

    this.gear = 0;
    this.rpm = this.engine.idle;
    this.shiftUntil = 0;
    this.stopped = false;

    this.out = ctx.createGain();
    this.out.gain.value = 0.0001;
    this.out.connect(ctx.destination);

    // The synth starts immediately and unconditionally: it needs nothing but an
    // AudioContext, so there is always a voice from the first frame even while
    // the recordings are still being fetched.
    this.voice = new SynthVoice(ctx, this.out, this.engine);
    if (this.engine.recorded) this.#useRecordingsWhenReady();
  }

  // Swap the synth for the real car once both clips have decoded. Normally they
  // were primed during the loading splash and this resolves on the next tick,
  // before the first update; on a slow connection it can land mid-race, which
  // is why it is a crossfade rather than a cut.
  #useRecordingsWhenReady() {
    Promise.all([
      loadSample(this.ctx, ENGINE_FRONT),
      loadSample(this.ctx, ENGINE_REAR),
    ]).then(([front, rear]) => {
      if (this.stopped || !front || !rear) return;
      const recorded = new RecordedVoice(this.ctx, this.out, { front, rear });
      recorded.gain.gain.value = 0.0001;
      recorded.fade(1, VOICE_CROSSFADE);
      const outgoing = this.voice;
      outgoing.fade(0.0001, VOICE_CROSSFADE);
      setTimeout(() => outgoing.stop(), VOICE_CROSSFADE * 1000 + 60);
      this.voice = recorded;
      this.status = this.ownsContext
        ? 'ready (real recordings, own context — Phaser has no WebAudio manager)'
        : 'ready (real recordings)';
    });
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
    this.voice.render({ firing, rpm, load, through, shifting }, now);

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
      voice: this.voice ? this.voice.kind : 'none',
      cylinders: this.engine ? this.engine.cylinders : 0,
      contextState: this.ctx ? this.ctx.state : 'none',
      ownsContext: !!this.ownsContext,
      waitingForGesture: !!(this.resume && this.resume.waiting()),
      gear: this.gear + 1,
      rpm: Math.round(this.rpm),
    };
  }

  stop() {
    if (!this.ok) return;
    this.stopped = true;
    if (this.resume) this.resume.cancel();
    this.voice.stop();
    try {
      this.out.disconnect();
    } catch (error) {
      void error;
    }
    // The context itself stays open. It is shared with the horn and reused by
    // the next race — see the note in context.js about how few of them a page
    // is allowed.
    this.ok = false;
  }
}
