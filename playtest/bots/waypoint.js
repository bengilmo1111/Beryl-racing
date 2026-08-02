function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function wrapAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export default function waypoint(state) {
  // Branching courses keep their required gameplay gates before the split so
  // every town route is valid. For automated visual/play tests the harness may
  // additionally supply a look-ahead point on the primary road, preventing the
  // bot from drawing a straight line across the landscape between sparse gates.
  const target = state.driveTarget || state.nextCheckpoint;
  if (!target || state.finished) return { throttle: 0, brake: 1, steer: 0 };

  const dx = target.x - state.pos.x;
  const dy = target.y - state.pos.y;
  const desiredHeading = Math.atan2(dx, -dy);
  const error = wrapAngle(desiredHeading - state.heading);
  const magnitude = Math.abs(error);
  const speedRatio = Math.abs(state.speed) / Math.max(1, state.maxSpeed);

  return {
    steer: clamp(error / 0.65, -1, 1),
    throttle: magnitude < 1.05 ? (magnitude > 0.7 && speedRatio > 0.55 ? 0.25 : 1) : 0,
    brake: magnitude > 1.05 && speedRatio > 0.22 ? 1 : 0,
  };
}
