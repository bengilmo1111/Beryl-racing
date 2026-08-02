// Ōtaki Forks, the gorge road, market gardens, river crossing, old-town road
// network and Tasman coast.
//
// All scenery is code-built Three.js geometry. It is visual-only: the road
// network, surfaces, terrain and tree collisions remain the simulation source of
// truth. Recognition comes from landform, road arrangement and architecture,
// not from floating place-name boards.
import {
  Group,
  Mesh,
  PlaneGeometry,
  BoxGeometry,
  CylinderGeometry,
  ConeGeometry,
} from 'three';
import { WORLD } from '../../config.js';
import { C, basic, lambert } from './../palette.js';
import { buildOtakiFarmhouse } from '../houses.js';

const COLOUR = {
  bank: 0xcfc19a,
  sleeper: 0x76583c,
  rail: 0x818b91,
  concrete: 0xb7b6ad,
  fieldA: 0x87a85d,
  fieldB: 0x9caf68,
  fieldC: 0xc2b96f,
  shelter: 0xe7dfce,
  roof: 0x5f6968,
  roofRed: 0x8a5247,
  dune: 0xd8c58e,
  pine: 0x315d46,
  pineTrunk: 0x6f513a,
};

function box(width, height, depth, x, y, z, material) {
  const mesh = new Mesh(new BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  return mesh;
}

function placeAcross(object, cp, height) {
  object.position.set(cp.x, height, cp.y);
  object.rotation.y = Math.PI / 2 - cp.angle;
  return object;
}

function terrainPlane(width, depth, colour, x, z, terrain, lift = 2) {
  const mesh = new Mesh(new PlaneGeometry(width, depth), basic(colour, { fog: true }));
  mesh.geometry.rotateX(-Math.PI / 2);
  mesh.position.set(x, terrain.heightAt(x, z) + lift, z);
  return mesh;
}

function placeFarmhouse(group, terrain, spec) {
  const farmhouse = buildOtakiFarmhouse(spec);
  farmhouse.position.set(spec.x, terrain.heightAt(spec.x, spec.z) + 1, spec.z);
  farmhouse.rotation.y = spec.yaw;
  group.add(farmhouse);
}

function addRiver(group, track, def, terrain) {
  const cp = track.checkpoints[def.scenery?.riverCp ?? 0];
  if (!cp) return;
  const roadH = track.heights ? track.heights[cp.index] : 0;
  const carve = (track.sea || []).find((region) => region.angle != null);
  const level = carve ? carve.level : roadH - 50;
  const halfAcross = carve ? carve.halfW : 165;
  const length = carve ? carve.halfL * 2 : 3500;

  const water = new Mesh(
    new PlaneGeometry(length, halfAcross * 2),
    basic(C.river, { fog: true })
  );
  water.geometry.rotateX(-Math.PI / 2);
  group.add(placeAcross(water, cp, level + 2));

  // Wide pale gravel banks make the braided river read as a Kapiti riverbed,
  // rather than a canal cut exactly to the water surface.
  for (const side of [-1, 1]) {
    const bank = new Mesh(new PlaneGeometry(length, 105), basic(COLOUR.bank, { fog: true }));
    bank.geometry.rotateX(-Math.PI / 2);
    const placed = placeAcross(bank, cp, level + 3);
    placed.translateZ(side * (halfAcross + 58));
    group.add(placed);
  }

  // Low concrete bridge parapets follow the road. They are deliberately visual
  // only; collision belongs to the deterministic scenery system.
  for (const side of [-1, 1]) {
    const parapet = new Mesh(new BoxGeometry(16, 42, 390), lambert(COLOUR.concrete));
    const placed = placeAcross(parapet, cp, roadH + 21);
    placed.translateX(side * (track.half + 13));
    group.add(placed);
  }

  // A few exposed gravel bars break up the broad water without textures.
  for (const offset of [-980, -260, 610]) {
    const bar = new Mesh(new PlaneGeometry(310, 64), basic(0xd9c99d, { fog: true }));
    bar.geometry.rotateX(-Math.PI / 2);
    const placed = placeAcross(bar, cp, level + 4);
    placed.translateX(offset);
    placed.rotation.y += offset > 0 ? 0.12 : -0.08;
    group.add(placed);
  }
}

function addRailOverbridge(group, track, def) {
  const cp = track.checkpoints[def.scenery?.railwayCp ?? 0];
  if (!cp) return;
  const roadH = track.heights ? track.heights[cp.index] : 0;
  const corridorWidth = 1400;

  // The modern road crosses above the rail corridor. Rails and sleepers sit
  // below road level, while parapets define the short overbridge.
  for (let offset = -corridorWidth / 2; offset <= corridorWidth / 2; offset += 44) {
    const sleeper = new Mesh(new BoxGeometry(8, 4, 78), lambert(COLOUR.sleeper));
    const placed = placeAcross(sleeper, cp, roadH - 30);
    placed.translateX(offset);
    group.add(placed);
  }
  for (const railOffset of [-18, 18]) {
    const rail = new Mesh(new BoxGeometry(corridorWidth, 6, 6), lambert(COLOUR.rail));
    const placed = placeAcross(rail, cp, roadH - 26);
    placed.translateZ(railOffset);
    group.add(placed);
  }
  for (const side of [-1, 1]) {
    const parapet = new Mesh(new BoxGeometry(14, 46, 270), lambert(COLOUR.concrete));
    const placed = placeAcross(parapet, cp, roadH + 23);
    placed.translateX(side * (track.half + 12));
    group.add(placed);
  }
}

function addMarketGardens(group, terrain) {
  // Long rectangular growing blocks and dark windbreak rows are the strongest
  // rural cue on the flats between the gorge and town.
  const plots = [
    [11200, 5600, 1150, 360, COLOUR.fieldA, 0.08],
    [10300, 6150, 980, 330, COLOUR.fieldC, -0.05],
    [10800, 6900, 1050, 390, COLOUR.fieldB, 0.02],
    [7900, 6750, 1000, 340, COLOUR.fieldA, -0.04],
    [7200, 7250, 930, 310, COLOUR.fieldC, 0.06],
  ];
  for (const [x, z, width, depth, colour, yaw] of plots) {
    const field = terrainPlane(width, depth, colour, x, z, terrain, 2.4);
    field.rotation.y = yaw;
    group.add(field);
  }

  const hedgeMat = lambert(0x365f43);
  for (const [x, z, length, yaw] of [
    [11200, 5380, 1080, 0.08],
    [10300, 5950, 950, -0.05],
    [10800, 6670, 1000, 0.02],
    [7900, 6550, 950, -0.04],
    [7200, 7060, 900, 0.06],
  ]) {
    const hedge = box(length, 52, 34, x, terrain.heightAt(x, z) + 26, z, hedgeMat);
    hedge.rotation.y = yaw;
    group.add(hedge);
  }
}

function addTown(group, terrain, layout) {
  const wallMats = [
    lambert(0xeee9de),
    lambert(0xe4e7df),
    lambert(0xe8dcc7),
    lambert(0xd9e2df),
  ];
  const roofMats = [lambert(COLOUR.roof), lambert(COLOUR.roofRed)];

  // Two loose ribbons of compact buildings imply the old highway / old-town
  // centre and the beach settlement without turning the route into a city.
  const buildings = [
    [8500, 8460, 220, 105, 155, 0.05],
    [8050, 8480, 180, 95, 130, -0.03],
    [7350, 8950, 240, 115, 150, 0.02],
    [6800, 9150, 210, 100, 145, -0.08],
    [6100, 9250, 250, 120, 165, 0.03],
    [5350, 9400, 215, 105, 140, -0.06],
    [4300, 8450, 185, 95, 125, 0.12],
    [3500, 8100, 170, 90, 118, -0.04],
    [2780, 8500, 155, 82, 108, 0.03],
    [2440, 9000, 170, 88, 112, -0.05],
    [2050, 9350, 160, 86, 106, 0.08],
  ];

  buildings.forEach(([x, z, w, d, h, yaw], index) => {
    const y = terrain.heightAt(x, z);
    const root = new Group();
    root.add(box(w, h, d, 0, h / 2, 0, wallMats[index % wallMats.length]));
    root.add(box(w + 18, 12, d + 18, 0, h + 6, 0, roofMats[index % roofMats.length]));
    root.position.set(x, y + 1, z);
    root.rotation.y = yaw;
    group.add(root);
  });

  // A modest platform/shelter beside the rail corridor, recognisable as a small
  // town station without any sign text.
  const station = new Group();
  station.add(box(360, 10, 72, 0, 5, 0, lambert(COLOUR.concrete)));
  station.add(box(190, 90, 70, 35, 55, 15, lambert(COLOUR.shelter)));
  station.add(box(220, 12, 96, 35, 106, 15, lambert(COLOUR.roofRed)));
  station.position.set(8640, terrain.heightAt(8640, 6900) - 12, 6900);
  station.rotation.y = 0.1;
  group.add(station);

  // Keep layout used: it documents the authored core and avoids a second set of
  // magic bounds diverging from the route data.
  group.userData.townBounds = layout.zones.town;
}

function addBeach(group, terrain, layout) {
  const beach = layout.zones.beach;
  const seaLevel = terrain.seaLevel || 0;

  const sand = new Mesh(new PlaneGeometry(beach.w, beach.h), basic(C.sand, { fog: true }));
  sand.geometry.rotateX(-Math.PI / 2);
  sand.position.set(beach.x + beach.w / 2, seaLevel + 3, beach.y + beach.h / 2);
  group.add(sand);

  const sea = new Mesh(
    new PlaneGeometry(4200, beach.h + 3600),
    basic(C.river, { fog: true })
  );
  sea.geometry.rotateX(-Math.PI / 2);
  sea.position.set(-1550, seaLevel + 1, beach.y + beach.h / 2);
  group.add(sea);

  // Low dune ridges and a line of wind-shaped pines/baches separate Marine
  // Parade from the open Tasman coast.
  const duneMat = lambert(COLOUR.dune);
  for (let z = 7150; z <= 10400; z += 520) {
    const dune = box(180, 26, 330, 760, seaLevel + 13, z, duneMat);
    dune.rotation.y = 0.08 * Math.sin(z * 0.01);
    group.add(dune);
  }

  const pineMat = lambert(COLOUR.pine);
  const trunkMat = lambert(COLOUR.pineTrunk);
  for (let z = 7200; z <= 10300; z += 620) {
    const trunk = new Mesh(new CylinderGeometry(12, 17, 115, 6), trunkMat);
    trunk.position.set(910, seaLevel + 58, z);
    group.add(trunk);
    const crown = new Mesh(new ConeGeometry(90, 210, 7), pineMat);
    crown.position.set(910, seaLevel + 192, z);
    group.add(crown);
  }

  const bachWalls = [0xf1ece0, 0xdce5e3, 0xe8d7c2];
  for (const [index, z] of [7450, 8250, 9050, 9850].entries()) {
    const x = 1370 + (index % 2) * 130;
    const y = terrain.heightAt(x, z);
    const bach = new Group();
    bach.add(box(210, 92, 135, 0, 46, 0, lambert(bachWalls[index % bachWalls.length])));
    bach.add(box(230, 12, 155, 0, 99, 0, lambert(index % 2 ? COLOUR.roof : COLOUR.roofRed)));
    bach.position.set(x, y + 1, z);
    bach.rotation.y = index % 2 ? -0.05 : 0.07;
    group.add(bach);
  }
}

function addFarmhouses(group, terrain) {
  const farmhouses = [
    {
      x: 14350, z: 3900, yaw: -0.18, variant: 'homestead', shed: true,
      palette: {
        wall: 0xeee6d2, trim: 0xfff7e3, roof: 0x6f7775, door: 0x6c4d3c,
        shedWall: 0x8a6a4d, shedRoof: 0x7b5a4e,
      },
    },
    {
      x: 12400, z: 4450, yaw: Math.PI + 0.08, variant: 'gabled', shed: false,
      palette: { wall: 0xdce3cf, trim: 0xf6efd9, roof: 0x8b4e3e, door: 0x6a4438 },
    },
    {
      x: 10900, z: 6000, yaw: 0.18, variant: 'cottage', shed: true,
      palette: {
        wall: 0xeee9df, trim: 0xffffff, roof: 0x68746f, door: 0x58705d,
        shedWall: 0x9b7d5b, shedRoof: 0x74554b,
      },
    },
    {
      x: 8200, z: 7200, yaw: Math.PI - 0.16, variant: 'two-storey', shed: false,
      palette: { wall: 0xe3cfaa, trim: 0xfaf2df, roof: 0x4f585e, door: 0x7c4538 },
    },
    {
      x: 7000, z: 7550, yaw: 0.42, variant: 'homestead', shed: true,
      palette: {
        wall: 0xd9d2c2, trim: 0xf3ecdc, roof: 0x6a725e, door: 0x6e4638,
        shedWall: 0x896c51, shedRoof: 0x895448,
      },
    },
  ];
  for (const farmhouse of farmhouses) placeFarmhouse(group, terrain, farmhouse);
}

export function buildOtaki(track, def, terrain) {
  const group = new Group();
  group.name = 'otaki-forks-to-coast';

  const layout = def.layout;
  if (!layout) return group;

  addBeach(group, terrain, layout);
  addRiver(group, track, def, terrain);
  addRailOverbridge(group, track, def);
  addMarketGardens(group, terrain);
  addFarmhouses(group, terrain);
  addTown(group, terrain, layout);

  return group;
}
