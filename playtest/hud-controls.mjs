import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdir } from 'node:fs/promises';
const server = await createServer({ server: { host: '127.0.0.1', port: 4497, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const errors = [];
try {
  await mkdir('playtest-out/hud-controls', { recursive: true });
  const context = await browser.newContext({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await page.goto('http://127.0.0.1:4497/');
  await page.waitForFunction(() => window.__BERYL_GAME__?.scene.isActive('Title'));
  await page.evaluate(() => window.__BERYL_GAME__.scene.getScene('Title').scene.start('Race'));
  await page.waitForFunction(() => window.__BERYL_GAME__.scene.getScene('Race').touch);
  const cdp = await context.newCDPSession(page);
  for (const [width, height] of [[915, 412], [667, 375]]) {
    await page.setViewportSize({ width, height });
    await page.waitForFunction(w => window.__BERYL_GAME__.scale.width === w, width);
    const buttons = await page.evaluate(() => {
      const touch = window.__BERYL_GAME__.scene.getScene('Race').touch;
      return Object.fromEntries(touch.buttons.map(b => [b.stateKey, { x: b.cx, y: b.cy, radius: b.radius }]));
    });
    for (const b of Object.values(buttons)) {
      assert.ok(b.x - b.radius >= 0 && b.x + b.radius <= width && b.y - b.radius >= 0 && b.y + b.radius <= height);
    }
    await page.screenshot({ path: `playtest-out/hud-controls/${width}x${height}.png` });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...buttons.left, id: 1 }, { ...buttons.gas, id: 2 }].map(({ x, y, id }) => ({ x, y, id })) });
    const input = await page.evaluate(() => window.__BERYL_GAME__.scene.getScene('Race').touch.getInput());
    assert.equal(input.steer, -1);
    assert.equal(input.throttle, 1);
    await page.screenshot({ path: `playtest-out/hud-controls/${width}x${height}-pressed.png` });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.deepEqual(await page.evaluate(() => window.__BERYL_GAME__.scene.getScene('Race').touch.getInput()), { steer: 0, throttle: 0, handbrake: false });
  }
  // Utility controls still use their full 44px targets after the optical inset.
  const sound = { x: 667 - 12 - 44 - 8 - 22, y: 34 };
  const before = await page.evaluate(async () => (await import('/src/audio/sound.js')).isMuted(window.__BERYL_GAME__.scene.getScene('Race')));
  // Sliding off and back on cancels a utility tap, as does releasing a
  // pointer that started elsewhere. Neither should toggle sound or leave a race.
  await page.mouse.move(sound.x, sound.y);
  await page.mouse.down();
  await page.mouse.move(sound.x, 110);
  await page.mouse.move(sound.x, sound.y);
  await page.mouse.up();
  assert.equal(await page.evaluate(async () => (await import('/src/audio/sound.js')).isMuted(window.__BERYL_GAME__.scene.getScene('Race'))), before);
  await page.touchscreen.tap(sound.x, sound.y);
  assert.notEqual(await page.evaluate(async () => (await import('/src/audio/sound.js')).isMuted(window.__BERYL_GAME__.scene.getScene('Race'))), before);
  await page.touchscreen.tap(667 - 12 - 2 * 52 - 22, 34);
  await page.waitForFunction(() => window.__BERYL_GAME__.scene.isActive('Title'));
  assert.deepEqual(errors, []);
  console.log('HUD controls PASS: mobile layouts, simultaneous steering/throttle, release, sound toggle, home');
} finally { await browser.close(); await server.close(); }
