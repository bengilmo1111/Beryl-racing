import { buildJourneyRoute, newDriveState, advanceDrive, cargoState, stoppedAtMeeting, journeyTarget, routeDistanceLeft } from './drive.js';
import { readJourney, writeJourney } from './story.js';
import { unitsToKmh } from '../scale.js';

export function installJourneyDrive(scene) {
  if (!scene.journeyChapter) return;
  const save = readJourney();
  scene.journeyRevisit = !!save.completed[scene.journeyChapter.id];
  const resume = scene.game.registry.get('__journeyFresh') ? null
    : save.checkpoint?.chapter === scene.journeyChapter.id ? save.checkpoint : null;
  scene.game.registry.remove('__journeyFresh');
  scene.journeyRoute = buildJourneyRoute(scene.track, scene.journeyChapter, resume?.route || save.choice);
  scene.journeyDrive = newDriveState();
  scene.expected = 1;
  scene.journeyNoteAt = 0;
  if (resume && resume.gate < scene.journeyRoute.gates.length) {
    scene.expected = resume.gate;
    const previous = scene.journeyRoute.gates[scene.expected - 1];
    const line = scene.journeyRoute.line;
    const ahead = line[Math.min(previous.routeIndex + 1, line.length - 1)];
    scene.car.reset(previous.x, previous.y, Math.atan2(ahead.x - previous.x, -(ahead.y - previous.y)));
    scene.journeyDrive = { ...scene.journeyDrive, elapsed: resume.elapsed,
      roughSeconds: resume.roughSeconds, contacts: resume.contacts };
    scene.contactEvents = resume.contacts;
  }
  // Story drives have an itinerary, not a personal-best target. Time trials
  // retain their existing panel and independent records.
  scene.hud.currentLabel.setText(scene.journeyRoute.parking ? 'TO THE SUMMIT' : 'TO THE BEACH');
  scene.hud.last.setVisible(false); scene.hud.best.setVisible(false);
  const note = document.createElement('div');
  note.className = 'journey-driving';
  document.getElementById('game').append(note);
  scene.journeyNote = note;
  scene.events.once('shutdown', () => note.remove());
  updateJourneyNote(scene);
  scene.hud.reposition();
}
export function updateJourneyDrive(scene, dt, onTrack) {
  if (!scene.journeyChapter || scene.finished || !scene.timing) return;
  scene.journeyDrive = advanceDrive(scene.journeyDrive, { dt, onTrack, speed: scene.car.speed,
    heading: scene.car.rotation, contacts: scene.contactEvents });
  if (scene.journeyDrive.elapsed >= (scene.journeyNoteAt || 0)) {
    scene.journeyNoteAt = scene.journeyDrive.elapsed + 0.2;
    updateJourneyNote(scene);
  }
}
function updateJourneyNote(scene) {
  const route = scene.journeyRoute, car = scene.car;
  const next = route.gates[scene.expected];
  const distance = next ? Math.hypot(next.x - car.x, next.y - car.y) : 0;
  const final = scene.expected === route.gates.length - 1;
  const remaining = routeDistanceLeft(route, car);
  scene.hud.current.setText(`${(remaining / 1000).toFixed(1)} km`);
  const task = final && route.parking ? 'Pull left into the summit car park · stop in the ring for 2 seconds'
    : route.oldTown && remaining < 2100 ? 'Old-town route · follow the route pointer through town'
      : `${scene.journeyChapter.course === 'otaki' ? 'To Ōtaki Beach' : 'To the summit'} · ${(remaining / 1000).toFixed(1)} km`;
  const cargo = scene.journeyChapter.id === 'tea-on-the-hill'
    ? ` · Flask ${cargoState(scene.journeyDrive)}${cargoState(scene.journeyDrive) !== 'steady' ? ' · ease off before bends' : ''}` : '';
  // A simple route bearing remains useful when taking a branch, or returning
  // for a missed gate. This points to an on-road lookahead except near the gate.
  const target = distance < 1600 ? next : journeyTarget(route, car);
  const desired = target ? Math.atan2(target.x - car.x, -(target.y - car.y)) : car.rotation;
  const turn = Math.atan2(Math.sin(desired - car.rotation), Math.cos(desired - car.rotation));
  const arrow = Math.abs(turn) > 2 ? '↶' : turn < -0.25 ? '↖' : turn > 0.25 ? '↗' : '↑';
  scene.journeyNote.textContent = `${arrow} ${task}${cargo}`;
  if (final && route.parking && distance < 174 && Math.abs(unitsToKmh(car.speed)) < 3) {
    scene.journeyNote.textContent = `Meeting point · ${Math.min(2, scene.journeyDrive.stopSeconds).toFixed(1)} / 2 seconds stopped`;
  }
}
export function checkJourneyGate(scene, dt = 0) {
  const route = scene.journeyRoute;
  const gate = route.gates[scene.expected];
  if (!gate) return;
  const final = scene.expected === route.gates.length - 1;
  if (final && route.parking) {
    if (stoppedAtMeeting(route, scene.car, scene.journeyDrive, dt)) scene.finishSprint();
    return;
  }
  if (Math.hypot(scene.car.x - gate.x, scene.car.y - gate.y) > scene.captureRadius) return;
  if (final) scene.finishSprint();
  else { scene.expected++; saveJourneyCheckpoint(scene); }
}

// Save an itinerary gate, never a position in a ditch or against a rail. A
// continuation resets speed on the road and keeps cargo and elapsed drive time.
export function saveJourneyCheckpoint(scene) {
  if (!scene.journeyChapter || scene.finished || !scene.journeyDrive) return;
  const save = readJourney();
  if (save.completed[scene.journeyChapter.id]) return; // A revisit cannot overwrite the original run.
  save.checkpoint = { chapter: scene.journeyChapter.id, gate: scene.expected,
    elapsed: scene.journeyDrive.elapsed, roughSeconds: scene.journeyDrive.roughSeconds,
    contacts: scene.contactEvents, route: scene.journeyRoute.oldTown ? 'old-town' : 'riverbank' };
  scene.journeySaved = writeJourney(save);
}
