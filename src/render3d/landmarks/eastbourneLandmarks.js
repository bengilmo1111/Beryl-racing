// Low-poly landmark models for Eastbourne Dash.
//
// Everything in this file is actual Three.js geometry. The only raster-like
// surfaces are code-drawn text labels, used on physical signboards so place
// names remain correctly spelled and editable. There are no generated images,
// baked renders, downloaded textures or imported 3D models.
import {
  Group,
  Mesh,
  BoxGeometry,
  CylinderGeometry,
  PlaneGeometry,
  DoubleSide,
  Box3,
} from 'three';
import { basic, lambert } from '../palette.js';
import { labelTexture } from '../textures.js';

const COLOURS = {
  wharfDeck: 0x747c80,
  wharfPile: 0x45413b,
  white: 0xf5f0df,
  cream: 0xe8d7ae,
  ink: 0x253a42,
  glass: 0x486b78,
  lawn: 0x71a95a,
  deepGreen: 0x416d47,
  paleBlue: 0xa9ced0,
  paleYellow: 0xe4cc83,
  fadedRed: 0xa85d52,
  dustyPink: 0xc99792,
  sage: 0x8fac8f,
  roofDark: 0x596267,
  roofGreen: 0x58705d,
  roofRed: 0x86564b,
  timber: 0xa78057,
  concrete: 0xb8b4aa,
  memorial: 0x8b8d87,
};

function box(w, h, d, x, y, z, material) {
  const mesh = new Mesh(new BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
}

function post(radius, height, x, y, z, material, sides = 8) {
  const mesh = new Mesh(new CylinderGeometry(radius, radius * 1.04, height, sides), material);
  mesh.position.set(x, y, z);
  return mesh;
}

function addGableRoof(group, width, depth, eaveY, rise, material, overhang = 14) {
  const halfRun = width / 2 + overhang;
  const slope = Math.hypot(halfRun, rise);
  const angle = Math.atan2(rise, halfRun);
  for (const side of [-1, 1]) {
    const panel = box(
      slope,
      7,
      depth + overhang * 2,
      side * halfRun / 2,
      eaveY + rise / 2,
      0,
      material
    );
    panel.rotation.z = side < 0 ? angle : -angle;
    group.add(panel);
  }
}

function addWindow(group, x, y, frontZ, width, height, trim, glass) {
  group.add(box(width + 10, height + 10, 5, x, y, frontZ, trim));
  group.add(box(width, height, 3, x, y, frontZ - 3, glass));
  group.add(box(width + 1, 3, 3, x, y, frontZ - 5, trim));
}

function addDoor(group, x, y, frontZ, width, height, trim, doorMat) {
  group.add(box(width + 10, height + 8, 5, x, y, frontZ, trim));
  group.add(box(width, height, 3, x, y, frontZ - 3, doorMat));
  group.add(box(4, 4, 3, x + width * 0.28, y, frontZ - 5, trim));
}

// Adds controlled, correctly spelled text to a physical 3D sign. The label is
// drawn at runtime by the same code path already used for course furniture.
function addLabelFace(group, text, width, height, y, frontZ, options = {}) {
  const { texture, aspect } = labelTexture(text, {
    color: options.color ?? '#fff8e7',
    background: options.background ?? '#15314b',
    fontSize: options.fontSize ?? 54,
    padX: 24,
    padY: 14,
    radius: 8,
  });
  const faceH = Math.min(height, width / aspect);
  const faceW = faceH * aspect;
  const face = new Mesh(
    new PlaneGeometry(faceW, faceH),
    basic(0xffffff, { map: texture, transparent: true, fog: true, side: DoubleSide })
  );
  face.position.set(0, y, frontZ);
  // Physical sign fronts in this kit face local -Z.
  face.rotation.y = Math.PI;
  group.add(face);
}

function buildRoadsideSign(text, width = 190, height = 66) {
  const group = new Group();
  const frame = lambert(COLOURS.white);
  const board = lambert(COLOURS.ink);
  const postH = 105;
  for (const x of [-width * 0.36, width * 0.36]) {
    group.add(box(8, postH, 8, x, postH / 2, 0, frame));
  }
  group.add(box(width + 12, height + 12, 10, 0, postH, 0, frame));
  group.add(box(width, height, 8, 0, postH, -2, board));
  addLabelFace(group, text, width - 10, height - 10, postH, -6.2, { fontSize: 48 });
  return group;
}

export function buildDaysBayWharf() {
  const group = new Group();
  group.name = 'days-bay-wharf';

  const deck = lambert(COLOURS.wharfDeck);
  const rails = lambert(COLOURS.white);
  const piles = lambert(COLOURS.wharfPile);
  const shelterWall = lambert(COLOURS.cream);
  const shelterRoof = lambert(COLOURS.roofDark);

  // Local origin is the beach end. The long stem runs straight out to sea along
  // local -X, perpendicular to Eastbourne's north-south shoreline.
  const stemLength = 560;
  const stemWidth = 78;
  const deckY = 18;
  group.add(box(stemLength, 16, stemWidth, -stemLength / 2, deckY, 0, deck));

  // The seaward ferry berth forms a clear T rather than a diagonal pier.
  const headWidth = 160;
  const headLength = 230;
  group.add(box(headWidth, 16, headLength, -stemLength, deckY, 0, deck));

  // Timber piles remain visible between the water and the deck. Fewer, thicker
  // piles give the right rhythm without turning into visual noise at chase view.
  for (let x = -50; x >= -stemLength; x -= 78) {
    for (const z of [-stemWidth * 0.34, stemWidth * 0.34]) {
      group.add(post(7, 52, x, -4, z, piles));
    }
  }
  for (const x of [-stemLength - headWidth * 0.38, -stemLength + headWidth * 0.38]) {
    for (const z of [-headLength * 0.38, headLength * 0.38]) {
      group.add(post(8, 54, x, -5, z, piles));
    }
  }

  // White railings are the landmark's strongest colour cue.
  const railY = deckY + 34;
  for (const z of [-stemWidth / 2 + 4, stemWidth / 2 - 4]) {
    group.add(box(stemLength - 18, 5, 5, -stemLength / 2 + 4, railY + 10, z, rails));
    for (let x = -12; x >= -stemLength + 8; x -= 48) {
      group.add(box(5, 46, 5, x, railY - 9, z, rails));
    }
  }

  // Rail the outer edge and ends of the T-head, leaving berth gaps beside the
  // shelter so the shape still reads as a working ferry wharf.
  const outerX = -stemLength - headWidth / 2 + 4;
  group.add(box(5, 5, headLength - 8, outerX, railY + 10, 0, rails));
  for (let z = -headLength / 2 + 10; z <= headLength / 2 - 10; z += 48) {
    group.add(box(5, 46, 5, outerX, railY - 9, z, rails));
  }
  for (const z of [-headLength / 2 + 4, headLength / 2 - 4]) {
    group.add(box(headWidth - 8, 5, 5, -stemLength, railY + 10, z, rails));
    for (const x of [-stemLength - 58, -stemLength, -stemLength + 58]) {
      group.add(box(5, 46, 5, x, railY - 9, z, rails));
    }
  }

  // Small waiting shelter on the T-head. It stays open and simple so the wharf
  // silhouette, not architectural detail, remains dominant.
  const shelter = new Group();
  const shelterX = -stemLength + 12;
  for (const x of [-42, 42]) {
    for (const z of [-38, 38]) shelter.add(box(7, 78, 7, x, 57, z, rails));
  }
  shelter.add(box(96, 54, 8, 0, 52, 42, shelterWall));
  shelter.add(box(112, 8, 104, 0, 100, 0, shelterRoof));
  shelter.position.x = shelterX;
  group.add(shelter);

  // Broad beach-end steps clarify that the wharf connects to shore but is not a
  // route Beryl can enter.
  for (let i = 0; i < 3; i += 1) {
    group.add(box(92 + i * 12, 7, 22, 10 + i * 9, 5 + i * 5, 0, deck));
  }

  return group;
}

function buildParkShelter() {
  const group = new Group();
  const posts = lambert(COLOURS.white);
  const roof = lambert(COLOURS.roofGreen);
  const slab = lambert(COLOURS.concrete);
  group.add(box(170, 8, 120, 0, 4, 0, slab));
  for (const x of [-70, 70]) {
    for (const z of [-46, 46]) group.add(box(8, 112, 8, x, 56, z, posts));
  }
  addGableRoof(group, 190, 140, 112, 42, roof, 8);
  return group;
}

export function buildWilliamsPark() {
  const group = new Group();
  group.name = 'williams-park';
  const lawn = lambert(COLOURS.lawn);
  group.add(box(620, 4, 430, 0, 2, 0, lawn));

  const shelter = buildParkShelter();
  shelter.position.set(105, 4, 45);
  shelter.rotation.y = -0.1;
  group.add(shelter);

  const sign = buildRoadsideSign('WILLIAMS PARK', 245, 66);
  sign.position.set(-210, 4, -165);
  group.add(sign);

  // Low timber edging keeps the park readable as open public lawn rather than a
  // second driveable surface.
  const edge = lambert(COLOURS.timber);
  group.add(box(520, 10, 9, 0, 8, -210, edge));
  return group;
}

function shopMaterials(wall, roof) {
  return {
    wall: lambert(wall),
    roof: lambert(roof),
    trim: lambert(COLOURS.white),
    glass: lambert(COLOURS.glass),
    ink: lambert(COLOURS.ink),
    timber: lambert(COLOURS.timber),
  };
}

function buildShopModule({ width, depth, height, wall, roof, label, roofType = 'flat', doorSide = 1 }) {
  const group = new Group();
  const m = shopMaterials(wall, roof);
  const frontZ = -depth / 2 - 2;
  group.add(box(width, height, depth, 0, height / 2, 0, m.wall));

  if (roofType === 'gable') addGableRoof(group, width, depth, height, 45, m.roof, 12);
  else {
    group.add(box(width + 18, 10, depth + 18, 0, height + 5, 0, m.roof));
    group.add(box(width + 4, 28, 12, 0, height - 2, frontZ - 2, m.wall));
  }

  const doorX = doorSide * width * 0.29;
  addDoor(group, doorX, 42, frontZ, 32, 76, m.trim, m.ink);
  addWindow(group, -doorSide * width * 0.18, 50, frontZ, width * 0.42, 58, m.trim, m.glass);

  // Deep verandah/awning and posts establish the compact village-shop rhythm.
  const awning = box(width + 18, 7, 48, 0, height * 0.63, frontZ - 23, m.roof);
  awning.rotation.x = -0.08;
  group.add(awning);
  for (const x of [-width * 0.42, width * 0.42]) {
    group.add(box(6, height * 0.63, 6, x, height * 0.315, frontZ - 42, m.trim));
  }

  group.add(box(width - 24, 40, 8, 0, height * 0.82, frontZ - 6, m.ink));
  addLabelFace(group, label, width - 34, 30, height * 0.82, frontZ - 10.2, {
    fontSize: 42,
    background: '#15314b',
  });
  return group;
}

export function buildEastbourneShops() {
  const group = new Group();
  group.name = 'eastbourne-village-shops';
  const specs = [
    { width: 150, depth: 118, height: 126, wall: COLOURS.paleBlue, roof: COLOURS.roofDark, label: 'BAKERY', roofType: 'gable', doorSide: 1 },
    { width: 178, depth: 126, height: 146, wall: COLOURS.paleYellow, roof: COLOURS.roofRed, label: 'GROCER', roofType: 'flat', doorSide: -1 },
    { width: 164, depth: 122, height: 132, wall: COLOURS.dustyPink, roof: COLOURS.roofDark, label: 'TEA ROOMS', roofType: 'flat', doorSide: 1 },
    { width: 150, depth: 118, height: 122, wall: COLOURS.sage, roof: COLOURS.roofGreen, label: 'DAIRY', roofType: 'gable', doorSide: -1 },
  ];

  let cursor = 0;
  for (const spec of specs) {
    const shop = buildShopModule(spec);
    shop.position.x = cursor + spec.width / 2;
    group.add(shop);
    cursor += spec.width + 8;
  }

  // Re-centre the row around its origin and add a continuous footpath.
  const totalWidth = cursor - 8;
  for (const child of group.children) child.position.x -= totalWidth / 2;
  group.add(box(totalWidth + 70, 7, 72, 0, 3.5, -96, lambert(COLOURS.concrete)));

  return group;
}

export function buildRonaBayCue() {
  const group = new Group();
  group.name = 'rona-bay-cue';

  const shelter = new Group();
  const wall = lambert(COLOURS.paleBlue);
  const trim = lambert(COLOURS.white);
  const roof = lambert(COLOURS.roofRed);
  shelter.add(box(126, 78, 92, 0, 39, 0, wall));
  addGableRoof(shelter, 136, 102, 78, 34, roof, 8);
  addDoor(shelter, 0, 32, -48, 34, 58, trim, lambert(COLOURS.ink));
  shelter.position.set(95, 0, 20);
  group.add(shelter);

  const sign = buildRoadsideSign('RONA BAY', 180, 60);
  sign.position.set(-80, 0, -45);
  group.add(sign);
  return group;
}

export function buildEastbourneRSA() {
  const group = new Group();
  group.name = 'eastbourne-rsa';
  const wall = lambert(COLOURS.cream);
  const trim = lambert(COLOURS.white);
  const roof = lambert(COLOURS.roofGreen);
  const glass = lambert(COLOURS.glass);
  const door = lambert(COLOURS.fadedRed);
  const concrete = lambert(COLOURS.concrete);
  const memorial = lambert(COLOURS.memorial);

  const width = 390;
  const depth = 230;
  const wallH = 150;
  const frontZ = -depth / 2 - 2;
  group.add(box(width, wallH, depth, 0, wallH / 2, 0, wall));
  addGableRoof(group, width, depth, wallH, 86, roof, 18);

  // Central entry projects toward the finish approach.
  group.add(box(168, 102, 72, 0, 51, frontZ - 32, wall));
  addGableRoof(group, 176, 82, 102, 46, roof, 10);
  addDoor(group, -31, 42, frontZ - 70, 46, 76, trim, door);
  addDoor(group, 31, 42, frontZ - 70, 46, 76, trim, door);

  for (const x of [-145, -82, 82, 145]) addWindow(group, x, 72, frontZ, 42, 62, trim, glass);

  // Controlled sign face, large enough to read before the finish.
  group.add(box(240, 48, 10, 0, 127, frontZ - 72, lambert(COLOURS.ink)));
  addLabelFace(group, 'EASTBOURNE RSA', 226, 38, 127, frontZ - 77.2, {
    fontSize: 44,
    background: '#15314b',
  });

  // Modest forecourt and memorial cues keep this a community destination rather
  // than a professional race venue.
  group.add(box(330, 6, 126, 0, 3, frontZ - 104, concrete));
  group.add(box(42, 54, 26, -175, 27, frontZ - 82, memorial));
  group.add(box(54, 8, 34, -175, 58, frontZ - 82, trim));
  group.add(post(4, 215, 178, 107.5, frontZ - 72, trim, 10));

  return group;
}

// Clear air between the kerb and the nearest corner of a landmark.
const SHOULDER = 90;

// Nearest centreline sample to a point, and the outward direction from the road
// toward it — which is the side of the road the landmark was authored on.
function roadSideAt(track, x, z) {
  let best = Infinity;
  let c = track.centerline[0];
  for (const p of track.centerline) {
    const d = Math.hypot(p.x - x, p.y - z);
    if (d < best) {
      best = d;
      c = p;
    }
  }
  let dx = x - c.x;
  let dz = z - c.y;
  const len = Math.hypot(dx, dz) || 1;
  return { c, dx: dx / len, dz: dz / len };
}

// Closest a model's footprint comes to the road, measuring the whole route
// rather than just the point it was seated against.
//
// `box` is a world-space AABB, so the exact point-to-rectangle distance is a
// couple of clamps. Using the AABB rather than the geometry is deliberately
// conservative: it over-estimates the footprint, which errs toward more
// clearance, never less.
function footprintClearance(track, box) {
  let worst = Infinity;
  for (const p of track.centerline) {
    const ox = Math.max(box.min.x - p.x, 0, p.x - box.max.x);
    const oz = Math.max(box.min.z - p.y, 0, p.y - box.max.z);
    const d = Math.hypot(ox, oz);
    if (d < worst) worst = d;
  }
  return worst;
}

// Seat a landmark at its authored roadside coordinate, set back off the
// carriageway by its own footprint.
//
// The authored point in `def.landmarks` is where a *sign* stood — right at the
// roadside. A building on that point would sit in the road, so the model is
// pushed outward along the road normal until it clears the kerb by SHOULDER.
//
// The push is iterative, and it has to be. A single perpendicular setback is
// only correct where the road is straight: these models are 400–740 units wide,
// they sit parallel to the tangent at their anchor, and Eastbourne's road curves
// away underneath them — so the far end of a wide model swings back over the
// carriageway even though the near corner cleared. Measuring the whole footprint
// against the whole centreline and pushing again is what catches that. The
// village shops needed 163 units more than the flat calculation gave them, and
// the RSA 74.
//
// Everything is expressed in terms of `track.half` and the model's own bounding
// box, so this survives both a reshaped model and a change of road width.
function placeAtLandmark(model, track, terrain, anchor, { yOffset = 2, flip = false } = {}) {
  const side = roadSideAt(track, anchor.x, anchor.z);
  const c = side.c;
  const dx = flip ? -side.dx : side.dx;
  const dz = flip ? -side.dz : side.dz;
  const wanted = track.half + SHOULDER;

  // Model fronts face local -Z, so the frontmost geometry is at box.min.z.
  let setback = wanted - new Box3().setFromObject(model).min.z;

  const seat = () => {
    const x = c.x + dx * setback;
    const z = c.y + dz * setback;
    // Aim the front back at the road, not at the camera.
    model.rotation.y = Math.atan2(-(c.x - x), -(c.y - z));
    model.position.set(x, terrain.heightAt(x, z) + yOffset, z);
    model.updateMatrixWorld(true);
  };

  seat();
  for (let i = 0; i < 8; i++) {
    const deficit = wanted - footprintClearance(track, new Box3().setFromObject(model));
    if (deficit <= 1) break;
    setback += deficit + 4;
    seat();
  }
  return model;
}

export function buildEastbourneLandmarks(track, def, terrain, { shoreX, seaLevel = 0 } = {}) {
  const group = new Group();
  group.name = 'eastbourne-landmarks';

  // Landmark positions come from `def.landmarks` — the same authored list the
  // roadside signs are built from — rather than from a second set of world
  // proportions. That matters: signs.js suppresses the freestanding board for
  // any name a model carries, so if the two disagreed the name would silently
  // move to wherever the model happened to be. One source of truth also means
  // these follow any re-authoring of the route, and any change to LENGTH_SCALE,
  // for free.
  const at = (name) => {
    const found = (def.landmarks || []).find(([, , text]) => text === name);
    return found ? { x: found[0], z: found[1] } : null;
  };

  const wharfAnchor = at('DAYS BAY WHARF');
  if (wharfAnchor) {
    // The wharf is the one landmark that is not seated off the road: it has to
    // stand in the harbour. It keeps the shoreline's x and takes only its z from
    // the authored point, so it lines up with its own roadside sign.
    const wharf = buildDaysBayWharf();
    wharf.position.set(shoreX - 8, seaLevel + 2, wharfAnchor.z);
    group.add(wharf);
  }

  for (const [name, build, opts] of [
    ['WILLIAMS PARK', buildWilliamsPark, {}],
    // Rona Bay's name marker is authored on the seaward side, but the strip
    // between the road and the seawall is only about 320 units wide — narrower
    // than this shelter once it has been set back off the carriageway, so
    // honouring that side buries it inside the seawall mesh. It goes inland
    // instead; the name is what the landmark is for, and it is unchanged.
    ['RONA BAY', buildRonaBayCue, { flip: true }],
    ['EASTBOURNE VILLAGE', buildEastbourneShops, {}],
    ['EASTBOURNE RSA', buildEastbourneRSA, {}],
  ]) {
    const anchor = at(name);
    if (anchor) group.add(placeAtLandmark(build(), track, terrain, anchor, opts));
  }

  return group;
}
