// Exactly the endpoints used by the visible post-and-wire spans.
export function fenceBarriers(props) {
  return props.filter(p => p.kind === 'fence').map(p => {
    const dx = Math.cos(p.yaw) * p.length / 2;
    const dy = Math.sin(p.yaw) * p.length / 2;
    return { a: { x: p.x - dx, y: p.y - dy }, b: { x: p.x + dx, y: p.y + dy } };
  });
}
