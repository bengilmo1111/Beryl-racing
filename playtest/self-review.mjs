// Evidence gathering for a visual/gameplay review, not a verdict on human enjoyment.
// Keeps existing playtest output and records failures without hiding later courses.
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { runNewMobilePlayerJourney } from './journeys/new-mobile-player.mjs';

const out = 'playtest-out/self-review';
await mkdir(out, { recursive: true });
const port = process.argv.includes('--journey') ? 4505 : 4503;
const server = await createServer({ server: { host: '127.0.0.1', port, strictPort: true }, logLevel: 'error' });
await server.listen();
const baseUrl = `http://127.0.0.1:${port}/`;
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const report = { date: new Date().toISOString(), runs: [], keyboard: [] };
const courses = ['eastbourne-dash', 'manfield', 'remutaka', 'otaki'];
async function newPage(options = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, ...options });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  return { page, errors };
}
async function shot(page, name) {
  await page.evaluate(() => window.__h._render());
  await page.screenshot({ path: `${out}/${name}.png` });
}
try {
  if (process.argv.includes('--journey')) {
    report.journey = await runNewMobilePlayerJourney({ browser, baseUrl, outDir: `${out}/journey` });
    console.log(JSON.stringify(report.journey));
  } else {
    if (!process.argv.includes('--keyboard-only')) {
    for (const course of courses) {
      for (const bot of ['waypoint', 'heldSteering']) {
        const { page, errors } = await newPage();
        await page.goto(`${baseUrl}?harness=1&ui=1&course=${course}&seed=779425`);
        await page.waitForFunction(() => !!window.__h);
        await page.evaluate(() => window.advanceTime(0));
        let result;
        do {
          result = await page.evaluate(bot => {
            let s = window.__h._stateLite();
            let offRoad = 0;
            for (let n = 0; n < 600 && !s.finished && s.frame < 18000; n++) {
              window.__h.setInput(window.__h._botInput(bot, s));
              s = window.__h._stepNoRender(1);
              if (!window.__BERYL_GAME__.scene.getScene('Race').car.onTrack) offRoad++;
            }
            window.__reviewOffRoad = (window.__reviewOffRoad || 0) + offRoad;
            return { ...s, offRoadFraction: window.__reviewOffRoad / s.frame };
          }, bot);
          if (bot === 'heldSteering' && [600, 1800, 6000].includes(result.frame)) await shot(page, `${course}-${bot}-${result.frame}`);
        } while (!result.finished && result.frame < 18000);
        await page.evaluate(() => { window.__h.setInput({}); window.__h._stepNoRender(180); });
        await shot(page, `${course}-${bot}-end`);
        if (result.finished && bot === 'waypoint' && course !== 'manfield') {
          for (const [width, height] of [[667, 375], [915, 412], [1280, 720]]) {
            await page.setViewportSize({ width, height });
            await page.waitForFunction(w => window.__BERYL_GAME__.scale.width === w, width);
            await shot(page, `${course}-results-${width}x${height}`);
          }
          result.resultsBounds = await page.evaluate(() => {
            const s = window.__BERYL_GAME__.scene.getScene('Race');
            return s.children.list.filter(o => o.type === 'Container' && o.depth === 1400).map(o => ({ x: o.x, y: o.y, bounds: o.getBounds() }));
          });
        }
        const row = { course, bot, ...result, errors };
        if (course === 'remutaka' && bot === 'heldSteering' && !result.finished) {
          row.escape = await page.evaluate(() => {
            const before = window.__h._stateLite();
            const motiveInput = window.__h._botInput('heldSteering', before);
            window.__h.setInput({ brake: 1, steer: 0 });
            const after = window.__h._stepNoRender(180);
            return { motiveInput, before, after,
              distance: Math.hypot(after.pos.x - before.pos.x, after.pos.y - before.pos.y) };
          });
          await shot(page, 'remutaka-stall-after-reversing');
        }
        report.runs.push(row);
        console.log(JSON.stringify(row));
        await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
        await page.close();
      }
    }
    }
    // Real keyboard events through the title and race UI, with a controlled clock.
    // No virtual bot input or car-position injection is used in this section.
    for (const course of courses) {
      const { page, errors } = await newPage();
      await page.goto(`${baseUrl}?harness=1&ui=1&seed=779425`);
      await page.waitForFunction(() => !!window.__h);
      await page.evaluate(async () => { await window.__h.ready; await window.advanceTime(0); });
      const buttons = await page.evaluate(id => {
        const s = window.__BERYL_GAME__.scene.getScene('Title');
        const b = s.trackButtons.find(b => b.def.id === id).btn;
        const bounds = b.getBounds();
        return { course: { x: bounds.centerX, y: bounds.centerY }, play: { x: s.play.x, y: s.play.y } };
      }, course);
      await page.mouse.click(buttons.course.x, buttons.course.y);
      await page.evaluate(() => window.advanceTime(20));
      await page.mouse.click(buttons.play.x, buttons.play.y);
      await page.evaluate(() => window.advanceTime(4000));
      const before = await page.evaluate(() => window.__h._stateLite());
      if (before.courseId !== course) throw new Error(`Selected ${course}, started ${before.courseId}`);
      await page.keyboard.down('ArrowUp');
      await page.evaluate(() => window.advanceTime(3000));
      await page.keyboard.down('ArrowRight');
      await page.evaluate(() => window.advanceTime(1000));
      await page.keyboard.up('ArrowRight');
      await page.keyboard.up('ArrowUp');
      await shot(page, `${course}-keyboard-mistake`);
      const mistake = await page.evaluate(() => window.__h._stateLite());
      await page.keyboard.down('ArrowDown');
      await page.evaluate(() => window.advanceTime(2500));
      await page.keyboard.up('ArrowDown');
      await shot(page, `${course}-keyboard-reverse`);
      const reversed = await page.evaluate(() => window.__h._stateLite());
      await page.keyboard.press('r');
      await page.evaluate(() => window.advanceTime(20));
      await shot(page, `${course}-keyboard-recover`);
      const recovered = await page.evaluate(() => window.__h._stateLite());
      await page.keyboard.press('Escape');
      await page.evaluate(() => window.advanceTime(20));
      const home = await page.evaluate(() => window.__BERYL_GAME__.scene.isActive('Title'));
      const row = { course, before, mistake, reversed, recovered, home, errors };
      report.keyboard.push(row);
      console.log('KEYBOARD', JSON.stringify(row));
      await page.close();
    }
  }
} finally {
  await writeFile(`${out}/${process.argv.includes('--journey') ? 'journey-report' : process.argv.includes('--keyboard-only') ? 'keyboard-report' : 'report'}.json`, JSON.stringify(report, null, 2));
  await browser.close();
  await server.close();
}
