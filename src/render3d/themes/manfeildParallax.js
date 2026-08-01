// The Manawatū beyond the circuit fence.
//
// Manfeild sits on flat farmland outside Feilding, and what makes that skyline
// recognisable is two things: the long wall of the Tararua and Ruahine ranges
// across the eastern horizon, and — on a clear day, away to the north-west —
// Mount Taranaki standing on its own above everything.
//
// Between the ranges and the track is farmland, so the middle distance is
// shelter belts: the dark, hard-edged rows of macrocarpa and poplar that every
// Manawatū paddock boundary has. They are what gives the circuit trees on the
// horizon without putting a ring of collidable trunks around a course you are
// meant to drive flat out.
//
// The route runs the long way along X, so unlike Eastbourne's bands these run
// along X too, with the ranges behind one long side and Taranaki off the other.
import { BoxGeometry, ConeGeometry, Group, Mesh, MeshBasicMaterial, SphereGeometry } from 'three';
import { WORLD } from '../../config.js';
import { addCloud, markDecorative, ridge } from './parallax.js';

const COLOUR = {
  farRange: 0x8fa8bd, // Ruahine, furthest and hazed almost to sky
  nearRange: 0x6d8699, // Tararua, closer and a shade deeper
  taranaki: 0x9db4c6,
  taranakiSnow: 0xeef3f6,
  shelterFar: 0x6f8a5e,
  shelterNear: 0x40573c,
  paddockPale: 0xa9b878,
  paddockDeep: 0x8ea567,
  shedRust: 0x8d6a52,
  shedIron: 0x9aa39f,
  cloudWarm: 0xfff6e4,
  cloudShade: 0xe8dfcd,
  sun: 0xffe7a6,
};

// Every band spans well past the world on both ends: at 14,500 units wide the
// player can see along the straights to a point where a band that stopped at the
// world edge would visibly run out.
function span() {
  const W = WORLD.width;
  return { start: -W * 0.35, end: W * 1.35 };
}

// Where the farmland is allowed to start.
//
// Bands are placed off the *track's* bounding box, not off fractions of the
// world. The circuit fills z 0.15–0.84 of its world, so world fractions that
// look safely peripheral are not: a belt at 0.66 H lands across the infield, and
// a paddock at 0.8 H lands on the main straight. The margins below also clear
// the venue, which reaches roughly 700 units either side of the start/finish
// line. Bands ending up outside the world is fine and expected — this is
// background, and the ground quad already extends six times the world.
function bounds(track) {
  let near = Infinity;
  let far = -Infinity;
  for (const p of track.centerline) {
    if (p.y < near) near = p.y;
    if (p.y > far) far = p.y;
  }
  return { near: near - 900, far: far + 900 };
}

function addRanges(group, edge) {
  const { start, end } = span();

  // The Ruahine behind the Tararua: two bands, the far one paler and flatter.
  // Aerial perspective is doing the work here, not detail — a distant range
  // reads by being washed toward sky colour, which is also why these sit far
  // enough apart in tone to separate at a glance.
  group.add(
    ridge(
      {
        along: 'x',
        at: edge.far + 9600,
        start,
        end,
        segments: 54,
        bottom: -220,
        driftAt: (t) => Math.sin(t * Math.PI * 3.1) * 260 + Math.sin(t * Math.PI * 8.4) * 90,
        heightAt: (t) =>
          760 + Math.sin(t * Math.PI * 4.3 + 0.6) * 210 + Math.sin(t * Math.PI * 11) * 78,
      },
      COLOUR.farRange
    )
  );
  group.add(
    ridge(
      {
        along: 'x',
        at: edge.far + 5700,
        start,
        end,
        segments: 62,
        bottom: -220,
        driftAt: (t) => Math.sin(t * Math.PI * 4.6 + 1.2) * 190 + Math.sin(t * Math.PI * 12) * 70,
        heightAt: (t) =>
          560 + Math.sin(t * Math.PI * 6.1 + 1.4) * 175 + Math.sin(t * Math.PI * 15.5) * 62,
      },
      COLOUR.nearRange
    )
  );
}

// Mount Taranaki: a near-perfect lone cone, which is exactly why it survives
// this treatment. Its silhouette is the whole recognition, so it is one cone
// with a snow cap and nothing else.
function addTaranaki(group, edge) {
  const W = WORLD.width;
  const x = W * 0.17;
  const z = edge.near - 8600;

  const mountain = new Mesh(
    new ConeGeometry(1150, 1000, 22),
    new MeshBasicMaterial({ color: COLOUR.taranaki, fog: false })
  );
  mountain.position.set(x, 380, z);
  group.add(mountain);

  const snow = new Mesh(
    new ConeGeometry(345, 300, 22),
    new MeshBasicMaterial({ color: COLOUR.taranakiSnow, fog: false })
  );
  snow.position.set(x, 730, z);
  group.add(snow);
}

// Shelter belts. Rows of hard-edged blocks rather than individual trees: at this
// distance a macrocarpa row reads as one dark mass with a lumpy top, and drawing
// it as a ridge instead of hundreds of canopies costs two meshes.
function addShelterBelts(group, edge) {
  const { start, end } = span();

  for (const [at, height, colour, phase] of [
    [edge.far + 480, 122, COLOUR.shelterNear, 2.1],
    [edge.far + 1900, 150, COLOUR.shelterFar, 0.0],
    [edge.near - 520, 116, COLOUR.shelterNear, 3.4],
    [edge.near - 1850, 138, COLOUR.shelterFar, 1.1],
  ]) {
    group.add(
      ridge(
        {
          along: 'x',
          at,
          start,
          end,
          segments: 90,
          bottom: -60,
          driftAt: (t) => Math.sin(t * Math.PI * 9 + phase) * 120,
          // Square-ish tops with gaps: the sharp steps are gateways and paddock
          // corners, which is what stops the row reading as a hedge-shaped hill.
          heightAt: (t) => {
            const gate = Math.sin(t * Math.PI * 26 + phase) > 0.86 ? 0.12 : 1;
            return height * gate * (0.82 + Math.sin(t * Math.PI * 17 + phase) * 0.18);
          },
        },
        colour
      )
    );
  }
}

// Broad bands of pasture between the belts, in two greens, so the farmland does
// not read as one unbroken sheet of the same green all the way to the ranges.
//
// The y matters: these have to sit *above* road.js's GROUND_Y of -8 or the
// ground quad — which spans six times the world — hides them completely, and
// below ROAD_Y of 0 so they can never argue with the tarmac. -3 splits it.
function addPaddocks(group, edge) {
  const W = WORLD.width;
  const geometry = new BoxGeometry(W * 1.9, 4, 1500);

  for (const [z, colour] of [
    [edge.far + 1150, COLOUR.paddockPale],
    [edge.far + 2800, COLOUR.paddockDeep],
    [edge.near - 1200, COLOUR.paddockDeep],
    [edge.near - 2750, COLOUR.paddockPale],
  ]) {
    const paddock = new Mesh(geometry, new MeshBasicMaterial({ color: colour, fog: false }));
    paddock.position.set(W * 0.5, -3, z);
    group.add(paddock);
  }
}

// A few farm sheds out in the paddocks. Deliberately sparse and small: they give
// the horizon a sense of scale, and anything more would compete with the pit
// buildings that the player is actually meant to look at.
function addFarmSheds(group, edge) {
  const W = WORLD.width;
  const wall = new BoxGeometry(190, 78, 120);
  const roof = new BoxGeometry(205, 12, 134);
  const materials = [
    new MeshBasicMaterial({ color: COLOUR.shedRust, fog: false }),
    new MeshBasicMaterial({ color: COLOUR.shedIron, fog: false }),
  ];

  const spots = [
    [W * 0.12, edge.far + 1250],
    [W * 0.47, edge.far + 2400],
    [W * 0.81, edge.far + 1050],
    [W * 0.28, edge.near - 1300],
    [W * 0.69, edge.near - 2350],
  ];
  spots.forEach(([x, z], i) => {
    const shed = new Mesh(wall, materials[i % 2]);
    shed.position.set(x, 9, z);
    shed.rotation.y = (i % 3) * 0.22;
    group.add(shed);
    const top = new Mesh(roof, materials[(i + 1) % 2]);
    top.position.set(x, 52, z);
    top.rotation.y = shed.rotation.y;
    group.add(top);
  });
}

// High summer sky over the Manawatū: a small hard sun and scattered flat-bottomed
// cumulus, kept well above the ranges so they never tangle with the skyline.
function addSky(group, edge) {
  const W = WORLD.width;

  const sun = new Mesh(
    new SphereGeometry(120, 12, 8),
    new MeshBasicMaterial({ color: COLOUR.sun, fog: false })
  );
  sun.position.set(W * 0.72, 2100, edge.near - 6500);
  group.add(sun);

  addCloud(group, { x: W * 0.1, y: 1750, z: edge.far + 4200, scale: 190, colour: COLOUR.cloudWarm });
  addCloud(group, { x: W * 0.44, y: 1980, z: edge.far + 6100, scale: 150, colour: COLOUR.cloudShade });
  addCloud(group, { x: W * 0.86, y: 1680, z: edge.far + 3400, scale: 210, colour: COLOUR.cloudWarm });
  addCloud(group, { x: W * 0.26, y: 1880, z: edge.near - 5200, scale: 165, colour: COLOUR.cloudShade });
  addCloud(group, { x: W * 0.66, y: 1620, z: edge.near - 7000, scale: 195, colour: COLOUR.cloudWarm });
}

export function buildManfeildParallax(track) {
  const group = new Group();
  group.name = 'manfeild-parallax-backgrounds';
  const edge = bounds(track);

  addPaddocks(group, edge);
  addShelterBelts(group, edge);
  addFarmSheds(group, edge);
  addRanges(group, edge);
  addTaranaki(group, edge);
  addSky(group, edge);

  return markDecorative(group);
}
