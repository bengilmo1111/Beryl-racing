import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { SHOTS_DIR } from './files.mjs';
import { installOfflineRoutes, unique, watchPage } from './browser.mjs';

export const BOT_MODULE_NAMES = {
  idle: 'idle',
  'pedal-to-the-metal': 'pedalToTheMetal',
  random: 'random',
  waypoint: 'waypoint',
};

function percentile(values, fraction) {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * fraction) - 1)];
}

function failure(code, scope, message) {
  return { code, scope, message };
}

async function captureShot(page, courseId, botId, frame, suffix = '') {
  const label = String(frame).padStart(6, '0');
  const fileName = `${courseId}--${botId}--f${label}${suffix}.png`;
  // _screenshot renders and composites the 3D world canvas with the transparent
  // Phaser HUD canvas. Reading the Phaser canvas directly would capture the HUD
  // over nothing.
  const dataUrl = await page.evaluate(() => window.__h._screenshot());
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  await writeFile(path.join(SHOTS_DIR, fileName), Buffer.from(base64, 'base64'));
  return `shots/${fileName}`;
}

export async function runSimulation({
  browser,
  baseUrl,
  course,
  botId,
  spec,
  headed,
}) {
  const scope = `${course.id}/${botId}`;
  const courseSpec = spec.courses[course.id];
  const limit = spec.global.botFrameLimits[BOT_MODULE_NAMES[botId]] ??
    spec.global.botFrameLimits[botId];
  const screenshotEvery = spec.global.screenshotEveryFrames;
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await installOfflineRoutes(context);
  const page = await context.newPage();
  const watched = watchPage(page);
  const failures = [];
  const screenshots = [];
  const runtimeMessages = [];
  let finalState = null;
  let maxCheckpoints = 0;
  let offRoadFrames = 0;
  let sampledFrames = 0;
  let outOfBoundsEvents = 0;
  let wasOutOfBounds = false;
  let softlock = false;
  let softlockFrame = null;
  const movementWindow = [];

  try {
    await page.goto(`${baseUrl}?harness=1`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => !!window.__h, null, { timeout: 15000 });
    try {
      await page.evaluate(
        async ({ courseId, seed }) => {
          await window.__h.ready;
          await window.__h.loadCourse(courseId, { seed });
        },
        { courseId: course.id, seed: spec.seed }
      );
    } catch (error) {
      runtimeMessages.push(error.message);
    }

    finalState = await page.evaluate(() => window.__h?._stateLite?.() || null);
    if (finalState && finalState.checkpointsTotal !== courseSpec.checkpointsTotal) {
      failures.push(
        failure(
          'checkpoint-count',
          scope,
          `expected ${courseSpec.checkpointsTotal} checkpoints, found ${finalState.checkpointsTotal}`
        )
      );
    }

    while (finalState && finalState.frame < limit && !(botId === 'waypoint' && finalState.finished)) {
      let samples;
      try {
        samples = await page.evaluate(
          ({ moduleName, frames }) => {
            const result = [];
            let state = window.__h._stateLite();
            for (let i = 0; i < frames && !state.finished; i++) {
              const input = window.__h._botInput(moduleName, state);
              window.__h.setInput(input);
              state = window.__h._stepNoRender(1);
              result.push({ state, input });
            }
            return result;
          },
          {
            moduleName: BOT_MODULE_NAMES[botId],
            frames: Math.min(30, limit - finalState.frame),
          }
        );
      } catch (error) {
        runtimeMessages.push(error.message);
        break;
      }

      for (const sample of samples) {
        const state = sample.state;
        finalState = state;
        sampledFrames += 1;
        maxCheckpoints = Math.max(maxCheckpoints, state.checkpointsHit);
        if (state.onSurface === 'grass') offRoadFrames += 1;

        const outside =
          state.pos.x < 0 ||
          state.pos.y < 0 ||
          state.pos.x > state.world.width ||
          state.pos.y > state.world.height;
        if (outside && !wasOutOfBounds) outOfBoundsEvents += 1;
        wasOutOfBounds = outside;

        const motiveInput = sample.input.throttle > 0.1 || sample.input.brake > 0.1;
        if (!motiveInput) {
          movementWindow.length = 0;
        } else {
          movementWindow.push(state.pos);
          if (movementWindow.length > spec.global.softlockWindowFrames) movementWindow.shift();
          if (movementWindow.length === spec.global.softlockWindowFrames && !softlock) {
            const first = movementWindow[0];
            let maxDistance = 0;
            for (const pos of movementWindow) {
              maxDistance = Math.max(maxDistance, Math.hypot(pos.x - first.x, pos.y - first.y));
            }
            const boundary =
              state.pos.x < 80 ||
              state.pos.y < 80 ||
              state.pos.x > state.world.width - 80 ||
              state.pos.y > state.world.height - 80;
            if (!boundary && maxDistance < spec.global.softlockMinDisplacement) {
              softlock = true;
              softlockFrame = state.frame;
            }
          }
        }
      }

      if (
        finalState &&
        (screenshots.length === 0 ||
          Math.floor(finalState.frame / screenshotEvery) >
            Math.floor((finalState.frame - samples.length) / screenshotEvery))
      ) {
        try {
          screenshots.push(await captureShot(page, course.id, botId, finalState.frame));
        } catch (error) {
          failures.push(failure('screenshot-capture', scope, error.message));
        }
      }
    }

    if (finalState) {
      try {
        screenshots.push(
          await captureShot(page, course.id, botId, finalState.frame, '--final')
        );
      } catch (error) {
        failures.push(failure('screenshot-capture', scope, error.message));
      }
    }
  } catch (error) {
    runtimeMessages.push(error.stack || error.message);
  }

  let harnessErrors = [];
  try {
    harnessErrors = await page.evaluate(() => window.__h?.errors?.() || []);
    const fullState = await page.evaluate(() => window.__h?.state?.() || null);
    if (fullState) finalState = fullState;
  } catch (error) {
    runtimeMessages.push(error.message);
  }

  const failedRequests = unique([
    ...watched.failedRequests,
    ...harnessErrors.filter((entry) => entry.type === 'network').map((entry) => entry.detail),
  ]);
  const unhandledRejections = unique(
    harnessErrors
      .filter((entry) => entry.type === 'unhandledrejection')
      .map((entry) => entry.detail)
  );
  const runtimeErrors = unique([
    ...runtimeMessages,
    ...watched.pageErrors,
    ...harnessErrors
      .filter((entry) => entry.type === 'error' || entry.type === 'exception')
      .map((entry) => entry.detail),
  ]);
  const consoleErrors = unique([
    ...watched.consoleErrors,
    ...harnessErrors.filter((entry) => entry.type === 'console').map((entry) => entry.detail),
  ]);
  const frameTimes = finalState?.frameTimesMs || [];
  const checkpointsTotal = finalState?.checkpointsTotal || courseSpec.checkpointsTotal;
  const checkpointReachRate = checkpointsTotal > 0 ? maxCheckpoints / checkpointsTotal : 0;
  const metrics = {
    finished: !!finalState?.finished,
    finishTimeMs: finalState?.finishTimeMs ?? null,
    checkpointsHit: maxCheckpoints,
    checkpointsTotal,
    checkpointReachRate,
    softlock,
    softlockFrame,
    outOfBoundsEvents,
    offRoadFraction: sampledFrames > 0 ? offRoadFrames / sampledFrames : 0,
    frameTimeP95Ms: percentile(frameTimes, 0.95),
    framesOver33Ms: frameTimes.filter((value) => value > 33).length,
    consoleErrors,
    unhandledRejections,
    runtimeErrors,
    failedRequests,
  };

  if (runtimeErrors.length || unhandledRejections.length) {
    failures.push(
      failure(
        'runtime-error',
        scope,
        unique([...runtimeErrors, ...unhandledRejections]).join(' | ')
      )
    );
  }
  if (consoleErrors.length > spec.global.maxConsoleErrors) {
    failures.push(
      failure('console-error', scope, `${consoleErrors.length} console error(s): ${consoleErrors.join(' | ')}`)
    );
  }
  if (failedRequests.length > spec.global.maxFailedRequests) {
    failures.push(
      failure('failed-request', scope, `${failedRequests.length} failed request(s): ${failedRequests.join(' | ')}`)
    );
  }
  if (metrics.framesOver33Ms > spec.global.maxFramesOver33Ms) {
    failures.push(
      failure(
        'frame-budget',
        scope,
        `${metrics.framesOver33Ms} frames exceeded 33ms (limit ${spec.global.maxFramesOver33Ms})`
      )
    );
  }
  if (courseSpec.noSoftlock && softlock) {
    failures.push(failure('softlock', scope, `position stayed within ${spec.global.softlockMinDisplacement}px for ${spec.global.softlockWindowFrames} driven frames`));
  }
  if (outOfBoundsEvents > courseSpec.maxOutOfBoundsEvents) {
    failures.push(
      failure(
        'out-of-bounds',
        scope,
        `${outOfBoundsEvents} out-of-bounds event(s), limit ${courseSpec.maxOutOfBoundsEvents}`
      )
    );
  }
  if (botId === 'waypoint') {
    if (courseSpec.waypointMustFinish && !metrics.finished) {
      failures.push(failure('waypoint-not-finished', scope, `did not finish within ${limit} frames`));
    }
    if (checkpointReachRate < courseSpec.minimumWaypointCheckpointRate) {
      failures.push(
        failure(
          'checkpoint-rate',
          scope,
          `${Math.round(checkpointReachRate * 100)}% reached, minimum ${Math.round(courseSpec.minimumWaypointCheckpointRate * 100)}%`
        )
      );
    }
    if (
      metrics.finishTimeMs != null &&
      (metrics.finishTimeMs < courseSpec.finishTimeMs.min ||
        metrics.finishTimeMs > courseSpec.finishTimeMs.max)
    ) {
      failures.push(
        failure(
          'finish-time-range',
          scope,
          `${metrics.finishTimeMs}ms outside ${courseSpec.finishTimeMs.min}–${courseSpec.finishTimeMs.max}ms`
        )
      );
    }
  }

  await context.close();
  return {
    courseId: course.id,
    bot: botId,
    verdict: failures.length === 0 ? 'pass' : 'fail',
    metrics,
    screenshots,
    failures,
    headed,
  };
}
