import path from 'node:path';
import { OUT_DIR, writeJson, writeText } from './files.mjs';

function fmtTime(value) {
  return value == null ? '—' : `${Math.round(value)} ms`;
}

function fmtRate(value) {
  return `${Math.round(value * 100)}%`;
}

export function makeReport({ runs, journey, mobile, failures, durationMs, seed }) {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    verdict: failures.length === 0 ? 'pass' : 'fail',
    summary: {
      runs: runs.length,
      passedRuns: runs.filter((run) => run.verdict === 'pass').length,
      failedRuns: runs.filter((run) => run.verdict === 'fail').length,
      failures: failures.length,
      durationMs,
    },
    environment: {
      seed,
      simulationViewport: { width: 1280, height: 720 },
      mobileViewport: {
        requestedPortrait: { width: 390, height: 844 },
        testedLandscape: { width: 844, height: 390 },
      },
    },
    runs,
    journey,
    mobile,
    failures,
  };
}

export function renderMarkdown(report) {
  const pass = report.verdict === 'pass';
  const lines = [
    `**${pass ? 'PASS' : 'FAIL'}** — ${report.summary.passedRuns}/${report.summary.runs} simulation runs passed; ${report.failures.length} failure(s).`,
    '',
    '<!-- beryl-playtest -->',
    '',
    '| Course | Bot | Result | Finish | Checkpoints | Off-road | Softlock | OOB |',
    '|---|---|---:|---:|---:|---:|---:|---:|',
  ];

  for (const run of report.runs) {
    const m = run.metrics;
    lines.push(
      `| ${run.courseId} | ${run.bot} | ${run.verdict.toUpperCase()} | ${fmtTime(m.finishTimeMs)} | ${fmtRate(m.checkpointReachRate)} | ${fmtRate(m.offRoadFraction)} | ${m.softlock ? 'yes' : 'no'} | ${m.outOfBoundsEvents} |`
    );
  }

  lines.push('', '## Shell checks', '');
  lines.push(
    `- Mobile controls: ${report.mobile?.verdict?.toUpperCase() || 'NOT RUN'}`,
    `- New mobile player journey: ${report.journey?.verdict?.toUpperCase() || 'NOT RUN'}`
  );

  lines.push('', '## Failures', '');
  if (report.failures.length === 0) {
    lines.push('None.');
  } else {
    for (const failure of report.failures) {
      lines.push(`- **${failure.code}** (${failure.scope}): ${failure.message}`);
    }
  }

  lines.push('', `Completed in ${(report.summary.durationMs / 1000).toFixed(1)}s.`);
  return `${lines.join('\n')}\n`;
}

export async function writeReport(report) {
  await writeJson(path.join(OUT_DIR, 'playtest-report.json'), report);
  await writeText(path.join(OUT_DIR, 'playtest-report.md'), renderMarkdown(report));
}
