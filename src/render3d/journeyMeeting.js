import { Group, Mesh, RingGeometry } from 'three';
import { basic } from './palette.js';
import { metres } from '../scale.js';

// Paint on the existing paved summit, not another invisible collision object.
export function buildJourneyMeeting(route) {
  const group = new Group();
  group.name = 'sunday-run-meeting-point';
  if (!route?.meeting) return group;
  const ring = new Mesh(new RingGeometry(metres(2.8), metres(3), 48), basic(0xffd166, { fog: true, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(route.meeting.x, route.meeting.h + 1, route.meeting.y);
  ring.renderOrder = 3;
  group.add(ring);
  return group;
}
