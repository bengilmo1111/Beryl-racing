import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';
const server = await createServer({ server: { host: '127.0.0.1', port: 4492 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const out = 'playtest-out/otaki-review';
await mkdir(out, { recursive: true });
try {
  for (const route of ['riverbank', 'town']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, body: '' }));
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?harness=1&course=otaki&seed=780385`);
    await page.waitForFunction(() => !!window.__h);
    await page.evaluate(async route => {
      await window.advanceTime(0);
      const scene = window.__BERYL_GAME__.scene.getScene('Race');
      const primary = scene.track.centerline;
      let path = primary;
      if (route === 'town') {
        const branch = scene.track.roads.find(r => r.id === 'rahui-mill-tasman').centerline;
        const start = primary.reduce((best, p, i) => Math.hypot(p.x - branch[0].x, p.y - branch[0].y) < best.gap
          ? { i, gap: Math.hypot(p.x - branch[0].x, p.y - branch[0].y) } : best, { i: 0, gap: Infinity }).i;
        // The town route meets Marine Parade north of the finish. Turn south
        // for the marked beach arrival, which can be crossed either way.
        path = [...primary.slice(0, start), ...branch, ...primary.slice(-50).reverse()];
      }
      window.__otakiReview = { path, route, frames: 0, offRoad: 0 };
    }, route);
    let result;
    do {
      result = await page.evaluate(async () => {
        const { default: bot } = await import('/playtest/bots/waypoint.js');
        const t = window.__otakiReview;
        let state = window.__h.state();
        for (let n = 0; n < 600 && !state.finished && t.frames < 18000; n++) {
          let nearest = 0, gap = Infinity;
          t.path.forEach((p, i) => { const d = Math.hypot(p.x-state.pos.x,p.y-state.pos.y); if(d<gap){gap=d;nearest=i;} });
          let target = nearest, distance = 0;
          while (target < t.path.length - 1 && distance < 450) {
            distance += Math.hypot(t.path[target+1].x-t.path[target].x,t.path[target+1].y-t.path[target].y); target++;
          }
          // Supply the path point as the steering target even close to a gate.
          const input = bot({ ...state, nextCheckpoint: t.path[target], driveTarget: t.path[target] });
          // Take the signed 90-degree turn onto Marine Parade at town speed.
          if (t.route === 'town' && state.pos.x < 16000 && state.pos.y < 84000) {
            input.throttle = Math.abs(state.speed) < 300 ? 0.4 : 0;
            input.brake = Math.abs(state.speed) > 400 ? 1 : 0;
          }
          window.__h.setInput(input);
          state = window.__h._stepNoRender(1);
          t.frames++;
          if (!window.__BERYL_GAME__.scene.getScene('Race').car.onTrack) t.offRoad++;
        }
        return { finished: state.finished, frames: t.frames, offRoad: t.offRoad, gates: state.checkpointsHit, time: state.finishTimeMs, pos: state.pos, speed: state.speed, next: state.nextCheckpoint };
      });
    } while (!result.finished && result.frames < 18000);
    if (result.finished) await page.evaluate(() => window.__h._stepNoRender(20));
    const failureShot = await page.evaluate(() => window.__h._screenshot());
    await writeFile(`${out}/${route}-arrival.png`, Buffer.from(failureShot.split(',')[1], 'base64'));
    assert.ok(result.finished, `${route}: did not finish: ${JSON.stringify(result)}`);
    assert.ok(result.offRoad / result.frames < 0.15, `${route}: excessive off-road driving`);
    const data = await page.evaluate(() => {
      const scene = window.__BERYL_GAME__.scene.getScene('Race');
      scene.hud.clearMessage();
      return window.__h._screenshot();
    });
    await writeFile(`${out}/${route}-finish.png`, Buffer.from(data.split(',')[1], 'base64'));
    assert.deepEqual(errors, [], `${route}: browser errors`);
    const stopped = await page.evaluate(() => {
      window.__h._stepNoRender(90);
      const scene = window.__BERYL_GAME__.scene.getScene('Race');
      return { speed: Math.abs(scene.car.speed), onTrack: scene.car.onTrack };
    });
    assert.ok(stopped.speed < 10 && stopped.onTrack, `${route}: must stop on the road after finishing`);
    console.log(`Otaki ${route} PASS ${JSON.stringify({ ...result, stopped })}`);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
