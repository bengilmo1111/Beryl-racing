// Exercise the production build through the same prefix-stripping gateway as
// Gilmore.games. Root-only tests cannot detect broken absolute asset URLs.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { preview } from 'vite';
import { chromium } from 'playwright';

const origin = await preview({ preview: { host: '127.0.0.1', port: 4490, strictPort: true } });
const gateway = createServer(async (req, res) => {
  if (!req.url.startsWith('/beryl-racing/')) {
    res.writeHead(404).end('Assets must stay under the game prefix');
    return;
  }
  try {
    const response = await fetch(`http://127.0.0.1:4490${req.url.slice('/beryl-racing'.length)}`);
    res.writeHead(response.status, { 'content-type': response.headers.get('content-type') || 'application/octet-stream' });
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    res.writeHead(502).end(String(error));
  }
});
await new Promise(resolve => gateway.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 915, height: 412 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().startsWith('http://127.0.0.1:') && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const base = `http://127.0.0.1:${gateway.address().port}/beryl-racing/`;
  await page.goto(`${base}?harness=1&course=eastbourne-dash&seed=780385`);
  await page.waitForFunction(() => !!window.__h, null, { timeout: 30000 });
  await page.evaluate(() => window.advanceTime(0));
  assert.equal(await page.title(), 'Beryl Racing 3D');
  const rendering = await page.locator('#game3d').evaluate(canvas => ({
    width: canvas.width, height: canvas.height,
    webgl: !!canvas.getContext('webgl2'),
  }));
  assert.ok(rendering.width > 0 && rendering.height > 0 && rendering.webgl, 'the gateway must start the 3D renderer');
  const manifest = await (await page.request.get(`${base}game-manifest.json`)).json();
  assert.equal(manifest.canonicalUrl, 'https://gilmore.games/beryl-racing/');
  assert.equal(manifest.id, 'beryl-racing');
  assert.equal(await page.getByRole('button', { name: 'Report this moment', exact: true }).count(), 0);
  await page.goto(`${base}?harness=1&course=eastbourne-dash&seed=780385&playtest=1`);
  await page.waitForFunction(() => !!window.__h, null, { timeout: 30000 });
  await page.evaluate(async () => {
    await window.__h.ready;
    window.__h.setInput({ throttle: 1, steer: 0 });
    window.__h._stepNoRender(180);
  });
  const timingShape = await page.evaluate(() => ({
    liteHasHistory: window.__h._stepNoRender(1).frameTimesMs !== undefined,
    fullCount: window.__h.state().frameTimesMs.length,
  }));
  assert.equal(timingShape.liteHasHistory, false, 'bot steps must not duplicate timing history');
  assert.ok(timingShape.fullCount >= 181, 'full state retains timings for final metrics');
  const reportButton = page.getByRole('button', { name: 'Report this moment', exact: true });
  const bounds = await reportButton.boundingBox();
  assert.ok(bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= 915 && bounds.y + bounds.height <= 412);
  const [download] = await Promise.all([page.waitForEvent('download'), reportButton.click()]);
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const report = JSON.parse(Buffer.concat(chunks).toString());
  assert.equal(report.kind, 'beryl-driving-trace');
  assert.equal(report.courseId, 'eastbourne-dash');
  assert.ok(report.samples.length > 0 && report.samples.length <= 6000);
  assert.ok(report.obstacles.length > 0);
  assert.ok(report.samples.at(-1).timeMs - report.samples[0].timeMs <= 20000);
  await page.evaluate(() => window.__h.loadCourse('manfield', { seed: 1 }));
  assert.equal(await page.getByRole('button', { name: 'Report this moment', exact: true }).count(), 1, 'old scene removes its report button');
  assert.deepEqual(errors, []);
  console.log('gateway PASS: 3D canvas, scripts, assets and canonical manifest load beneath /beryl-racing/');
} finally {
  await browser.close();
  await new Promise(resolve => gateway.close(resolve));
  await new Promise(resolve => origin.httpServer.close(resolve));
}
