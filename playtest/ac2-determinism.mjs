import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { TRACKS } from '../src/tracks.js';

// Recorded simulation baselines. Run-to-run equality alone cannot catch a
// physics-affecting regression — three identical wrong runs still pass — so the
// values are pinned here as well. `obstacles` is a SHA-256 over the scene's
// collision circles, which is the fastest way to detect a change in the seeded
// scenery placement that seeds them (see src/scenery.js).
//
// These change only when gameplay is deliberately changed. If a code change
// moves them, fix the change — do not re-record without saying so explicitly.
//
// The history below is deliberately kept. It is what makes a baseline change
// auditable: each entry records not just that the numbers moved but which check
// the move proved. Deleting it leaves future reviewers unable to tell a
// deliberate re-record from a silent regression.
//
// - Recorded 2026-08-01 against 8bf33c6, superseding the numbers in progress.md's
//   2026-07-28 entry, which were never refreshed after 8bf33c6 scaled every route
//   ×2 and Beryl's speed ×1.5 — so those were already stale on main.
// - Re-recorded when elevation landed. Manfield is deliberately flat, and its
//   numbers being unchanged to the last digit is the check that the
//   `grade !== 0` guard in Car.update really does cost a flat course nothing.
// - Re-recorded when Beryl got more pep (SPEED_SCALE 1.5 -> 1.8 plus a dedicated
//   ACCEL_SCALE), about 18% off every course.
// - Re-recorded when roadWidth doubled to two lanes. That reaches the simulation
//   three ways: the on-track test covers twice the width so the grass penalty
//   applies far less often; tree placement rejects anything within
//   `roadWidth / 2 + 90`, moving the whole obstacle field; and the terrain
//   road-pinning radius grows with it. Widths are capped per course, not simply
//   doubled — see buildEdges in track.js. Ceilings: Eastbourne 602, Manfield 339,
//   Remutaka 260, Otaki 299.
// - Re-recorded when Manfeild became the real traced layout, and again when its
//   trees were removed.
// - Re-recorded when Eastbourne was rebuilt around the real coastal road network.
//   Manfeild, Remutaka and Otaki did not move, which is the check that adding
//   branch roads left the scenery RNG draw order alone.
// - Re-recorded when buildings became solid (src/structures.js). Eastbourne's and
//   Manfeild's finish times and positions were *identical* to the run before and
//   only their fingerprints moved, which is the check that buildings sit off the
//   racing line rather than in it.
// - Re-recorded when Otaki was rebuilt Forks-to-coast, and when the playtest
//   driver started following the primary road between sparse gates (see
//   primaryDriveTarget in src/harness/index.js). The latter moves every course,
//   because the bot now corners on the road instead of aiming across country.
const BASELINES = {
  'eastbourne-dash': {
    finishTimeMs: 88300,
    pos: { x: 2747.92983493, y: 13870.297876459 },
    obstacles: '5bbda54a9e300c32',
  },
  // Manfeild has no trees, so every circle on the circuit belongs to a building:
  // pit wall, garages, timing tower, paddock sheds, grandstand and marshal huts.
  manfield: {
    finishTimeMs: 30950,
    pos: { x: 8270.404420269, y: 6605.160041343 },
    obstacles: 'daa5a3d3cd8a28cb',
  },
  remutaka: {
    finishTimeMs: 90816.666667,
    pos: { x: 9391.229952087, y: 1527.632240145 },
    obstacles: '1bb1e8cc66ce86a7',
  },
  // Re-recorded 2026-08-02 for the complete Ōtaki replacement: a much longer
  // Forks-to-coast route, realistic sealed/gravel split, eight gates, branch
  // roads through town and a newly filtered obstacle field. The test driver now
  // follows the primary road between sparse branch-safe gates rather than
  // cutting straight across paddocks. The fingerprint also includes the solid
  // structures introduced on 3d-port after this branch started.
  otaki: {
    finishTimeMs: 112600,
    pos: { x: 1198.201214702, y: 8335.845253765 },
    obstacles: 'f30794a984cd487e',
  },
};

// Set RECORD_BASELINES=1 to print the values to paste above. Use deliberately.
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

// A fingerprint of the collision circles the race was built with. Cheap to
// compute and it fails in seconds, versus a full replay, when the seeded
// scenery placement in src/scenery.js drifts.
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
