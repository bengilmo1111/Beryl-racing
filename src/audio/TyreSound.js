import { acquireContext, outputBus, resumeOnGesture } from './context.js';

// Procedural tyre friction: the supplied recordings contain engine and horn,
// so they cannot provide an isolated tyre sample. Share the vehicle audio bus.
export class TyreSound {
  constructor(soundManager) {
    this.ctx = acquireContext(soundManager).ctx;
    if (!this.ctx) return;
    const ctx = this.ctx;
    this.resume = resumeOnGesture(ctx);
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Local PRNG: audio construction must not consume the game's random stream.
    let seed = 7391;
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data[i] = seed / 2147483648 - 1;
    }
    this.source = ctx.createBufferSource();
    this.source.buffer = buffer;
    this.source.loop = true;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'bandpass';
    this.filter.Q.value = 1.4;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.source.connect(this.filter).connect(this.out).connect(outputBus(ctx));
    this.source.start();
  }

  update({ speed, sliding, onTrack, surface, muted }) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const pace = Math.max(0, Math.min(1, speed));
    const rough = !onTrack || surface === 'gravel';
    const scrub = !rough && sliding && pace > 0.12;
    const moving = Math.max(0, (pace - 0.03) / 0.97);
    const level = muted ? 0 : scrub ? 0.24 + pace * 0.16 : rough ? moving * 0.18 : 0;
    this.filter.frequency.setTargetAtTime(scrub ? 950 + pace * 800 : 240 + pace * 450, now, 0.06);
    this.filter.Q.setTargetAtTime(scrub ? 2.8 : 0.7, now, 0.06);
    this.out.gain.setTargetAtTime(level, now, muted ? 0.015 : 0.06);
  }

  stop() {
    if (!this.ctx) return;
    this.resume.cancel();
    this.source.stop();
    this.source.disconnect();
    this.filter.disconnect();
    this.out.disconnect();
    this.ctx = null;
  }
}
