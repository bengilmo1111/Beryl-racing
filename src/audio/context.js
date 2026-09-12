// One AudioContext for everything the game makes a noise with itself — the
// engine and the horn.
//
// Getting hold of a usable AudioContext is harder than it looks on a phone, and
// is why the engine was silent on Android while the music played fine. Two
// independent things go wrong, and both produce exactly that symptom:
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
//
// The context we make is kept for the life of the page rather than closed with
// whatever created it. Browsers cap a page at a handful of AudioContexts, and a
// race scene is restarted every time the player retries — one per retry would
// run that budget out. It is also shared: the engine and the horn must be able
// to outlive each other.

let ownContext = null;

// { ctx, owned }. `owned` means we made it, which the audio readout reports
// because "Phaser has no WebAudio manager" is the single most useful thing to
// know when diagnosing silence on a phone.
export function acquireContext(soundManager) {
  if (soundManager && soundManager.context) {
    return { ctx: soundManager.context, owned: false };
  }
  if (ownContext) return { ctx: ownContext, owned: true };
  const Ctor = typeof window !== 'undefined'
    && (window.AudioContext || window.webkitAudioContext);
  if (!Ctor) return { ctx: null, owned: false };
  try {
    ownContext = new Ctor();
    return { ctx: ownContext, owned: true };
  } catch (error) {
    void error;
    return { ctx: null, owned: false };
  }
}

// Everything the game makes itself — the engine, the horn — goes out through one
// bus with a limiter on the end of it, rather than straight at the destination.
//
// The arithmetic is why. The engine peaks around −6 dBFS at full chat, the horn
// around −4, and the music is a mastered mp3 that touches 0 dBFS played at 0.4.
// Those three summed are half again over full scale, and a Web Audio
// destination does not politely turn that down: it clips, and a clipped horn
// over a clipped engine is a crackle. The limiter only does anything in that
// coincidence — press the horn flat out in top — and holds our half of the mix
// just under 0.6 so there is room for the music.
//
// The music is Phaser's and does not come through here, which is deliberate:
// ducking the soundtrack every time somebody honks would be a mixing decision,
// and this is a safety net.
const buses = new WeakMap();

export function outputBus(ctx) {
  if (!ctx) return null;
  const existing = buses.get(ctx);
  if (existing) return existing;
  let bus;
  try {
    bus = ctx.createDynamicsCompressor();
    bus.threshold.value = -7;
    bus.knee.value = 5;
    bus.ratio.value = 16;
    bus.attack.value = 0.002;
    bus.release.value = 0.25;
  } catch (error) {
    void error;
    bus = ctx.createGain(); // no compressor here; better unlimited than silent
  }
  bus.connect(ctx.destination);
  buses.set(ctx, bus);
  return bus;
}

const GESTURES = ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'keydown', 'click'];

function gestureTargets() {
  const targets = [];
  if (typeof window !== 'undefined') targets.push(window);
  if (typeof document !== 'undefined') targets.push(document);
  return targets;
}

// Resume now, and again on every gesture until it takes. Returns a function
// that reports whether it is still waiting for one, and a `cancel` to detach.
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
export function resumeOnGesture(ctx) {
  if (!ctx) return { waiting: () => false, cancel: () => {} };
  let handler = null;
  const stop = () => {
    if (!handler) return;
    for (const target of gestureTargets()) {
      for (const type of GESTURES) target.removeEventListener(type, handler, { capture: true });
    }
    handler = null;
  };
  const tryResume = () => {
    if (ctx.state === 'running') {
      stop();
      return;
    }
    const attempt = ctx.resume();
    if (attempt && attempt.then) attempt.then(stop, () => {});
  };
  handler = tryResume;
  for (const target of gestureTargets()) {
    for (const type of GESTURES) {
      target.addEventListener(type, tryResume, { passive: true, capture: true });
    }
  }
  tryResume();
  return { waiting: () => !!handler, cancel: stop };
}
