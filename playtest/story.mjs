import assert from 'node:assert/strict';
import { CHAPTERS, cleanJourney, finishChapter, nextChapter, readJourney, writeJourney, JOURNEY_KEY } from '../src/journey/story.js';
let save = cleanJourney(null);
assert.equal(nextChapter(save).id, CHAPTERS[0].id);
assert.deepEqual(finishChapter(save, CHAPTERS[3]), save, 'Cannot skip ahead by completing a locked chapter');
for (const chapter of CHAPTERS) {
  save = finishChapter(save, chapter, 'shaken');
  assert.equal(save.completed[chapter.id].cargo, 'shaken');
}
assert.equal(nextChapter(save), null);
assert.deepEqual(finishChapter(save, CHAPTERS[0], 'steady'), save, 'Revisits preserve the original story');
let raw = null;
const store = { getItem: key => key === JOURNEY_KEY ? raw : null, setItem: (key, value) => { raw = value; } };
assert.equal(writeJourney(save, store), true);
assert.deepEqual(readJourney(store), save);
assert.equal(writeJourney(save, { setItem() { throw new Error('quota'); } }), false);
assert.deepEqual(readJourney(null), save, 'Blocked storage keeps session progress');
assert.equal(Object.keys(cleanJourney({ version: 1, completed: { [CHAPTERS[2].id]: {} } }).completed).length, 0);
console.log('Story PASS: ordered chapters, revisits, persistence and unavailable storage');

const { buildJourneyRoute, newDriveState, advanceDrive, cargoState, stoppedAtMeeting } = await import('../src/journey/drive.js');
const { TRACKS } = await import('../src/tracks.js');
const { applyTrack } = await import('../src/config.js');
const { buildTrack, distanceToCenterline } = await import('../src/track.js');
const { metres, kmhToUnits } = await import('../src/scale.js');
applyTrack(TRACKS.find(t => t.id === 'otaki'));
const otaki = buildTrack();
const direct = buildJourneyRoute(otaki, CHAPTERS[0]);
const town = buildJourneyRoute(otaki, CHAPTERS[2]);
assert.ok(town.oldTown && town.line.some(p => otaki.roads[1].centerline.includes(p)), 'Old-town itinerary is a distinct drive');
for (const p of town.line) assert.ok(distanceToCenterline(p.x, p.y, otaki.centerline) <= otaki.half, 'Story route stays on existing roads');
assert.deepEqual(town.line.at(-1), direct.line.at(-1), 'Both routes arrive at the same beach');
assert.equal(buildJourneyRoute(otaki, CHAPTERS[4], 'old-town').oldTown, true);
assert.equal(buildJourneyRoute(otaki, CHAPTERS[4], 'riverbank').oldTown, false);
applyTrack(TRACKS.find(t => t.id === 'remutaka'));
const hill = buildTrack(), park = buildJourneyRoute(hill, CHAPTERS[3]);
assert.ok(Math.hypot(park.meeting.x - hill.summit.origin.x, park.meeting.y - hill.summit.origin.y) > hill.half + metres(3));
const drive = newDriveState();
for (let i = 0; i < 30; i++) assert.equal(stoppedAtMeeting(park, { ...hill.summit.origin, speed: 0 }, drive, 0.1), false, 'Stopping on highway cannot deliver');
assert.equal(stoppedAtMeeting(park, { ...park.meeting, speed: kmhToUnits(20) }, drive, 3), false);
assert.equal(stoppedAtMeeting(park, { ...park.meeting, speed: 0 }, drive, 1), false);
assert.equal(stoppedAtMeeting(park, { ...park.meeting, speed: 0 }, drive, 1), true);
let smooth = newDriveState(), rough = newDriveState();
for (let i = 0; i < 120; i++) {
  smooth = advanceDrive(smooth, { dt: 0.2, onTrack: true, speed: kmhToUnits(40), heading: 0, contacts: 0 });
  rough = advanceDrive(rough, { dt: 0.2, onTrack: false, speed: kmhToUnits(40), heading: 0, contacts: 0 });
}
assert.equal(cargoState(smooth), 'steady'); assert.equal(cargoState(rough), 'spilled');
console.log('Round 2 PASS: real branch routing, pavement-only destinations, stopped delivery and driving-sensitive cargo');

const { briefFor, arrivalFor } = await import('../src/journey/story.js');
let continuing = finishChapter(cleanJourney(null), CHAPTERS[0]);
continuing.checkpoint = { chapter: CHAPTERS[1].id, gate: 4, elapsed: 28, roughSeconds: 9, contacts: 2, route: 'riverbank' };
continuing = cleanJourney(continuing);
assert.equal(continuing.checkpoint.gate, 4);
assert.deepEqual(finishChapter(continuing, CHAPTERS[0]), continuing, 'Revisiting must preserve the current saved chapter');
assert.equal(cleanJourney({ ...continuing, checkpoint: { ...continuing.checkpoint, gate: -1 } }).checkpoint, null);
assert.equal(cleanJourney({ ...continuing, checkpoint: { ...continuing.checkpoint, elapsed: Infinity } }).checkpoint, null);
let spill = finishChapter(continuing, CHAPTERS[1], 'spilled');
assert.match(briefFor(CHAPTERS[3], spill), /fresh flask/);
assert.match(arrivalFor(CHAPTERS[1], spill), /flask is empty/);
let all = cleanJourney(null);
all.choice = 'old-town';
for (const chapter of CHAPTERS) all = finishChapter(all, chapter);
assert.match(arrivalFor(CHAPTERS[5], all), /Mere’s workshop/);
assert.equal(all.checkpoint, null);
console.log('Round 3 PASS: checkpoint validation, revisit safety and consequences in later scenes');
