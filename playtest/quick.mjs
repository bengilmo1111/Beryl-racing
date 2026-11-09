import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Browser-free contracts for the normal edit/check loop. Keep full driving
// replays and image capture explicit so small changes stay cheap to verify.
const checks = [
  'track-geometry',
  'placement',
  'road-index',
  'road-contact',
  'arcade-driving',
  'rivals',
  'polish-contracts',
];
const started = Date.now();
for (const check of checks) {
  console.log(`\nChecking ${check}`);
  const result = spawnSync(process.execPath, [fileURLToPath(new URL(`./${check}.mjs`, import.meta.url))], {
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`\nQuick quality checks passed in ${((Date.now() - started) / 1000).toFixed(1)}s`);
