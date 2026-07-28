import path from 'node:path';
import waypoint from '../bots/waypoint.js';
import { ensureDir, writeJson } from '../lib/files.mjs';
import { installOfflineRoutes, unique, watchPage } from '../lib/browser.mjs';

const PORTRAIT = { width: 412, height: 915 };
const LANDSCAPE = { width: 915, height: 412 };
const FIXED_DELTA_MS = 1000 / 60;

function journeyFailure(code, message) {
  return { code, scope: 'journey/new-mobile-player', message };
}

async function canvasObjectPoint(page, sceneKey, expression) {
  return page.evaluate(
    ({ key, objectExpression }) => {
      const game = window.__BERYL_GAME__;
      const scene = game.scene.getScene(key);
      let object;
      if (objectExpression === 'play') object = scene.play;
      if (objectExpression === 'default-course') object = scene.trackButtons[0].btn;
      const rect = game.canvas.getBoundingClientRect();
      return {
        x: rect.left + (object.x / scene.scale.width) * rect.width,
        y: rect.top + (object.y / scene.scale.height) * rect.height,
      };
    },
    { key: sceneKey, objectExpression: expression }
  );
}

async function screenshot(page, journeyDir, name) {
  const file = path.join(journeyDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return path.basename(file);
}

function touchSignature(points) {
  return points
    .map((point) => `${point.id}:${Math.round(point.x)}:${Math.round(point.y)}`)
    .sort()
    .join(',');
}

export async function runNewMobilePlayerJourney({ browser, baseUrl, outDir }) {
  const journeyDir = path.join(outDir, 'new-mobile-player');
  await ensureDir(journeyDir);
  const context = await browser.newContext({
    viewport: PORTRAIT,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
    recordVideo: { dir: journeyDir, size: LANDSCAPE },
  });
  await installOfflineRoutes(context);
  await context.addInitScript(() => localStorage.clear());
  const page = await context.newPage();
  const watched = watchPage(page);
  const client = await context.newCDPSession(page);
  const failures = [];
  const screenshots = [];
  const timeline = [];
  let finishState = null;
  let persistedBest = null;
  let retryBest = null;
  let currentTouchSignature = '';
  let videoPath = null;

  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  try {
    await page.goto(`${baseUrl}?harness=1&ui=1&seed=779425`, {
      waitUntil: 'networkidle',
    });
    await page.waitForFunction(() => !!window.__h, null, { timeout: 15000 });
    await page.evaluate(() => window.__h.ready);
    screenshots.push(await screenshot(page, journeyDir, '01-portrait-rotate-prompt'));

    await page.setViewportSize(LANDSCAPE);
    await page.waitForTimeout(200);
    await page.evaluate(() => window.advanceTime(0));
    screenshots.push(await screenshot(page, journeyDir, '02-landscape-title'));

    const defaultCourse = await canvasObjectPoint(page, 'Title', 'default-course');
    await page.touchscreen.tap(defaultCourse.x, defaultCourse.y);
    await page.evaluate((ms) => window.advanceTime(ms), 2 * FIXED_DELTA_MS);
    const play = await canvasObjectPoint(page, 'Title', 'play');
    await page.touchscreen.tap(play.x, play.y);
    await page.evaluate((ms) => window.advanceTime(ms), 2 * FIXED_DELTA_MS);
    await page.waitForFunction(
      () => window.__BERYL_GAME__?.scene?.isActive('Race'),
      null,
      { timeout: 10000 }
    );

    for (let i = 0; i < 8; i++) {
      await page.evaluate((ms) => window.advanceTime(ms), 30 * FIXED_DELTA_MS);
      const timing = await page.evaluate(
        () => window.__BERYL_GAME__.scene.getScene('Race').timing
      );
      if (timing) break;
    }
    let state = await page.evaluate(() => window.__h._stateLite());
    timeline.push(state);
    screenshots.push(await screenshot(page, journeyDir, '03-race-start'));

    const controls = await page.evaluate(() => {
      const touch = window.__BERYL_GAME__.scene.getScene('Race').touch;
      return Object.fromEntries(
        touch.buttons.map((button) => [
          button.stateKey,
          { x: button.cx, y: button.cy, id: button.stateKey },
        ])
      );
    });

    let previousCheckpoint = state.checkpointsHit;
    let commandFrames = 0;
    while (!state.finished && commandFrames < 18000) {
      const input = waypoint(state);
      const points = [];
      if (input.throttle > 0.5) points.push({ ...controls.gas, id: 1 });
      if (input.brake > 0.5) points.push({ ...controls.brake, id: 1 });
      if (input.steer < -0.12) points.push({ ...controls.left, id: 2 });
      if (input.steer > 0.12) points.push({ ...controls.right, id: 2 });
      const signature = touchSignature(points);
      if (signature !== currentTouchSignature) {
        if (currentTouchSignature) {
          await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        }
        if (points.length) {
          await client.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: points.map((point) => ({
              x: point.x,
              y: point.y,
              id: point.id,
              radiusX: 2,
              radiusY: 2,
              force: 1,
            })),
          });
        }
        currentTouchSignature = signature;
      }

      await page.evaluate((ms) => window.advanceTime(ms), 5 * FIXED_DELTA_MS);
      commandFrames += 5;
      state = await page.evaluate(() => window.__h._stateLite());
      if (state.frame % 30 < 5) timeline.push(state);
      if (state.checkpointsHit !== previousCheckpoint) {
        previousCheckpoint = state.checkpointsHit;
        screenshots.push(
          await screenshot(
            page,
            journeyDir,
            `checkpoint-${String(previousCheckpoint).padStart(2, '0')}`
          )
        );
      }
    }

    if (currentTouchSignature) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      currentTouchSignature = '';
    }
    finishState = state;
    timeline.push(state);
    if (!state.finished) {
      failures.push(
        journeyFailure('journey-not-finished', 'touch-only waypoint drive did not finish')
      );
    } else {
      screenshots.push(await screenshot(page, journeyDir, '04-finish'));
      const persisted = await page.evaluate(() => {
        const scene = window.__BERYL_GAME__.scene.getScene('Race');
        return {
          key: scene.def.storageKey,
          value: localStorage.getItem(scene.def.storageKey),
        };
      });
      persistedBest = Number(persisted.value) || null;
      if (persistedBest == null) {
        failures.push(
          journeyFailure('best-time-not-persisted', `no value stored at ${persisted.key}`)
        );
      }

      await page.evaluate((ms) => window.advanceTime(ms), 60 * FIXED_DELTA_MS);
      screenshots.push(await screenshot(page, journeyDir, '05-results'));
      await page.touchscreen.tap(LANDSCAPE.width / 2, LANDSCAPE.height / 2 + 80);
      await page.waitForFunction(
        () => window.__BERYL_GAME__?.scene?.isActive('Race'),
        null,
        { timeout: 10000 }
      );
      await page.evaluate((ms) => window.advanceTime(ms), 150 * FIXED_DELTA_MS);
      retryBest = await page.evaluate(() => {
        const scene = window.__BERYL_GAME__.scene.getScene('Race');
        return {
          sceneBest: scene.best,
          storedBest: Number(localStorage.getItem(scene.def.storageKey)) || null,
        };
      });
      screenshots.push(await screenshot(page, journeyDir, '06-retry'));
      if (
        retryBest.sceneBest !== persistedBest ||
        retryBest.storedBest !== persistedBest
      ) {
        failures.push(
          journeyFailure(
            'best-time-retry-mismatch',
            `persisted ${persistedBest}, retry scene ${retryBest.sceneBest}, storage ${retryBest.storedBest}`
          )
        );
      }
    }
  } catch (error) {
    failures.push(journeyFailure('journey-error', error.stack || error.message));
  } finally {
    if (currentTouchSignature) {
      try {
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } catch {
        // Page may already be closed.
      }
    }
    try {
      const harnessErrors = await page.evaluate(() => window.__h?.errors?.() || []);
      if (harnessErrors.length) {
        failures.push(
          journeyFailure(
            'journey-harness-error',
            harnessErrors.map((entry) => `${entry.type}: ${entry.detail}`).join(' | ')
          )
        );
      }
    } catch {
      // Primary journey error already records a page failure.
    }
    await writeJson(path.join(journeyDir, 'state-timeline.json'), timeline);
    await writeJson(path.join(journeyDir, 'console-log.json'), {
      consoleErrors: unique(watched.consoleErrors),
      pageErrors: unique(watched.pageErrors),
      failedRequests: unique(watched.failedRequests),
    });
    await context.tracing.stop({ path: path.join(journeyDir, 'trace.zip') });
    const video = page.video();
    await page.close();
    await context.close();
    if (video) {
      try {
        videoPath = await video.path();
      } catch {
        videoPath = null;
      }
    }
  }

  const shellErrors = unique([
    ...watched.pageErrors,
    ...watched.failedRequests,
  ]);
  if (shellErrors.length) {
    failures.push(journeyFailure('journey-shell-error', shellErrors.join(' | ')));
  }

  return {
    id: 'new-mobile-player',
    verdict: failures.length === 0 ? 'pass' : 'fail',
    touchOnly: true,
    initialViewport: PORTRAIT,
    rotatedViewport: LANDSCAPE,
    finishTimeMs: finishState?.finishTimeMs ?? null,
    persistedBest,
    retryBest,
    screenshots,
    trace: 'new-mobile-player/trace.zip',
    video: videoPath ? path.relative(outDir, videoPath).replaceAll('\\', '/') : null,
    timeline: 'new-mobile-player/state-timeline.json',
    consoleLog: 'new-mobile-player/console-log.json',
    failures,
  };
}
