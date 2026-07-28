import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { TRACKS } from '../src/tracks.js';

const manifest = JSON.parse(await readFile(new URL('../game-manifest.json', import.meta.url), 'utf8'));
const courses = manifest.courses || [];
assert.ok(courses.length > 0, 'game-manifest.json must list at least one course');
assert.deepEqual(
  courses.map(({ id }) => id).sort(),
  TRACKS.map(({ id }) => id).sort(),
  'game-manifest.json courses must match src/tracks.js'
);

const server = await createServer({
  server: { host: '127.0.0.1', port: 4173, strictPort: true },
  logLevel: 'error',
});
await server.listen();

const browser = await chromium.launch({ headless: true });
const baseUrl = 'http://127.0.0.1:4173/?harness=1';
const seed = 0x0be4a1;
const maxFrames = 18000;

function comparable(state) {
  return JSON.stringify({
    finishTimeMs: state.finishTimeMs,
    pos: state.pos,
  });
}

async function newRun(courseId) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.stack || error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });
  // Typography is not part of simulation determinism and CI may have no
  // outbound network. Stub the external stylesheet so only game requests count.
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' })
  );
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__h, null, { timeout: 15000 });
  await page.evaluate(async ({ id, runSeed }) => {
    await window.__h.ready;
    await window.__h.loadCourse(id, { seed: runSeed });
  }, { id: courseId, runSeed: seed });
  return { page, pageErrors };
}

async function recordInputs(courseId) {
  const { page, pageErrors } = await newRun(courseId);
  const inputs = [];
  let state = await page.evaluate(() => window.__h.state());

  while (!state.finished && inputs.length < maxFrames) {
    const chunk = await page.evaluate(async (limit) => {
      const { default: bot } = await import('/playtest/bots/waypoint.js');
      const commands = [];
      let snapshot = window.__h.state();
      for (let i = 0; i < limit && !snapshot.finished; i++) {
        const command = bot(snapshot);
        commands.push(command);
        window.__h.setInput(command);
        snapshot = window.__h._stepNoRender(1);
      }
      return { commands, snapshot };
    }, Math.min(600, maxFrames - inputs.length));
    inputs.push(...chunk.commands);
    state = chunk.snapshot;
  }

  const harnessErrors = await page.evaluate(() => window.__h.errors());
  await page.close();
  assert.ok(state.finished, `${courseId}: waypoint did not finish within ${maxFrames} frames`);
  assert.deepEqual(pageErrors, [], `${courseId}: page errors during baseline run`);
  assert.deepEqual(harnessErrors, [], `${courseId}: harness errors during baseline run`);
  return { inputs, state };
}

async function replay(courseId, inputs) {
  const { page, pageErrors } = await newRun(courseId);
  const state = await page.evaluate((commands) => {
    let snapshot = window.__h.state();
    for (const command of commands) {
      window.__h.setInput(command);
      snapshot = window.__h._stepNoRender(1);
    }
    return snapshot;
  }, inputs);
  const harnessErrors = await page.evaluate(() => window.__h.errors());
  await page.close();
  assert.deepEqual(pageErrors, [], `${courseId}: page errors during replay`);
  assert.deepEqual(harnessErrors, [], `${courseId}: harness errors during replay`);
  return state;
}

try {
  for (const course of courses) {
    const baseline = await recordInputs(course.id);
    const results = [baseline.state];
    results.push(await replay(course.id, baseline.inputs));
    results.push(await replay(course.id, baseline.inputs));

    const expected = comparable(results[0]);
    for (let i = 1; i < results.length; i++) {
      assert.equal(
        comparable(results[i]),
        expected,
        `${course.id}: run ${i + 1} did not match the baseline`
      );
    }
    console.log(
      `AC2 ${course.id}: PASS x3 (${baseline.state.finishTimeMs} ms, ${baseline.inputs.length} frames, ${expected})`
    );
  }

  const botNames = ['idle', 'pedalToTheMetal', 'random', 'waypoint'];
  for (const course of courses) {
    const { page, pageErrors } = await newRun(course.id);
    for (const botName of botNames) {
      const snapshot = await page.evaluate(async ({ id, runSeed, name }) => {
        const bots = await import('/playtest/bots/index.js');
        await window.__h.loadCourse(id, { seed: runSeed });
        let state = window.__h.state();
        for (let frame = 0; frame < 180; frame++) {
          window.__h.setInput(bots[name](state));
          state = window.__h._stepNoRender(1);
        }
        return state;
      }, { id: course.id, runSeed: seed, name: botName });
      assert.ok(
        Number.isFinite(snapshot.pos.x) && Number.isFinite(snapshot.pos.y),
        `${course.id}/${botName}: produced a non-finite position`
      );
    }
    const harnessErrors = await page.evaluate(() => window.__h.errors());
    await page.close();
    assert.deepEqual(pageErrors, [], `${course.id}: page errors during bot matrix`);
    assert.deepEqual(harnessErrors, [], `${course.id}: harness errors during bot matrix`);
    console.log(`D2 ${course.id}: PASS ${botNames.join(', ')}`);
  }
} finally {
  await browser.close();
  await server.close();
}
