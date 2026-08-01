// The Ōtaki River crossing, the railway, and Ōtaki Beach.
//
// Ported from the 2D drawOtakiSetting(), keeping its `scenery` hooks
// (riverCp / railwayCp / beach) and its spacings. Original at
// 491875f:src/scenes/RaceScene.js.
import { Group, Mesh, PlaneGeometry, BoxGeometry } from 'three';
import { WORLD } from '../../config.js';
import { C, basic, lambert } from './../palette.js';

const BANK_COLOR = 0xcfc19a;
const SLEEPER_COLOR = 0x7a5b3a;
const RAIL_COLOR = 0x9099a0;

// Place an object across the road at a checkpoint. `angle` is the along-road
// direction, so a yaw of π/2 − angle puts local +Z along the road and local X
// across it (see markers.js, which derives the same thing).
function placeAcross(object, cp, height) {
  object.position.set(cp.x, height, cp.y);
  object.rotation.y = Math.PI / 2 - cp.angle;
  return object;
}

export function buildOtaki(track, def, terrain) {
  const group = new Group();
  const sc = def.scenery || {};
  const cps = track.checkpoints;
  const roadH = (cp) => (track.heights ? track.heights[cp.index] : 0);

  // Beach and sea in the north-west corner.
  if (sc.beach) {
    const b = sc.beach;
    const sand = new Mesh(new PlaneGeometry(b.w, b.h), basic(C.sand, { fog: true }));
    sand.geometry.rotateX(-Math.PI / 2);
    sand.position.set(b.x + b.w / 2, (terrain.seaLevel || 0) + 3, b.y + b.h / 2);
    group.add(sand);

    // The Tasman, running out past the world edge.
    const sea = new Mesh(
      new PlaneGeometry(b.w + WORLD.width * 0.5, b.h + WORLD.height * 0.5),
      basic(C.river, { fog: true })
    );
    sea.geometry.rotateX(-Math.PI / 2);
    sea.position.set(b.x - WORLD.width * 0.2, (terrain.seaLevel || 0) + 1, b.y - WORLD.height * 0.2);
    group.add(sea);
  }

  // Ōtaki River: a broad band under the road, so the road becomes the bridge.
  const riverCp = cps[sc.riverCp ?? 0];
  if (riverCp) {
    const h = roadH(riverCp);
    // The water level and extents come from the carve the terrain builder
    // already applied, so the surface sits in the channel rather than on top of
    // the ground it is supposed to have cut through.
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

    // Pale banks along both edges of the water.
    for (const side of [-1, 1]) {
      const bank = new Mesh(new PlaneGeometry(width, 26), basic(BANK_COLOR, { fog: true }));
      bank.geometry.rotateX(-Math.PI / 2);
      const b = placeAcross(bank, riverCp, level + 4);
      b.translateZ(side * halfAlong);
      group.add(b);
    }

    // Bridge parapets. Purely visual — giving them collision would change how
    // the course drives, and this pass is not a gameplay change.
    for (const side of [-1, 1]) {
      const rail = new Mesh(new BoxGeometry(14, 34, 300), lambert(C.cream));
      const r = placeAcross(rail, riverCp, h + 17);
      r.translateX(side * (track.half + 12));
      group.add(r);
    }
  }

  // Railway crossing: sleepers and rails laid over the road surface.
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

  return group;
}
