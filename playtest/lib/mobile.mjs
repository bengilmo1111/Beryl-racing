import path from 'node:path';
import { OUT_DIR } from './files.mjs';
import { installOfflineRoutes, unique, watchPage } from './browser.mjs';

function failure(code, message) {
  return { code, scope: 'mobile-controls', message };
}

export async function inspectMobileControls({ browser, baseUrl, required }) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  await installOfflineRoutes(context);
  await context.addInitScript(() => localStorage.clear());
  const page = await context.newPage();
  const watched = watchPage(page);
  const failures = [];
  let controls = [];

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForFunction(
      () => window.__BERYL_GAME__?.scene?.isActive('Title'),
      null,
      { timeout: 15000 }
    );

    const play = await page.evaluate(() => {
      const game = window.__BERYL_GAME__;
      const scene = game.scene.getScene('Title');
      const rect = game.canvas.getBoundingClientRect();
      return {
        x: rect.left + (scene.play.x / scene.scale.width) * rect.width,
        y: rect.top + (scene.play.y / scene.scale.height) * rect.height,
      };
    });
    await page.touchscreen.tap(play.x, play.y);
    await page.waitForFunction(
      () => window.__BERYL_GAME__?.scene?.isActive('Race'),
      null,
      { timeout: 10000 }
    );

    controls = await page.evaluate(() => {
      const scene = window.__BERYL_GAME__.scene.getScene('Race');
      if (!scene.touch) return [];
      return scene.touch.buttons.map((button) => ({
        id: button.stateKey,
        x: button.cx,
        y: button.cy,
        radius: button.radius,
        visible: button.button.visible && scene.touch.layer.visible,
        withinViewport:
          button.cx - button.radius >= 0 &&
          button.cy - button.radius >= 0 &&
          button.cx + button.radius <= scene.scale.width &&
          button.cy + button.radius <= scene.scale.height,
      }));
    });
    await page.screenshot({
      path: path.join(OUT_DIR, 'mobile-controls.png'),
      fullPage: true,
    });
  } catch (error) {
    failures.push(failure('mobile-controls-error', error.stack || error.message));
  }

  if (required && controls.length !== 4) {
    failures.push(
      failure('mobile-controls-missing', `expected 4 touch controls, found ${controls.length}`)
    );
  }
  const hidden = controls.filter((control) => !control.visible);
  if (hidden.length) {
    failures.push(
      failure('mobile-controls-hidden', `hidden controls: ${hidden.map((c) => c.id).join(', ')}`)
    );
  }
  const outside = controls.filter((control) => !control.withinViewport);
  if (outside.length) {
    failures.push(
      failure(
        'mobile-controls-out-of-viewport',
        `outside 844x390 viewport: ${outside.map((c) => c.id).join(', ')}`
      )
    );
  }
  const pageFailures = unique([
    ...watched.pageErrors,
    ...watched.failedRequests,
  ]);
  if (pageFailures.length) {
    failures.push(failure('mobile-shell-error', pageFailures.join(' | ')));
  }

  await context.close();
  return {
    verdict: failures.length === 0 ? 'pass' : 'fail',
    portraitViewport: { width: 390, height: 844 },
    landscapeViewport: { width: 844, height: 390 },
    controls,
    consoleErrors: unique(watched.consoleErrors),
    failures,
  };
}
