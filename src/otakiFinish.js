import { crossesFinishBand } from './arrival.js';

// Put the line before the branch junction at the route endpoint, so either
// town route still has a short, unambiguous final approach along Marine Parade.
export function otakiFinish(track) {
  const cp = track.checkpoints.at(-1);
  const tx = Math.cos(cp.angle), ty = Math.sin(cp.angle);
  const x = cp.x - tx * 700, y = cp.y - ty * 700;
  const point = (across, along) => ({ x: x - ty * across + tx * along, y: y + tx * across + ty * along });
  const band = [point(-track.half, -16), point(-track.half, 16), point(track.half, 16), point(track.half, -16)];
  return { ...cp, x, y, band };
}

export function crossesOtakiFinish(track, from, to) {
  return crossesFinishBand(otakiFinish(track).band, from, to);
}
