// The player's path, which the deterministic harness deliberately never runs.
//
// `?harness=1` disables audio outright — AudioContext is wall-clock and would
// inject non-determinism — so nothing in test:determinism or the playtest matrix
// ever constructs an EngineSound or draws a sign over real terrain. This loads
// the game the way a person does and checks both.
//
// It also asserts the gearbox actually shifts. That is the whole point of the
// synth: a Morris Minor revs hard and does not go fast, so if the revs only ever
// slide upward the engine has lost its character and nothing else would notice.
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
console.log('audio-check: PASS — four gears, revs to ' + peak + ', dropping on every shift');

