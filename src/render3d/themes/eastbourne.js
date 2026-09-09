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
  IcosahedronGeometry,
  InstancedMesh,
  Object3D,
  Color,
} from 'three';
import { WORLD } from '../../config.js';
import { EASTBOURNE_LAYOUT } from '../../eastbourneRoute.js';
import { basic, lambert } from '../palette.js';
import { eastbourneCoast } from '../../coast.js';
import { resolvePlace, resolvePlaces } from '../../places.js';
import { metres } from '../../scale.js';
import { buildEastbourneVilla, villaPalette } from '../houses.js';
import { HILL_OFFSETS, hillElevation } from '../../eastbourneHills.js';
import { bakeStatic } from '../bake.js';
import { buildEastbourneParallax } from './eastbourneParallax.js';
import { seawallGeometry, harbourGeometry, shoreBandGeometry } from '../coastalGeometry.js';
import { visualCoast } from '../../coastalProfile.js';
import { summerTrees } from '../../eastbourneSummer.js';
import { buildPohutukawa } from '../models/nzTrees.js';
import { nearestRoadPose } from '../../driveRoute.js';
import { findJunctions, junctionMask } from '../road.js';
import { terrainPatchGeometry } from '../terrainPatch.js';

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

  for (const [width, colour, height] of [[9, COLOUR.shallow, 3], [0.7, COLOUR.foam, 5]]) {
    const band = new Mesh(shoreBandGeometry(points, metres(width)), basic(colour, { fog: true }));
    band.position.y = sea + height;
    group.add(band);
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
  // One north/south surface, rather than a ribbon folded around every road bend.
  // Profile origins are mapped beyond the inland-most street; measured eastward
  // distances and absolute heights then preserve the much gentler viewing angle.
  const start = track.centerline[0].y - metres(220);
  const end = track.centerline.at(-1).y + metres(350);
  const rows = 90, columns = HILL_OFFSETS.length + 2;
  const positions = [], indices = [];
  for (let i = 0; i <= rows; i++) {
    const z = start + (end - start) * i / rows;
    const fraction = (z - track.centerline[0].y) / (track.centerline.at(-1).y - track.centerline[0].y);
    const nearest = track.centerline.reduce((a, b) => Math.abs(a.y - z) < Math.abs(b.y - z) ? a : b);
    const local = track.roads.flatMap(r => r.centerline.filter(p => Math.abs(p.y - z) < metres(140)).map(p => p.x + r.half));
    const edge = Math.max(nearest.x, ...local) + metres(45);
    const fade = Math.min(1, i / 10, (rows - i) / 10);
    const taper = fade * fade * (3 - 2 * fade);
    for (let c = 0; c < columns; c++) {
      const distance = HILL_OFFSETS[c] ?? (c === columns - 2 ? 850 : 1100);
      const x = edge + metres(distance);
      const ground = terrain.heightAt(x, z);
      const measured = hillElevation(fraction, Math.min(c, HILL_OFFSETS.length - 1));
      // Beyond the measured 600 m section, return the backdrop gently to ground.
      const tail = c === columns - 1 ? 0 : c === columns - 2 ? 0.75 : 1;
      const h = (terrain.seaLevel || 0) + metres(measured) * taper * tail;
      positions.push(x, c === 0 || c === columns - 1 ? ground - 4 : Math.max(ground - 4, h), z);
      if (i && c) {
        const b = i * columns + c, a = b - columns;
        indices.push(a - 1, b - 1, a, a, b - 1, b);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const colours = [];
  for (let i = 0; i < positions.length / 3; i++) {
    const shade = 0.9 + Math.sin(i * 0.49) * 0.06 + Math.cos(i * 0.17) * 0.04;
    const tint = new Color(0x426e4d).multiplyScalar(shade);
    colours.push(tint.r, tint.g, tint.b);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
  group.add(new Mesh(geometry, lambert(0xffffff, { side: DoubleSide, vertexColors: true })));
  // Bush grows on this measured hill mesh, not on the lower driving terrain.
  // Subdivide each face to keep the crowns grounded on steep slopes.
  const crowns = [];
  for (let r = 4; r < rows - 4; r++) {
    for (let c = 1; c < columns - 3; c++) {
      const index = (r * columns + c) * 3;
      for (let k = 0; k < 3; k++) {
        const next = index + (k === 2 ? columns : 1) * 3;
        const t = 0.15 + k * 0.28;
        crowns.push({ x: positions[index] * (1-t) + positions[next] * t,
          y: positions[index+1] * (1-t) + positions[next+1] * t,
          z: positions[index+2] * (1-t) + positions[next+2] * t,
          radius: metres(7 + (r * 7 + c * 3 + k) % 9) });
      }
    }
  }
  const bush = new InstancedMesh(new IcosahedronGeometry(1, 0), lambert(0xffffff), crowns.length);
  const dummy = new Object3D();
  crowns.forEach((p, i) => {
    dummy.position.set(p.x, p.y + p.radius * 0.18, p.z);
    dummy.rotation.set(0, i * 2.39996, 0);
    dummy.scale.set(p.radius, p.radius * (0.6 + (i % 3) * 0.08), p.radius * 0.9);
    dummy.updateMatrix(); bush.setMatrixAt(i, dummy.matrix);
    bush.setColorAt(i, new Color([0x234f36, 0x326342, 0x3d704a, 0x295b3c][i % 4]));
  });
  bush.name = 'eastbourne-hillside-bush';
  bush.computeBoundingSphere(); group.add(bush);
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
  // A single DoubleSide texture reads backwards from behind. Give the rear
  // its own correctly oriented face so approach and departure both read well.
  const back = new Mesh(sign.geometry, sign.material);
  back.rotation.y = Math.PI;
  back.position.z = -0.5;
  sign.add(back);
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
export function groundRibbon(group, terrain, a, b, width, colour) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const length = Math.hypot(dx, dz);
  if (length < 1) return;
  if (terrain.describe) {
    const geometry = terrainPatchGeometry(terrain, {
      x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, width,
      depth: length + 8, yaw: Math.atan2(dx, dz), lift: 3,
    });
    group.add(new Mesh(geometry, lambert(colour, { side: DoubleSide })));
    return;
  }
  const nx = -dz / length * width / 2, nz = dx / length * width / 2;
  const count = Math.max(1, Math.ceil(length / metres(1)));
  const positions = [], indices = [];
  for (let i = 0; i <= count; i++) {
    for (const sign of [-1, 1]) {
      const x = a.x + dx * i / count + nx * sign;
      const z = a.z + dz * i / count + nz * sign;
      positions.push(x, terrain.heightAt(x, z) + 3, z);
    }
    if (i) { const k = i * 2; indices.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  group.add(new Mesh(geometry, lambert(colour, { side: DoubleSide })));
}

function addStreetPaths(group, terrain, track) {
  const paths = new Group();
  const junctions = findJunctions(track.roads);
  for (const road of track.roads) {
    if (road.id === 'marine-drive-north') continue;
    const skip = junctionMask(junctions, road.centerline);
    const sides = road.id === 'primary' ? [1] : [-1, 1];
    for (const side of sides) {
      for (let i = 1; i < road.centerline.length; i++) {
        if (skip?.(i - 1)) continue;
        const a = road.centerline[i - 1], b = road.centerline[i];
        const dx = b.x - a.x, dz = b.y - a.y, length = Math.hypot(dx, dz) || 1;
        const offset = (road.half + metres(1.2)) * side;
        const p = { x: a.x + dz / length * offset, z: a.y - dx / length * offset };
        const q = { x: b.x + dz / length * offset, z: b.y - dx / length * offset };
        // Keep a footpath out of any joining road or the arrival parking bays.
        const pose = nearestRoadPose(track, (p.x + q.x) / 2, (p.z + q.z) / 2);
        if (pose.distance < pose.road.half + metres(0.4)) continue;
        if (road.id === 'primary' && i > road.centerline.length - 45) continue;
        groundRibbon(paths, terrain, p, q, metres(1.8), COLOUR.concrete);
      }
    }
  }
  const mesh = bakeStatic(paths);
  if (mesh) { mesh.name = 'eastbourne-footpaths'; group.add(mesh); }
}

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
    if (s.frontage) {
      const door = { x: s.x - Math.sin(s.yaw) * s.d / 2,
        z: s.z - Math.cos(s.yaw) * s.d / 2 };
      groundRibbon(street, terrain, s.frontage, door, metres(1.2), COLOUR.concrete);
      // Low painted garden boundary with a real opening at the path.
      const across = { x: Math.cos(s.yaw), z: -Math.sin(s.yaw) };
      const outward = { x: Math.sin(s.yaw), z: Math.cos(s.yaw) };
      const origin = { x: s.frontage.x + outward.x * metres(1.5),
        z: s.frontage.z + outward.z * metres(1.5) };
      for (const side of [-1, 1]) {
        const a = { x: origin.x + across.x * metres(1.1) * side,
          z: origin.z + across.z * metres(1.1) * side };
        const b = { x: origin.x + across.x * (s.w / 2 + metres(1)) * side,
          z: origin.z + across.z * (s.w / 2 + metres(1)) * side };
        for (const h of [0.22, 0.57]) {
          const rail = addSegment(street, a, b, metres(0.07), metres(0.08),
            (terrain.heightAt(a.x, a.z) + terrain.heightAt(b.x, b.z)) / 2 + metres(h), lambert(COLOUR.white));
          rail.rotation.x = -Math.atan2(terrain.heightAt(b.x, b.z) - terrain.heightAt(a.x, a.z), Math.hypot(b.x - a.x, b.z - a.z));
        }
        const gardenEnd = { x: b.x + outward.x * metres(4), z: b.z + outward.z * metres(4) };
        for (const h of [0.22, 0.57]) {
          const rail = addSegment(street, b, gardenEnd, metres(0.07), metres(0.08),
            (terrain.heightAt(b.x, b.z) + terrain.heightAt(gardenEnd.x, gardenEnd.z)) / 2 + metres(h), lambert(COLOUR.white));
          rail.rotation.x = -Math.atan2(terrain.heightAt(gardenEnd.x, gardenEnd.z) - terrain.heightAt(b.x, b.z), metres(4));
        }
        for (let d = 0; d <= 4; d += 0.5) {
          const x = b.x + outward.x * metres(d), z = b.z + outward.z * metres(d);
          const post = box(metres(0.1), metres(0.75), metres(0.08), lambert(COLOUR.white));
          placeAtGround(post, terrain, x, z, metres(0.375)); post.rotation.y = s.yaw; street.add(post);
        }
        for (let d = metres(1.1); d <= s.w / 2 + metres(1); d += metres(0.5)) {
          const x = origin.x + across.x * d * side, z = origin.z + across.z * d * side;
          const picket = box(metres(0.1), metres(0.75), metres(0.08), lambert(COLOUR.white));
          placeAtGround(picket, terrain, x, z, metres(0.375));
          picket.rotation.y = s.yaw;
          street.add(picket);
        }
      }
    }
  }
  const baked = bakeStatic(street);
  group.add(baked || street);
}

function simpleGableBuilding(width, depth, wallHeight, wallColour, roofColour) {
  const root = new Group();
  const wall = box(width, wallHeight, depth, lambert(wallColour));
  wall.position.y = wallHeight / 2;
  root.add(wall);
  const half = width / 2 + 12, rise = 92;
  for (const side of [-1, 1]) {
    const roof = box(Math.hypot(half, rise), 8, depth + 24, lambert(roofColour));
    roof.position.set(side * half / 2, wallHeight + rise / 2, 0);
    roof.rotation.z = -side * Math.atan2(rise, half);
    root.add(roof);
  }
  const ends = new BufferGeometry();
  ends.setAttribute('position', new Float32BufferAttribute([
    -width / 2, wallHeight, -depth / 2, 0, wallHeight + rise, -depth / 2, width / 2, wallHeight, -depth / 2,
    -width / 2, wallHeight, depth / 2, width / 2, wallHeight, depth / 2, 0, wallHeight + rise, depth / 2,
  ], 3));
  ends.computeVertexNormals();
  root.add(new Mesh(ends, lambert(wallColour)));
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

  // A continuous village strip: generic shop types, not unverified business replicas.
  const shopRoot = new Group();
  const shopWidths = [150, 175, 160, 185, 155];
  const shopNames = ['DAIRY', 'BAKERY', 'BOOKS', 'FISH & CHIPS', 'CAFE'];
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
    const sign = nameboard(shopNames[i], width - 12, 26, i % 2 ? '#725547' : '#315b51');
    sign.position.set(cursor + width / 2, 120, -80);
    sign.rotation.y = Math.PI;
    shopRoot.add(sign);
    const door = box(24, 75, 8, lambert(COLOUR.roofGreen));
    door.position.set(cursor + width * 0.82, 38, -80);
    shopRoot.add(door);
    const doorGlass = box(16, 48, 3, lambert(COLOUR.glass));
    doorGlass.position.set(cursor + width * 0.82, 47, -85);
    shopRoot.add(doorGlass);
    cursor += width + 8;
  });
  const footpath = box(900, 7, 105, lambert(COLOUR.concrete));
  footpath.position.set(0, 3.5, -128);
  shopRoot.add(footpath);
  const shopsAt = at('shops');
  placeAtGround(shopRoot, terrain, shopsAt.x, shopsAt.z, 2);
  shopRoot.rotation.y = shopsAt.yaw;
  shopRoot.scale.setScalar(2);
  if (shopsAt.frontage) {
    const front = { x: shopsAt.x - Math.sin(shopsAt.yaw) * 350,
      z: shopsAt.z - Math.cos(shopsAt.yaw) * 350 };
    groundRibbon(group, terrain, shopsAt.frontage, front, shopsAt.w, COLOUR.concrete);
  }
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
  const fork = resolvePlace(track, { road: 'primary', at: 0.694, offsetMetres: -8 });
  const forkHeading = nearestRoadPose({ roads: [track.roads[0]] }, fork.x, fork.z).rotation;
  for (const [text, height] of [['RSA → WATERFRONT', 3.2], ['RSA ↑ VILLAGE', 2.1]]) {
    const sign = nameboard(text, metres(7), metres(0.9));
    placeAtGround(sign, terrain, fork.x, fork.z, metres(height));
    sign.rotation.y = -forkHeading; group.add(sign);
  }
  for (const side of [-1, 1]) {
    const post = box(metres(0.12), metres(3.8), metres(0.12), lambert(COLOUR.white));
    placeAtGround(post, terrain, fork.x + Math.cos(forkHeading) * metres(3) * side,
      fork.z + Math.sin(forkHeading) * metres(3) * side, metres(1.9)); group.add(post);
  }
  const approach = resolvePlace(track, { road: 'primary', at: 0.968, offsetMetres: -8 });
  const advance = nameboard('RSA PARKING AHEAD', metres(7), metres(1.2));
  placeAtGround(advance, terrain, approach.x, approach.z, metres(2.8));
  const direction = nearestRoadPose({ roads: [track.roads[0]] }, approach.x, approach.z).rotation;
  advance.rotation.y = -direction;
  for (const x of [-metres(3), metres(3)]) {
    const post = box(metres(0.12), metres(3), metres(0.12), lambert(COLOUR.white));
    post.position.set(x, -metres(1.4), 0); advance.add(post);
  }
  group.add(advance);
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
  for (const dx of [-3, 3]) {
    const p = arrival.point(-8 + dx, -9);
    const post = box(metres(0.12), metres(2.5), metres(0.12), lambert(COLOUR.white));
    post.position.set(p.x, arrival.h + metres(1.25), p.y);
    group.add(post);
  }

}

export function buildEastbourne(track, def, terrain, structures = [], flowering = null) {
  const group = new Group();
  group.name = 'eastbourne-layout-environment';

  addCoast(group, terrain, track);
  const wharf = new Group();
  addWharf(wharf, terrain, track);
  group.add(bakeStatic(wharf) || wharf);
  addCoastalPines(group, terrain, track, structures);
  addHills(group, terrain, track);
  addStreetPaths(group, terrain, track);
  addHouses(group, terrain, structures);
  const flowers = new Group();
  for (const p of flowering || summerTrees(track, structures)) {
    const tree = buildPohutukawa({ variant: p.variant, scale: p.scale, flowered: true });
    tree.position.set(p.x, terrain.heightAt(p.x, p.z), p.z);
    tree.rotation.y = p.yaw;
    flowers.add(tree);
  }
  const floweringMesh = bakeStatic(flowers);
  if (floweringMesh) {
    floweringMesh.name = 'summer-pohutukawa';
    floweringMesh.userData.treeCount = flowers.children.length;
    group.add(floweringMesh);
  }
  addVillage(group, terrain, structures, track);

  // Distant real geometry supplies harbour and bush parallax beyond the detailed
  // foreground. It is decorative and carries no gameplay collision.
  group.add(buildEastbourneParallax(terrain.seaLevel || 0));
  return group;
}
