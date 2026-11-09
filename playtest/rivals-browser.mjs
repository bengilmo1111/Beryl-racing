import { preview } from 'vite';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const server = await preview({ preview: { host: '127.0.0.1', port: 4491, strictPort: false }, logLevel: 'error' });
let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?harness=1&ui=1&course=manfield&seed=780385`);
  await page.waitForFunction(() => !!window.__h);
  await page.evaluate(() => window.advanceTime(0));
  const result = await page.evaluate(() => {
    const s = window.__BERYL_GAME__.scene.getScene('Race');
    const before = s.rivals.cars.map(c => c.distance);
    s.timing = false;
    window.__h._stepNoRender(30);
    const waited = s.rivals.cars.every((c, i) => c.distance === before[i]);
    s.timing = true;
    for (let i = 0; i < 180; i++) {
      window.__h.setInput(window.__h._botInput('waypoint'));
      window.__h._stepNoRender(1);
    }
    return { waited, moved: s.rivals.cars.every((c, i) => c.distance > before[i]),
      rigs: s.world3d.rivalFleet.rigs.length, hud: s.hud.position.text };
  });
  assert.equal(result.waited, true);
  assert.equal(result.moved, true);
  assert.equal(result.rigs, 4);
  assert.match(result.hud, /POSITION  [1-5] \/ 5/);
  await mkdir('playtest-out/rivals', { recursive: true });
  const screenshot = async name => {
    const data = await page.evaluate(() => window.__h._screenshot());
    await writeFile(`playtest-out/rivals/${name}.png`, Buffer.from(data.split(',')[1], 'base64'));
  };
  await screenshot('manfield-desktop');
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(250);
  await page.evaluate(() => window.advanceTime(0));
  await screenshot('manfield-mobile');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ...result, errors, screenshots: 'playtest-out/rivals' }));
} finally {
  await browser?.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
