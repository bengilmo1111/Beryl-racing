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
