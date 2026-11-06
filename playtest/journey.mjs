import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdir } from 'node:fs/promises';
const out = process.env.JOURNEY_OUT || 'playtest-out/journey';
await mkdir(out, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 4491, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.goto('http://127.0.0.1:4491/');
  await page.getByRole('button', { name: 'Start the Sunday run' }).waitFor();
  await page.screenshot({ path: `${out}/round-3-title.png` });
  await page.getByRole('button', { name: 'Start the Sunday run' }).click();
  await page.getByRole('dialog', { name: 'The Sunday run', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Read the chapter & drive' }).click();
  await page.getByRole('dialog', { name: 'The first box', exact: true }).waitFor();
  await page.screenshot({ path: `${out}/round-1-chapter.png` });
  // Keyboard activation of DOM controls must not trigger Title's free-drive shortcut.
  await page.getByRole('button', { name: 'Take Beryl out', exact: true }).press('Enter');
  await page.waitForFunction(() => window.__BERYL_GAME__.scene.getScene('Race').journeyChapter?.id === 'first-box');
  assert.equal(await page.locator('.journey-overlay').count(), 0);
  await page.evaluate(() => {
    const scene = window.__BERYL_GAME__.scene.getScene('Race');
    scene.finishSprint();
  });
  await page.getByRole('dialog', { name: 'The first box — arrival' }).waitFor();
  await page.getByRole('button', { name: 'Put the book away' }).click();
  await page.getByRole('button', { name: 'Continue the Sunday run' }).waitFor();
  await page.reload();
  await page.getByRole('button', { name: 'Continue the Sunday run · Tea on the hill' }).waitFor();
  // A saved fifth chapter deliberately has a different global route choice:
  // continuation must use the itinerary saved with the checkpoint.
  await page.evaluate(async () => {
    const story = await import('/src/journey/story.js');
    let save = story.cleanJourney(null);
    for (const c of story.CHAPTERS.slice(0, 4)) save = story.finishChapter(save, c);
    save.choice = 'riverbank';
    save.checkpoint = { chapter: 'the-road-we-choose', gate: 4, elapsed: 31, roughSeconds: 9, contacts: 3, route: 'old-town' };
    story.writeJourney(save);
    const { TRACKS } = await import('/src/tracks.js');
    const def = TRACKS.find(t => t.id === 'otaki');
    localStorage.setItem(def.storageKey, '123456');
  });
  await page.reload();
  await page.getByRole('button', { name: 'Continue the Sunday run' }).click();
  await page.getByRole('button', { name: 'Read the chapter & drive' }).click();
  await page.getByRole('button', { name: 'Continue from the last stop' }).click();
  await page.waitForFunction(() => window.__BERYL_GAME__.scene.getScene('Race').journeyChapter?.id === 'the-road-we-choose');
  const resumed = await page.evaluate(() => {
    const scene = window.__BERYL_GAME__.scene.getScene('Race');
    return { gate: scene.expected, oldTown: scene.journeyRoute.oldTown,
      elapsed: scene.journeyDrive.elapsed, rough: scene.journeyDrive.roughSeconds,
      distance: Math.hypot(scene.car.x - scene.journeyRoute.gates[3].x, scene.car.y - scene.journeyRoute.gates[3].y) };
  });
  assert.ok(resumed.distance < 57.9, 'Resume starts within one metre of the saved road gate');
  delete resumed.distance;
  assert.deepEqual(resumed, { gate: 4, oldTown: true, elapsed: 31, rough: 9 });
  await page.evaluate(() => window.__BERYL_GAME__.scene.getScene('Race').goHome());
  await page.reload();
  await page.getByRole('button', { name: 'Continue the Sunday run' }).click();
  await page.getByRole('button', { name: 'Read the chapter & drive' }).click();
  await page.getByRole('button', { name: 'Continue from the last stop' }).waitFor();
  // Starting the chapter again makes the route choice available without deleting
  // the book. Seed a fresh chapter state to inspect both itinerary options.
  await page.evaluate(async () => {
    const story = await import('/src/journey/story.js');
    const save = story.readJourney(); save.checkpoint = null; story.writeJourney(save);
  });
  await page.reload();
  await page.setViewportSize({ width: 915, height: 412 });
  await page.getByRole('button', { name: 'Continue the Sunday run' }).click();
  await page.getByRole('button', { name: 'Read the chapter & drive' }).click();
  await page.getByRole('button', { name: 'Old town · Rāhui, Mill and Tasman' }).click();
  assert.equal(await page.getByRole('button', { name: 'Old town · Rāhui, Mill and Tasman' }).getAttribute('aria-pressed'), 'true');
  const actionBox = await page.getByRole('button', { name: 'Take Beryl out' }).boundingBox();
  assert.ok(actionBox && actionBox.y >= 0 && actionBox.y + actionBox.height <= 412, 'Phone chapter action stays visible');
  await page.screenshot({ path: `${out}/round-3-phone-route-choice.png` });
  await page.getByRole('button', { name: 'Take Beryl out' }).click();
  await page.waitForFunction(() => window.__BERYL_GAME__.scene.getScene('Race').journeyRoute?.oldTown);
  await page.evaluate(() => window.__BERYL_GAME__.scene.getScene('Race').finishSprint());
  await page.getByRole('dialog', { name: 'The road we choose — arrival' }).waitFor();
  await page.getByText('You arrive by Tasman Road.', { exact: false }).waitFor();
  assert.equal(await page.evaluate(async () => {
    const { TRACKS } = await import('/src/tracks.js');
    return localStorage.getItem(TRACKS.find(t => t.id === 'otaki').storageKey);
  }), '123456', 'Story arrival must not overwrite time-trial records');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.screenshot({ path: `${out}/round-3-arrival.png` });
  await page.getByRole('button', { name: 'Put the book away' }).click();
  await page.getByRole('button', { name: 'Continue the Sunday run · Next Sunday' }).waitFor();
  assert.equal(await page.evaluate(() => window.__BERYL_GAME__.registry.get('__journeyChapter')), undefined);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__BERYL_GAME__.scene.isActive('Race'));
  assert.equal(await page.evaluate(() => window.__BERYL_GAME__.scene.getScene('Race').journeyRoute), null, 'Free drive must not inherit story rules');
  assert.deepEqual(errors, []);
  // Storage can be denied entirely, rather than only running out of quota.
  const blocked = await browser.newPage({ viewport: { width: 915, height: 412 } });
  const blockedErrors = []; blocked.on('pageerror', e => blockedErrors.push(e.message));
  await blocked.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage denied', 'SecurityError'); } }));
  await blocked.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await blocked.goto('http://127.0.0.1:4491/');
  await blocked.getByRole('button', { name: 'Start the Sunday run' }).click();
  await blocked.getByRole('button', { name: 'Read the chapter & drive' }).click();
  await blocked.getByRole('button', { name: 'Take Beryl out' }).click();
  await blocked.waitForFunction(() => !!window.__BERYL_GAME__.scene.getScene('Race').journeyDrive);
  await blocked.evaluate(() => window.__BERYL_GAME__.scene.getScene('Race').finishSprint());
  await blocked.getByText('Progress is kept for this visit.', { exact: false }).waitFor();
  await blocked.getByRole('button', { name: 'Put the book away' }).click();
  await blocked.getByRole('button', { name: 'Continue the Sunday run · Tea on the hill' }).waitFor();
  assert.deepEqual(blockedErrors, []);
  await blocked.close();
  console.log('Storage denial PASS: playable session fallback with honest save status');
  console.log('Round 3 browser PASS: checkpoint reload, saved route and cargo, phone choice, consequence, record isolation and free drive');
  console.log('Round 1 browser PASS: title → brief → drive → arrival → saved next chapter after reload');
} finally { await browser.close(); await server.close(); }
