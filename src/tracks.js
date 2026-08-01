// Course catalogue. Each entry is a fully self-contained description of a
// course — its world size, road geometry, handling model, decoration theme,
// game mode and HUD/finish copy. config.applyTrack() copies the live parts into
// the shared config objects when a course becomes active.
//
// Two very different courses ship today:
//
//   * Manfeild Circuit    — the real Manfeild Chris Amon layout, traced from
//     MotorSport NZ's circuit map (lap racing, red/white rumble kerbs).
//   * Eastbourne Dash   — a gentle coastal point-to-point sprint (single run
//     to the RSA, harbour on your left, warm late afternoon).
//
// Because they were authored at different scales, each carries its own physics.

import { applyTrack } from './config.js';

export const TRACKS = [
  {
    id: 'eastbourne-dash',
    name: 'Eastbourne Dash',
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
      // Two lanes wide. At ~59 units/metre (Beryl is 217.6 units for a 3.7m car)
      // this is about 6m of sealed road, which is what a marked centre line
      // needs — the old 180 was a single 3m lane with room for one car.
      //
      // There is a hard ceiling on this, per course. track.js offsets the
      // centreline by ±half along its own normal, so once half exceeds the
      // tightest corner's radius the two edges cross and the road folds through
      // itself — visible as the kerb line cutting diagonally over the tarmac.
      // Eastbourne's tightest bend has a 301-unit radius, so its ceiling is 602
      // and 360 is comfortable. The other three courses are much tighter and are
      // capped accordingly; see each one below.
      roadWidth: 360,
      samplesPerSegment: 20,
      numCheckpoints: 10,
      closed: false,
      // Ferry Road is genuinely steep, and the route starts at the top of it
      // (28 Ferry Road is anchor 0). Beryl drops off the hill onto the flat
      // harbour road, runs the coast at sea level, then climbs gently inland to
      // the RSA. Heights are world units; see track.js sampleProfile.
      elevation: {
        // Wellington Harbour: the western strip, flat at sea level, so the
        // Ferry Road hill falls to the water instead of the water climbing the
        // hill. Matches the 2D harbour (width * 0.167, down to height * 0.8).
        // Pre-scale coordinates, like the anchors.
        sea: [{ x: -400, y: -400, w: 801, h: 4400, level: 0 }],
        profile: [
          { at: 0, h: 105 }, // top of Ferry Road
          { at: 0.1, h: 10 }, // down on the coast road — roughly a 20% drop
          { at: 0.8, h: 6 }, // flat along the harbour
          { at: 1, h: 30 }, // up a little into the village and the RSA
        ],
      },
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
      gravity: 300, // px/s^2 along the slope (scaled with the other speed fields)
      maxClimbPenalty: 0.78, // cap vs accel — full throttle always climbs
      downhillOverspeed: 0.18, // Ferry Road is a proper run down
    },
    storageKey: 'beryl-racing-3d.eastbourne-dash.bestTimeMs.v1',
    hud: { current: 'DASH TIME', progress: 'TO EASTBOURNE' },
    bestLabel: 'Eastbourne best',
    results: {
      title: 'DASH COMPLETE!',
      message: 'Phew! Just in time for a beer.',
      retryLabel: '↻  DASH AGAIN',
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
    name: 'Manfeild Circuit',
    tagline: 'Chris Amon • 3.03 km',
    mode: 'circuit', // continuous lap racing
    theme: 'manfield',
    world: { width: 3540, height: 1920 },
    // Manfeild is built bigger than the map, on purpose. The traced layout keeps
    // the real circuit's *shape* and proportions, but at true scale its tightest
    // corner has a 122-unit radius, which caps the road at 244 — narrow enough
    // that a drifting game loses the room it needs. Scaling the whole site
    // scales every corner radius with it, so the road can be 450 and the layout
    // still reads as Manfeild. A real racetrack is a place with a size, so
    // making that size bigger is a fair trade; the corner *sequence* is what you
    // recognise. Applied on top of LENGTH_SCALE — see scaleCourse.
    lengthScale: 2.05,
    // The real thing. Traced from MotorSport New Zealand's official circuit map
    // for Manfeild Circuit Chris Amon (CRO004d), so the shape you drive is the
    // shape on the map: main straight, the left onto the infield loop, the ess
    // back down and out to the far loop, the back straight, the top loop, the
    // long top straight and the right-hand return to the line.
    //
    // Scale: this 12,352-unit lap is the circuit's real 3.03 km — ≈0.25 m per
    // unit here, ≈0.12 m once LENGTH_SCALE has been applied — so the corner
    // radii keep their true proportions. Anchor 0 is the actual start/finish
    // line (the green line on the map) and the lap runs clockwise, as the map's
    // arrow does. Marshal posts 1–8 are signed where the map puts them (see
    // `landmarks`). See docs/tracks/MANFEILD-LAYOUT.md for how it was traced.
    geometry: {
      anchors: [
        { x: 1883, y: 1609 }, // start/finish, main straight heading west
        { x: 1510, y: 1607 },
        { x: 1144, y: 1605 },
        { x: 777, y: 1605 },
        { x: 480, y: 1595 },
        { x: 315, y: 1515 }, // turn 1, the left-hander off the straight
        { x: 300, y: 1400 },
        { x: 449, y: 1249 },
        { x: 710, y: 1117 },
        { x: 987, y: 1024 }, // onto the infield loop
        { x: 1251, y: 1031 },
        { x: 1494, y: 1143 },
        { x: 1696, y: 1364 }, // the ess drops back down
        { x: 1836, y: 1443 },
        { x: 2000, y: 1372 },
        { x: 2205, y: 1177 },
        { x: 2410, y: 1130 },
        { x: 2683, y: 1148 },
        { x: 2872, y: 1074 }, // the loop at the far end of the infield
        { x: 2893, y: 980 },
        { x: 2757, y: 876 },
        { x: 2470, y: 808 },
        { x: 2139, y: 799 },
        { x: 1766, y: 799 }, // back straight, running west
        { x: 1406, y: 800 },
        { x: 1026, y: 800 },
        { x: 660, y: 800 },
        { x: 412, y: 761 },
        { x: 322, y: 654 }, // the top loop
        { x: 367, y: 508 },
        { x: 577, y: 365 },
        { x: 846, y: 300 },
        { x: 1149, y: 306 },
        { x: 1446, y: 367 }, // the long top straight, running east
        { x: 1713, y: 438 },
        { x: 1998, y: 512 },
        { x: 2271, y: 584 },
        { x: 2533, y: 652 },
        { x: 2783, y: 717 },
        { x: 3036, y: 823 },
        { x: 3201, y: 1019 }, // the far right-hand loop
        { x: 3234, y: 1227 },
        { x: 3134, y: 1367 },
        { x: 2839, y: 1479 },
        { x: 2531, y: 1574 }, // back onto the main straight
        { x: 2249, y: 1611 },
      ],
      // Broad racing tarmac, and the reason `lengthScale` above exists. See the
      // roadWidth note on the Eastbourne course: half the width cannot exceed a
      // corner's radius or the road folds through itself, and at the map's own
      // proportions Manfeild's tightest corner caps the road at 244. Enlarging
      // the site scales the radii with it, so 450 fits.
      roadWidth: 450,
      samplesPerSegment: 20,
      // Was 6, which was plenty for the old oval. The real layout doubles back
      // on itself twice, and gates that far apart leave a straight line between
      // them that crosses the infield rather than the road.
      numCheckpoints: 18, // includes the start/finish gate (index 0)
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
    storageKey: 'beryl-racing-3d.manfield.bestLapMs.v1',
    hud: { current: 'LAP TIME', progress: 'LAP 1', lapWord: 'LAP' },
    bestLabel: 'Best lap',
    // The eight marshal posts, at the positions the CRO map puts them.
    landmarks: [
      [436, 1446, 'POST 1'],
      [1110, 1143, 'POST 2'],
      [1858, 1305, 'POST 3'],
      [2366, 1275, 'POST 4'],
      [2727, 1003, 'POST 5'],
      [507, 572, 'POST 6'],
      [3116, 1165, 'POST 7'],
      [2534, 1680, 'POST 8'],
    ],
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
      // Narrower and more technical than the coastal road, and it has to be:
      // the tightest switchback has a 130-unit radius, so 260 is the hard
      // ceiling before the offset edges cross. 240 leaves a margin.
      roadWidth: 240,
      samplesPerSegment: 20,
      numCheckpoints: 11,
      closed: false,
      // The point of the course: a long, gentle rise through the lower sweepers
      // that hardens into a sustained ~13-14% grind once the switchbacks start.
      // Caricatured for feel, not surveyed — see PRD/ART-DIRECTION on compressed
      // distances and exaggerated hills.
      elevation: {
        profile: [
          { at: 0, h: 0 }, // Te Mārua, low and broad
          { at: 0.3, h: 45 }, // lower sweepers, barely climbing
          { at: 0.55, h: 160 }, // Kaitoke bend, it starts to bite
          { at: 0.8, h: 320 }, // deep in the switchbacks
          { at: 1, h: 440 }, // Remutaka Summit
        ],
      },
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
      // Lowest in the game. The switchbacks are the steepest thing Beryl drives,
      // and a heavier pull here stalled her outright whenever a driver lifted off
      // mid-hairpin — she hovered around zero instead of either climbing or
      // rolling back, which is neither fun nor recoverable.
      gravity: 200,
      maxClimbPenalty: 0.78,
      downhillOverspeed: 0.12,
    },
    storageKey: 'beryl-racing-3d.remutaka.bestTimeMs.v1',
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
  {
    id: 'otaki',
    name: 'Ōtaki Rally',
    tagline: 'Gravel-to-coast rally',
    mode: 'sprint', // one run, inland foothills down to the coast
    theme: 'otaki',
    world: { width: 5200, height: 5200 },
    // Skeleton route (first cut): a compressed inland-to-coast dash. Start at
    // Ōtaki Forks in the SE foothills, wind down the valley, blast the open
    // farmland gravel with a couple of square rural turns, cross the Ōtaki River
    // and the railway, thread the sealed township, then run out to Ōtaki Beach in
    // the NW. Open spline; placeholder coordinates tuned so nothing self-overlaps.
    geometry: {
      anchors: [
        { x: 4500, y: 4650 }, // Ōtaki Forks — inland start
        { x: 4250, y: 4250 },
        { x: 4380, y: 3820 }, // valley bend
        { x: 4050, y: 3480 },
        { x: 4180, y: 3050 },
        { x: 3720, y: 2780 }, // out onto the farm flats
        { x: 3120, y: 2760 }, // long gravel straight (west)
        { x: 3150, y: 2260 }, // square rural turn (north)
        { x: 2600, y: 2160 }, // turn back west toward the river
        { x: 2120, y: 2060 }, // Ōtaki River crossing (kept straight)
        { x: 1720, y: 1940 },
        { x: 1500, y: 1620 }, // railway crossing / edge of town
        { x: 1360, y: 1300 }, // into the sealed township
        { x: 1520, y: 1020 }, // town turn
        { x: 1140, y: 860 },
        { x: 780, y: 700 }, // out toward the coast
        { x: 470, y: 540 }, // Ōtaki Beach finish (NW)
      ],
      // Capped by the tightest river-flat bend (150-unit radius, 299 ceiling).
      roadWidth: 280,
      samplesPerSegment: 20,
      numCheckpoints: 13,
      closed: false,
      // Gravel farmland/river/railway, sealed through town, loose again onto the
      // beach approach. Fractions of the route length; drives both look and grip.
      surfaceBands: [
        { type: 'gravel', until: 0.66 },
        { type: 'sealed', until: 0.93 },
        { type: 'gravel', until: 1.0 },
      ],
      // Inland foothills down to the coast, as the tagline says: a steep loose
      // descent out of the valley, easing across the farm flats, then all but
      // flat through the township and out to the beach.
      elevation: {
        // The Tasman, beyond Ōtaki Beach in the north-west corner (the beach
        // rect in `scenery` is 1050 x 1050 from the origin). Pre-scale.
        sea: [{ x: -400, y: -400, w: 700, h: 1450, level: 0 },
              { x: -400, y: -400, w: 1450, h: 700, level: 0 }],
        // The Ōtaki River, carved under the bridge at the same checkpoint the
        // crossing scenery uses. Pre-scale, like the anchors.
        river: { cp: 6, halfWidth: 130, halfLength: 925, drop: 45 },
        profile: [
          { at: 0, h: 420 }, // Ōtaki Forks, up in the foothills
          { at: 0.3, h: 140 }, // down the valley — the fast, loose part
          { at: 0.62, h: 60 }, // out onto the farmland flats
          { at: 1, h: 10 }, // Ōtaki Beach, sea level
        ],
      },
    },
    // Rally character: the fastest and loosest of the road courses, still
    // Morris-Minor-flavoured (long acceleration, weak brakes, oversteer). Gravel
    // is looser than the sealed town section. Tunable.
    physics: {
      maxSpeed: 115, // open gravel straights want pace
      accel: 62, // long acceleration
      brakeDecel: 100, // poor brakes; plan ahead for the town and river
      reverseAccel: 46,
      maxReverse: 38,
      coastDrag: 9, // slow to stop
      overspeedDrag: 110,
      turnRate: 3.4,
      lowSpeedTurn: 0.6,
      gripNormal: 6.0, // sealed / town on-road grip
      gripGravel: 4.2, // gravel — looser, slidier, dusty
      gripDrift: 2.6,
      gripGrass: 3.2, // dry roadside grass off-track
      driftTurnBoost: 1.5,
      grassMaxSpeedFactor: 0.5,
      grassDrag: 110,
      driftLateral: 14,
      gravity: 300,
      maxClimbPenalty: 0.78,
      downhillOverspeed: 0.15, // gravel descent out of the valley
    },
    storageKey: 'beryl-racing-3d.otaki.bestTimeMs.v1',
    hud: { current: 'RALLY TIME', progress: 'TO THE BEACH' },
    bestLabel: 'Best rally',
    results: {
      title: 'BEACH!',
      message: 'Made it! Save us a spot at the picnic.',
      retryLabel: '↻  RALLY AGAIN',
    },
    landmarks: [
      [4650, 4780, 'ŌTAKI FORKS'],
      [3480, 2680, 'FARMLAND'],
      [2120, 1840, 'ŌTAKI RIVER'],
      [1780, 1480, 'RAILWAY'],
      [1360, 1120, 'ŌTAKI'],
      [470, 760, 'ŌTAKI BEACH'],
    ],
    arrows: [
      { x: 3020, y: 2440, text: 'TURN  ➜', rot: -1.3 },
      { x: 2400, y: 1980, text: 'RIVER  ➜', rot: 0.2 },
    ],
    finishLabel: 'FINISH • ŌTAKI BEACH',
    // Code-drawn scenery hooks (see RaceScene.drawOtakiSetting). River & railway
    // are placed across the road at these checkpoint indices; beach fills the NW.
    scenery: {
      riverCp: 6,
      railwayCp: 8,
      beach: { x: 0, y: 0, w: 1050, h: 1050 },
    },
  },
];

// --- Global feel tuning ----------------------------------------------------
// Applied to every course at load. These are the knobs behind the overall
// "longer and a little faster" feel:
//   • LENGTH_SCALE stretches the route + world (and the scenery that lives in
//     world coordinates) so each course is about twice as long to drive. Road
//     width and the camera zoom are deliberately left alone, so the road looks
//     the same on screen — there's just more of it.
//   • SPEED_SCALE multiplies only the velocity-dimension handling values, so
//     Beryl is about 1.5× faster while each car keeps its character (turn and
//     grip rates are untouched).
// (Beryl's sprite is separately drawn 1.25× larger in entities/Car.js.)
const LENGTH_SCALE = 2;
// Raised from 1.5: the courses were still reading as too slow to drive. This
// lifts top speed and every acceleration term together, so each car keeps its
// character rather than just gaining a higher ceiling it takes forever to reach.
const SPEED_SCALE = 1.8;
// Extra pep on top of the speed lift, applied to acceleration only. Top speed is
// what a course is capable of; acceleration is what it *feels* like, and a
// Morris Minor that takes three seconds to wind up feels slow even when the
// number at the end is high. Getting there quicker is most of the fix.
const ACCEL_SCALE = 1.3;
// Grip is nudged up by less than the speed increase. At higher speed the car's
// absolute sideways slide would grow on the same-width roads and wash off the
// tighter corners; lifting grip by less keeps it on the road while leaving most
// of the loose, oversteery character intact.
const GRIP_SCALE = 1.4;

// Handling values measured in px/s or px/s² — everything that scales with speed.
// Ratios (lowSpeedTurn, driftTurnBoost, grassMaxSpeedFactor) and turnRate are
// intentionally excluded so the feel is preserved.
const SPEED_FIELDS = [
  'maxSpeed', 'accel', 'brakeDecel', 'reverseAccel', 'maxReverse',
  'coastDrag', 'overspeedDrag', 'grassDrag', 'driftLateral',
  // Gravity is px/s^2, same as accel. It has to scale with accel or the climb
  // penalty would quietly shrink relative to Beryl's power and the hills would
  // stop mattering. (maxClimbPenalty and downhillOverspeed are ratios, so they
  // are deliberately excluded, like lowSpeedTurn and grassMaxSpeedFactor.)
  'gravity',
];
// Lateral-grip rates — scaled up modestly (GRIP_SCALE) to hold the road margin.
const GRIP_FIELDS = ['gripNormal', 'gripGravel', 'gripDrift', 'gripGrass'];

function scaleCourse(def) {
  // A course may ask for extra room on top of the global scale. Manfeild does,
  // so that a road wide enough to drift on still fits inside the real layout's
  // corners; see the note on its `lengthScale`.
  const L = LENGTH_SCALE * (def.lengthScale ?? 1);
  def.world = { width: Math.round(def.world.width * L), height: Math.round(def.world.height * L) };
  const g = def.geometry;
  g.anchors = g.anchors.map((a) => ({ x: a.x * L, y: a.y * L }));
  // Elevation scales with length so the *grade* is preserved. Routes get twice
  // as long; if the heights stayed put, every hill would halve in steepness and
  // the climb would quietly stop being a climb.
  if (g.elevation) {
    g.elevation = { ...g.elevation };
    if (g.elevation.profile) {
      g.elevation.profile = g.elevation.profile.map((p) => ({ at: p.at, h: p.h * L }));
    }
    // Sea rects are world geometry like the anchors, so they scale in x/y. The
    // level is a height, and scales for the same reason the profile does.
    if (g.elevation.river) {
      const r = g.elevation.river;
      g.elevation.river = {
        cp: r.cp,
        halfWidth: r.halfWidth * L,
        halfLength: r.halfLength * L,
        drop: r.drop * L,
      };
    }
    if (g.elevation.sea) {
      g.elevation.sea = g.elevation.sea.map((r) => ({
        x: r.x * L, y: r.y * L, w: r.w * L, h: r.h * L, level: r.level * L,
      }));
    }
  }
  // roadWidth intentionally NOT scaled (keeps the same on-screen road width).
  if (def.landmarks) def.landmarks = def.landmarks.map(([x, y, t]) => [x * L, y * L, t]);
  if (def.arrows) def.arrows = def.arrows.map((a) => ({ ...a, x: a.x * L, y: a.y * L }));
  if (def.scenery && def.scenery.beach) {
    const b = def.scenery.beach;
    def.scenery.beach = { x: b.x * L, y: b.y * L, w: b.w * L, h: b.h * L };
  }
  for (const f of SPEED_FIELDS) {
    if (def.physics[f] != null) def.physics[f] *= SPEED_SCALE;
  }
  // Acceleration gets the extra pep on top. Braking rises with it so the cars
  // don't become quick to gather speed and hopeless at losing it again.
  def.physics.accel *= ACCEL_SCALE;
  if (def.physics.brakeDecel != null) def.physics.brakeDecel *= ACCEL_SCALE;
  for (const f of GRIP_FIELDS) {
    if (def.physics[f] != null) def.physics[f] *= GRIP_SCALE;
  }
  return def;
}

TRACKS.forEach(scaleCourse);

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
