import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
const out = 'playtest-out/otaki-reference';
await mkdir(out, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 4493 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning' && !m.text().includes('Multiple instances')) errors.push(m.text()); });
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, body: '' }));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?harness=1&course=otaki&seed=780385`);
  await page.waitForFunction(() => !!window.__h);
  await page.evaluate(() => window.advanceTime(0));
  for (const [name, fraction, reverse] of [['gorge', .09, false], ['farm-road', .35, false], ['inland-ranges', .58, true], ['beach-road', .99, false]]) {
    const data = await page.evaluate(({ fraction, reverse }) => {
      const scene = window.__BERYL_GAME__.scene.getScene('Race');
      const line = scene.track.centerline, i = Math.floor((line.length - 2) * fraction);
      const p = line[i], q = line[i+1];
      scene.car.reset(p.x, p.y, Math.atan2(q.x-p.x, -(q.y-p.y)) + (reverse ? Math.PI : 0));
      scene.world3d.chase.snap();
      scene.hud.clearMessage();
      scene.children.list.filter(o => o.text === 'GO!').forEach(o => o.setVisible(false));
      return window.__h._screenshot();
    }, { fraction, reverse });
    await writeFile(`${out}/${name}.png`, Buffer.from(data.split(',')[1], 'base64'));
  }
  const aerial = await page.evaluate(() => {
    const scene = window.__BERYL_GAME__.scene.getScene('Race'), world = scene.world3d;
    const { world: size, coastX } = scene.def.layout;
    const camera = world.chase.camera.clone();
    camera.position.set(coastX + 10500, 5100, size.height * .78 + 8000);
    camera.lookAt(coastX - 1800, 0, size.height * .78 - 1000);
    world.renderer.render(world.scene3d, camera);
    return world.renderer.domElement.toDataURL('image/png');
  });
  await writeFile(`${out}/beach-aerial.png`, Buffer.from(aerial.split(',')[1], 'base64'));
  assert.deepEqual(errors, []);
  console.log(`Otaki photo-reference views PASS: ${out}`);
} finally { await browser.close(); await server.close(); }
