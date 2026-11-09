// Water footprints are shared by terrain and scenery, in game X/Y coordinates.
export function inWaterRegion(regions, x, y, padding = 0) {
  return (regions || []).some(region => {
    if (region.angle == null) return x >= region.x - padding && x <= region.x + region.w + padding
      && y >= region.y - padding && y <= region.y + region.h + padding;
    const dx = x - region.cx, dy = y - region.cy;
    const along = dx * Math.cos(region.angle) + dy * Math.sin(region.angle);
    const across = -dx * Math.sin(region.angle) + dy * Math.cos(region.angle);
    return Math.abs(along) < region.halfW + padding && Math.abs(across) < region.halfL + padding;
  });
}
