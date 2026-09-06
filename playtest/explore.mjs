import { chromium } from 'playwright';
import { preview } from 'vite';
import { writeFile, appendFile } from 'node:fs/promises';
import { BOT_MODULE_NAMES, runSimulation } from './lib/matrix.mjs';
import { ROOT, OUT_DIR, readJson, resetOutput } from './lib/files.mjs';

// Separate from acceptance tests: failure to finish is evidence, not proof of a bug.
const courseId = process.argv[2] || 'eastbourne-dash';
const manifest = await readJson('game-manifest.json');
const course = manifest.courses.find(c => c.id === courseId);
if (!course) throw new Error(`Unknown course ${courseId}`);
const spec = await readJson('playtest-spec.json');
const scenarios = ['lateBraking', 'steeringTaps', 'heldSteering'];
for (const id of scenarios) {
  BOT_MODULE_NAMES[id] = id;
  spec.global.botFrameLimits[id] = 12000;
}
spec.global.screenshotEveryFrames = 600;
spec.courses[courseId].noSoftlock = false;
await resetOutput();
const server = await preview({ root: ROOT, logLevel: 'error', preview: { host: '127.0.0.1', port: 4173 } });
let browser;
const runs = [];
try {
  browser = await chromium.launch({ headless: true });
  for (const seed of [spec.seed, spec.seed + 1]) {
    spec.seed = seed;
    for (const botId of scenarios) {
      const run = await runSimulation({ browser, baseUrl: `http://127.0.0.1:${server.httpServer.address().port}/`, course, botId, spec, headed: false });
      runs.push({ seed, ...run });
      console.log(`${courseId}/${botId}/${seed}: ${run.verdict}, contacts=${run.metrics.contactEvents}, off-road=${run.metrics.offRoadFraction}`);
    }
  }
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
const report = { schemaVersion: 1, commit: process.env.GITHUB_SHA || 'development', courseId, runs };
await writeFile(`${OUT_DIR}/exploration.json`, JSON.stringify(report, null, 2));
const lines = ['# Gameplay exploration', '', 'These scripted mistakes measure robustness, not fun. Stalls and incomplete runs require diagnosis.', '',
  '| Scenario | Seed | Finished | Gates | Off-road | Contacts | Stalled | Checks |',
  '|---|---:|---|---:|---:|---:|---|---|'];
for (const r of runs) {
  const m = r.metrics;
  lines.push(`| ${r.bot} | ${r.seed} | ${m.finished} | ${m.checkpointsHit}/${m.checkpointsTotal} | ${(100*m.offRoadFraction).toFixed(1)}% | ${m.contactEvents} | ${m.softlock} | ${r.verdict} |`);
}
lines.push('', 'Artifacts include ordered screenshots and the final 20 seconds of state/input samples per run. Rerun with the same commit, seed, course and bot. Compare metrics only across matching scenarios.');
await writeFile(`${OUT_DIR}/exploration.md`, lines.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, lines.join('\n'));
if (runs.some(r => r.verdict !== 'pass')) process.exitCode = 1;
