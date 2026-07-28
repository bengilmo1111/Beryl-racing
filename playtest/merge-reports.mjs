import { cp, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { BOT_MODULE_NAMES } from './lib/matrix.mjs';
import { makeReport, writeReport } from './lib/report.mjs';
import { OUT_DIR, ROOT, ensureDir, resetOutput } from './lib/files.mjs';

const partsDir = path.resolve(process.argv[2] || path.join(ROOT, 'playtest-parts'));
const manifest = JSON.parse(
  await readFile(path.join(ROOT, 'game-manifest.json'), 'utf8')
);
const courseOrder = new Map(manifest.courses.map((course, index) => [course.id, index]));
const botOrder = new Map(Object.keys(BOT_MODULE_NAMES).map((bot, index) => [bot, index]));

async function findReports(directory) {
  const reports = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) reports.push(...(await findReports(fullPath)));
    else if (entry.name === 'playtest-report.json') reports.push(fullPath);
  }
  return reports;
}

async function copyArtifacts(artifactRoot) {
  const candidates = ['shots', 'journeys'];
  for (const name of candidates) {
    try {
      await cp(path.join(artifactRoot, name), path.join(OUT_DIR, name), {
        recursive: true,
        force: true,
      });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  try {
    await cp(
      path.join(artifactRoot, 'mobile-controls.png'),
      path.join(OUT_DIR, 'mobile-controls.png'),
      { force: true }
    );
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

const reportPaths = await findReports(partsDir);
if (reportPaths.length === 0) {
  throw new Error(`No playtest-report.json files found beneath ${partsDir}`);
}

await resetOutput();
const parts = [];
for (const reportPath of reportPaths) {
  parts.push(JSON.parse(await readFile(reportPath, 'utf8')));
  await copyArtifacts(path.dirname(reportPath));
}

const runs = parts
  .flatMap((part) => part.runs || [])
  .sort(
    (a, b) =>
      (courseOrder.get(a.courseId) ?? 999) - (courseOrder.get(b.courseId) ?? 999) ||
      (botOrder.get(a.bot) ?? 999) - (botOrder.get(b.bot) ?? 999)
  );
const journey = parts.map((part) => part.journey).find(Boolean) || null;
const mobile = parts.map((part) => part.mobile).find(Boolean) || null;
const failures = parts.flatMap((part) => part.failures || []);
const seed = parts[0]?.environment?.seed ?? null;
const durationMs = Math.max(...parts.map((part) => part.summary?.durationMs || 0));

const report = makeReport({ runs, journey, mobile, failures, durationMs, seed });
report.ci = {
  schemaVersion: 1,
  parts: reportPaths.length,
  parallelDurationMs: durationMs,
};
await writeReport(report);
process.stdout.write(
  `Merged ${reportPaths.length} reports: ${report.verdict.toUpperCase()} (${runs.length} runs, ${failures.length} failures)\n`
);
