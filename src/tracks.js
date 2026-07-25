// Course catalogue. Each entry is a fully self-contained description of a
// course — its world size, road geometry, handling model, decoration theme,
// game mode and HUD/finish copy. config.applyTrack() copies the live parts into
// the shared config objects when a course becomes active.
//
// Two very different courses ship today:
//
//   * Manfield Racetrack  — the original closed drift circuit (lap racing,
//     large fast world, red/white rumble kerbs).
//   * Eastbourne Pootle   — a gentle coastal point-to-point sprint (single run
//     to the RSA, harbour on your left, warm late afternoon).
//
// Because they were authored at different scales, each carries its own physics.

import { applyTrack } from './config.js';

export const TRACKS = [
  {
    id: 'eastbourne-pootle',
    name: 'Eastbourne Pootle',
    tagline: 'Coastal point-to-point',
    mode: 'sprint', // one run, start to finish
    theme: 'eastbourne',
    world: { width: 2400, height: 5000 },
    // Compressed north-to-south coastal route. Harbour stays on the player's
    // left until the village, then the road turns inland to the RSA.
    geometry: {
      anchors: [
        { x: 800, y: 400 },
        { x: 650, y: 700 },
        { x: 740, y: 1100 },
        { x: 610, y: 1580 },
        { x: 740, y: 2100 },
        { x: 580, y: 2660 },
        { x: 720, y: 3200 },
        { x: 640, y: 3700 },
        { x: 850, y: 4050 },
        { x: 1250, y: 4200 },
        { x: 1450, y: 4470 },
        { x: 1280, y: 4740 },
      ],
      roadWidth: 180,
      samplesPerSegment: 20,
      numCheckpoints: 10,
      closed: false,
    },
    physics: {
      maxSpeed: 60, // px/s; tuned for an approximately two-minute clean run
      accel: 72,
      brakeDecel: 150,
      reverseAccel: 42,
      maxReverse: 30,
      coastDrag: 12,
      overspeedDrag: 90,
      turnRate: 3.3,
      lowSpeedTurn: 0.5,
      gripNormal: 9.0,
      gripDrift: 2.4,
      gripGrass: 4.0,
      driftTurnBoost: 1.5,
      grassMaxSpeedFactor: 0.5,
      grassDrag: 100,
      driftLateral: 14,
    },
    storageKey: 'beryl-racing.eastbourne-pootle.bestTimeMs.v1',
    hud: { current: 'POOTLE TIME', progress: 'TO EASTBOURNE' },
    bestLabel: 'Eastbourne best',
    results: {
      title: 'POOTLE COMPLETE!',
      message: 'Phew! Just in time for a beer.',
      retryLabel: '↻  POOTLE AGAIN',
    },
  },
  {
    id: 'manfield',
    name: 'Manfield Racetrack',
    tagline: 'Classic drift circuit',
    mode: 'circuit', // continuous lap racing
    theme: 'manfield',
    world: { width: 3000, height: 2000 },
    // Hand-authored closed loop: a long bottom straight, sweeping right-handers,
    // a top ess, and a left sweeper back to the line.
    geometry: {
      anchors: [
        { x: 760, y: 1560 },
        { x: 1700, y: 1660 },
        { x: 2400, y: 1520 },
        { x: 2720, y: 1170 },
        { x: 2520, y: 820 },
        { x: 2660, y: 470 },
        { x: 2080, y: 400 },
        { x: 1680, y: 560 },
        { x: 1250, y: 380 },
        { x: 760, y: 440 },
        { x: 400, y: 820 },
        { x: 470, y: 1240 },
        { x: 560, y: 1480 },
      ],
      roadWidth: 300, // wide, for drifting room
      samplesPerSegment: 20,
      numCheckpoints: 6, // includes the start/finish gate (index 0)
      closed: true,
    },
    physics: {
      maxSpeed: 940, // px/s on tarmac
      accel: 900,
      brakeDecel: 1600,
      reverseAccel: 340,
      maxReverse: 240,
      coastDrag: 150,
      overspeedDrag: 700,
      turnRate: 3.3,
      lowSpeedTurn: 0.5,
      gripNormal: 9.0,
      gripDrift: 2.4,
      gripGrass: 4.0,
      driftTurnBoost: 1.5,
      grassMaxSpeedFactor: 0.5,
      grassDrag: 900,
      driftLateral: 70,
    },
    storageKey: 'beryl-racing.manfield.bestLapMs.v1',
    hud: { current: 'LAP TIME', progress: 'LAP 1', lapWord: 'LAP' },
    bestLabel: 'Best lap',
  },
];

const SELECT_KEY = 'beryl-racing.selectedTrack.v1';

let selectedId = TRACKS[0].id;

export function getSelectedTrack() {
  return TRACKS.find((t) => t.id === selectedId) || TRACKS[0];
}

export function getSelectedTrackId() {
  return getSelectedTrack().id;
}

// Choose a course: remember it, and push its config into the live objects so
// the next Race scene (and the title readout) reflects the choice.
export function setSelectedTrack(id) {
  if (!TRACKS.some((t) => t.id === id)) return;
  selectedId = id;
  try {
    localStorage.setItem(SELECT_KEY, id);
  } catch (e) {
    void e; // storage may be unavailable (private mode); selection still works
  }
  applyTrack(getSelectedTrack());
}

// Restore the last-used course on load and apply it immediately, so the config
// objects are valid before any scene is created.
(function initSelection() {
  try {
    const saved = localStorage.getItem(SELECT_KEY);
    if (saved && TRACKS.some((t) => t.id === saved)) selectedId = saved;
  } catch (e) {
    void e;
  }
  applyTrack(getSelectedTrack());
})();
