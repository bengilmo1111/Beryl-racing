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
    // Morris Minor character: a decent top speed you have to work up to (long,
    // lazy acceleration), weak brakes that are slow to wash off speed, and loose,
    // low-grip cornering that gently oversteers — the tail drifts wide rather
    // than the car darting where it's pointed.
    physics: {
      maxSpeed: 88, // px/s; higher top end so the coastal run isn't a crawl
      accel: 46, // long acceleration — takes ~2s to wind up to top speed
      brakeDecel: 82, // poor brakes: slow to stop
      reverseAccel: 40,
      maxReverse: 34,
      coastDrag: 8, // carries momentum; reluctant to slow when you lift off
      overspeedDrag: 90,
      turnRate: 3.1, // slightly lazy turn-in
      lowSpeedTurn: 0.55,
      gripNormal: 5.4, // loose rear end — slow oversteer through the bends
      gripDrift: 2.4,
      gripGrass: 3.4,
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
    // Roadside landmark labels, advance arrows and the finish marker text.
    landmarks: [
      [830, 300, '28 FERRY ROAD'],
      [470, 1100, 'DAYS BAY WHARF'],
      [900, 1580, 'WILLIAMS PARK'],
      [470, 2660, 'RONA BAY'],
      [920, 3700, 'EASTBOURNE VILLAGE'],
      [1420, 4740, 'EASTBOURNE RSA'],
    ],
    arrows: [{ x: 980, y: 4010, text: 'TURN INLAND  ➜', rot: 0.15 }],
    finishLabel: 'FINISH • RSA',
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
  {
    id: 'remutaka',
    name: 'Remutaka Hill Climb',
    tagline: 'Summit hill climb',
    mode: 'sprint', // one run, foot of the hill to the summit
    theme: 'remutaka',
    world: { width: 5200, height: 3200 },
    // Skeleton route (first cut): a compressed climb of SH2 from Te Marua in the
    // broad, open west, running east through the lower sweepers and the Kaitoke
    // bend, then tightening into summit switchbacks up to the Remutaka Summit
    // sign in the high east. Open spline; coordinates are placeholders tuned so
    // the hairpins don't self-overlap. Final art (guardrails, chevrons, the
    // summit sign) is a later pass per docs/tracks/REMUTAKA-ART-BRIEF.md.
    geometry: {
      anchors: [
        { x: 360, y: 2000 }, // Te Marua start — broad and low
        { x: 780, y: 1900 },
        { x: 1250, y: 1980 },
        { x: 1750, y: 1780 }, // lower sweepers
        { x: 2250, y: 1900 },
        { x: 2750, y: 1620 },
        { x: 3200, y: 1500 }, // Kaitoke bend
        { x: 3560, y: 1780 },
        { x: 3720, y: 2160 }, // foot of the switchbacks
        { x: 4080, y: 1980 },
        { x: 3900, y: 1600 }, // hairpin 1
        { x: 4280, y: 1460 },
        { x: 4080, y: 1140 }, // hairpin 2
        { x: 4500, y: 1040 },
        { x: 4380, y: 780 }, // final charge
        { x: 4820, y: 680 }, // Remutaka Summit finish
      ],
      roadWidth: 150, // narrower and more technical than the coastal road
      samplesPerSegment: 20,
      numCheckpoints: 11,
      closed: false,
    },
    // Same Morris Minor character as Eastbourne (long acceleration, weak brakes,
    // loose oversteer), scaled a little quicker for the hill and kept just
    // grippy enough at low speed to hustle the summit hairpins. Tunable.
    physics: {
      maxSpeed: 100, // decent top end for the lower sweepers
      accel: 54, // long acceleration — ~2s to top speed
      brakeDecel: 92, // poor brakes; the switchbacks need planning ahead
      reverseAccel: 42,
      maxReverse: 36,
      coastDrag: 9, // slow to stop
      overspeedDrag: 100,
      turnRate: 3.3,
      lowSpeedTurn: 0.6, // a bit more low-speed steer so the hairpins stay doable
      gripNormal: 5.8, // loose, oversteery — a touch more grip than the coast run
      gripDrift: 2.6,
      gripGrass: 3.4,
      driftTurnBoost: 1.5,
      grassMaxSpeedFactor: 0.5,
      grassDrag: 110,
      driftLateral: 14,
    },
    storageKey: 'beryl-racing.remutaka.bestTimeMs.v1',
    hud: { current: 'CLIMB TIME', progress: 'TO THE SUMMIT' },
    bestLabel: 'Best climb',
    results: {
      title: 'SUMMIT!',
      message: 'We made it. Hope the brakes work on the way down.',
      retryLabel: '↻  CLIMB AGAIN',
    },
    landmarks: [
      [360, 2200, 'TE MĀRUA'],
      [3200, 1360, 'KAITOKE'],
      [2250, 2060, 'THE SWEEPERS'],
      [4820, 900, 'REMUTAKA SUMMIT'],
    ],
    arrows: [
      { x: 3760, y: 2360, text: 'HAIRPINS  ➜', rot: -0.5 },
      { x: 4360, y: 1300, text: '➜', rot: -1.2 },
    ],
    finishLabel: 'FINISH • SUMMIT',
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
