// A screenshot of a given course at a given frame, without running the matrix.
//
// The full playtest takes 26 minutes and writes a thousand images. Most of the
// time the question is much narrower than that — *do the houses look right yet*
// — and the answer is two pictures. Every scale and placement bug this project
// has had was caught by looking at one of these and by nothing else (see
// docs/architecture/WORLD-SCALE.md), so taking one needs to be cheap.
//
// Serves from src through Vite rather than from dist, so it needs no build and
// cannot invalidate a matrix running against dist/ at the same time.
//
//   npm run shots
//   npm run shots -- otaki:5600,6400 eastbourne-dash:8000
//
// It also prints the building and obstacle counts for each course, which come
// from the running game. Do not be tempted to count them in a throwaway Node
// script instead: `buildTrack()` takes no arguments and reads a module-level
// course, so it will answer confidently about the wrong one.
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { writeFile, mkdir } from 'node:fs/promises';

const OUT = process.env.SHOTS_OUT || 'playtest-out/shots-adhoc';
const DEFAULT = ['eastbourne-dash:5200,8000', 'otaki:5600,6400', 'remutaka:4000', 'manfield:2000'];
const jobs = (process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT).map((arg) => {
  const [course, frames] = arg.split(':');
  return { course, frames: (frames || '4000').split(',').map(Number).sort((a, b) => a - b) };
});

await mkdir(OUT, { recursive: true });
const server = await createServer({
  server: { host: '127.0.0.1', port: 4488, strictPort: false },
  logLevel: 'error',
});
await server.listen();
const port = server.httpServer.address().port;
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
});

for (const { course, frames } of jobs) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const problems = [];
  page.on('pageerror', (e) => problems.push(`error: ${e.message}`));
  page.on('console', (m) => {
    // THREE warns rather than throws on a colour it cannot parse, which is how a
    // whole town rendered white without anything failing. Warnings count.
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
  });
  await page.route('https://fonts.googleapis.com/**', (r) =>
    r.fulfill({ status: 200, contentType: 'text/css', body: '' })
  );
  await page.goto(`http://127.0.0.1:${port}/?harness=1&course=${course}&seed=780385`, {
    waitUntil: 'networkidle',
  });
  await page.waitForFunction(() => !!window.__h, null, { timeout: 20000 });
  await page.evaluate(() => window.advanceTime(0));

  await page.evaluate(() => {
    const scene = window.__BERYL_GAME__.scene.getScene('Race');
    for (const fence of scene.scenery.props.filter(p => p.kind === 'fence')) {
      const line = scene.track.centerline;
      let index = 0, gap = Infinity;
      line.forEach((p, i) => {
        const d = Math.hypot(p.x - fence.x, p.y - fence.y);
        if (d < gap) { gap = d; index = i; }
      });
      const a = line[Math.max(0, index - 1)], b = line[Math.min(line.length - 1, index + 1)];
      const dot = Math.abs(((b.x-a.x)*Math.cos(fence.yaw)+(b.y-a.y)*Math.sin(fence.yaw))/Math.hypot(b.x-a.x,b.y-a.y));
      if (dot < 0.95) throw new Error(`Fence crosses road: alignment ${dot}`);
    }
  });

  let done = 0;
  for (const frame of frames) {
    // The bot decides every frame. Stepping without feeding it input leaves the
    // car parked while the clock runs, which produces very convincing
    // screenshots of an empty paddock.
    await page.evaluate((n) => {
      for (let i = 0; i < n; i += 1) {
        window.__h.setInput(window.__h._botInput('waypoint'));
        window.__h._stepNoRender(1);
      }
    }, frame - done);
    done = frame;
    const data = await page.evaluate(() => window.__h._screenshot());
    await writeFile(`${OUT}/${course}-f${frame}.png`, Buffer.from(data.split(',')[1], 'base64'));
  }

  if (course === 'otaki' || course === 'manfield') {
    const data = await page.evaluate(async course => {
      const { Vector3 } = await import('/node_modules/three/build/three.module.js');
      const scene = window.__BERYL_GAME__.scene.getScene('Race'), world = scene.world3d;
      let x, z, yaw = 0;
      if (course === 'manfield') {
        const st = scene.structures.find(s => s.kind === 'garage');
        ({ x, z, yaw } = st);
      } else {
        const { WORLD } = await import('/src/config.js');
        x = WORLD.width * 11200 / 19000; z = WORLD.height * 5600 / 11000;
      }
      const y = scene.terrain.heightAt(x, z);
      const camera = world.chase.camera.clone();
      const target = new Vector3(x, y + (course === 'manfield' ? 60 : 0), z);
      camera.position.set(x + Math.cos(yaw) * 550 - Math.sin(yaw) * 500, y + 450,
        z - Math.sin(yaw) * 550 - Math.cos(yaw) * 500);
      camera.lookAt(target);
      world.renderer.render(world.scene3d, camera);
      return world.renderer.domElement.toDataURL('image/png');
    }, course);
    await writeFile(`${OUT}/${course}-scenery.png`, Buffer.from(data.split(',')[1], 'base64'));
  }

  if (process.env.BERYL_ART_VIEWS === '1') {
    if (course === 'eastbourne-dash') {
      for (const kind of ['shops', 'villa', 'shelter', 'pavilion']) {
        const data = await page.evaluate(async kind => {
          const { Vector3 } = await import('/node_modules/three/build/three.module.js');
          const scene = window.__BERYL_GAME__.scene.getScene('Race');
          const s = scene.structures.find(s => s.kind === kind);
          const world = scene.world3d;
          const camera = world.chase.camera.clone();
          const front = new Vector3(-Math.sin(s.yaw), 0, -Math.cos(s.yaw));
          const target = new Vector3(s.x, scene.terrain.heightAt(s.x, s.z) + 120, s.z);
          camera.position.copy(target).addScaledVector(front, 1700);
          camera.position.x += Math.cos(s.yaw) * 700;
          camera.position.z -= Math.sin(s.yaw) * 700;
          camera.position.y += 450;
          camera.lookAt(target);
          world.renderer.render(world.scene3d, camera);
          return world.renderer.domElement.toDataURL('image/png');
        }, kind);
        await writeFile(`${OUT}/eastbourne-${kind}.png`, Buffer.from(data.split(',')[1], 'base64'));
      }
    }
    for (const [name, eye] of [['front-quarter', [240, 150, -330]], ['rear-quarter', [-240, 145, 330]], ['side', [390, 100, 0]]]) {
      const data = await page.evaluate(async (eye) => {
        const { Vector3 } = await import('/node_modules/three/build/three.module.js');
        const world = window.__BERYL_GAME__.scene.getScene('Race').world3d;
        const camera = world.chase.camera.clone();
        camera.fov = 45;
        camera.updateProjectionMatrix();
        camera.position.copy(world.beryl.root.localToWorld(new Vector3(...eye)));
        camera.lookAt(world.beryl.root.localToWorld(new Vector3(0, 48, 0)));
        world.renderer.render(world.scene3d, camera);
        return world.renderer.domElement.toDataURL('image/png');
      }, eye);
      await writeFile(`${OUT}/beryl-${name}.png`, Buffer.from(data.split(',')[1], 'base64'));
    }
  }
  const counts = await page.evaluate(() => {
    const scene = window.__BERYL_GAME__.scene.getScene('Race');
    const kinds = {};
    for (const s of scene.structures || []) kinds[s.kind] = (kinds[s.kind] || 0) + 1;
    return { buildings: (scene.structures || []).length, obstacles: scene.obstacles.length, kinds };
  });
  console.log(`${course.padEnd(16)} ${counts.buildings} buildings, ${counts.obstacles} obstacles  ${JSON.stringify(counts.kinds)}`);
  const real = problems.filter((p) => !p.includes('GPU stall'));
  if (real.length) console.log(`  ${[...new Set(real)].slice(0, 5).join('\n  ')}`);
  await page.close();
}

console.log(`shots written to ${OUT}/`);
await browser.close();
await server.close();
