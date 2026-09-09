// Drive each intended alternative through the actual scene and shared finish.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';
const server = await createServer({ server: { host: '127.0.0.1', port: 4489 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true });
try {
  await mkdir('playtest-out/arrival', { recursive: true });
  for (const route of ['waterfront', 'muritai', 'inland']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, body: '' }));
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?harness=1&course=eastbourne-dash&seed=779425`);
    await page.waitForFunction(() => !!window.__h);
    await page.evaluate(async route => {
      await window.advanceTime(0);
      const scene = window.__BERYL_GAME__.scene.getScene('Race');
      const roads = scene.track.roads, primary = roads[0].centerline;
      const muritai = roads.find(r => r.id === 'muritai-road').centerline;
      const inland = roads.find(r => r.id === 'village-inland').centerline;
      const indexAt = (line, p) => line.reduce((best, q, i) => {
        const d = Math.hypot(q.x-p.x,q.y-p.y); return d<best.d ? {i,d} : best;
      }, {i:0,d:Infinity}).i;
      let path = primary;
      if (route !== 'waterfront') {
        const middle = route === 'muritai' ? muritai : [
          ...muritai.slice(0,indexAt(muritai,inland[0])), ...inland,
          ...muritai.slice(indexAt(muritai,inland.at(-1))+1),
        ];
        path = [...primary.slice(0,indexAt(primary,muritai[0])), ...middle,
          ...primary.slice(indexAt(primary,muritai.at(-1))+1)];
      }
      window.__arrivalTest = { path, frames: 0, offRoad: 0 };
    }, route);
    let result;
    do {
      result = await page.evaluate(async () => {
        const { default: bot } = await import('/playtest/bots/waypoint.js');
        const t = window.__arrivalTest;
        let s = window.__h.state();
        for (let n=0; n<600 && !s.finished && t.frames<12000; n++) {
          let nearest=0, gap=Infinity;
          t.path.forEach((p,i)=>{const d=Math.hypot(p.x-s.pos.x,p.y-s.pos.y);if(d<gap){gap=d;nearest=i;}});
          let target=nearest, distance=0;
          while(target<t.path.length-1 && distance<450) {
            distance+=Math.hypot(t.path[target+1].x-t.path[target].x,t.path[target+1].y-t.path[target].y);target++;
          }
          window.__h.setInput(bot({...s,driveTarget:t.path[target]}));
          s=window.__h._stepNoRender(1);
          t.frames++;
          if(!window.__BERYL_GAME__.scene.getScene('Race').car.onTrack)t.offRoad++;
        }
        return {finished:s.finished,frames:t.frames,offRoad:t.offRoad,time:s.finishTimeMs};
      });
    } while (!result.finished && result.frames < 12000);
    assert.ok(result.finished, `${route}: did not arrive`);
    assert.ok(result.offRoad/result.frames < 0.15, `${route}: too much off-road travel: ${JSON.stringify(result)}`);
    const parked = await page.evaluate(async () => {
      window.__h.setInput({throttle:0,brake:0,steer:0});
      window.__h._stepNoRender(90);
      const scene=window.__BERYL_GAME__.scene.getScene('Race');
      const {inTriangle}=await import('/src/arrival.js');
      return {inside:inTriangle(scene.car.x,scene.car.y,scene.track.pavedAreas[0]),speed:scene.car.speed};
    });
    assert.ok(parked.inside && Math.abs(parked.speed)<10, `${route}: must stop inside the parking area`);
    assert.deepEqual(errors,[]);
    console.log(`Eastbourne ${route} PASS ${JSON.stringify(result)}`);
    await page.close();
  }
  // Exercise the real frame update and finish/results flow at the stripe's
  // outer edges, not just the centreline followed by reference route drivers.
  for (const [x, direction] of [[-8.5, 1], [9.5, 1], [-8.5, -1], [9.5, -1]]) {
    const page = await browser.newPage();
    await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, body: '' }));
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?harness=1&course=eastbourne-dash&seed=779425`);
    await page.waitForFunction(() => !!window.__h);
    const result = await page.evaluate(async ({x,direction}) => {
      await window.advanceTime(0);
      const scene = window.__BERYL_GAME__.scene.getScene('Race');
      const {rsaArrival} = await import('/src/arrival.js');
      const {metres} = await import('/src/scale.js');
      const arrival = rsaArrival(scene.track), start = arrival.point(x,-3-direction);
      scene.car.reset(start.x,start.y,scene.track.start.rotation);
      scene.car.rotation = Math.atan2(Math.sin(arrival.yaw)*direction,-Math.cos(arrival.yaw)*direction);
      scene.car.vx = Math.sin(arrival.yaw)*direction*metres(5);
      scene.car.vy = Math.cos(arrival.yaw)*direction*metres(5);
      scene.expected = scene.track.checkpoints.length-1;
      scene.timing = true; scene.lapStartTime = scene.time.now;
      window.__h.setInput({throttle:1,brake:0,steer:0});
      for(let i=0;i<120 && !scene.finished;i++) window.__h._stepNoRender(1);
      const finished = scene.finished;
      window.__h.setInput({throttle:0,brake:0,steer:0});
      await window.advanceTime(2500);
      return {finished, time:scene.lastCompletionTimeMs};
    },{x,direction});
    assert.ok(result.finished && result.time > 0, `Outer finish crossing failed: ${x}/${direction}`);
    await page.getByRole('dialog', {name:'Eastbourne results'}).waitFor();
    await page.close();
  }
  console.log('Eastbourne outer finish PASS: real frame updates and results at both edges in both directions');
} finally { await browser.close(); await server.close(); }
