import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { TRACKS } from '../src/tracks.js';

// Recorded simulation baselines. Run-to-run equality alone cannot catch a
// physics-affecting regression — three identical wrong runs still pass — so the
// values are pinned here as well. `finishTimeMs`/`pos` come from the AC2 record
// in progress.md; `obstacles` is a SHA-256 over the scene's collision circles,
// which is the fastest way to detect a change in the seeded scenery placement
// that seeds them (see src/scenery.js).
//
// These change only when gameplay is deliberately changed. If a code change
// moves them, fix the change — do not re-record without saying so explicitly.
//
// Recorded 2026-08-01 against 8bf33c6. They supersede the numbers in
// progress.md's 2026-07-28 entry, which were never refreshed after 8bf33c6
// ("Longer/faster courses, bigger Beryl sprite") scaled every route ×2 and
// Beryl's speed ×1.5 — so those were already stale on main before this branch.
//
// Re-recorded again when elevation landed. Eastbourne, Remutaka and Ōtaki now
// have height profiles and gravity along the slope; Manfield is deliberately
// flat, and its numbers being unchanged to the last digit is the check that the
// `grade !== 0` guard in Car.update really does cost a flat course nothing.
// Remutaka is much slower than its flat version (the climb); Eastbourne and
// Ōtaki are slightly faster than theirs (net descents).
//
// Re-recorded once more when Beryl was given more pep — SPEED_SCALE 1.5 -> 1.8
// plus a dedicated ACCEL_SCALE — which took roughly 18% off every course.
// Every course re-baselined when roadWidth doubled to two lanes. That change
// reaches the simulation three ways: the on-track test (`dist <= track.half`)
// covers twice the width, so the grass speed penalty applies far less often;
// tree placement rejects anything within `roadWidth / 2 + 90`, moving the whole
// obstacle field outward and changing every fingerprint; and the terrain road-
// pinning radius grows with it. The bots therefore drive visibly better rather
// than merely differently — Remutaka nearly halved, from 168.7s to 92.0s,
// because the waypoint bot stops falling off the switchbacks.
//
// The widths are capped per course, not simply doubled. track.js offsets the
// centreline by ±half along its own normal, so once half exceeds a corner's
// radius the road folds through itself. Ceilings: Eastbourne 602, Manfield 339,
// Remutaka 260, Otaki 299.
const BASELINES = {
  'eastbourne-dash': {
    finishTimeMs: 63166.666667,
    pos: { x: 2564.543957223, y: 9031.06365964 },
    obstacles: '03391c49f50abb65',
  },
  // Re-recorded when the circuit stopped being an invented oval and became the
  // real Manfeild layout (see docs/tracks/MANFEILD-LAYOUT.md), then again when
  // trees were cleared out of a closed circuit's infield. A different
  // centreline, road width, checkpoint count and tree scatter necessarily move
  // all three values; the other courses did not shift either time, which is the
  // check that the scenery RNG draw order was left alone.
  manfield: {
    finishTimeMs: 34883.333333,
    pos: { x: 8271.057258642, y: 6535.478402139 },
    // Empty: the SHA-256 of `[]`. Manfeild's art pass removed its trees, and
    // with them every collision circle on the circuit — deliberately, so a track
    // you are meant to drive flat out has nothing invisible to hit. Its finish
    // time and position did not move, which is the check that the trees the bot
    // was passing were never ones it touched.
    obstacles: '4f53cda18c2baa0c',
  },
  remutaka: {
    finishTimeMs: 91966.666667,
    pos: { x: 9392.104197495, y: 1526.952446061 },
    obstacles: '1bb1e8cc66ce86a7',
  },
  // Ōtaki alone moved when the 2D renderer came out, and the reason is worth
  // knowing. Phaser's Text constructor keys its canvas texture with a UUID built
  // from Math.random, so every text object silently consumed draws from the
  // seeded stream. Ōtaki's crossbuck label was the only one created *before*
  // tree placement, so deleting it shifted that course's scenery and, with it,
  // the collision circles the run bumps into.
  //
  // This class of fragility is now gone rather than papered over: scatterScenery
  // runs at the top of RaceScene.create(), before any text or HUD exists, so UI
  // churn can no longer perturb gameplay placement.
  otaki: {
    finishTimeMs: 81833.333333,
    pos: { x: 1248.88744466, y: 1243.523102511 },
    obstacles: '84952307dd7e9846',
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

// PLAYWRIGHT_CHROMIUM_EXECUTABLE lets a sandbox or dev box point at a Chromium
// it already has, when that build differs from the one this Playwright version
// would download. Unset in CI, where Playwright resolves its own browser.
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
    // Run-to-run equality is only half of it: also hold the run against the
    // recorded simulation baseline, so a physics-affecting change fails here
    // rather than passing as three consistent wrong answers.
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
          `${course.id}: obstacle placement drifted — the seeded RNG draw order in src/scenery.js changed`
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
