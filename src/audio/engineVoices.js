// The two ways Beryl can make a noise, behind one small interface.
//
// `EngineSound` works out what the engine is *doing* — which gear, what revs,
// how hard it is being asked to work. A voice turns that into sound. There are
// two, and which one you get is not a quality setting:
//
//  • RecordedVoice plays the real car. Two loops cut from recordings made at
//    the front and the back of Beryl, pitched by playback rate to the crank
//    speed the gearbox model says she is doing, and mixed against each other by
//    load. This is the one you normally hear.
//  • SynthVoice is three oscillators. It covers the case where the recordings
//    cannot be loaded, and it is the only voice that can play an engine Beryl
//    does not have — Manfeild's V8 is a joke that no recording of a 948cc
//    A-series can tell.
//
// Both are driven by the same call and both hang off their own gain, so
// EngineSound can crossfade from one to the other if the recordings turn up
// late on a slow connection.

// How quickly a parameter chases its target. Slow enough to smooth the frame
// rate, fast enough that a gearchange is a change and not a slide.
const GLIDE = 0.055;

class Voice {
  constructor(ctx, destination) {
    this.ctx = ctx;
    this.gain = ctx.createGain();
    this.gain.gain.value = 1;
    this.gain.connect(destination);
  }

  fade(to, seconds) {
    const now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(to, now + seconds);
  }

  disconnect() {
    try {
      this.gain.disconnect();
    } catch (error) {
      void error;
    }
  }
}

// An engine at a steady throttle is never quite steady, and a loop is. That
// difference is the whole tell: hold a constant speed for ten seconds with a
// fixed playback rate and the ear stops hearing a car and starts hearing a
// sample, however good the sample is.
//
// So the rate wanders, by a per-cent or so, on two slow sines whose periods
// share no common multiple — the pattern never comes back around. Each layer
// gets its own periods and phases, so the front and the rear drift against each
// other as well, which is most of what makes two mics sound like one car rather
// than like one recording played twice.
//
// It wanders more off throttle than on it, because that is what an engine does:
// held wide open it settles, and on a trailing throttle it hunts.
const WANDER = 0.014;

function wander(now, load, shape) {
  const depth = WANDER * (1.2 - load * 0.5);
  return 1 + depth * (Math.sin(now * shape.a + shape.pa) * 0.62
    + Math.sin(now * shape.b + shape.pb) * 0.38);
}

// Beryl herself.
//
// The reference frequencies are measured, not guessed: each loop was cut from a
// steady passage of its recording and its firing rate found from the spectrum.
// 74.5 Hz and 82.6 Hz are two firings per revolution of a four, so the front
// clip is the car at about 2235 rpm and the rear at about 2480 — both in the
// unhurried middle of the rev range, which is why they sit together.
//
// Playback rate is then simply the ratio: to hear her at 3500 rpm, play the
// clip fast enough that its firing rate is the firing rate of 3500 rpm. The
// wide bounds are guards against a silly number, not a tuning — idle works out
// at about 0.35× and the redline at about 2.1×, and both are wanted.
const FRONT_FIRING_HZ = 74.51;
const REAR_FIRING_HZ = 82.63;
const MIN_RATE = 0.25;
const MAX_RATE = 2.6;

// Periods of about 2.4 s and 1.1 s for one layer, 2.9 s and 1.3 s for the
// other. Nothing here divides into anything else here.
const FRONT_WANDER = { a: 2.62, b: 5.71, pa: 0.0, pb: 2.1 };
const REAR_WANDER = { a: 2.17, b: 4.83, pa: 1.3, pb: 3.7 };
const SYNTH_WANDER = { a: 2.41, b: 5.23, pa: 0.7, pb: 4.4 };

export class RecordedVoice extends Voice {
  constructor(ctx, destination, buffers) {
    super(ctx, destination);
    this.kind = 'recorded';

    // Rear first: the exhaust is the note you hear from a chase camera, and it
    // is the layer that is always there.
    this.rear = this.#layer(buffers.rear, REAR_FIRING_HZ, 0, REAR_WANDER);
    // The front is the one that shouts when she is working. Started part-way
    // through its own loop so the two recordings do not line up and beat — and
    // the loops are different lengths (4.1 s and 2.9 s), so they only come back
    // into step every half a minute or so.
    this.front = this.#layer(buffers.front, FRONT_FIRING_HZ, 0.37, FRONT_WANDER);
  }

  #layer(buffer, referenceHz, offsetFraction, shape) {
    const ctx = this.ctx;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = buffer.duration;

    // Below about 0.5× the clip's own bandwidth ends up as rumble; this keeps
    // it out without touching the firing fundamental, which never gets below
    // ~27 Hz... which is under 45. Cut gently, then.
    const rumble = ctx.createBiquadFilter();
    rumble.type = 'highpass';
    rumble.frequency.value = 30;
    rumble.Q.value = 0.7;

    // Opens with load. A recording made off throttle stays dull until she is
    // asked for something, which is most of the difference between cruising and
    // climbing.
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2000;
    tone.Q.value = 0.6;

    const gain = ctx.createGain();
    gain.gain.value = 0.0001;

    source.connect(rumble).connect(tone).connect(gain).connect(this.gain);
    source.start(0, buffer.duration * offsetFraction);
    return { source, rumble, tone, gain, referenceHz, shape };
  }

  #rate(layer, firing, load, now) {
    const rate = (firing / layer.referenceHz) * wander(now, load, layer.shape);
    return Math.max(MIN_RATE, Math.min(MAX_RATE, rate));
  }

  render({ firing, load, through, shifting }, now) {
    const rearRate = this.#rate(this.rear, firing, load, now);
    const frontRate = this.#rate(this.front, firing, load, now);
    this.rear.source.playbackRate.setTargetAtTime(rearRate, now, GLIDE);
    this.front.source.playbackRate.setTargetAtTime(frontRate, now, GLIDE);

    // The exhaust carries the body of it and barely changes. The front layer is
    // the effort: quiet and dull off throttle, loud and open with load and revs.
    // Levels are set against the synth's, measured by rendering the same rev
    // sweep through both: a voice that is 6 dB quieter than the one it replaced
    // reads as "the engine sound is broken" rather than as a mix decision.
    const rearLevel = shifting ? 0.62 : 0.86 + load * 0.3;
    // The front layer breathes as well as wanders. Same idea, slower, and only
    // on the layer that is meant to sound like effort.
    const breath = 1 + 0.11 * Math.sin(now * 1.37 + 0.6);
    const frontLevel = shifting
      ? 0.16
      : (0.19 + load * 0.78 * (0.35 + through * 0.65)) * breath;
    this.rear.gain.gain.setTargetAtTime(rearLevel, now, GLIDE);
    this.front.gain.gain.setTargetAtTime(frontLevel, now, GLIDE);

    // Both filters track the note as well as the load, so pitching the clip up
    // does not simply make it brighter for free.
    this.rear.tone.frequency.setTargetAtTime(900 + firing * 8 + load * 1600, now, GLIDE);
    this.front.tone.frequency.setTargetAtTime(700 + firing * 10 + load * 4200, now, GLIDE);
  }

  stop() {
    for (const layer of [this.rear, this.front]) {
      try {
        layer.source.stop();
      } catch (error) {
        void error; // already stopped
      }
      try {
        layer.source.disconnect();
      } catch (error) {
        void error;
      }
    }
    this.disconnect();
  }
}

// The original synth, kept whole.
//
// A four-stroke fires once per cylinder every two revolutions, so a four gives
// two firing pulses per rev and a V8 gives four. Double the pulse rate at the
// same crank speed is exactly why one sounds thrashy and the other sounds like
// it is idling when it is not, and it is the only reason this can play an
// engine that was never recorded.
export class SynthVoice extends Voice {
  constructor(ctx, destination, engine) {
    super(ctx, destination);
    this.kind = 'synth';
    // A big lazy V8 wants a fatter, lower body and less of the small-four
    // intake thrash, so the mix shifts with the engine rather than being tuned
    // once for the A-series and left.
    this.bigEngine = engine.cylinders > 6;

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
    this.body.connect(this.bodyGain).connect(this.bodyFilter).connect(this.gain);

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
    this.bark.connect(this.barkGain).connect(this.barkFilter).connect(this.gain);

    // Intake whine: a quiet square an octave up, which is what gives a small
    // four its thrashiness near the redline.
    this.whine = ctx.createOscillator();
    this.whine.type = 'square';
    this.whineGain = ctx.createGain();
    this.whineGain.gain.value = 0.0;
    this.whine.connect(this.whineGain).connect(this.gain);

    this.body.start();
    this.bark.start();
    this.whine.start();
  }

  render({ firing, load, through, shifting }, now) {
    // Oscillators are the most even thing in this file, so they want the wander
    // more than the recordings do.
    const f = firing * wander(now, load, SYNTH_WANDER);
    this.body.frequency.setTargetAtTime(f * 0.5, now, GLIDE);
    this.bark.frequency.setTargetAtTime(f, now, GLIDE);
    this.whine.frequency.setTargetAtTime(f * 2, now, GLIDE);

    // Under load the bandpass opens and the whine comes up: more harmonics, more
    // effort. Off throttle it closes and she just burbles.
    this.barkFilter.frequency.setTargetAtTime(420 + f * 3.2 + load * 900, now, GLIDE);
    this.barkFilter.Q.setTargetAtTime(1.4 + load * 2.6, now, GLIDE);
    this.bodyFilter.frequency.setTargetAtTime(160 + f * 1.1, now, GLIDE);
    const whine = this.bigEngine ? 0.35 : 1;
    this.whineGain.gain.setTargetAtTime(
      shifting ? 0.004 : (0.012 + load * 0.05 * (0.25 + through * 0.75)) * whine,
      now,
      GLIDE
    );
  }

  stop() {
    for (const osc of [this.body, this.bark, this.whine]) {
      try {
        osc.stop();
      } catch (error) {
        void error; // already stopped
      }
    }
    this.disconnect();
  }
}
