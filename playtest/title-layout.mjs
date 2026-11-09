import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdir } from 'node:fs/promises';
const out = 'playtest-out/title-layout';
await mkdir(out, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 4496, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await page.goto('http://127.0.0.1:4496/');
  await page.getByRole('button', { name: 'Start the Sunday run' }).waitFor();
  await page.locator('#loading').waitFor({ state: 'detached' });
  await page.evaluate(async () => {
    const { STORAGE_KEY } = await import('/src/config.js');
    localStorage.setItem(STORAGE_KEY, '83456');
    window.__BERYL_GAME__.scene.getScene('Title').refreshSelection();
  });
  for (const [width, height] of [[667, 375], [740, 360], [915, 412], [1280, 720], [667, 375]]) {
    await page.setViewportSize({ width, height });
    await page.waitForFunction(({ width, height }) => {
      const scene = window.__BERYL_GAME__.scene.getScene('Title');
      return scene.scale.width === width && scene.scale.height === height;
    }, { width, height });
    const boxes = await page.evaluate(() => {
      const scene = window.__BERYL_GAME__.scene.getScene('Title');
      scene.layout();
      return [scene.titleText, scene.subtitleText, scene.selectorLabel,
        ...scene.trackButtons.map(({ btn }) => btn), scene.bestText, scene.play, scene.footer]
        .map(node => ({ label: node.text, ...node.getBounds() }))
        .concat({ label: 'Sunday run', ...document.querySelector('.journey-entry').getBoundingClientRect().toJSON() });
    });
    for (let i = 0; i < boxes.length; i++) {
      const a = boxes[i];
      assert.ok(a.x >= 0 && a.y >= 0 && a.x + a.width <= width && a.y + a.height <= height, `${width}x${height}: ${a.label} outside viewport`);
      for (const b of boxes.slice(i + 1)) {
        const overlaps = a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
        assert.ok(!overlaps, `${width}x${height}: ${a.label} overlaps ${b.label}`);
      }
    }
    await page.screenshot({ path: `${out}/${width}x${height}.png` });
    console.log(`Title layout PASS ${width}x${height}: saved best and controls remain separate`);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); await server.close(); }
