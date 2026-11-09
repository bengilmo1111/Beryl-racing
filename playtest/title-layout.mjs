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
  await page.waitForFunction(() => window.__BERYL_GAME__?.scene.isActive('Title'));
  await page.locator('#loading').waitFor({ state: 'detached' });
  await page.evaluate(async () => {
    const { STORAGE_KEY } = await import('/src/config.js');
    localStorage.setItem(STORAGE_KEY, '83456');
    window.__BERYL_GAME__.scene.getScene('Title').refreshSelection();
  });
  for (const [width, height] of [[667, 375], [740, 360], [915, 412], [1280, 720], [390, 844], [768, 1024], [667, 375]]) {
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
        .map(node => ({ label: node.text, ...node.getBounds() }));
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
  // Course choices remain clickable after resize; the selected course drives
  // both the saved-time readout and the race started by the main button.
  const chosen = await page.evaluate(() => {
    const scene = window.__BERYL_GAME__.scene.getScene('Title');
    const { btn, def } = scene.trackButtons[2];
    return { x: btn.x + btn.width / 2, y: btn.y + btn.height / 2, id: def.id };
  });
  await page.mouse.click(chosen.x, chosen.y);
  assert.equal(await page.evaluate(async () => (await import('/src/tracks.js')).getSelectedTrackId()), chosen.id);
  const play = await page.evaluate(() => {
    const btn = window.__BERYL_GAME__.scene.getScene('Title').play;
    return { x: btn.x, y: btn.y };
  });
  await page.mouse.click(play.x, play.y);
  await page.waitForFunction(() => window.__BERYL_GAME__.scene.isActive('Race'));
  assert.equal(await page.evaluate(() => window.__BERYL_GAME__.scene.getScene('Race').def.id), chosen.id);
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const portrait = await phone.newPage();
  await portrait.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await portrait.goto('http://127.0.0.1:4496/');
  await portrait.locator('#rotate').waitFor({ state: 'visible' });
  await portrait.locator('.beryl-photo').evaluate(img => img.decode());
  for (const [width, height] of [[390, 844], [320, 568]]) {
    await portrait.setViewportSize({ width, height });
    const fit = await portrait.locator('#rotate').evaluate(el => [...el.children].every(child => {
      if (getComputedStyle(child).display === 'none') return true;
      const r = child.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
    }));
    assert.ok(fit, `portrait ${width}x${height}: branding and rotation instructions fit`);
    await portrait.screenshot({ path: `${out}/portrait-${width}x${height}.png` });
  }
  // Fullscreen re-entry is shown in landscape, where branding must give way
  // to the action instead of forcing the resume button below the viewport.
  await portrait.setViewportSize({ width: 568, height: 320 });
  await portrait.evaluate(() => {
    document.documentElement.className = 'rotate-shown';
    document.getElementById('rotate').classList.add('needs-tap');
    document.getElementById('rotate-resume').hidden = false;
  });
  const resumeFits = await portrait.locator('#rotate-resume').evaluate(el => {
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= innerHeight;
  });
  assert.ok(resumeFits, 'fullscreen resume action fits short landscape');
  await phone.close();
  assert.deepEqual(errors, []);
} finally { await browser.close(); await server.close(); }
