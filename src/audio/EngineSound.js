// A procedural small-classic-car engine (Morris Minor-ish): a low, puttery
// four-cylinder chug synthesised with Web Audio. Pitch, brightness and the
// "chug" rate all rise with speed; volume swells with speed and throttle.
//
// Built on Phaser's AudioContext but routed straight to the context
// destination, so we control its volume/mute ourselves (see update's `muted`).
export class EngineSound {
  constructor(soundManager) {
    this.ctx = soundManager && soundManager.context ? soundManager.context : null;
    this.ok = !!this.ctx;
    if (!this.ok) return;
    const ctx = this.ctx;
    if (ctx.state === 'suspended') ctx.resume();

    // Output volume envelope.
    this.out = ctx.createGain();
    this.out.gain.value = 0.0001;
    this.out.connect(ctx.destination);

    // "Chug" gain, wobbled by an LFO to give the lumpy small-engine beat.
    this.chug = ctx.createGain();
    this.chug.gain.value = 0.7;
    this.chug.connect(this.out);

    // Muffled tone.
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 400;
    this.filter.Q.value = 6;
    this.filter.connect(this.chug);

    // Two detuned sawtooths: firing buzz + an octave-down body.
    this.osc1 = ctx.createOscillator();
    this.osc1.type = 'sawtooth';
    this.osc1.frequency.value = 48;
    this.g1 = ctx.createGain();
    this.g1.gain.value = 0.5;
    this.osc1.connect(this.g1).connect(this.filter);

    this.osc2 = ctx.createOscillator();
    this.osc2.type = 'sawtooth';
    this.osc2.frequency.value = 24;
    this.osc2.detune.value = -6;
    this.g2 = ctx.createGain();
    this.g2.gain.value = 0.45;
    this.osc2.connect(this.g2).connect(this.filter);

    // LFO wobble on the chug gain (sawtooth => a putt-putt attack).
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sawtooth';
    this.lfo.frequency.value = 7;
    this.lfoGain = ctx.createGain();
    this.lfoGain.gain.value = 0.35;
    this.lfo.connect(this.lfoGain).connect(this.chug.gain);

    this.osc1.start();
    this.osc2.start();
    this.lfo.start();
  }

  // speedRatio in [0,1]; throttle -1..1; muted boolean.
  update(speedRatio, throttle, muted) {
    if (!this.ok) return;
    const t = this.ctx.currentTime;
    const r = Math.max(0, Math.min(1, speedRatio));
    const f = 46 + r * 150; // firing pitch
    this.osc1.frequency.setTargetAtTime(f, t, 0.06);
    this.osc2.frequency.setTargetAtTime(f / 2, t, 0.06);
    this.filter.frequency.setTargetAtTime(320 + r * 1500, t, 0.06);
    this.lfo.frequency.setTargetAtTime(6 + r * 26, t, 0.06); // faster chug with speed

    let vol = 0.05 + r * 0.1 + (throttle > 0 ? 0.03 : 0);
    if (muted) vol = 0;
    this.out.gain.setTargetAtTime(Math.max(vol, 0.0001), t, 0.08);
  }

  stop() {
    if (!this.ok) return;
    try {
      this.osc1.stop();
      this.osc2.stop();
      this.lfo.stop();
    } catch (e) {
      /* already stopped */
    }
    try {
      this.out.disconnect();
    } catch (e) {
      /* noop */
    }
    this.ok = false;
  }
}
