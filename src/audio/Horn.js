// Beryl's horn.
//
// A recording of the real one: a single note at about 315 Hz with the harmonic
// stack on top of it that makes a car horn sound like a car horn rather than a
// beep. One press, one honk, about a second of it — held or tapped, it is the
// same honk, which is what the real button does once you let go of it.
//
// It shares the engine's AudioContext (see context.js) and, like the engine,
// keeps a synthesised fallback for the case where the clip cannot be fetched:
// a horn that does nothing when you press it is worse than an approximate one.
import { acquireContext, resumeOnGesture } from './context.js';
import { loadSample, HORN } from './samples.js';

// The measured fundamental of the real horn, for the fallback to aim at.
const HORN_HZ = 315;
// Two honks closer together than this are one honk. Without it, holding a
// finger on a button that repeats — or leaning on the H key — stacks a new
// source every frame and the horn turns into a wall of noise.
const RETRIGGER_SECONDS = 0.18;
const FALLBACK_SECONDS = 0.75;

export class Horn {
  constructor(soundManager) {
    const acquired = acquireContext(soundManager);
    this.ctx = acquired.ctx;
    this.ok = !!this.ctx;
    this.buffer = null;
    this.source = 'loading';
    this.lastPlayed = -Infinity;
    this.playing = null;
    this.stopped = false;
    if (!this.ok) return;

    this.resume = resumeOnGesture(this.ctx);
    this.out = this.ctx.createGain();
    this.out.gain.value = 0.75;
    this.out.connect(this.ctx.destination);

    loadSample(this.ctx, HORN).then((buffer) => {
      if (this.stopped) return;
      this.buffer = buffer;
      this.source = buffer ? 'recording' : 'synth';
    });
  }

  // One honk. Returns what it played, which is what the playtest checks and
  // what the on-screen audio readout reports.
  //
  // Muting is the caller's business: the scene knows whether the player has
  // turned the sound off, and this does not.
  play() {
    if (!this.ok) return 'none';
    const ctx = this.ctx;
    // The horn is often the first thing a player touches, and on a phone the
    // context is still suspended at that point. Resuming is asynchronous, so
    // honk on the other side of it rather than into a stopped clock.
    if (ctx.state === 'suspended') {
      const attempt = ctx.resume();
      if (attempt && attempt.then) {
        attempt.then(() => this.#honk(), () => {});
        return 'pending';
      }
    }
    return this.#honk();
  }

  #honk() {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    if (now - this.lastPlayed < RETRIGGER_SECONDS) return 'retrigger';
    this.lastPlayed = now;
    // A honk already sounding is cut short rather than layered, so a double tap
    // is two honks and not one fat one.
    this.#stopCurrent(now);
    return this.buffer ? this.#playRecording(now) : this.#playFallback(now);
  }

  #playRecording(now) {
    const ctx = this.ctx;
    const source = ctx.createBufferSource();
    source.buffer = this.buffer;
    const gain = ctx.createGain();
    gain.gain.value = 1;
    source.connect(gain).connect(this.out);
    source.start(now);
    this.playing = { gain, stop: () => source.stop() };
    source.onended = () => {
      if (this.playing && this.playing.gain === gain) this.playing = null;
      try {
        gain.disconnect();
      } catch (error) {
        void error;
      }
    };
    return 'recording';
  }

  // Not the real horn, but the same note and the same shape: a sawtooth at the
  // fundamental through a resonant bandpass sitting on the third harmonic,
  // which is where most of the real one's energy is.
  #playFallback(now) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = HORN_HZ;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = HORN_HZ * 3;
    band.Q.value = 2.4;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.02);
    gain.gain.setValueAtTime(0.5, now + FALLBACK_SECONDS - 0.06);
    gain.gain.linearRampToValueAtTime(0.0001, now + FALLBACK_SECONDS);
    osc.connect(band).connect(gain).connect(this.out);
    osc.start(now);
    osc.stop(now + FALLBACK_SECONDS + 0.02);
    this.playing = { gain, stop: () => osc.stop() };
    osc.onended = () => {
      if (this.playing && this.playing.gain === gain) this.playing = null;
      try {
        gain.disconnect();
      } catch (error) {
        void error;
      }
    };
    return 'synth';
  }

  // A short fade rather than an abrupt stop: cutting a loud tone mid-cycle is a
  // click.
  #stopCurrent(now) {
    const current = this.playing;
    if (!current) return;
    this.playing = null;
    try {
      current.gain.gain.cancelScheduledValues(now);
      current.gain.gain.setValueAtTime(current.gain.gain.value, now);
      current.gain.gain.linearRampToValueAtTime(0.0001, now + 0.015);
      setTimeout(() => {
        try {
          current.stop();
        } catch (error) {
          void error; // already finished
        }
      }, 40);
    } catch (error) {
      void error;
    }
  }

  describe() {
    return { ok: this.ok, source: this.source, contextState: this.ctx ? this.ctx.state : 'none' };
  }

  stop() {
    this.stopped = true;
    if (!this.ok) return;
    if (this.resume) this.resume.cancel();
    this.#stopCurrent(this.ctx.currentTime);
    try {
      this.out.disconnect();
    } catch (error) {
      void error;
    }
    this.ok = false;
  }
}
