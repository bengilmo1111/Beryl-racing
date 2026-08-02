// Ōtaki Rally road network.
//
// The data lives here rather than inline in tracks.js only because there is a
// lot of it. tracks.js imports these values and remains the authoritative course
// catalogue; nothing is patched into the definition later at apply time.
//
// Authored at final world scale. The course entry is marked `preScaled`, so the
// global physics tuning still applies while distances are not doubled again.
//
// The layout is a readable caricature of the real inland-to-coast journey:
// Ōtaki Gorge Road winds down from the Forks, crosses the expressway/railway and
// Ōtaki River, then opens into the real town street pattern. From there the
// player can reach the beach directly via Riverbank Road / Rangiuru Road, travel
// north through the old highway and Rāhui / Mill / Main / Tasman Roads, or move
// between those routes on Aotaki, Waerenga and beach-grid links.

export const OTAKI_LAYOUT = {
  world: { width: 19000, height: 11000 },
  coastX: 620,
  places: {
    forks: { x: 17600, z: 2200 },
    upperGorge: { x: 14800, z: 3350 },
    farmland: { x: 10800, z: 5000 },
    railway: { x: 9000, z: 6600 },
    river: { x: 9000, z: 7600 },
    oldHighway: { x: 9000, z: 8200 },
    oldTown: { x: 6500, z: 8900 },
    beachTown: { x: 2750, z: 8650 },
    finish: { x: 1100, z: 8000 },
  },
  zones: {
    // Used only by authored scenery and deterministic placement filters.
    gorge: { x: 9300, y: 900, w: 9000, h: 5900 },
    town: { x: 2300, y: 7500, w: 7000, h: 2400 },
    beach: { x: 0, y: 6900, w: 1050, h: 3800 },
  },
};

const PRIMARY_ANCHORS = [
  // The last part of Ōtaki Gorge Road is narrow, winding and unsealed. It is a
  // proper journey rather than the old five-bend placeholder descent.
  { x: 17600, y: 2200 },
  { x: 17050, y: 2600 },
  { x: 16600, y: 2300 },
  { x: 16000, y: 2900 },
  { x: 15400, y: 2600 },
  { x: 14800, y: 3350 },
  { x: 14100, y: 3000 },
  { x: 13400, y: 3700 },
  { x: 12650, y: 3500 },
  { x: 11900, y: 4250 },
  { x: 11150, y: 4700 },
  { x: 10400, y: 5300 },
  { x: 9800, y: 5900 },
  { x: 9300, y: 6200 },
  // The road turns north beside the old highway corridor, crosses rail and the
  // river, then reaches the point where the town routes split.
  { x: 9000, y: 6600 },
  { x: 8950, y: 7100 },
  { x: 9000, y: 7600 },
  // Direct route: Riverbank Road west, Rangiuru Road, then Marine Parade.
  { x: 8400, y: 7800 },
  { x: 7600, y: 8000 },
  { x: 6800, y: 8250 },
  { x: 6000, y: 8400 },
  { x: 5200, y: 8500 },
  { x: 4800, y: 8750 },
  { x: 4300, y: 9100 },
  { x: 3650, y: 9300 },
  { x: 3000, y: 9500 },
  { x: 2350, y: 9650 },
  { x: 1700, y: 9750 },
  { x: 1250, y: 9300 },
  { x: 1100, y: 8600 },
  { x: 1100, y: 8000 },
];

const SEALED = [{ type: 'sealed', until: 1 }];

const BRANCHES = [
  {
    id: 'rahui-mill-tasman',
    roadWidth: 270,
    samplesPerSegment: 18,
    surfaceBands: SEALED,
    closed: false,
    anchors: [
      // Continue north on the old highway, cross through Rāhui / Mill Road and
      // the old-town centre, then follow Main / Tasman Road to the coast.
      { x: 9000, y: 7600 },
      { x: 9000, y: 8200 },
      { x: 8800, y: 8650 },
      { x: 8100, y: 8700 },
      { x: 7200, y: 8700 },
      { x: 6500, y: 8900 },
      { x: 5700, y: 9000 },
      { x: 5000, y: 9200 },
      { x: 4300, y: 8800 },
      { x: 3500, y: 8400 },
      { x: 2700, y: 8150 },
      { x: 1900, y: 8000 },
      { x: 1100, y: 8000 },
    ],
  },
  {
    id: 'aotaki-riverbank-link',
    roadWidth: 250,
    samplesPerSegment: 14,
    surfaceBands: SEALED,
    closed: false,
    anchors: [
      // Aotaki Street links the old-town route back toward Riverbank Road.
      { x: 6500, y: 8900 },
      { x: 6500, y: 8500 },
      { x: 6500, y: 8150 },
      { x: 6800, y: 8250 },
    ],
  },
  {
    id: 'waerenga-link',
    roadWidth: 250,
    samplesPerSegment: 14,
    surfaceBands: SEALED,
    closed: false,
    anchors: [
      // Waerenga Road gives a second connection from the old highway side to
      // the direct Riverbank route.
      { x: 9000, y: 8200 },
      { x: 8350, y: 8200 },
      { x: 7600, y: 8000 },
    ],
  },
  {
    id: 'rangiuru-town-link',
    roadWidth: 245,
    samplesPerSegment: 12,
    surfaceBands: SEALED,
    closed: false,
    anchors: [
      // The old centre and direct route meet again around Rangiuru Road.
      { x: 5000, y: 9200 },
      { x: 4900, y: 9000 },
      { x: 4800, y: 8750 },
    ],
  },
  {
    id: 'beach-grid-link',
    roadWidth: 240,
    samplesPerSegment: 14,
    surfaceBands: SEALED,
    closed: false,
    anchors: [
      // A small beach-town grid lets the player swap between Tasman Road and
      // Rangiuru / Marine Parade close to the finish.
      { x: 2700, y: 8150 },
      { x: 2750, y: 8650 },
      { x: 2850, y: 9150 },
      { x: 3000, y: 9500 },
    ],
  },
];

export const OTAKI_GEOMETRY = {
  anchors: PRIMARY_ANCHORS,
  branches: BRANCHES,
  roadWidth: 280,
  samplesPerSegment: 20,
  numCheckpoints: 8,
  // Every required gate except the finish is before the town network splits.
  // Any realistic route through Ōtaki therefore remains a valid rally route.
  checkpointFractions: [0, 0.1, 0.21, 0.34, 0.46, 0.51, 0.556, 1],
  closed: false,
  // Only the upper gorge is gravel. DOC describes the final five kilometres to
  // the Forks as unsealed; the lower gorge, town and beach roads are sealed.
  surfaceBands: [
    { type: 'gravel', until: 0.22 },
    { type: 'sealed', until: 1 },
  ],
  elevation: {
    // The Tasman lies west of Marine Parade. The authored theme adds the visible
    // beach strip; this fixed-level region keeps the terrain beneath it flat.
    sea: [{ x: -2200, y: -800, w: 2850, h: 12600, level: 0 }],
    // Checkpoint 6 is the Ōtaki River bridge, immediately before route choice.
    river: { cp: 6, halfWidth: 165, halfLength: 1750, drop: 58 },
    profile: [
      { at: 0, h: 520 },
      { at: 0.12, h: 440 },
      { at: 0.25, h: 300 },
      { at: 0.42, h: 145 },
      { at: 0.52, h: 42 },
      { at: 0.7, h: 18 },
      { at: 1, h: 8 },
    ],
  },
};
