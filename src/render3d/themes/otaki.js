// The Ōtaki River crossing, railway, beach, and rural farmhouse scenery.
//
// River/rail/beach geometry is ported from the 2D drawOtakiSetting(). The houses
// are broad low-poly rural silhouettes: weatherboard homesteads, gabled farm
// cottages, verandahs, chimneys and detached sheds, varied mostly through colour.
import { Group, Mesh, PlaneGeometry, BoxGeometry } from 'three';
import { WORLD } from '../../config.js';
import { C, basic, lambert } from './../palette.js';
import { buildOtakiFarmhouse } from '../houses.js';

const BANK_COLOR = 0xcfc19a;
const SLEEPER_COLOR = 0x7a5b3a;
const RAIL_COLOR = 0x9099a0;

function placeAcross(object, cp, height) {
  object.position.set(cp.x, height, cp.y);
  object.rotation.y = Math.PI / 2 - cp.angle;
  return object;
}

function placeFarmhouse(group, terrain, spec, sx, sz) {
  const farmhouse = buildOtakiFarmhouse(spec);
  const x = spec.x * sx;
  const z = spec.z * sz;
  farmhouse.position.set(x, terrain.heightAt(x, z) + 1, z);
  farmhouse.rotation.y = spec.yaw;
  group.add(farmhouse);
}

export function buildOtaki(track, def, terrain) {
  const group = new Group();
  const sc = def.scenery || {};
  const cps = track.checkpoints;
  const roadH = (cp) => (track.heights ? track.heights[cp.index] : 0);

  if (sc.beach) {
    const b = sc.beach;
    const sand = new Mesh(new PlaneGeometry(b.w, b.h), basic(C.sand, { fog: true }));
    sand.geometry.rotateX(-Math.PI / 2);
    sand.position.set(b.x + b.w / 2, (terrain.seaLevel || 0) + 3, b.y + b.h / 2);
    group.add(sand);

    const sea = new Mesh(
      new PlaneGeometry(b.w + WORLD.width * 0.5, b.h + WORLD.height * 0.5),
      basic(C.river, { fog: true })
    );
    sea.geometry.rotateX(-Math.PI / 2);
    sea.position.set(b.x - WORLD.width * 0.2, (terrain.seaLevel || 0) + 1, b.y - WORLD.height * 0.2);
    group.add(sea);
  }

  const riverCp = cps[sc.riverCp ?? 0];
  if (riverCp) {
    const h = roadH(riverCp);
    const carve = (track.sea || []).find((s) => s.angle != null);
    const level = carve ? carve.level : h;
    const halfAlong = carve ? carve.halfW : 130;
    const width = carve ? carve.halfL * 2 : track.half * 2 + WORLD.width * 0.34;

    const river = new Mesh(
      new PlaneGeometry(width, halfAlong * 2),
      basic(C.river, { fog: true })
    );
    river.geometry.rotateX(-Math.PI / 2);
    group.add(placeAcross(river, riverCp, level + 2));

    for (const side of [-1, 1]) {
      const bank = new Mesh(new PlaneGeometry(width, 26), basic(BANK_COLOR, { fog: true }));
      bank.geometry.rotateX(-Math.PI / 2);
      const b = placeAcross(bank, riverCp, level + 4);
      b.translateZ(side * halfAlong);
      group.add(b);
    }

    for (const side of [-1, 1]) {
      const rail = new Mesh(new BoxGeometry(14, 34, 300), lambert(C.cream));
      const r = placeAcross(rail, riverCp, h + 17);
      r.translateX(side * (track.half + 12));
      group.add(r);
    }
  }

  const railCp = cps[sc.railwayCp ?? 0];
  if (railCp) {
    const h = roadH(railCp);
    const w = track.half + 26;
    for (let s = -w; s <= w; s += 26) {
      const sleeper = new Mesh(new BoxGeometry(7, 4, 64), lambert(SLEEPER_COLOR));
      const o = placeAcross(sleeper, railCp, h + 2);
      o.translateX(s);
      group.add(o);
    }
    for (const offset of [-14, 14]) {
      const rail = new Mesh(new BoxGeometry(w * 2, 5, 5), lambert(RAIL_COLOR));
      const o = placeAcross(rail, railCp, h + 5);
      o.translateZ(offset);
      group.add(o);
    }
  }

  // Farmhouses sit through the middle farmland section, not in the bushy Forks
  // start or the built-up township. Positions use the original 5200×5200 course
  // coordinates and scale with the live world. Their larger footprints and
  // nearby sheds distinguish rural homesteads from Eastbourne's tight villas.
  const sx = WORLD.width / 5200;
  const sz = WORLD.height / 5200;
  const farmhouses = [
    {
      x: 3850, z: 3180, yaw: -0.18, variant: 'homestead', shed: true,
      palette: {
        wall: 0xeee6d2, trim: 0xfff7e3, roof: 0x6f7775, door: 0x6c4d3c,
        shedWall: 0x8a6a4d, shedRoof: 0x7b5a4e,
      },
    },
    {
      x: 3420, z: 2550, yaw: Math.PI + 0.08, variant: 'gabled', shed: false,
      palette: { wall: 0xdce3cf, trim: 0xf6efd9, roof: 0x8b4e3e, door: 0x6a4438 },
    },
    {
      x: 2970, z: 3000, yaw: 0.18, variant: 'cottage', shed: true,
      palette: {
        wall: 0xeee9df, trim: 0xffffff, roof: 0x68746f, door: 0x58705d,
        shedWall: 0x9b7d5b, shedRoof: 0x74554b,
      },
    },
    {
      x: 2820, z: 1940, yaw: Math.PI - 0.16, variant: 'two-storey', shed: false,
      palette: { wall: 0xe3cfaa, trim: 0xfaf2df, roof: 0x4f585e, door: 0x7c4538 },
    },
    {
      x: 2350, z: 2420, yaw: 0.42, variant: 'homestead', shed: true,
      palette: {
        wall: 0xd9d2c2, trim: 0xf3ecdc, roof: 0x6a725e, door: 0x6e4638,
        shedWall: 0x896c51, shedRoof: 0x895448,
      },
    },
    {
      x: 2050, z: 1700, yaw: -0.25, variant: 'gabled', shed: false,
      palette: { wall: 0xe4e8e5, trim: 0xfbf5e6, roof: 0x778189, door: 0x496978 },
    },
  ];
  for (const farmhouse of farmhouses) placeFarmhouse(group, terrain, farmhouse, sx, sz);

  return group;
}
