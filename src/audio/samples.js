// Beryl's own voice: recordings of the real car, decoded once and shared.
//
// Three clips, cut from ~30 s phone recordings made at the car (the masters are
// in `reference/audio/`, and `reference/audio/README.md` records exactly which
// seconds each loop came from):
//
//  • engine-front — from in front of the car, so mostly induction and the
//    mechanical racket off the block. Bright, busy, what she sounds like when
//    she is working.
//  • engine-rear  — from behind, by the exhaust. Boomier and steadier, and the
//    layer that carries the note from a chase camera.
//  • horn         — one press of the real horn. A single tone, ~315 Hz, with
//    the harmonic stack that makes it sound like a car and not a beep.
//
// They are 16-bit mono WAV, 22.05 kHz, and WAV on purpose. mp3 and AAC both
// carry encoder delay and padding that `decodeAudioData` turns into silence at
// the head and tail of the buffer, which is inaudible on a one-shot and fatal
// on a loop: the gap lands in the middle of the engine note every 1.8 seconds.
// The engine clips are also cut to a whole number of firing cycles and wrapped
// with a crossfade, so the buffers loop with no click and no dropout. Recutting
// them by hand loses both properties — see the reference README first.
//
// Nothing here throws. A clip that will not load or decode resolves to null and
// the caller falls back to the synth, because a game that goes quiet is better
// than a game that will not start.

const buffers = new Map(); // url -> Promise<AudioBuffer|null>
const failures = [];

export const ENGINE_FRONT = 'beryl-engine-front.wav';
export const ENGINE_REAR = 'beryl-engine-rear.wav';
export const HORN = 'beryl-horn.wav';

// Always beneath the configured base path: production is served under
// /beryl-racing/ through the gateway, so a root-relative URL 404s there.
export function sampleUrl(name) {
  return `${import.meta.env.BASE_URL}assets/${name}`;
}

function decode(ctx, bytes) {
  // Safari's older signature is callback-only and returns undefined, so the
  // promise form cannot simply be awaited everywhere.
  return new Promise((resolve, reject) => {
    const attempt = ctx.decodeAudioData(bytes, resolve, reject);
    if (attempt && attempt.then) attempt.then(resolve, reject);
  });
}

// The decoded clip, or null if it could not be had. Cached per URL: AudioBuffers
// are plain sample data and may be played by any context, and there is only one
// context here anyway.
export function loadSample(ctx, name) {
  if (!ctx) return Promise.resolve(null);
  const url = sampleUrl(name);
  if (buffers.has(url)) return buffers.get(url);
  const pending = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.arrayBuffer();
    })
    .then((bytes) => decode(ctx, bytes))
    .catch((error) => {
      const why = `${name}: ${error && error.message ? error.message : error}`;
      failures.push(why);
      console.warn(`Beryl sample unavailable, falling back to the synth — ${why}`);
      return null;
    });
  buffers.set(url, pending);
  return pending;
}

// Kick all three off during the loading splash so the race does not start on a
// fetch. Decoding works happily on a suspended context, so this does not need a
// gesture first — only playing does.
export function primeSamples(ctx) {
  return Promise.all([ENGINE_FRONT, ENGINE_REAR, HORN].map((name) => loadSample(ctx, name)));
}

// For the audio readout: what, if anything, refused to load.
export function sampleFailures() {
  return failures.slice();
}
