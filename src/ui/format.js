// mm:ss.mmm formatting for lap times.
export function formatTime(ms) {
  if (ms == null || !isFinite(ms)) return '--:--.---';
  const totalMs = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const millis = totalMs % 1000;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(
    millis
  ).padStart(3, '0')}`;
}

export const FONT = 'Fredoka, Nunito, system-ui, sans-serif';

// A responsive scale factor for UI elements. In RESIZE mode this.scale.width /
// height equal the real viewport size, so a 320px-wide phone would otherwise
// get the same pixel-sized HUD as a 1280px desktop. We scale UI relative to the
// 1280x720 reference, clamped so it never gets uncomfortably tiny on small
// phones or oversized on large tablets/desktops.
export function uiScale(scene, min = 0.62, max = 1.15) {
  const w = scene.scale.width;
  const h = scene.scale.height;
  const s = Math.min(w / 1280, h / 720);
  return Math.max(min, Math.min(max, s));
}

// True for narrow/short viewports (phones), where controls and text need to be
// proportionally larger and layouts tighter.
export function isCompact(scene) {
  return scene.scale.width < 820 || scene.scale.height < 480;
}
