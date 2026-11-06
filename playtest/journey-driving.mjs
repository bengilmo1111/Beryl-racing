import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
const out = process.env.JOURNEY_OUT || 'playtest-out/journey';
await mkdir(out, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 4492, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
try {
  for (const id of (process.env.JOURNEY_CHAPTERS || 'first-box,tea-on-the-hill,a-place-at-the-table,room-for-the-view,the-road-we-choose,next-sunday').split(',')) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await page.goto('http://127.0.0.1:4492/?harness=1&seed=780385');
    await page.waitForFunction(() => !!window.__h);
    await page.evaluate(async id => {
      await window.__h.ready;
      const { chapterById, CHAPTERS, cleanJourney, finishChapter, writeJourney } = await import('/src/journey/story.js');
      const chapter = chapterById(id);
      let save = cleanJourney(null);
      for (const prior of CHAPTERS.slice(0, CHAPTERS.indexOf(chapter))) save = finishChapter(save, prior);
      writeJourney(save);
      window.__BERYL_GAME__.registry.set('__journeyChapter', id);
      await window.__h.loadCourse(chapter.course, { seed: 780385 });
    }, id);
    const result = await page.evaluate(() => {
      const scene = window.__BERYL_GAME__.scene.getScene('Race');
      let visitedBranch = false;
      let frames = 0;
      for (; frames < 18000 && !scene.finished; frames++) {
        const state = window.__h._stateLite();
        const input = window.__h._botInput('waypoint', state);
        const route = scene.journeyRoute;
        if (route.oldTown) {
          const road = scene.track.roads.find(r => r.id === 'rahui-mill-tasman');
          const middle = road.centerline[Math.floor(road.centerline.length / 2)];
          if (Math.hypot(scene.car.x - middle.x, scene.car.y - middle.y) < 900) visitedBranch = true;
        }
        if (route.parking && scene.expected === route.gates.length - 1) {
          const d = Math.hypot(scene.car.x - route.meeting.x, scene.car.y - route.meeting.y) / 57.9;
          const speed = Math.abs(scene.car.speed) / 57.9 * 3.6;
          if (d < 120) {
            const wanted = d < 3 ? 0 : Math.min(30, (d - 2) * 0.8);
            input.throttle = speed < wanted ? 1 : 0;
            input.brake = scene.car.speed > 0 && speed > Math.max(2, wanted + 1) ? 0.6 : 0;
          }
        }
        window.__h.setInput(input); window.__h._stepNoRender(1);
      }
      window.__h._stepNoRender(180);
      return { parking: scene.journeyRoute.parking, oldTown: scene.journeyRoute.oldTown, finished: scene.finished, expected: scene.expected, gates: scene.journeyRoute.gates.length,
        time: scene.lastCompletionTimeMs, frames, visitedBranch, stopSeconds: scene.journeyDrive.stopSeconds,
        cargo: scene.journeyDrive.roughSeconds, speed: scene.car.speed, heading: scene.car.rotation, pos: { x: scene.car.x, y: scene.car.y },
        next: scene.journeyRoute.gates[scene.expected], errors: window.__h.errors() };
    });
    const data = await page.evaluate(() => window.__h._screenshot());
    await writeFile(`${out}/round-2-${id}-world.png`, Buffer.from(data.split(',')[1], 'base64'));
    await page.screenshot({ path: `${out}/round-2-${id}.png` });
    console.log(id, JSON.stringify(result));
    assert.equal(result.finished, true, `${id} did not complete`);
    if (result.oldTown) assert.equal(result.visitedBranch, true, 'Must actually visit the town branch');
    if (result.parking) assert.ok(result.stopSeconds >= 2, 'Must stop in the summit car park');
    const saved = await page.evaluate(async () => {
      const { readJourney } = await import('/src/journey/story.js'); return readJourney();
    });
    assert.ok(saved.completed[id], 'The driven chapter must be saved as completed');
    assert.equal(saved.checkpoint, null, 'A completed drive must clear its continuation');
    assert.deepEqual(errors, []); assert.deepEqual(result.errors, []);
    await page.close();
  }
  console.log('Story driving PASS: every requested chapter driven to arrival and saved, including town routing and parked deliveries');
} finally { await browser.close(); await server.close(); }
