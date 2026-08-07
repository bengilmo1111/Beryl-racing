// Eastbourne Dash environment: Wellington Harbour, the narrow beach strip,
// steep bush hills and a recognisable run of mostly white seaside buildings.
//
// There are deliberately no floating labels or road signs in this theme. The
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
} from 'three';
import { WORLD } from '../../config.js';
import { EASTBOURNE_LAYOUT } from '../../eastbourneRoute.js';
import { basic, lambert } from '../palette.js';
import { eastbourneCoast } from '../../coast.js';
import { metres } from '../../scale.js';
import { buildEastbourneVilla, villaPalette } from '../houses.js';
import { bakeStatic } from '../bake.js';
import { buildEastbourneParallax } from './eastbourneParallax.js';

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
  const { points, wall } = eastbourneCoast(track);

  // Open water, out past anything the camera can reach. Anchored on the derived
  // shoreline rather than on fractions of the world, so it arrives at the beach
  // instead of near it.
  let sumX = 0;
  let sumZ = 0;
  for (const p of points) {
    sumX += p.x;
    sumZ += p.z;
  }
  const midX = sumX / points.length;
  const midZ = sumZ / points.length;
  const reach = Math.max(WORLD.width, WORLD.height) * 2.2;
  const water = new Mesh(new PlaneGeometry(reach, reach), basic(COLOUR.water, { fog: true }));
  water.geometry.rotateX(-Math.PI / 2);
  // Half a plane seaward of the mean shoreline, so its landward edge lands on
  // the coast. The beach is a ramp, so the water's edge is hidden under the
  // sand wherever the two disagree by a metre — which is the right way to be
  // wrong, and the reason the foam is drawn separately below.
  water.position.set(midX - reach * 0.5 + metres(6), sea + 2, midZ);
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
  for (let i = 0; i < wall.length - 1; i += 1) {
    const a = wall[i];
    const b = wall[i + 1];
    const y = terrain.heightAt((a.x + b.x) / 2, (a.z + b.z) / 2);
    addSegment(group, a, b, metres(0.5), metres(0.8), y + metres(0.4), concrete);
  }
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
  const z = EASTBOURNE_LAYOUT.places.wharfZ;
  const shoreX = shoreXAt(eastbourneCoast(track), z);
  const sea = terrain.seaLevel || 0;
  const deck = lambert(0x72797c);
  const white = lambert(COLOUR.white);
  const piles = lambert(0x4d443b);

  // Days Bay Wharf: the stem projects at right angles from the beach and ends
  // in a clear T. White railings are its strongest recognisable colour cue.
  const stem = box(600, 16, 78, deck);
  stem.position.set(shoreX - 300, sea + 22, z);
  group.add(stem);
  const head = box(165, 16, 250, deck);
  head.position.set(shoreX - 600, sea + 22, z);
  group.add(head);

  for (let x = shoreX - 55; x >= shoreX - 610; x -= 76) {
    for (const dz of [-28, 28]) {
      const pile = new Mesh(new CylinderGeometry(7, 8, 55, 8), piles);
      pile.position.set(x, sea - 2, z + dz);
      group.add(pile);
    }
  }
  for (const dz of [-34, 34]) {
    const rail = box(570, 5, 5, white);
    rail.position.set(shoreX - 300, sea + 57, z + dz);
    group.add(rail);
    for (let x = shoreX - 30; x >= shoreX - 575; x -= 48) {
      const post = box(5, 44, 5, white);
      post.position.set(x, sea + 40, z + dz);
      group.add(post);
    }
  }
  for (const dz of [-116, 116]) {
    const rail = box(150, 5, 5, white);
    rail.position.set(shoreX - 600, sea + 57, z + dz);
    group.add(rail);
  }
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
function addCoastalPines(group, terrain, track) {
  const { points } = eastbourneCoast(track);
  const count = 9;
  for (let i = 0; i < count; i += 1) {
    // Skipping the run-on at either end, which is geography rather than shore.
    const t = 0.1 + (i / (count - 1)) * 0.8;
    const at = points[Math.round(t * (points.length - 1))];
    if (!at) continue;
    // Set back onto the berm, on the landward side of the sand.
    const inland = at.x + metres(9) + (i % 2) * metres(4);
    addNorfolkPine(group, terrain, inland, at.z, 0.86 + (i % 3) * 0.08);
  }
}

function addHills(group, terrain) {
  const W = WORLD.width;
  const H = WORLD.height;
  const colours = [COLOUR.hill, COLOUR.hillDark, COLOUR.bush];

  // The eastern side of the settlement rises abruptly. Broad overlapping cones
  // are deliberately exaggerated in height: from the road they read as the
  // steep, bush-covered East Harbour hills rather than distant gentle farmland.
  for (let i = 0; i < 15; i += 1) {
    const z = H * (0.06 + i * 0.067);
    const x = W * (0.72 + (i % 3) * 0.055);
    const radius = 620 + (i % 4) * 130;
    const height = 820 + (i % 5) * 170;
    const hill = new Mesh(new ConeGeometry(radius, height, 8), lambert(colours[i % colours.length]));
    hill.position.set(x, terrain.heightAt(x, z) + height / 2 - 80, z);
    hill.rotation.y = (i % 2) * 0.25;
    group.add(hill);
  }
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
    placeAtGround(house, terrain, s.x, s.z, 1);
    house.rotation.y = s.yaw;
    street.add(house);
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

function addVillage(group, terrain, structures) {
  const places = EASTBOURNE_LAYOUT.places;
  // Same rule as the houses: the resolved footprint is the truth. Flat ground
  // decoration (the park lawn, the school field, the RSA forecourt) is not solid
  // and stays keyed to the authored place.
  const at = (kind) => structures.find((s) => s.kind === kind);

  // Open green at Williams Park, a major break in the otherwise built-up edge.
  const lawn = box(760, 5, 540, lambert(COLOUR.lawn));
  placeAtGround(lawn, terrain, places.williamsPark.x, places.williamsPark.z, 2);
  group.add(lawn);
  const shelterAt = at('shelter');
  const shelter = simpleGableBuilding(190, 135, 95, COLOUR.white, COLOUR.roofGreen);
  placeAtGround(shelter, terrain, shelterAt.x, shelterAt.z, 4);
  shelter.rotation.y = shelterAt.yaw;
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
  const rsa = simpleGableBuilding(520, 280, 165, COLOUR.warmWhite, COLOUR.roofGreen);
  placeAtGround(rsa, terrain, rsaAt.x, rsaAt.z, 2);
  rsa.rotation.y = rsaAt.yaw;
  addWindowBand(rsa, 390, 82, -145);
  group.add(rsa);
  const forecourt = box(540, 6, 260, lambert(COLOUR.concrete));
  placeAtGround(forecourt, terrain, rsaAt.x, rsaAt.z - 260, 2);
  group.add(forecourt);
}

export function buildEastbourne(track, def, terrain, structures = []) {
  const group = new Group();
  group.name = 'eastbourne-layout-environment';

  addCoast(group, terrain, track);
  addWharf(group, terrain, track);
  addCoastalPines(group, terrain, track);
  addHills(group, terrain);
  addHouses(group, terrain, structures);
  addVillage(group, terrain, structures);

  // Distant real geometry supplies harbour and bush parallax beyond the detailed
  // foreground. It is decorative and carries no gameplay collision.
  group.add(buildEastbourneParallax(terrain.seaLevel || 0));
  return group;
}
