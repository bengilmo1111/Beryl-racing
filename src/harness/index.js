import { TRACKS, setSelectedTrack } from '../tracks.js';
import { CAR, WORLD } from '../config.js';
import { distanceToCenterline, surfaceAt } from '../track.js';
import { captureHarnessErrors } from './errors.js';
import { createSeededRandom, normalizeSeed } from './rng.js';
import * as bots from '../../playtest/bots/index.js';

const FIXED_DELTA_MS = 1000 / 60;
const COUNTDOWN_FRAME_LIMIT = 600;
const originalRandom = Math.random;

function waitForScene(game, key) {
  return new Promise((resolve) => {
    const poll = () => {
      const scene = game.scene.getScene(key);
      if (scene?.sys?.isActive()) {
        resolve(scene);
      } else {
        requestAnimationFrame(poll);
      }
    };
    poll();
  });
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(min, Math.min(max, number));
}

function round(value) {
  return Number(value.toFixed(9));
}

function roundTime(value) {
  return Number(value.toFixed(6));
}

export function startHarness({ Phaser, config, createGame }) {
  const capturedErrors = captureHarnessErrors();
  const params = new URLSearchParams(window.location.search);
  const responsiveUi = params.get('ui') === '1';
  const querySeed = params.get('seed') || 0;
  let random = createSeededRandom(querySeed);
  Math.random = () => random();

  const harnessConfig = {
    ...config,
    scale: responsiveUi
      ? { ...config.scale }
      : {
          ...config.scale,
          mode: Phaser.Scale.NONE,
          width: 1280,
          height: 720,
        },
  };
  const game = createGame(harnessConfig);
  game.registry.set('__harness', true);

  let absoluteTimeMs = 0;
  let frame = 0;
  let activeSeed = normalizeSeed(querySeed);
  let frameTimesMs = [];
  let virtualInput = { throttle: 0, brake: 0, steer: 0 };

  const ready = waitForScene(game, 'Title').then(() => {
    absoluteTimeMs = game.loop.time;
    game.loop.stop();
  });

  function advanceOneFrame() {
    absoluteTimeMs += FIXED_DELTA_MS;
    const started = performance.now();
    // The deterministic contract is simulation stepping. Rendering every
    // internal frame makes long headless runs needlessly GPU-bound; Phaser's
    // headlessStep executes the same managers and scenes without a canvas draw.
    try {
      game.headlessStep(absoluteTimeMs, FIXED_DELTA_MS);
    } catch (error) {
      capturedErrors.record('exception', error?.stack || error);
      throw error;
    }
    frameTimesMs.push(performance.now() - started);
    frame += 1;
  }

  function renderFrame() {
    const scene = game.scene.getScene('Race');
    if (scene?.sys?.isActive()) scene.harnessRenderOnly = true;
    try {
      // A zero-delta normal step runs Phaser's renderer. RaceScene explicitly
      // skips gameplay work during this draw-only pass.
      game.step(absoluteTimeMs, 0);
    } finally {
      if (scene) scene.harnessRenderOnly = false;
    }
  }

  async function loadCourse(id, { seed = 0 } = {}) {
    await ready;
    const course = TRACKS.find((entry) => entry.id === id);
    if (!course) throw new Error(`Unknown course id: ${id}`);

    activeSeed = normalizeSeed(seed);
    random = createSeededRandom(activeSeed);
    Math.random = () => random();
    virtualInput = { throttle: 0, brake: 0, steer: 0 };
    frameTimesMs = [];
    frame = 0;
    absoluteTimeMs = 0;

    if (game.scene.isActive('Race')) game.scene.stop('Race');
    setSelectedTrack(id);
    game.scene.start('Race');

    const scene = game.scene.getScene('Race');
    scene.harnessInput = virtualInput;

    let countdownFrames = 0;
    while (!scene.timing && countdownFrames < COUNTDOWN_FRAME_LIMIT) {
      advanceOneFrame();
      countdownFrames += 1;
    }
    if (!scene.timing) throw new Error(`Countdown did not finish for course: ${id}`);

    // Public frame/sim time begin at GO, not during scene setup/countdown.
    frame = 0;
    frameTimesMs = [];
    renderFrame();
    return state();
  }

  function setInput(input = {}) {
    virtualInput = {
      throttle: clamp(input.throttle, 0, 1),
      brake: clamp(input.brake, 0, 1),
      steer: clamp(input.steer, -1, 1),
    };
    const scene = game.scene.getScene('Race');
    if (scene?.sys?.isActive()) scene.harnessInput = virtualInput;
  }

  function stepFrames(frames, render) {
    const count = Number(frames);
    if (!Number.isInteger(count) || count < 0) {
      throw new TypeError('step(frames) requires a non-negative integer');
    }
    for (let i = 0; i < count; i++) advanceOneFrame();
    if (render) renderFrame();
    return state();
  }

  const step = (frames) => stepFrames(frames, true);

  function state(includeFrameTimes = true) {
    const scene = game.scene.getScene('Race');
    if (!scene?.sys?.isActive() || !scene.car) return null;

    const checkpointsTotal = scene.track.checkpoints.length;
    const circuitComplete = scene.mode === 'circuit' && scene.lastCompletionTimeMs != null;
    const finished = !!scene.finished || circuitComplete;
    const checkpointsHit = finished
      ? checkpointsTotal
      : scene.mode === 'circuit' && scene.expected === 0
        ? checkpointsTotal - 1
        : scene.expected;
    const next = finished ? null : scene.track.checkpoints[scene.expected];
    const onTrack =
      distanceToCenterline(scene.car.x, scene.car.y, scene.track.centerline) <= scene.track.half;
    const surface = surfaceAt(scene.car.x, scene.car.y, scene.track);

    return {
      courseId: scene.def.id,
      seed: activeSeed,
      frame,
      simTimeMs: round(frame * FIXED_DELTA_MS),
      world: { width: WORLD.width, height: WORLD.height },
      pos: { x: round(scene.car.x), y: round(scene.car.y) },
      vel: { x: round(scene.car.vx), y: round(scene.car.vy) },
      speed: round(scene.car.speed),
      heading: round(scene.car.rotation),
      onSurface: onTrack ? surface || 'sealed' : 'grass',
      checkpointsHit,
      checkpointsTotal,
      nextCheckpoint: next ? { x: round(next.x), y: round(next.y) } : null,
      lap: scene.lapNumber,
      finished,
      finishTimeMs:
        scene.lastCompletionTimeMs == null ? null : roundTime(scene.lastCompletionTimeMs),
      frameTimesMs: includeFrameTimes ? frameTimesMs.map(round) : undefined,
      maxSpeed: CAR.maxSpeed,
    };
  }

  window.__h = {
    ready,
    loadCourse,
    setInput,
    step,
    // Test-runner optimization: identical simulation step without a draw after
    // every single-frame bot decision. Not part of the public D1 contract.
    _stepNoRender: (frames) => stepFrames(frames, false),
    _stateLite: () => state(false),
    _render: renderFrame,
    _botInput: (name, snapshot = state(false)) => {
      if (typeof bots[name] !== 'function') throw new Error(`Unknown bot: ${name}`);
      return bots[name](snapshot);
    },
    state: () => state(true),
    errors: capturedErrors.read,
  };
  let automaticLoad = null;
  window.advanceTime = async (ms) => {
    if (automaticLoad) await automaticLoad;
    else await ready;
    return step(Math.max(0, Math.round(Number(ms) / FIXED_DELTA_MS)));
  };
  window.render_game_to_text = () => JSON.stringify(state());

  window.addEventListener('pagehide', () => {
    Math.random = originalRandom;
  }, { once: true });

  const requestedCourse = params.get('course');
  if (requestedCourse) {
    automaticLoad = ready
      .then(() => loadCourse(requestedCourse, { seed: params.get('seed') || 0 }))
      .catch((error) => console.error('[harness] automatic course load failed', error));
  }

  return window.__h;
}
