import { appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './lib/files.mjs';

const manifest = JSON.parse(
  await readFile(path.join(ROOT, 'game-manifest.json'), 'utf8')
);
const courses = JSON.stringify(manifest.courses.map((course) => course.id));

if (!process.env.GITHUB_OUTPUT) {
  throw new Error('GITHUB_OUTPUT is required');
}

await appendFile(process.env.GITHUB_OUTPUT, `courses=${courses}\n`);
