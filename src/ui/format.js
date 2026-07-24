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
