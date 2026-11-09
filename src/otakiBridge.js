// One list of sloping bridge spans for both visible parapets and collision.
export function otakiBridgeSpans(track, def) {
  const cp = track.checkpoints[def.scenery.riverCp];
  const river = track.sea.find(s => s.angle != null);
  const halfLength = river.halfW + Math.max(105, river.halfW * 0.35);
  const along = p => (p.x - cp.x) * Math.cos(cp.angle) + (p.y - cp.y) * Math.sin(cp.angle);
  const spans = [];
  for (let i = 1; i < track.centerline.length; i++) {
    const a = track.centerline[i - 1], b = track.centerline[i];
    const da = along(a), db = along(b);
    if (Math.min(da, db) > halfLength || Math.max(da, db) < -halfLength) continue;
    if (Math.hypot(a.x - cp.x, a.y - cp.y) > halfLength * 2) continue;
    const dx = b.x - a.x, dz = b.y - a.y, distance = Math.hypot(dx, dz);
    if (!distance) continue;
    spans.push({ a, b, dx, dz, distance, ah: track.heights[i - 1], bh: track.heights[i] });
  }
  return spans;
}

export function otakiBridgeBarriers(track, def) {
  return otakiBridgeSpans(track, def).flatMap(({ a, b, dx, dz, distance }) => [-1, 1].map(side => {
    const x = -dz / distance * side * (track.half + 13);
    const y = dx / distance * side * (track.half + 13);
    return { a: { x: a.x + x, y: a.y + y }, b: { x: b.x + x, y: b.y + y } };
  }));
}
