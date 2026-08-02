import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { TRACKS } from '../src/tracks.js';

// Recorded simulation baselines. Run-to-run equality catches nondeterminism;
// these pinned values also catch three identical but wrong runs. Re-record only
// when gameplay deliberately changes, and say why.
const BASELINES = {
  // Complete Eastbourne route replacement: longer coast run, branch network,
  // seven gates and a different obstacle field.
  'eastbourne-dash': {
    finishTimeMs: 108133.333333,
    pos: { x: 2670.485515835, y: 13879.714365457 },
    obstacles: '9404101c358ce680',
  },
  // Real Manfeild layout, enlarged so its broad road fits the tightest radius;
  // no trees or collision circles on the race venue.
  manfield: {
    finishTimeMs: 34883.333333,
    pos: { x: 8271.057258642, y: 6535.478402139 },
    obstacles: '4f53cda18c2baa0c',
  },
  remutaka: {
    finishTimeMs: 91966.666667,
    pos: { x: 9392.104197495, y: 1526.952446061 },
    obstacles: '1bb1e8cc66ce86a7',
  },
  // Re-recorded 2026-08-02 for the complete Ōtaki replacement: a much longer
  // Forks-to-coast route, realistic sealed/gravel split, eight gates, branch
  // roads through town and a newly filtered obstacle field. The test driver now
  // follows the primary road between sparse branch-safe gates rather than
  // cutting straight across paddocks. Other courses stayed byte-identical.
  otaki: {
    finishTimeMs: 105300,
    pos: { x: 1143.180988072, y: 8345.932976982 },
    obstacles: '6e270ace41b2c2d7',
  },
};

// Set RECORD_BASELINES=1 to print values for an intentional route/physics change.
const recording = process.env.RECORD_BASELINES === '1';
const recorded = {};

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

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;
const browser = await chromium.launch({ headless: true, executablePath });
const baseUrl = 'http://127.0.0.1:4173/?harness=1';
const seed = 0x0be4a1;
const maxFrames = 18000;

function comparable(state) {
  return JSON.stringify({
    finishTimeMs: state.finishTimeMs,
    pos: state.pos,
  });
}

async function obstacleFingerprint(page) {
  const json = await page.evaluate(() => {
    const scene = window.__BERYL_GAME__.scene.getScene('Race');
    return JSON.stringify(scene.obstacles);
  });
  return createHash('sha256').update(json).digest('hex').slice(0, 16);
}

async function newRun(courseId) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.stack || error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });
  // Typography is not part of simulation determinism and CI may be offline.
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

  const fingerprint = await obstacleFingerprint(page);
  const harnessErrors = await page.evaluate(() => window.__h.errors());
  await page.close();
  assert.ok(state.finished, `${courseId}: waypoint did not finish within ${maxFrames} frames`);
  assert.deepEqual(pageErrors, [], `${courseId}: page errors during baseline run`);
  assert.deepEqual(harnessErrors, [], `${courseId}: harness errors during baseline run`);
  return { inputs, state, fingerprint };
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
    const results = [
      baseline.state,
      await replay(course.id, baseline.inputs),
      await replay(course.id, baseline.inputs),
    ];

    const expected = comparable(results[0]);
    for (let i = 1; i < results.length; i++) {
      assert.equal(
        comparable(results[i]),
        expected,
        `${course.id}: run ${i + 1} did not match the baseline`
      );
    }

    const pinned = BASELINES[course.id];
    if (recording) {
      recorded[course.id] = {
        finishTimeMs: baseline.state.finishTimeMs,
        pos: baseline.state.pos,
        obstacles: baseline.fingerprint,
      };
    } else {
      assert.ok(pinned, `${course.id}: no recorded baseline — add one to BASELINES`);
      assert.equal(
        baseline.state.finishTimeMs,
        pinned.finishTimeMs,
        `${course.id}: finish time drifted from the recorded baseline`
      );
      assert.deepEqual(
        baseline.state.pos,
        pinned.pos,
        `${course.id}: final position drifted from the recorded baseline`
      );
      if (pinned.obstacles) {
        assert.equal(
          baseline.fingerprint,
          pinned.obstacles,
          `${course.id}: obstacle placement drifted — seeded RNG draw order changed`
        );
      }
    }

    console.log(
      `AC2 ${course.id}: PASS x3 (${baseline.state.finishTimeMs} ms, ${baseline.inputs.length} frames, obstacles ${baseline.fingerprint}, ${expected})`
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

  if (recording) {
    console.log('\nRecorded baselines — paste into BASELINES:\n');
    console.log(JSON.stringify(recorded, null, 2));
  }
} finally {
  await browser.close();
  await server.close();
}
