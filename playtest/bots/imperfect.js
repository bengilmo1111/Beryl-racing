import waypoint from './waypoint.js';

// Deliberate steering mistakes can leave the target behind the car. The
// reference driver then requests no pedals, but stationary steering cannot
// change heading. Keep this restart policy out of the pinned reference driver.
function restartableWaypoint(state) {
  const input = waypoint(state);
  if (!state.finished && state.nextCheckpoint && input.throttle === 0 && input.brake === 0
      && Math.abs(state.speed) / Math.max(1, state.maxSpeed) < 0.18) {
    return { ...input, throttle: 0.3 };
  }
  return input;
}

// Stateless, frame-based mistakes: the same seed/input scenario is reproducible.
export function lateBraking(state) {
  const input = restartableWaypoint(state);
  if (state.frame % 240 < 45) return { ...input, throttle: 1, brake: 0 };
  return input;
}
export function steeringTaps(state) {
  const input = restartableWaypoint(state);
  return { ...input, steer: state.frame % 18 < 6 ? Math.sign(input.steer) : 0 };
}
export function heldSteering(state) {
  const input = restartableWaypoint(state);
  const phase = state.frame % 600;
  return { ...input, steer: phase >= 240 && phase < 300 ? 1 : input.steer };
}
