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
        best = { x: px, y: py, rotation: Math.atan2(dx, -dy), distance, road, index: i };
      }
    }
  }
  return best;
}

export function roadAhead(pose, distance) {
  const line = pose.road.centerline;
  let point = pose;
  for (let offset = 1; offset <= line.length; offset++) {
    const i = pose.index + offset;
    if (!pose.road.closed && i >= line.length) return line[line.length - 1];
    const next = line[i % line.length];
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
