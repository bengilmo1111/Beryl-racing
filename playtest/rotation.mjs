// Turning the phone: the half-screen bug, and the pause that replaced it.
//
// The bug this exists to keep fixed: in fullscreen, a portrait/landscape round
// trip left the game drawn into a portrait-wide strip of a landscape screen,
// and the only way out was to toggle fullscreen off and on again. The cause is
// in Phaser's ScaleManager — see the note at the top of src/viewport.js — and
// it is entirely invisible to the deterministic harness, which never rotates
// and runs at a fixed size.
//
// So this loads the game the way a person on a phone does, turns it over, and
// checks the four things that were wrong or missing: the canvas follows the
// viewport, the game pauses rather than being driven blind, the prompt is
// somewhere a fullscreen player can actually see it, and the climb clock is not
// charged for the time the phone was sideways.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const LANDSCAPE = { width: 915, height: 412 };
const PORTRAIT = { width: 412, height: 915 };
// Rotation is reported in stages and src/viewport.js keeps re-measuring for a
// while afterwards, so give it longer than a frame to come to rest.
const SETTLE_MS = 1500;

const server = await createServer({
  server: { host: '127.0.0.1', port: 4456, strictPort: true },
  logLevel: 'error',
});
await server.listen();

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
});
// A phone: touch input and a coarse pointer, which is what both the stylesheet
// and src/viewport.js key the portrait prompt off.
const context = await browser.newContext({
  viewport: LANDSCAPE,
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.stack || e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
await page.route('https://fonts.googleapis.com/**', (r) =>
  r.fulfill({ status: 200, contentType: 'text/css', body: '' })
);
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto('http://127.0.0.1:4456/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__BERYL_GAME__?.scene?.isActive('Title'), null, {
  timeout: 20000,
});

function readState() {
  return page.evaluate(() => {
    const game = window.__BERYL_GAME__;
    const world = document.getElementById('game3d');
    const rotate = document.getElementById('rotate');
    return {
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      canvas: `${game.canvas.width}x${game.canvas.height}`,
      world: world ? `${world.width}x${world.height}` : null,
      scale: `${Math.round(game.scale.width)}x${Math.round(game.scale.height)}`,
      fullscreen: !!document.fullscreenElement,
      paused: game.isPaused,
      promptShown: getComputedStyle(rotate).display !== 'none',
      promptText: rotate.querySelector('#rotate-message').textContent.trim(),
      resumeOffered: !document.getElementById('rotate-resume').hidden,
    };
  });
}

async function rotate(size) {
  await page.setViewportSize(size);
  await page.waitForTimeout(SETTLE_MS);
  return readState();
}

// The prompt has to be inside the fullscreen target, or a fullscreen phone
// shows the player nothing at all: only that element's subtree is rendered.
// This is how it used to be, and it is an easy thing to undo by accident.
const promptInsideGame = await page.evaluate(
  () => !!document.getElementById('game').querySelector('#rotate')
);
assert.ok(promptInsideGame, 'the rotate prompt must live inside #game, the fullscreen target');

// --- Windowed -----------------------------------------------------------------
let state = await rotate(PORTRAIT);
assert.equal(state.paused, true, 'portrait should pause the game');
assert.equal(state.promptShown, true, 'portrait should show the rotate prompt');

state = await rotate(LANDSCAPE);
assert.equal(state.paused, false, 'landscape should resume the game');
assert.equal(state.promptShown, false, 'landscape should hide the rotate prompt');
assert.equal(state.canvas, state.viewport, 'the canvas should fill the viewport');

// --- Fullscreen, which is where the bug lived ---------------------------------
// Entering needs a real gesture, so tap the button rather than calling the API.
const button = await page.evaluate(() => {
  const rect = window.__BERYL_GAME__.canvas.getBoundingClientRect();
  return { x: rect.left + rect.width - 34, y: rect.top + 34 };
});
await page.touchscreen.tap(button.x, button.y);
await page.waitForTimeout(600);
state = await readState();
assert.equal(state.fullscreen, true, 'the fullscreen button should enter fullscreen');

state = await rotate(PORTRAIT);
assert.equal(state.paused, true, 'portrait in fullscreen should pause the game');
assert.equal(state.promptShown, true, 'portrait in fullscreen should show the rotate prompt');

state = await rotate(LANDSCAPE);
assert.equal(state.fullscreen, true, 'the round trip should stay in fullscreen');
assert.equal(state.paused, false, 'landscape should resume the game');
assert.equal(
  state.canvas,
  state.viewport,
  `the canvas is ${state.canvas} on a ${state.viewport} screen — the half-screen bug is back`
);
assert.equal(state.scale, state.viewport, 'the Scale Manager should agree with the viewport');

// --- The climb clock ----------------------------------------------------------
// Straight into a race, without waiting out the countdown: headless frames are
// slow enough here that three seconds of scene time takes the best part of a
// minute, and the countdown is not what is being measured.
await page.evaluate(() => window.__BERYL_GAME__.scene.getScene('Title').scene.start('Race'));
await page.waitForFunction(() => window.__BERYL_GAME__.scene.isActive('Race'), null, {
  timeout: 20000,
});
await page.evaluate(() => {
  const race = window.__BERYL_GAME__.scene.getScene('Race');
  race.timing = true;
  race.lapStartTime = race.time.now;
});
const elapsed = () =>
  page.evaluate(() => {
    const race = window.__BERYL_GAME__.scene.getScene('Race');
    return race.time.now - race.lapStartTime;
  });

const before = await elapsed();
await page.setViewportSize(PORTRAIT);
const pausedFor = 2500;
await page.waitForTimeout(pausedFor);
state = await readState();
assert.match(
  state.promptText,
  /paused/i,
  'the prompt should say the climb is paused when one is under way'
);
await page.setViewportSize(LANDSCAPE);
await page.waitForTimeout(SETTLE_MS);
const charged = (await elapsed()) - before;
// Scene time is wall clock, so without the correction in RaceScene.update the
// whole pause lands on the player's climb.
assert.ok(
  charged < pausedFor,
  `the climb was charged ${Math.round(charged)}ms for a ${pausedFor}ms pause`
);

// --- When the browser drops fullscreen on the way round ------------------------
// Some do. Re-entering needs a gesture, so the prompt stays up and asks for one
// rather than quietly demoting the player to a windowed game.
await page.setViewportSize(PORTRAIT);
await page.waitForTimeout(600);
await page.evaluate(() => document.exitFullscreen && document.exitFullscreen());
await page.waitForTimeout(400);
state = await rotate(LANDSCAPE);
assert.equal(state.promptShown, true, 'a dropped fullscreen should keep the prompt up');
assert.equal(state.resumeOffered, true, 'a dropped fullscreen should offer the tap back in');
assert.equal(state.paused, true, 'the game should stay paused until that tap');

const tap = await page.evaluate(() => {
  const rect = document.getElementById('rotate-resume').getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
});
await page.touchscreen.tap(tap.x, tap.y);
await page.waitForTimeout(900);
state = await readState();
assert.equal(state.fullscreen, true, 'the tap should put fullscreen back');
assert.equal(state.paused, false, 'the tap should resume the game');
assert.equal(state.promptShown, false, 'the tap should dismiss the prompt');
assert.equal(state.canvas, state.viewport, 'the canvas should still fill the viewport');
assert.equal(state.world, state.viewport, 'the 3D canvas should still fill the viewport');

assert.deepEqual(errors, [], 'the page logged errors');

await context.close();
await browser.close();
await server.close();
console.log('Rotation: PASS — canvas follows the viewport, portrait pauses, fullscreen survives');
