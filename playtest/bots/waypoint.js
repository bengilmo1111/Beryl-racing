function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Beyond this range to the next gate, steer by the road instead of at the gate.
// Roughly seven car lengths, and deliberately measured against the car rather
// than the course: it is the distance at which aiming straight at something
// stops being a safe way to arrive at it.
//
// Since the rescale the gates are far enough apart that this is nearly always
// true, so the bot follows the road almost all the time. That used to break
// Remutaka — a fixed look-ahead is a chord across a hairpin, and the bot cut the
// switchbacks and never finished. It no longer does, because the hairpins are no
// longer tighter than the road is wide: the tightest corner on any course is now
// 2.4x the road's half-width, where three of the four were under 0.6x.
const FOLLOW_ROAD_ABOVE = 1600;

function wrapAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export default function waypoint(state) {
  // Follow the road while the next gate is far away; aim at the gate once it is
  // close.
  //
  // `driveTarget` is a look-ahead point on the primary centreline supplied by
  // the harness (see primaryDriveTarget). Gates can be a long way apart — a
  // branching course has to keep them all before its routes split — and aiming
  // straight at a distant gate drives the bot across whatever lies between.
  //
  // The distance test matters, and is not a detail. Following the road
  // unconditionally makes the bot cut Remutaka's switchbacks and fail to finish
  // at all: a fixed look-ahead is a chord across a hairpin. Courses whose gates
  // are closer together than FOLLOW_ROAD_ABOVE therefore keep aiming at gates
  // exactly as before, and their recorded baselines do not move. This is
  // deliberately a rule about geometry rather than about which course is
  // loaded — an earlier version keyed off `def.id === 'otaki'`, which hard-codes
  // a course into a harness that should know nothing about them.
  const gate = state.nextCheckpoint;
  let target = gate;
  if (state.driveTarget && gate) {
    const gateDistance = Math.hypot(gate.x - state.pos.x, gate.y - state.pos.y);
    if (gateDistance > FOLLOW_ROAD_ABOVE) target = state.driveTarget;
  }
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
