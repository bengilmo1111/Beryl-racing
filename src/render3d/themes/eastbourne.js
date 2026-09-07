import { buildPavedAreas } from '../road.js';
import { rsaArrival } from '../../arrival.js';
// Eastbourne Dash environment: Wellington Harbour, the narrow beach strip,
// steep bush hills and a recognisable run of mostly white seaside buildings.
//
// Signs belong to buildings and the park entrance. The
// place is communicated through geography and architecture: Ferry Road drops
// hard to the coast, Marine Drive follows the beach, the village thickens around
// the shops and school, and several streets converge on the RSA.
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  PlaneGeometry,
  CanvasTexture,
  SRGBColorSpace,
  DoubleSide,
  BufferGeometry,
  Float32BufferAttribute,
} from 'three';
import { WORLD } from '../../config.js';
import { EASTBOURNE_LAYOUT } from '../../eastbourneRoute.js';
import { basic, lambert } from '../palette.js';
import { eastbourneCoast } from '../../coast.js';
import { resolvePlace, resolvePlaces } from '../../places.js';
import { metres } from '../../scale.js';
import { buildEastbourneVilla, villaPalette } from '../houses.js';
import { ridge } from './parallax.js';
import { bakeStatic } from '../bake.js';
import { buildEastbourneParallax } from './eastbourneParallax.js';
import { seawallGeometry, harbourGeometry } from '../coastalGeometry.js';
import { visualCoast } from '../../coastalProfile.js';

const COLOUR = {
  water: 0x55b3d2,
  shallow: 0x78c7dc,
  sand: 0xe8d5a5,
  foam: 0xfff1d1,
  concrete: 0xb9b6ad,
  white: 0xf6f2e8,
  warmWhite: 0xeee6d5,
  paleBlue: 0xdce8ea,
  roofDark: 0x4d585d,
  roofGreen: 0x536f60,
  roofRed: 0x8f554a,
  glass: 0x496b78,
  timber: 0x92704f,
  lawn: 0x72ad5e,
  hill: 0x4c8b52,
  hillDark: 0x326b43,
  bush: 0x275d3b,
  trunk: 0x73583f,
};

function box(w, h, d, material) {
  return new Mesh(new BoxGeometry(w, h, d), material);
}

function addSegment(group, a, b, width, height, y, material) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = Math.hypot(dx, dz);
  const mesh = box(width, height, length, material);
  mesh.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2);
  mesh.rotation.y = Math.atan2(dx, dz);
  group.add(mesh);
  return mesh;
}

function placeAtGround(object, terrain, x, z, yOffset = 1) {
  object.position.set(x, terrain.heightAt(x, z) + yOffset, z);
  return object;
}

// The harbour, drawn from the same walk the seawall is built from.
//
// This used to lay a flat sand ribbon and a flat water plane over ground that
// was neither flat nor at that height, against an authored shoreline that the
// rescale had left hundreds of metres out to sea. Both problems go away by
// drawing what the terrain actually does: the ground ramps from the road down
// to sea level across the beach, render3d/ground.js tints that ramp to sand as
// it approaches the water, and all that is needed here is the water itself, a
// line of foam where it meets the sand, and the low wall at the road edge.
function addCoast(group, terrain, track) {
  const sea = terrain.seaLevel || 0;
  const { points, wall } = visualCoast(track);

  // Open water, out past anything the camera can reach. Anchored on the derived
  // shoreline rather than on fractions of the world, so it arrives at the beach
  // instead of near it.
  const reach = Math.max(WORLD.width, WORLD.height) * 2.2;
  const water = new Mesh(harbourGeometry(track, reach), basic(COLOUR.water, { fog: true }));
  water.position.y = sea + 2;
  group.add(water);

  const shallow = lambert(COLOUR.shallow);
  const foam = basic(COLOUR.foam, { fog: true });
  for (let i = 0; i < points.length - 1; i += 1) {
    // An inshore shelf, then the foam line right on the sand.
    addSegment(group, points[i], points[i + 1], metres(9), 7, sea + 3, shallow);
    addSegment(group, points[i], points[i + 1], metres(1.1), 4, sea + 5, foam);
  }

  // The low wall along the seaward edge of the road. Its collision circles are
  // placed by RaceScene.placeSeawall from the same `wall` polyline.
  const concrete = lambert(COLOUR.concrete);
  group.add(new Mesh(seawallGeometry(wall, terrain), concrete));
}

// Days Bay Wharf, projecting from wherever the beach actually is.
//
// `shoreX` was a single authored number for the whole coast, which stopped being
// true the moment the shoreline started following the road. The wharf now finds
// the coast point nearest its own z and starts there, so it meets the beach at
// the top and reaches open water at the T whatever the road does.
function shoreXAt(coast, z) {
  let best = coast.points[0];
  let bestGap = Infinity;
  for (const p of coast.points) {
    const gap = Math.abs(p.z - z);
    if (gap < bestGap) {
      bestGap = gap;
      best = p;
    }
  }
  return best.x;
}

function addWharf(group, terrain, track) {
  const z = resolvePlace(track, EASTBOURNE_LAYOUT.places.wharf).z;
  const shoreX = shoreXAt(eastbourneCoast(track), z);
  const sea = terrain.seaLevel || 0;
  const deck = lambert(0x72797c);
  const white = lambert(COLOUR.white);
  const piles = lambert(0x4d443b);

  // Days Bay Wharf: the stem projects at right angles from the beach and ends
  // in a clear T. White railings are its strongest recognisable colour cue.
  const length = metres(65);
  const width = metres(3.2);
  const deckY = sea + metres(2.1);
  const stem = box(length, metres(0.3), width, deck);
  stem.position.set(shoreX - length / 2, deckY, z);
  group.add(stem);
  const head = box(metres(9), metres(0.3), metres(17), deck);
  head.position.set(shoreX - length, deckY, z);
  group.add(head);
  for (let x = shoreX - metres(2); x > shoreX - length; x -= metres(4)) {
    for (const dz of [-width * 0.42, width * 0.42]) {
      const pile = new Mesh(new CylinderGeometry(10, 13, metres(3.3), 8), piles);
      pile.position.set(x, sea + metres(0.55), z + dz);
      group.add(pile);
      const post = box(8, metres(1.05), 8, white);
      post.position.set(x, deckY + metres(0.6), z + dz);
      group.add(post);
    }
  }
  for (const dz of [-width * 0.42, width * 0.42]) {
    for (const h of [0.5, 1.05]) {
      const rail = box(length, 7, 7, white);
      rail.position.set(shoreX - length / 2, deckY + metres(h), z + dz);
      group.add(rail);
    }
  }
  for (const dz of [-metres(8), metres(8)]) {
    const rail = box(metres(9), 7, 7, white);
    rail.position.set(shoreX - length, deckY + metres(1.05), z + dz);
    group.add(rail);
  }
  // A small cream-and-red harbour ferry gives the wharf its purpose and scale.
  const ferry = new Group();
  const hull = box(metres(4.5), metres(1.5), metres(14), lambert(0xeee5cd));
  hull.position.y = metres(0.45);
  ferry.add(hull);
  const cabin = box(metres(3.8), metres(1.8), metres(8), white);
  cabin.position.y = metres(2);
  ferry.add(cabin);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const pane = box(4, metres(0.7), metres(1), lambert(COLOUR.glass));
      pane.position.set(side * metres(1.93), metres(2.2), metres(-3 + i * 1.5));
      ferry.add(pane);
    }
  }
  const roof = box(metres(4.2), metres(0.25), metres(9), lambert(COLOUR.roofRed));
  roof.position.y = metres(3.05);
  ferry.add(roof);
  ferry.position.set(shoreX - length - metres(8), sea + 4, z);
  group.add(ferry);

}

function addNorfolkPine(group, terrain, x, z, scale = 1) {
  const root = new Group();
  const trunk = new Mesh(new CylinderGeometry(10 * scale, 15 * scale, 180 * scale, 8), lambert(COLOUR.trunk));
  trunk.position.y = 90 * scale;
  root.add(trunk);
  for (let i = 0; i < 5; i += 1) {
    const canopy = new Mesh(
      new ConeGeometry((72 - i * 10) * scale, 72 * scale, 9),
      lambert(i % 2 ? COLOUR.bush : COLOUR.hillDark)
    );
    canopy.position.y = (165 + i * 45) * scale;
    root.add(canopy);
  }
  placeAtGround(root, terrain, x, z, 1);
  group.add(root);
}

// Norfolk pines punctuate the shore without becoming a continuous forest.
//
// Spaced along the derived coast rather than at authored points: they are a
// feature *of the shore*, so if the shore moves they move with it. The authored
// x they used to carry put them on the beach in the world this file was written
// for and out in the harbour in the one it renders now.
function addCoastalPines(group, terrain, track, structures) {
  const { wall } = eastbourneCoast(track);
  // Put pines on the inland verge across the road, not 9 m from the water.
  const count = 9;
  for (let i = 0; i < count; i++) {
    const at = wall[Math.round((0.1 + i / (count - 1) * 0.8) * (wall.length - 1))];
    if (!at) continue;
    let closest = null, distance = Infinity;
    for (const road of track.roads) for (const p of road.centerline) {
      const d = Math.hypot(p.x - at.x, p.y - at.z);
      if (d < distance) { closest = { p, road }; distance = d; }
    }
    const { p, road } = closest;
    const length = Math.hypot(p.x - at.x, p.y - at.z) || 1;
    const setback = road.half + metres(8);
    const x = p.x + (p.x - at.x) / length * setback;
    const z = p.y + (p.y - at.z) / length * setback;
    // These decorative trees have no collider; keep them clear of buildings.
    if (structures.some(s => Math.hypot(s.x - x, s.z - z) < Math.hypot(s.w, s.d) / 2 + metres(4))) continue;
    if (track.roads.some(r => r.centerline.some(p => Math.hypot(p.x - x, p.y - z) < r.half + metres(3)))) continue;
    addNorfolkPine(group, terrain, x, z, 0.86 + (i % 3) * 0.08);
  }
}

function addHills(group, terrain, track) {
  // A continuous folded bush slope, tied to the road rather than world fractions.
  // The first row sits beyond the settlement; no decorative hill crosses a road.
  const points = track.centerline.filter((_, i) => i % 8 === 0);
  const positions = [];
  const indices = [];
  points.forEach((p, i) => {
    const wave = Math.sin(i * 0.53) * 0.5 + Math.sin(i * 1.31) * 0.2;
    for (const [offset, height] of [[80, 0], [160, 70], [260, 125], [390, 95]]) {
      const inlandEdge = Math.max(p.x, ...track.roads.flatMap(road =>
        road.centerline.filter(q => Math.abs(q.y - p.y) < metres(90)).map(q => q.x + road.half)));
      const x = inlandEdge + metres(offset);
      positions.push(x, terrain.heightAt(x, p.y) + metres(height * (1 + wave * 0.22)), p.y);
    }
    if (i > 0) for (let c = 0; c < 3; c++) {
      const a = (i - 1) * 4 + c, b = i * 4 + c;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  group.add(new Mesh(geometry, lambert(0x46765a, { side: DoubleSide, flatShading: true })));
  group.add(ridge({ at: WORLD.width * 0.82, start: -WORLD.height * 0.2,
    end: WORLD.height * 1.2, segments: 64, bottom: -200,
    driftAt: t => metres(50) * Math.sin(t * 21),
    heightAt: t => metres(185 + 45 * Math.sin(t * 24) + 18 * Math.sin(t * 51)),
  }, 0x638573));
}

// Painted, physical signs. Text is authored here and remains crisp on a phone.
function nameboard(text, width, height, colour = '#315b51') {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = Math.round(1024 * height / width);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#f4edda';
  ctx.lineWidth = 8;
  ctx.strokeRect(9, 9, canvas.width - 18, canvas.height - 18);
  ctx.fillStyle = '#f4edda';
  ctx.font = `bold ${Math.round(canvas.height * 0.49)}px Georgia`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 512, canvas.height * 0.52, 960);
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  const sign = new Mesh(new PlaneGeometry(width, height), basic(0xffffff, { map, side: DoubleSide, fog: true }));
  sign.name = text;
  return sign;
}

// Houses come from the resolved structure list, not from a copy of the
// positions: those footprints are what the car collides with, and they have
// already been pushed clear of the roads, so placing a model anywhere else would
// put the visible house and its solid footprint in different places.
//
// Baked into one mesh at the end. A villa is about twenty boxes and there are
// 270 of them along Marine Drive, which is 5,400 draw calls a frame for a street
// that never moves — see render3d/bake.js.
function addHouses(group, terrain, structures) {
  const street = new Group();
  for (const s of structures) {
    if (s.kind !== 'villa') continue;
    const house = buildEastbourneVilla({
      variant: s.variant,
      palette: villaPalette(s.palette),
    });
    house.scale.setScalar(s.scale || 1);
    placeAtGround(house, terrain, s.x, s.z, 1);
    house.rotation.y = s.yaw;
    street.add(house);
    // A doorstep path connects each verandah to its own plot, seated on terrain.
    const path = box(metres(0.9), 3, metres(2.2), lambert(COLOUR.concrete));
    const d = s.d / 2 + metres(0.5);
    placeAtGround(path, terrain, s.x - Math.sin(s.yaw) * d, s.z - Math.cos(s.yaw) * d, 2);
    path.rotation.y = s.yaw;
    street.add(path);
  }
  const baked = bakeStatic(street);
  group.add(baked || street);
}

function simpleGableBuilding(width, depth, wallHeight, wallColour, roofColour) {
  const root = new Group();
  const wall = box(width, wallHeight, depth, lambert(wallColour));
  wall.position.y = wallHeight / 2;
  root.add(wall);
  const roof = new Mesh(new ConeGeometry(Math.hypot(width / 2, 65), 92, 4), lambert(roofColour));
  roof.position.y = wallHeight + 34;
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = depth / width;
  root.add(roof);
  return root;
}

function addWindowBand(group, width, y, z) {
  const trim = lambert(COLOUR.white);
  const glass = lambert(COLOUR.glass);
  for (let x = -width * 0.36; x <= width * 0.36; x += width * 0.24) {
    const frame = box(58, 54, 6, trim);
    frame.position.set(x, y, z);
    group.add(frame);
    const pane = box(48, 44, 4, glass);
    pane.position.set(x, y, z - 4);
    group.add(pane);
  }
}

function addVillage(group, terrain, structures, track) {
  // Resolved against the road, like the footprints in structures.js. These are
  // route-relative specs now, not coordinates: reading `.x` off one gives
  // undefined, which places a lawn at NaN and draws nothing at all — silently,
  // because a mesh at NaN is simply never rasterised.
  const places = resolvePlaces(track, EASTBOURNE_LAYOUT.places);
  // Same rule as the houses: the resolved footprint is the truth. Flat ground
  // decoration (the park lawn, the school field) is not solid and stays keyed to
  // the place rather than to the building's pushed-clear footprint.
  const at = (kind) => structures.find((s) => s.kind === kind);

  // Open green at Williams Park, a major break in the otherwise built-up edge.
  const lawnGeometry = new PlaneGeometry(metres(38), metres(65), 16, 24);
  lawnGeometry.rotateX(-Math.PI / 2);
  const vertices = lawnGeometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i) + places.williamsPark.x;
    const z = vertices.getZ(i) + places.williamsPark.z;
    vertices.setXYZ(i, x, terrain.heightAt(x, z) + 2, z);
  }
  lawnGeometry.computeVertexNormals();
  group.add(new Mesh(lawnGeometry, lambert(COLOUR.lawn)));
  const entrance = resolvePlace(track, { road: 'primary', at: 0.235, offsetMetres: -10 });
  const parkSign = nameboard('WILLIAMS PARK', metres(3.5), metres(0.65));
  placeAtGround(parkSign, terrain, entrance.x, entrance.z, metres(1.65));
  parkSign.rotation.y = entrance.facing + Math.PI;
  for (const x of [-metres(1.5), metres(1.5)]) {
    const post = box(8, metres(1.9), 8, lambert(COLOUR.white));
    post.position.set(x, -metres(0.7), 0);
    parkSign.add(post);
  }
  group.add(parkSign);
  const shelterAt = at('shelter');
  const shelter = simpleGableBuilding(190, 135, 95, COLOUR.white, COLOUR.roofGreen);
  placeAtGround(shelter, terrain, shelterAt.x, shelterAt.z, 4);
  shelter.rotation.y = shelterAt.yaw;
  const pavilionSign = nameboard('DAYS BAY', 175, 34);
  pavilionSign.position.set(0, 85, -70);
  pavilionSign.rotation.y = Math.PI;
  shelter.add(pavilionSign);
  group.add(shelter);

  // Doctors / clinic: a low white civic-looking building immediately north of
  // the shops, matching the H marker relationship in the supplied map.
  const clinicAt = at('clinic');
  const clinic = simpleGableBuilding(430, 210, 130, COLOUR.white, COLOUR.roofDark);
  placeAtGround(clinic, terrain, clinicAt.x, clinicAt.z, 2);
  clinic.rotation.y = clinicAt.yaw;
  addWindowBand(clinic, 330, 72, -110);
  group.add(clinic);

  // Eastbourne's shops are grouped in one continuous strip between the clinic
  // and Muritai School. No shop names are drawn; awnings, glazed fronts and the
  // denser building rhythm do the work.
  const shopRoot = new Group();
  const shopWidths = [150, 175, 160, 185, 155];
  let cursor = -shopWidths.reduce((a, b) => a + b, 0) / 2 - 16;
  shopWidths.forEach((width, i) => {
    const module = box(width, 135 + (i % 2) * 18, 150, lambert(i === 2 ? COLOUR.paleBlue : COLOUR.white));
    module.position.set(cursor + width / 2, module.geometry.parameters.height / 2, 0);
    shopRoot.add(module);
    const roof = box(width + 12, 10, 164, lambert(i % 2 ? COLOUR.roofRed : COLOUR.roofDark));
    roof.position.set(cursor + width / 2, module.geometry.parameters.height + 5, 0);
    shopRoot.add(roof);
    const window = box(width * 0.58, 63, 7, lambert(COLOUR.glass));
    window.position.set(cursor + width * 0.42, 52, -79);
    shopRoot.add(window);
    const awning = box(width + 8, 8, 54, lambert(i % 2 ? COLOUR.roofGreen : COLOUR.roofRed));
    awning.position.set(cursor + width / 2, 92, -102);
    shopRoot.add(awning);
    cursor += width + 8;
  });
  const footpath = box(900, 7, 105, lambert(COLOUR.concrete));
  footpath.position.set(0, 3.5, -128);
  shopRoot.add(footpath);
  const shopsAt = at('shops');
  placeAtGround(shopRoot, terrain, shopsAt.x, shopsAt.z, 2);
  shopRoot.rotation.y = shopsAt.yaw;
  group.add(shopRoot);

  // Muritai School: a spread-out white classroom block and open field directly
  // south of the shops.
  const schoolField = box(760, 4, 520, lambert(COLOUR.lawn));
  placeAtGround(schoolField, terrain, places.school.x, places.school.z, 2);
  group.add(schoolField);
  const schoolAt = at('school');
  const school = simpleGableBuilding(620, 190, 122, COLOUR.white, COLOUR.roofGreen);
  placeAtGround(school, terrain, schoolAt.x, schoolAt.z, 5);
  school.rotation.y = schoolAt.yaw;
  addWindowBand(school, 500, 66, -100);
  group.add(school);

  // RSA destination: a broad white community hall with green roof and a paved
  // forecourt. It remains recognisable as a finish building without a text sign.
  const rsaAt = at('rsa');
  const rsa = simpleGableBuilding(metres(26), metres(12), metres(4.5), COLOUR.warmWhite, COLOUR.roofGreen);
  placeAtGround(rsa, terrain, rsaAt.x, rsaAt.z, 2);
  rsa.rotation.y = rsaAt.yaw;
  addWindowBand(rsa, metres(20), metres(1.8), -metres(6) - 5);
  const rsaSign = nameboard('EASTBOURNE RSA', metres(15), metres(1));
  rsaSign.position.set(0, metres(3.5), -metres(6) - 8);
  rsaSign.rotation.y = Math.PI;
  rsa.add(rsaSign);
  group.add(rsa);
  const arrival = rsaArrival(track);
  group.add(buildPavedAreas(track));
  const paint = basic(COLOUR.white, { fog: true });
  const stripe = (x1, z1, x2, z2) => {
    const p = arrival.point(x1, z1), q = arrival.point(x2, z2);
    addSegment(group, { x: p.x, z: p.y }, { x: q.x, z: q.y },
      metres(0.12), 1, arrival.h + 2, paint);
  };
  // Parking bays frame a clear central arrival lane.
  for (let z = -29; z <= -20; z += 3) stripe(8, z, 14, z);
  stripe(8, -29, 8, -20);
  stripe(-3.3, -3, 3.3, -3);
  const welcome = nameboard('RSA • FINISH', metres(7), metres(1));
  const signAt = arrival.point(-8, -9);
  welcome.position.set(signAt.x, arrival.h + metres(2.5), signAt.y);
  welcome.rotation.y = arrival.yaw + Math.PI;
  group.add(welcome);

}

export function buildEastbourne(track, def, terrain, structures = []) {
  const group = new Group();
  group.name = 'eastbourne-layout-environment';

  addCoast(group, terrain, track);
  const wharf = new Group();
  addWharf(wharf, terrain, track);
  group.add(bakeStatic(wharf) || wharf);
  addCoastalPines(group, terrain, track, structures);
  addHills(group, terrain, track);
  addHouses(group, terrain, structures);
  addVillage(group, terrain, structures, track);

  // Distant real geometry supplies harbour and bush parallax beyond the detailed
  // foreground. It is decorative and carries no gameplay collision.
  group.add(buildEastbourneParallax(terrain.seaLevel || 0));
  return group;
}
