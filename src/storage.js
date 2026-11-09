// Best times are optional. A browser denying storage must still let Beryl drive.
export function readBestTime(key) {
  try {
    const value = Number(globalThis.localStorage?.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch { return null; }
}
export function writeBestTime(key, time) {
  try { globalThis.localStorage?.setItem(key, String(Math.floor(time))); } catch { /* Session best remains on the HUD. */ }
}
