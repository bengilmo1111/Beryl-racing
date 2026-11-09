// Regression: non-coastal finish cards cropped their actions on short screens
// and retained desktop coordinates after resize. Finish is synthetic here;
// actual route completion is covered by the driving review.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdir } from 'node:fs/promises';

const out = 'playtest-out/results-layout';
await mkdir(out, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 4504, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
try {
  for (const course of ['remutaka', 'otaki']) {
    const page = await browser.newPage({ viewport: { width: 667, height: 375 } });
    await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
    await page.goto(`http://127.0.0.1:4504/?harness=1&ui=1&course=${course}`);
    await page.waitForFunction(() => !!window.__h);
    await page.evaluate(async () => {
      await window.advanceTime(0);
      const s = window.__BERYL_GAME__.scene.getScene('Race');
      s.lapStartTime = s.time.now - 83123;
      s.finishSprint();
      await window.advanceTime(1000);
    });
    for (const [width, height] of [[667, 375], [915, 412], [1280, 720], [667, 375]]) {
      await page.setViewportSize({ width, height });
      await page.waitForFunction(w => window.__BERYL_GAME__.scale.width === w, width);
      await page.evaluate(() => window.__h._render());
      const items = await page.evaluate(() => window.__BERYL_GAME__.scene.getScene('Race').resultsPanel.list
        .filter(n => n.type === 'Text').map(n => ({ text: n.text, ...n.getBounds() })));
      assert.equal(items.length, 6);
      assert.ok(items.some(item => item.text === 'FIRST RUN · SET YOUR BENCHMARK'));
      assert.ok(items.some(item => item.text === '01:23.123'), 'results must show the recorded finish time');
      for (const item of items) {
        assert.ok(item.x >= 0 && item.y >= 0 && item.x + item.width <= width && item.y + item.height <= height,
          `${course} ${width}x${height}: ${item.text} clipped: ${JSON.stringify(item)}`);
      }
      await page.screenshot({ path: `${out}/${course}-${width}x${height}.png` });
    }
    const retry = await page.evaluate(() => {
      const b = window.__BERYL_GAME__.scene.getScene('Race').resultsPanel.list.find(n => n.input && n.text !== 'CHANGE COURSE').getBounds();
      return { x: b.centerX, y: b.centerY };
    });
    await page.mouse.click(retry.x, retry.y);
    await page.evaluate(() => window.advanceTime(3000));
    assert.equal(await page.evaluate(() => {
      const s = window.__BERYL_GAME__.scene.getScene('Race');
      return s.timing && !s.finished && s.resultsPanel === null;
    }), true, `${course}: retry must start a fresh run`);
    // Verify the second action independently, after creating another card.
    await page.evaluate(() => {
      const s = window.__BERYL_GAME__.scene.getScene('Race');
      s.finishSprint();
      window.__h._stepNoRender(90);
      window.__h._render();
    });
    const change = await page.evaluate(() => {
      const b = window.__BERYL_GAME__.scene.getScene('Race').resultsPanel.list.find(n => n.text === 'CHANGE COURSE').getBounds();
      return { x: b.centerX, y: b.centerY };
    });
    await page.mouse.click(change.x, change.y);
    await page.evaluate(() => window.advanceTime(20));
    assert.equal(await page.evaluate(() => window.__BERYL_GAME__.scene.isActive('Title')), true);
    console.log(`${course}: results fit initial phone and resized screens; retry and change course work`);
    await page.close();
  }
} finally { await browser.close(); await server.close(); }
