// Recovery may return to earned road, but must never award a checkpoint.
import { metres } from './scale.js';
function pointSegmentDistance(x, y, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - a.x - dx * t, y - a.y - dy * t);
}

export function recoveryPoseClear(pose, car, circles = [], barriers = []) {
  for (const sign of [-1, 1]) {
    const x = pose.x + Math.sin(pose.rotation) * car.axleOffset * sign;
    const y = pose.y - Math.cos(pose.rotation) * car.axleOffset * sign;
    if (circles.some(o => Math.hypot(x - o.x, y - o.y) <= o.r + car.collideRadius + 12)) return false;
    if (barriers.some(({ a, b }) => pointSegmentDistance(x, y, a, b) <= car.collideRadius + 18)) return false;
  }
  return true;
}

export function recoverySection(scene, progress) {
  const cps = scene.track.checkpoints;
  const next = scene.expected;
  const previous = (next - 1 + cps.length) % cps.length;
  const low = scene.routeProgress.checkpoint(cps[previous].index);
  const high = next === 0 && scene.track.closed ? 1 : scene.routeProgress.checkpoint(cps[next].index);
  // Gate zero is captured within a radius, sometimes just before the road's
  // progress wraps from 1 to 0. That short approach already belongs to the new
  // lap and must not produce a spurious reset prompt.
  if (scene.track.closed && next === 1 && progress > .5 && scene.car
    && Math.hypot(scene.car.x - cps[0].x, scene.car.y - cps[0].y) <= scene.captureRadius) return true;
  return progress >= low - 0.002 && progress <= high + 0.002;
}

export function missedCheckpoint(scene, progress) {
  if (recoverySection(scene, progress)) return false;
  // Wait until the whole car has clearly passed the capture zone. A fixed
  // percentage used to mean much longer silent gaps on the longer courses.
  const margin = scene.routeProgress.length
    ? (scene.captureRadius + scene.car.axleOffset + metres(2)) / scene.routeProgress.length : .015;
  const cps = scene.track.checkpoints;
  return scene.expected === 0 && scene.track.closed
    ? progress < scene.routeProgress.checkpoint(cps.at(-1).index) - margin
    : progress > scene.routeProgress.checkpoint(cps[scene.expected].index) + margin;
}

export function rememberSafeRecovery(scene, pose, progress) {
  if (!recoverySection(scene, progress) || pose.distance >= pose.road.half - scene.car.collideRadius || scene.car.speed <= 0) return;
  const error = Math.atan2(Math.sin(scene.car.rotation - pose.rotation), Math.cos(scene.car.rotation - pose.rotation));
  const reverseBranch = pose.road.id !== 'primary' && Math.abs(error) > Math.PI - 0.65;
  if (Math.abs(error) > 0.65 && !reverseBranch) return;
  const candidate = { x: pose.x, y: pose.y, rotation: pose.rotation + (reverseBranch ? Math.PI : 0) };
  if (recoveryPoseClear(candidate, scene.car, scene.obstacles, scene.barriers)) {
    scene.lastSafe = candidate;
    scene.lastSafeExpected = scene.expected;
  }
}

export function chooseRecoveryPose(scene) {
  const circles = [...(scene.obstacles || []), ...(scene.traffic?.collisionCircles() || []), ...(scene.rivals?.collisionCircles() || [])];
  const clear = p => recoveryPoseClear(p, scene.car, circles, scene.barriers);
  if (scene.lastSafe && (scene.lastSafeExpected ?? 1) === scene.expected && clear(scene.lastSafe)) return scene.lastSafe;
  const cps = scene.track.checkpoints;
  const previous = cps[(scene.expected - 1 + cps.length) % cps.length];
  const line = scene.track.centerline;
  // Search back from the last passed gate if traffic occupies the remembered
  // pose. Never search forward into the next, unearned section of the course.
  for (let offset = 0; offset < Math.min(40, line.length); offset++) {
    let i = previous.index - offset;
    if (i < 0 && !scene.track.closed) break;
    i = (i + line.length) % line.length;
    const p = line[i], q = line[(i + 1) % line.length];
    const candidate = { ...p, rotation: Math.atan2(q.x - p.x, -(q.y - p.y)) };
    const next = cps[scene.expected];
    if (Math.hypot(p.x - next.x, p.y - next.y) <= scene.captureRadius + scene.car.axleOffset) continue;
    if (clear(candidate)) return candidate;
  }
  return null;
}
