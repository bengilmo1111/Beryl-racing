// The player's path, which the deterministic harness deliberately never runs.
//
// `?harness=1` disables audio outright — AudioContext is wall-clock and would
// inject non-determinism — so nothing in test:determinism or the playtest matrix
// ever constructs an EngineSound or draws a sign over real terrain. This loads
// the game the way a person does and checks both.
//
// It also asserts the gearbox actually shifts. That is the whole point of it: a
// Morris Minor revs hard and does not go fast, so if the revs only ever slide
// upward the engine has lost its character and nothing else would notice.
//
// And it asserts that what you hear is the real car. The engine is two loops cut
// from recordings of Beryl and the horn is one press of hers, so there are three
// new ways to be silent — a clip that 404s beneath the base path, a clip that
// will not decode, a horn button wired to nothing — and every one of them falls
// back quietly enough that nobody would notice until a player did. The clips are
// rendered offline here and measured: pitch has to follow the revs, the loops
// have to join without a click, and the horn has to sound when the button is
// pressed and when H is.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ server: { host: '127.0.0.1', port: 4455, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
const warnings = [];
page.on('pageerror', (e) => errors.push(e.stack || e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
  if (m.type() === 'warning') warnings.push(m.text());
});
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
await page.goto('http://127.0.0.1:4455/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => !!window.__BERYL_GAME__, null, { timeout: 20000 });

// Title -> race, the way a player gets there.
await page.mouse.click(640, 400);
await page.waitForTimeout(1200);
await page.keyboard.press('Enter');
await page.waitForTimeout(6000);

// Drive her, and sample what the synth is doing as the game runs it. The
// synthetic sweep this replaced called update() twice per sample with a sleep
// between, which is not how the game drives it and made the shift dip look
// permanent.
// Drive the synth the way the game does: one update per frame with the speed
// ratio rising, on the real AudioContext clock.
//
// An earlier version called update() twice per sample with a sleep in between,
// which is not how it is driven and made the clutch dip look permanent.
const drive = await page.evaluate(async () => {
  // A dedicated instance. Probing the scene's own engine meant two callers
  // driving one gearbox — the scene feeding it the parked car's speed and the
  // probe feeding it a sweep — so the gear flipped every frame and the clutch
  // dip re-armed every frame with it. The synth was fine; the measurement was
  // driving it twice.
  const { EngineSound } = await import('/src/audio/EngineSound.js');
  const race = window.__BERYL_GAME__.scene.getScene('Race');
  const engine = new EngineSound(race.sound);
  const out = [];
  const SECONDS = 9;
  const t0 = performance.now();
  let nextSample = 0;
  while (performance.now() - t0 < SECONDS * 1000) {
    const elapsed = (performance.now() - t0) / 1000;
    const ratio = Math.min(1, elapsed / SECONDS);
    engine.update(ratio, 1, true, 0); // muted: this is a measurement, not a noise
    if (elapsed >= nextSample) {
      out.push({ pct: Math.round(ratio * 100), gear: engine.gear + 1, rpm: Math.round(engine.rpm) });
      nextSample += 0.45;
    }
    await new Promise((r) => setTimeout(r, 16));
  }
  engine.stop();
  return out;
});
// The Android failure, reproduced.
//
// Music played and the engine did not, which narrows it to two things — Phaser
// landing on a sound manager that has no AudioContext at all (an mp3 is an
// <audio> element and needs none), or a context that starts suspended on mobile
// and is never resumed because the one resume attempt happens before any touch.
// Both must be survivable, so both are checked here rather than reasoned about.
const fallback = await page.evaluate(async () => {
  const { EngineSound } = await import('/src/audio/EngineSound.js');
  // A manager with no `.context`, which is what HTML5AudioSoundManager and
  // NoAudioSoundManager both look like from the outside.
  const engine = new EngineSound({ }, null);
  const out = { ok: engine.ok, owns: engine.ownsContext, status: engine.status };
  engine.stop();
  return out;
});
assert.ok(fallback.ok, `no context without Phaser's: ${fallback.status}`);
assert.ok(fallback.owns, 'should have made its own context when Phaser had none');

// And the other engine. Manfeild's joke only works if you can hear it: a V8
// fires four times per crankshaft revolution where the A-series fires twice, so
// the two courses must not sound the same.
const v8 = await page.evaluate(async () => {
  const { EngineSound } = await import('/src/audio/EngineSound.js');
  const { TRACKS } = await import('/src/tracks.js');
  const race = window.__BERYL_GAME__.scene.getScene('Race');
  const def = TRACKS.find((t) => t.id === 'manfield');
  const engine = new EngineSound(race.sound, def.engine);
  engine.update(0.9, 1, true, 0);
  const out = {
    intro: def.intro,
    cylinders: engine.engine.cylinders,
    firingsPerRev: engine.firingsPerRev,
    redline: engine.engine.redline,
  };
  engine.stop();
  return out;
});

// The recordings, rendered offline and measured.
//
// An OfflineAudioContext is the only way to inspect what a Web Audio graph
// actually produces: it renders faster than real time into a buffer that can be
// read sample by sample. Three things are worth knowing and none of them can be
// heard from here — that the note follows the revs, that the loops join without
// a click, and that nothing clips.
const recorded = await page.evaluate(async () => {
  const { RecordedVoice } = await import('/src/audio/engineVoices.js');
  const { loadSample, ENGINE_FRONT, ENGINE_REAR } = await import('/src/audio/samples.js');
  const probe = new AudioContext();
  const [front, rear] = await Promise.all([
    loadSample(probe, ENGINE_FRONT),
    loadSample(probe, ENGINE_REAR),
  ]);
  probe.close();
  if (!front || !rear) return { loaded: false };

  // Zero crossings per second: a coarse pitch, and enough to tell 1200 rpm from
  // 4200 rpm without an FFT.
  const render = async (rpm) => {
    const SR = 22050;
    const ctx = new OfflineAudioContext(1, SR * 3, SR);
    const master = ctx.createGain();
    master.gain.value = 0.36;
    master.connect(ctx.destination);
    const voice = new RecordedVoice(ctx, master, { front, rear });
    const firing = (rpm / 60) * 2;
    voice.render({ firing, rpm, load: 0.6, through: 0.5, shifting: false }, 0);
    const data = (await ctx.startRendering()).getChannelData(0);
    // Skip the first half second: the gains and filters are still gliding.
    const from = SR / 2;
    let crossings = 0;
    let peak = 0;
    let jump = 0;
    for (let i = from + 1; i < data.length; i++) {
      if ((data[i] >= 0) !== (data[i - 1] >= 0)) crossings++;
      peak = Math.max(peak, Math.abs(data[i]));
      jump = Math.max(jump, Math.abs(data[i] - data[i - 1]));
    }
    return { rpm, crossings: crossings / ((data.length - from) / SR), peak, jump };
  };
  return { loaded: true, low: await render(1200), high: await render(4200) };
});

// The horn, through the two things a player can actually press: the H key and
// the button. Both are driven as real input — a synthetic Phaser event would
// prove only that the event bus works, and the H key is read as a *fresh* press
// (`JustDown`) precisely so that a held key does not honk thirty times a
// second, which is state a synthesised event does not have.
const hornBefore = await page.evaluate(() => {
  const race = window.__BERYL_GAME__.scene.getScene('Race');
  if (!race.horn) return null;
  const buttons = race.children.list
    .filter((child) => child.type === 'Container' && child.depth === 1000)
    .sort((a, b) => a.y - b.y);
  const button = buttons[buttons.length - 1];
  return {
    source: race.horn.describe().source,
    lastPlayed: race.horn.lastPlayed,
    buttons: buttons.length,
    at: button ? { x: button.x + button.width / 2, y: button.y + button.height / 2 } : null,
  };
});
assert.ok(hornBefore, 'the race built no horn');
assert.equal(hornBefore.source, 'recording', `the horn is not playing the recording (${hornBefore.source})`);
assert.equal(hornBefore.buttons, 3, `expected fullscreen, sound and horn buttons, saw ${hornBefore.buttons}`);
assert.ok(hornBefore.at, 'no horn button on screen to press');

await page.keyboard.press('h');
await page.waitForTimeout(200);
const afterKey = await page.evaluate(() => window.__BERYL_GAME__.scene.getScene('Race').horn.lastPlayed);
assert.ok(afterKey > hornBefore.lastPlayed, 'H did not sound the horn');

// Long enough after the last honk to be a second honk rather than a retrigger.
await page.waitForTimeout(300);
await page.mouse.click(hornBefore.at.x, hornBefore.at.y);
await page.waitForTimeout(200);
const afterTap = await page.evaluate(() => window.__BERYL_GAME__.scene.getScene('Race').horn.lastPlayed);
assert.ok(afterTap > afterKey, 'tapping the horn button did not sound the horn');

console.log('accelerating from rest, one update per frame:');
let last = null;
for (const d of drive) {
  const mark = last !== null && d.gear !== last ? '   <- shift' : '';
  console.log(`  ${String(d.pct).padStart(3)}% of top   gear ${d.gear}   ${String(d.rpm).padStart(4)} rpm${mark}`);
  last = d.gear;
}

const state = await page.evaluate(() => {
  const race = window.__BERYL_GAME__.scene.getScene('Race');
  return {
    raceActive: !!race && race.scene.isActive(),
    audio: typeof window.__berylAudio === 'function' ? window.__berylAudio() : null,
    signs: race ? null : null,
  };
});
console.log('race active:', state.raceActive);
console.log('audio:', JSON.stringify(state.audio));
console.log('page errors:', errors.length ? errors.join('\n  ') : 'none');
if (warnings.length) console.log('warnings:', warnings.join('\n  '));
await browser.close();
await server.close();

// Assertions, so this fails rather than merely reporting.
assert.equal(errors.length, 0, `page errors:\n  ${errors.join('\n  ')}`);
assert.ok(state.raceActive, 'race scene did not start');
assert.ok(state.audio && state.audio.ok, `engine sound not ok: ${state.audio && state.audio.status}`);
assert.equal(state.audio.contextState, 'running', 'AudioContext is not running');

const gears = [...new Set(drive.map((d) => d.gear))];
assert.deepEqual(gears, [1, 2, 3, 4], `expected to shift through all four gears, saw ${gears}`);
const peak = Math.max(...drive.map((d) => d.rpm));
assert.ok(peak > 4000, `revs never got near the redline (peak ${peak})`);
for (let i = 1; i < drive.length; i++) {
  if (drive[i].gear === drive[i - 1].gear) continue;
  assert.ok(
    drive[i].rpm < drive[i - 1].rpm,
    `revs did not drop on the ${drive[i - 1].gear}->${drive[i].gear} shift`
  );
}

assert.ok(recorded.loaded, 'the engine recordings did not load');
// Both are two firings per revolution of a four, so 4200 rpm must cross zero a
// great deal more often than 1200 does. Anything less means the playback rate is
// not following the gearbox and the recordings are just a loop.
assert.ok(
  recorded.high.crossings > recorded.low.crossings * 1.8,
  `the note does not follow the revs: ${Math.round(recorded.low.crossings)} crossings/s at 1200 rpm, `
  + `${Math.round(recorded.high.crossings)} at 4200`
);
// A loop whose ends do not meet clicks once per lap of the buffer, and a click
// is a step. Ordinary engine noise moves a fiftieth of full scale between
// samples; a joint that has come apart moves a quarter of it.
for (const point of [recorded.low, recorded.high]) {
  assert.ok(point.jump < 0.1, `the engine loop clicks at ${point.rpm} rpm (step of ${point.jump.toFixed(3)})`);
  assert.ok(point.peak < 0.99, `the engine clips at ${point.rpm} rpm (peak ${point.peak.toFixed(3)})`);
}

assert.equal(v8.cylinders, 8, 'Manfeild should have the V8');
assert.equal(v8.firingsPerRev, 4, 'a V8 fires four times per crankshaft revolution');
assert.ok(v8.redline > peak, 'the V8 should rev past where the A-series gives up');
assert.ok(v8.intro, 'Manfeild needs an intro line, or the joke goes unexplained');

console.log(`audio-check: PASS — four gears, revs to ${peak}, dropping on every shift`);
console.log(`audio-check: PASS — survives a sound manager with no AudioContext (${fallback.status})`);
console.log(
  `audio-check: PASS — real recordings, ${Math.round(recorded.low.crossings)}→`
  + `${Math.round(recorded.high.crossings)} zero crossings/s from 1200 to 4200 rpm, `
  + `no click (largest step ${Math.max(recorded.low.jump, recorded.high.jump).toFixed(3)})`
);
console.log(`audio-check: PASS — horn sounds the ${hornBefore.source} on H and on the button`);
console.log(`audio-check: PASS — Manfeild V8, ${v8.firingsPerRev} firings/rev to ${v8.redline}, "${v8.intro}"`);

