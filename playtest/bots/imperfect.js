import waypoint from './waypoint.js';

// Stateless, frame-based mistakes: the same seed/input scenario is reproducible.
export function lateBraking(state) {
  const input = waypoint(state);
  if (state.frame % 240 < 45) return { ...input, throttle: 1, brake: 0 };
  return input;
}
export function steeringTaps(state) {
  const input = waypoint(state);
  return { ...input, steer: state.frame % 18 < 6 ? Math.sign(input.steer) : 0 };
}
export function heldSteering(state) {
  const input = waypoint(state);
  const phase = state.frame % 600;
  return { ...input, steer: phase >= 240 && phase < 300 ? 1 : input.steer };
}
