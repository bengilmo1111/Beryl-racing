import { crossesFinishBand } from './arrival.js';

// Both town routes join the same sea-facing approach. The finite finish lies
// inside the beachfront parking area with space to stop beyond the paint.
export function otakiFinish(track) {
  const cp = track.checkpoints.at(-1);
  const tx = Math.cos(cp.angle), ty = Math.sin(cp.angle);
  const x = cp.x - tx * 200, y = cp.y - ty * 200;
  const point = (across, along) => ({ x: x - ty * across + tx * along, y: y + tx * across + ty * along });
  const band = [point(-track.half, -16), point(-track.half, 16), point(track.half, 16), point(track.half, -16)];
  return { ...cp, x, y, band };
}

export function crossesOtakiFinish(track, from, to) {
  return crossesFinishBand(otakiFinish(track).band, from, to);
}
