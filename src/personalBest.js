// Splits belong to the saved best run, never to a sum of unrelated best sectors.
export function readBestSplits(key, best, count) {
  try {
    const record = JSON.parse(globalThis.localStorage?.getItem(`${key}.splits`) || 'null');
    if (!record || record.time !== Math.floor(best) || !Array.isArray(record.gates) || record.gates.length !== count) return null;
    if (record.gates.some((v, i, a) => !Number.isFinite(v) || v <= 0 || (i && v < a[i - 1]))) return null;
    if (Math.floor(record.gates.at(-1)) !== record.time) return null;
    return record.gates;
  } catch { return null; }
}

export function writeBestSplits(key, time, gates) {
  try { globalThis.localStorage?.setItem(`${key}.splits`, JSON.stringify({ time: Math.floor(time), gates })); } catch { /* In-session comparisons still work. */ }
}

export function bestComparison(time, previous) {
  if (!previous) return 'FIRST RUN · SET YOUR BENCHMARK';
  const delta = time - previous;
  return Math.abs(delta) < 1 ? 'MATCHED YOUR BEST' : delta < 0
    ? `NEW BEST · ${(-delta / 1000).toFixed(1)}s QUICKER`
    : `${(delta / 1000).toFixed(1)}s FROM YOUR BEST`;
}
