// Shared route look-ahead for the camera and recovery, without moving the car.
export function nearestRoadPose(track, x, y) {
  let best = null;
  for (const road of track.roads || [track]) {
    const line = road.centerline;
    const count = road.closed ? line.length : line.length - 1;
    for (let i = 0; i < count; i++) {
      const a = line[i], b = line[(i + 1) % line.length];
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
      const px = a.x + dx * t, py = a.y + dy * t;
      const distance = Math.hypot(x - px, y - py);
      if (!best || distance < best.distance) {
        best = { x: px, y: py, rotation: Math.atan2(dx, -dy), distance, road, index: i, t };
      }
    }
  }
  return best;
}

export function roadAhead(pose, distance, direction = 1) {
  const line = pose.road.centerline;
  let point = pose;
  for (let offset = 1; offset <= line.length; offset++) {
    const i = pose.index + (direction > 0 ? offset : 1 - offset);
    if (!pose.road.closed && i >= line.length) return line[line.length - 1];
    if (!pose.road.closed && i < 0) return line[0];
    const next = line[(i + line.length) % line.length];
    const length = Math.hypot(next.x - point.x, next.y - point.y);
    if (length >= distance) {
      const t = distance / (length || 1);
      return { x: point.x + (next.x - point.x) * t, y: point.y + (next.y - point.y) * t };
    }
    distance -= length;
    point = next;
  }
  return point;
}

// Map each connected branch onto the progress at its two junctions. Projecting
// the car directly onto the coastal road makes inland progress stick then jump.
export function buildRouteProgress(track) {
  const mapped = new Map();
  const distances = road => {
    const result = [0];
    for (let i = 1; i < road.centerline.length; i++) {
      const a = road.centerline[i - 1], b = road.centerline[i];
      result.push(result.at(-1) + Math.hypot(b.x - a.x, b.y - a.y));
    }
    return result;
  };
  const primary = track.roads[0];
  const base = distances(primary);
  mapped.set(primary, base.map(d => d / base.at(-1)));
  const value = pose => {
    const rows = mapped.get(pose.road);
    return rows[pose.index] + ((rows[pose.index + 1] ?? rows[pose.index]) - rows[pose.index]) * pose.t;
  };
  for (const road of track.roads.slice(1)) {
    const known = { roads: [...mapped.keys()] };
    const first = road.centerline[0], last = road.centerline.at(-1);
    const a = value(nearestRoadPose(known, first.x, first.y));
    const b = value(nearestRoadPose(known, last.x, last.y));
    const ds = distances(road);
    mapped.set(road, ds.map(d => a + (b - a) * d / ds.at(-1)));
  }
  return { at: value, checkpoint: index => mapped.get(primary)[index] };
}
