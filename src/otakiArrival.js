// Beachfront parking is shared by surface queries, rendering and clearance.
export function otakiArrival(track) {
  const end = track.centerline.at(-1), h = (track.heights?.at(-1) || 0) + .3;
  const point = (x,y) => ({x:end.x+x,y:end.y+y,h});
  const a=point(-500,-850), b=point(1200,-850), c=point(1200,850), d=point(-500,850);
  return { triangles:[[a,b,c],[a,c,d]], end, h };
}
