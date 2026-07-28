import path from 'node:path';
import { chromium } from 'playwright';
import { build, preview } from 'vite';
import { BOT_MODULE_NAMES, runSimulation } from './lib/matrix.mjs';
import { inspectMobileControls } from './lib/mobile.mjs';
import { makeReport, renderMarkdown, writeReport } from './lib/report.mjs';
import { OUT_DIR, ROOT, readJson, resetOutput } from './lib/files.mjs';
import { runNewMobilePlayerJourney } from './journeys/new-mobile-player.mjs';

function parseArgs(argv) {
  const options = {
    course: null,
    bot: null,
    headed: false,
    skipBuild: false,
    noJourney: false,
    journey: false,
    mobileOnly: false,
    noMobile: false,
  };
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--course=')) options.course = arg.slice('--course='.length);
    else if (arg.startsWith('--bot=')) options.bot = arg.slice('--bot='.length);
    else if (arg === '--headed') options.headed = true;
    else if (arg === '--skip-build') options.skipBuild = true;
    else if (arg === '--no-journey') options.noJourney = true;
    else if (arg === '--journey') options.journey = true;
    else if (arg === '--mobile-only') options.mobileOnly = true;
    else if (arg === '--no-mobile') options.noMobile = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (options.course === 'otaki-rally') options.course = 'otaki';
  if (options.bot === 'pedalToTheMetal') options.bot = 'pedal-to-the-metal';
  return options;
}

const started = Date.now();
const options = parseArgs(process.argv);
const manifest = await readJson('game-manifest.json');
const spec = await readJson('playtest-spec.json');
const failures = [];
const runs = [];
let journey = null;
let mobile = null;
let browser = null;
let previewServer = null;

await resetOutput();

if (spec.schemaVersion !== 1) {
  failures.push({
    code: 'spec-schema',
    scope: 'playtest-spec.json',
    message: `expected schemaVersion 1, found ${spec.schemaVersion}`,
  });
}
for (const course of manifest.courses || []) {
  if (!spec.courses[course.id]) {
    failures.push({
      code: 'course-spec-missing',
      scope: course.id,
      message: `course ${course.id} is in game-manifest.json but absent from playtest-spec.json`,
    });
  }
}

const selectedCourses = (manifest.courses || []).filter(
  (course) => !options.course || course.id === options.course
);
const selectedBots = Object.keys(BOT_MODULE_NAMES).filter(
  (bot) => !options.bot || bot === options.bot
);
const focusedSimulation = Boolean(options.course || options.bot);
if (selectedCourses.length === 0) {
  failures.push({
    code: 'unknown-course',
    scope: 'cli',
    message: `unknown course: ${options.course}`,
  });
}
if (selectedBots.length === 0) {
  failures.push({
    code: 'unknown-bot',
    scope: 'cli',
    message: `unknown bot: ${options.bot}`,
  });
}

try {
  if (!options.skipBuild) {
    await build({ root: ROOT, logLevel: 'warn' });
  }
  previewServer = await preview({
    root: ROOT,
    logLevel: 'error',
    preview: { host: '127.0.0.1', port: 4173, strictPort: false },
  });
  const address = previewServer.httpServer.address();
  const port = typeof address === 'object' && address ? address.port : 4173;
  const baseUrl = `http://127.0.0.1:${port}/`;

  browser = await chromium.launch({ headless: !options.headed });

  if (!options.mobileOnly) {
    const courseRuns = await Promise.all(
      selectedCourses.map(async (course) => {
        const results = [];
        if (!spec.courses[course.id]) return results;
        for (const botId of selectedBots) {
          process.stdout.write(`playtest ${course.id}/${botId} ... `);
          const run = await runSimulation({
            browser,
            baseUrl,
            course,
            botId,
            spec,
            headed: options.headed,
          });
          results.push(run);
          process.stdout.write(`${run.verdict.toUpperCase()}\n`);
        }
        return results;
      })
    );
    runs.push(...courseRuns.flat());
    for (const run of runs) failures.push(...run.failures);
  }

  if (!options.noMobile && (!focusedSimulation || options.mobileOnly || options.journey)) {
    mobile = await inspectMobileControls({
      browser,
      baseUrl,
      required: spec.global.mobileControlsRequired,
    });
    failures.push(...mobile.failures);
    process.stdout.write(`mobile controls ... ${mobile.verdict.toUpperCase()}\n`);
  }

  const fullMatrix = !options.course && !options.bot && !options.mobileOnly;
  if (!options.noJourney && (fullMatrix || options.journey)) {
    process.stdout.write('journey new-mobile-player ... ');
    journey = await runNewMobilePlayerJourney({
      browser,
      baseUrl,
      outDir: path.join(OUT_DIR, 'journeys'),
    });
    failures.push(...journey.failures);
    process.stdout.write(`${journey.verdict.toUpperCase()}\n`);
  }
} catch (error) {
  failures.push({
    code: 'playtest-runner-error',
    scope: 'runner',
    message: error.stack || error.message,
  });
} finally {
  if (browser) await browser.close();
  if (previewServer) {
    await new Promise((resolve) => previewServer.httpServer.close(resolve));
  }
}

const report = makeReport({
  runs,
  journey,
  mobile,
  failures,
  durationMs: Date.now() - started,
  seed: spec.seed,
});
await writeReport(report);
process.stdout.write(`\n${renderMarkdown(report)}`);
process.stdout.write(`JSON: ${path.join(OUT_DIR, 'playtest-report.json')}\n`);
process.stdout.write(`Markdown: ${path.join(OUT_DIR, 'playtest-report.md')}\n`);
process.exitCode = report.verdict === 'pass' ? 0 : 1;
