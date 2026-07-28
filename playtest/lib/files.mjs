import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const ROOT = path.resolve(import.meta.dirname, '../..');
export const OUT_DIR = path.join(ROOT, 'playtest-out');
export const SHOTS_DIR = path.join(OUT_DIR, 'shots');

export async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), 'utf8'));
}

export async function resetOutput() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(SHOTS_DIR, { recursive: true });
}

export async function ensureDir(directory) {
  await mkdir(directory, { recursive: true });
}

export async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function writeText(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, value, 'utf8');
}
