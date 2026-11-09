import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';

const out = 'playtest-out/polish';
await mkdir(out, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 4506, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const errors = [], report = { recovery: [], drives: [] };
async function pageFor(options = {}) {
  const page = await browser.newPage({ viewport: { width: 667, height: 375 }, ...options });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await page.goto('http://127.0.0.1:4506/?harness=1&ui=1');
  await page.waitForFunction(() => !!window.__h);
  await page.evaluate(() => window.__h.ready);
  return page;
}
async function load(page, course, seed = 779425) {
  await page.evaluate(async ({course, seed}) => { await window.__h.loadCourse(course, {seed}); }, {course, seed});
}
async function shot(page, name) {
  await page.evaluate(() => window.__h._render());
  await page.screenshot({ path: `${out}/${name}.png` });
}
async function drive(page) {
  let state;
  do {
    state = await page.evaluate(() => {
      let s = window.__h._stateLite();
      for (let i = 0; i < 600 && !s.finished && s.frame < 18000; i++) {
        window.__h.setInput(window.__h._botInput('waypoint', s));
        s = window.__h._stepNoRender(1);
      }
      return s;
    });
  } while (!state.finished && state.frame < 18000);
  assert.ok(state.finished, `Drive did not finish: ${JSON.stringify(state)}`);
  const data = await page.evaluate(() => {
    const s = window.__BERYL_GAME__.scene.getScene('Race');
    return { saved: s.bestSplits, splits: s.runSplits, best: s.best, key: s.def.storageKey,
      baseline: JSON.parse(localStorage.getItem(`${s.def.storageKey}.splits`)), splitText: s.hud.split.text };
  });
  return { course: state.courseId, time: state.finishTimeMs, gates: state.checkpointsHit, data };
}
try {
  const mobile = await pageFor({ isMobile: true, hasTouch: true });
  for (const course of ['eastbourne-dash', 'manfield', 'remutaka', 'otaki']) {
    await load(mobile, course);
    assert.equal(await mobile.evaluate(() => window.__BERYL_GAME__.scene.getScene('Race').recoverButton.visible), false,
      `${course}: no permanent mobile reset button`);
    await shot(mobile, `${course}-mobile-normal`);
    await mobile.evaluate(() => {
      let state = window.__h._stateLite();
      for (let i = 0; i < 900; i++) {
        window.__h.setInput(window.__h._botInput('waypoint', state));
        state = window.__h._stepNoRender(1);
      }
      window.__h.setInput({});
      const s = window.__BERYL_GAME__.scene.getScene('Race');
      const safe = s.lastSafe;
      s.car.reset(safe.x + Math.cos(safe.rotation) * s.track.half * 3,
        safe.y + Math.sin(safe.rotation) * s.track.half * 3, safe.rotation + Math.PI);
      window.__h._stepNoRender(110);
    });
    const before = await mobile.evaluate(() => {
      const s = window.__BERYL_GAME__.scene.getScene('Race'), b = s.recoverButton.getBounds();
      return { visible: s.recoverButton.visible, expected: s.expected, start: s.lapStartTime,
        count: s.recoveryCount, bounds: {x:b.x,y:b.y,width:b.width,height:b.height}, x:b.centerX,y:b.centerY,
        buttons: s.touch.buttons.map(b => ({x:b.cx,y:b.cy,r:b.radius})) };
    });
    assert.equal(before.visible, true, `${course}: offer reset after a mistake`);
    assert.ok(before.bounds.height >= 44, 'recovery needs a tappable target');
    for (const b of before.buttons) {
      const x = Math.max(before.bounds.x, Math.min(b.x, before.bounds.x + before.bounds.width));
      const y = Math.max(before.bounds.y, Math.min(b.y, before.bounds.y + before.bounds.height));
      assert.ok(Math.hypot(b.x-x,b.y-y) >= b.r, `${course}: contextual recovery overlaps a driving button`);
    }
    await shot(mobile, `${course}-mobile-recovery`);
    await mobile.touchscreen.tap(before.x, before.y);
    const after = await mobile.evaluate(() => {
      const s = window.__BERYL_GAME__.scene.getScene('Race');
      return {expected:s.expected,start:s.lapStartTime,count:s.recoveryCount,speed:s.car.speed,visible:s.recoverButton.visible};
    });
    assert.equal(after.expected, before.expected);
    assert.equal(before.start-after.start, 3000);
    assert.equal(after.count, before.count+1);
    assert.equal(after.speed, 0);
    assert.equal(after.visible, false);
    report.recovery.push({course,before,after});
    console.log(`${course}: contextual mobile recovery PASS`);
  }
  await mobile.close();
  const page = await pageFor({ viewport: {width:1280,height:720} });
  // Hold the exact bank-facing pose from the independent review.
  await load(page, 'remutaka');
  await page.evaluate(() => {
    window.__h._stepNoRender(180);
    const s = window.__BERYL_GAME__.scene.getScene('Race');
    s.car.reset(24394.430336651, 48562.147014841, 2.795272749);
    s.world3d.chase.snap();
  });
  await shot(page, 'remutaka-bank-camera');
  await page.keyboard.press('r');
  assert.equal(await page.evaluate(() => window.__h._stateLite().recoveryCount), 1);
  if (!process.argv.includes('--ui-only')) {
  for (const course of ['eastbourne-dash', 'manfield', 'remutaka', 'otaki']) {
    await load(page, course);
    const result = await drive(page);
    const expectedCount = await page.evaluate(() => {
      const t = window.__BERYL_GAME__.scene.getScene('Race').track;
      return t.checkpoints.length - (t.closed ? 0 : 1);
    });
    assert.equal(result.data.saved.length, expectedCount);
    assert.equal(result.data.baseline.time, Math.floor(result.data.best));
    report.drives.push(result);
    await page.evaluate(() => { window.__h.setInput({}); window.__h._stepNoRender(180); });
    await shot(page, `${course}-finished`);
    console.log(`${course}: finished ${result.time}ms with ${expectedCount} saved splits`);
  }
  const best = report.drives[0];
  await load(page, 'eastbourne-dash');
  await page.keyboard.press('r');
  const retry = await drive(page);
  assert.ok(retry.time > best.time + 2900);
  assert.equal(retry.data.best, Math.floor(best.data.best));
  assert.deepEqual(retry.data.baseline, best.data.baseline, 'a slower retry must retain the best run splits');
  assert.match(retry.data.splitText, /SPLIT 6 · \+3\.[0-9]s/);
  report.retry = retry;
  // Isolate the cost of ambient traffic, without changing the shipped course.
  await load(page, 'otaki');
  await page.evaluate(() => { window.__BERYL_GAME__.scene.getScene('Race').traffic = null; });
  report.otakiWithoutTraffic = await drive(page);
  await load(page, 'otaki', 779426);
  report.otakiSecondSeed = await drive(page);
  console.log(`Otaki timing: traffic=${report.drives.at(-1).time}, without=${report.otakiWithoutTraffic.time}, seed2=${report.otakiSecondSeed.time}`);
  }
  assert.deepEqual(errors, []);
  report.errors = errors;
  await page.close();
} finally {
  await writeFile(`${out}/${process.argv.includes('--ui-only') ? 'ui-report' : 'report'}.json`, JSON.stringify(report,null,2));
  await browser.close(); await server.close();
}
