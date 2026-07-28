import { pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'playwright') {
    return {
      url: pathToFileURL(`${process.cwd()}/node_modules/playwright/index.mjs`).href,
      shortCircuit: true,
    };
  }
  return nextResolve(specifier, context);
}
