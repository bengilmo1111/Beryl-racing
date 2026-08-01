// Eastbourne Dash route override.
//
// This is authored at the live 3D world scale rather than the older compressed
// prototype scale. config.applyTrack() installs it after tracks.js has applied
// its legacy global scale pass, so these coordinates are never scaled twice.
//
// Shape references:
// - the supplied Google Maps screenshots from 28 Ferry Road to Eastbourne RSA;
// - Greater Wellington's East Harbour northern-block map;
// - the visible relationship between Ferry Road, Marine Drive / Muritai Road,
//   Marine Parade, Muritai School and Tuatoru Street.
//
// The route is intentionally a readable caricature rather than GIS data. The
// recognisable sequence matters most: long steep Ferry Road, a hard left onto
// the coast, a long beach-hugging drive, then a small Eastbourne street network
// offering several ways to the RSA.

export const EASTBOURNE_LAYOUT = {
  world: { width: 7200, height: 15000 },
  shoreX: 1200,
  places: {
    wharfZ: 5480,
    williamsPark: { x: 3150, z: 7100 },
    doctors: { x: 3470, z: 11450 },
    shops: { x: 3460, z: 12040 },
    school: { x: 3720, z: 12720 },
    rsa: { x: 2920, z: 14350 },
  },
  // A nearly continuous shoreline with small bays. The playable road follows
  // this shape at a modest setback, leaving a thin strip of beach throughout.
  shoreline: [
    { x: 1200, z: 2500 },
    { x: 1160, z: 3600 },
    { x: 1120, z: 4700 },
    { x: 1200, z: 5800 },
    { x: 1080, z: 7000 },
    { x: 1160, z: 8200 },
    { x: 1100, z: 9400 },
    { x: 1180, z: 10600 },
    { x: 1100, z: 11800 },
    { x: 1120, z: 13000 },
    { x: 1180, z: 14500 },
  ],
};

const PRIMARY_ANCHORS = [
  // 28 Ferry Road: a long, steep descent before the junction.
  { x: 3160, y: 520 },
  { x: 3090, y: 1080 },
  { x: 2960, y: 1680 },
  { x: 2700, y: 2240 },
  { x: 2320, y: 2700 },
  // The real route turns sharply left onto the main coastal road.
  { x: 1940, y: 2920 },
  { x: 1600, y: 3000 },
  { x: 1480, y: 3290 },
  { x: 1510, y: 3720 },
  // Marine Drive: long coastal running with the harbour continuously left.
  { x: 1560, y: 4300 },
  { x: 1490, y: 4920 },
  { x: 1640, y: 5480 },
  { x: 1510, y: 6100 },
  { x: 1610, y: 6760 },
  { x: 1510, y: 7440 },
  { x: 1720, y: 8150 },
  { x: 1630, y: 8870 },
  { x: 1870, y: 9580 },
  { x: 1810, y: 10320 },
  { x: 2040, y: 10940 },
  // Muritai Road drifts inland through the village / school area.
  { x: 2370, y: 11520 },
  { x: 2620, y: 12120 },
  { x: 2730, y: 12780 },
  { x: 2790, y: 13320 },
  { x: 2570, y: 13720 },
  // Tuatoru Street approach to the RSA. Every route converges here.
  { x: 2160, y: 14120 },
];

const BRANCHES = [
  {
    id: 'marine-parade',
    roadWidth: 310,
    samplesPerSegment: 18,
    closed: false,
    anchors: [
      { x: 2040, y: 10940 },
      { x: 1710, y: 11320 },
      { x: 1510, y: 11860 },
      { x: 1480, y: 12480 },
      { x: 1540, y: 13100 },
      { x: 1660, y: 13620 },
      { x: 2160, y: 14120 },
    ],
  },
  {
    id: 'village-inland',
    roadWidth: 300,
    samplesPerSegment: 18,
    closed: false,
    anchors: [
      { x: 2370, y: 11520 },
      { x: 2980, y: 11600 },
      { x: 3370, y: 12100 },
      { x: 3370, y: 12820 },
      { x: 3110, y: 13440 },
      { x: 2570, y: 13720 },
    ],
  },
  // Cross streets make the village a network rather than three disconnected
  // ribbons, so the player can swap route midway through Eastbourne.
  {
    id: 'rata-street-link',
    roadWidth: 270,
    samplesPerSegment: 12,
    closed: false,
    anchors: [
      { x: 1510, y: 11860 },
      { x: 2050, y: 11920 },
      { x: 2620, y: 12120 },
      { x: 3370, y: 12100 },
    ],
  },
  {
    id: 'school-link',
    roadWidth: 270,
    samplesPerSegment: 12,
    closed: false,
    anchors: [
      { x: 1540, y: 13100 },
      { x: 2150, y: 13020 },
      { x: 2730, y: 12780 },
      { x: 3370, y: 12820 },
    ],
  },
];

function cloneRoad(road) {
  return {
    ...road,
    anchors: road.anchors.map((point) => ({ ...point })),
  };
}

export function applyEastbourneRoute(def) {
  def.world = { ...EASTBOURNE_LAYOUT.world };
  def.geometry = {
    anchors: PRIMARY_ANCHORS.map((point) => ({ ...point })),
    branches: BRANCHES.map(cloneRoad),
    roadWidth: 360,
    samplesPerSegment: 20,
    numCheckpoints: 7,
    // All required gates except the finish sit before the road network splits.
    // Players may therefore choose any village route without being pulled back
    // to an arbitrary "correct" street.
    checkpointFractions: [0, 0.12, 0.26, 0.42, 0.58, 0.73, 1],
    closed: false,
    elevation: {
      sea: [{ x: -1800, y: -1000, w: 3100, h: 17000, level: 0 }],
      profile: [
        { at: 0, h: 320 },
        { at: 0.07, h: 235 },
        { at: 0.16, h: 22 },
        { at: 0.76, h: 12 },
        { at: 1, h: 22 },
      ],
    },
  };

  // Route v2 is not comparable with the short prototype's records.
  def.storageKey = 'beryl-racing-3d.eastbourne-dash.bestTimeMs.v2';

  // Keep the old landmark array from generating floating labels or signboards.
  // The 3D Eastbourne theme now places its landmarks directly as architecture.
  def.landmarks = [];
  def.arrows = [];
  def.finishLabel = null;
  def.eastbourneLayout = EASTBOURNE_LAYOUT;
  return def;
}
