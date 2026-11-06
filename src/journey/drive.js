import { metres, unitsToKmh, UNITS_PER_METRE } from '../scale.js';

function nearestIndex(line, point) {
  let best = Infinity, index = 0;
  line.forEach((p, i) => { const d = Math.hypot(p.x - point.x, p.y - point.y); if (d < best) { best = d; index = i; } });
  return index;
}
export function buildJourneyRoute(track, chapter, choice = 'riverbank') {
  const oldTown = chapter.id === 'a-place-at-the-table' || (chapter.id === 'the-road-we-choose' && choice === 'old-town');
  let line = [...track.centerline];
  if (oldTown) {
    const branch = track.roads.find(road => road.id === 'rahui-mill-tasman');
    if (!branch) throw new Error('The old-town chapter needs the Ōtaki town road');
    const junction = nearestIndex(line, branch.centerline[0]);
    line = [...line.slice(0, junction), ...branch.centerline];
  }
  const parking = chapter.course === 'remutaka';
  let meeting = null;
  if (parking) {
    const summit = track.summit;
    meeting = summit.point(track.half - metres(0.5) + metres(8), metres(2));
    // Approach on the through road, then turn left through the open entrance.
    line = [...line.slice(0, summit.index - 14), summit.point(0, -metres(10)), meeting];
  }
  const cumulative = [0];
  for (let i = 1; i < line.length; i++) cumulative.push(cumulative[i - 1] + Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y));
  // These are story-only waypoints. The scenery and original time-trial gates
  // retain their identities (river/rail renderers read those checkpoint indices).
  const gates = [{ ...line[0], routeIndex: 0 }];
  let last = 0;
  for (let i = 1; i < line.length - 1; i++) {
    if (cumulative[i] - last >= metres(180)) { gates.push({ ...line[i], routeIndex: i }); last = cumulative[i]; }
  }
  gates.push({ ...line.at(-1), routeIndex: line.length - 1 });
  return { line, gates, cumulative, length: cumulative.at(-1), parking, meeting, oldTown };
}
export function journeyTarget(route, car) {
  const i = nearestIndex(route.line, car);
  return route.line[Math.min(i + 14, route.line.length - 1)];
}
export function newDriveState() {
  return { roughSeconds: 0, contacts: 0, lastHeading: null, stopSeconds: 0, elapsed: 0 };
}
export function cargoState(state) {
  return state.roughSeconds >= 20 ? 'spilled' : state.roughSeconds >= 8 ? 'shaken' : 'steady';
}
export function advanceDrive(state, { dt, onTrack, speed, heading, contacts }) {
  const next = { ...state, elapsed: state.elapsed + dt };
  const kmh = Math.abs(unitsToKmh(speed));
  const turn = state.lastHeading === null ? 0 : Math.atan2(Math.sin(heading - state.lastHeading), Math.cos(heading - state.lastHeading));
  const lateral = Math.abs(speed / UNITS_PER_METRE * turn / Math.max(dt, 0.001));
  if ((!onTrack && kmh > 12) || (lateral > 3.8 && kmh > 25)) next.roughSeconds += dt;
  if (contacts > state.contacts) next.roughSeconds += (contacts - state.contacts) * 3;
  next.lastHeading = heading;
  next.contacts = contacts;
  return next;
}
export function stoppedAtMeeting(route, car, state, dt) {
  const close = route.meeting && Math.hypot(car.x - route.meeting.x, car.y - route.meeting.y) < metres(3);
  state.stopSeconds = close && Math.abs(unitsToKmh(car.speed)) < 3 ? state.stopSeconds + dt : 0;
  return state.stopSeconds >= 2;
}
export function routeDistanceLeft(route, car) {
  const i = nearestIndex(route.line, car);
  return Math.max(0, (route.length - route.cumulative[i]) / UNITS_PER_METRE);
}
