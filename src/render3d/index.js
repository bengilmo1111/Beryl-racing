// The 3D view of a race.
//
// Phaser still owns the simulation, the HUD, input, audio and the playtest
// harness. This module owns everything the player sees of the world: it reads
// car and track state and draws it, and never writes back.
import Phaser from 'phaser';
import { Scene, HemisphereLight, DirectionalLight } from 'three';
import { C, makeFog } from './palette.js';
import { getRenderer, showCanvas, syncSize, getCanvas } from './renderer.js';
import { buildRoad, buildKerbs, buildApron, buildGround, buildCentreLine } from './road.js';
import { buildStartLine, buildStartGantry } from './markers.js';
import { buildBeryl, updateBeryl } from './beryl.js';
import { buildTrees } from './trees.js';
import { buildSigns } from './signs.js';
import { buildEastbourne } from './themes/eastbourne.js';
import { buildOtaki } from './themes/otaki.js';
import { buildManfeild } from './themes/manfeild.js';
import { SkidRibbon } from './fx/skid.js';
import { PuffPool } from './fx/puffs.js';
import { ChaseCamera } from './chaseCamera.js';
import { isCompact } from '../ui/format.js';

class RaceWorld {
  constructor(scene) {
    this.scene = scene;
    const harnessed = !!scene.game.registry.get('__harness');
    const { renderer } = getRenderer(harnessed);
    this.renderer = renderer;

    this.scene3d = new Scene();
    this.scene3d.background = C.sky.clone();
    this.scene3d.fog = makeFog();

    this.scene3d.add(new HemisphereLight(0xdfefff, 0xa9c69a, 1.35));
    const sun = new DirectionalLight(0xfff3d0, 0.55);
    sun.position.set(-1, 2, -0.6);
    this.scene3d.add(sun);

    // Ground first, then every driveable road. Most courses have one road; the
    // rebuilt Eastbourne course has a primary route plus Marine Parade, an
    // inland village route and cross streets. They use the same road primitives
    // so intersections read naturally through overlapping ribbons.
    this.terrain = scene.terrain;
    this.scene3d.add(buildGround(this.terrain));
    const roads = scene.track.roads || [scene.track];
    for (const road of roads) {
      for (const strip of buildApron(road)) this.scene3d.add(strip);
      this.scene3d.add(buildRoad(road));
      if (scene.def.theme !== 'manfield') this.scene3d.add(buildCentreLine(road));
      for (const strip of buildKerbs(road, scene.def.theme)) this.scene3d.add(strip);
    }

    // Eastbourne is meant to be recognised from its road geometry, shoreline,
    // houses and hills rather than floating labels. It therefore has neither a
    // START gantry nor generated roadside / finish signs.
    if (scene.def.theme === 'manfield') this.scene3d.add(buildStartLine(scene.track));
    else if (scene.def.theme !== 'eastbourne') this.scene3d.add(buildStartGantry(scene.track, 'START'));

    if (scene.def.theme === 'eastbourne') {
      this.scene3d.add(buildEastbourne(scene.track, scene.def, this.terrain));
    }
    if (scene.def.theme === 'otaki') this.scene3d.add(buildOtaki(scene.track, scene.def, this.terrain));
    if (scene.def.theme === 'manfield') {
      this.scene3d.add(buildManfeild(scene.track, scene.def, this.terrain));
    }

    this.scene3d.add(buildTrees(scene.scenery.trees, this.terrain));
    if (scene.def.theme !== 'eastbourne') {
      this.scene3d.add(buildSigns(scene.track, scene.def, this.terrain));
    }

    this.skid = new SkidRibbon(this.terrain);
    this.scene3d.add(this.skid.mesh);
    this.puffs = new PuffPool(this.scene3d, this.terrain);

    this.beryl = buildBeryl();
    this.scene3d.add(this.beryl.root);

    this.chase = new ChaseCamera(isCompact(scene));
    showCanvas(true);

    this._onPostRender = (renderer3, time, delta) => {
      if (!renderer3) return;
      this.render(delta / 1000);
    };
    scene.game.events.on(Phaser.Core.Events.POST_RENDER, this._onPostRender);
    scene.events.once('shutdown', () => this.destroy());
  }

  setCompact(compact) {
    this.chase.setCompact(compact);
  }

  shake(durationMs, amplitude) {
    this.chase.shake(durationMs, amplitude);
  }

  addSkid(from, to) {
    this.skid.add(from, to);
  }

  emitSmoke(at, count) {
    this.puffs.emit('smoke', at, count);
  }

  emitDust(at, count) {
    this.puffs.emit('dust', at, count);
  }

  render(dt) {
    const car = this.scene.car;
    if (!car) return;
    syncSize(this.scene.game.canvas, this.chase.camera);

    const ground = this.terrain.heightAt(car.x, car.y);
    const f = car.forward;
    const grade = this.terrain.gradeAlong(car.x, car.y, f.x, f.y);
    updateBeryl(this.beryl, car, this.scene.lastInput, dt, ground, grade);
    this.puffs.update(dt);
    this.chase.update(car, dt, this.terrain);
    this.renderer.render(this.scene3d, this.chase.camera);
  }

  destroy() {
    this.scene.game.events.off(Phaser.Core.Events.POST_RENDER, this._onPostRender);
    showCanvas(false);
    this.scene3d.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      const material = object.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else if (material) material.dispose();
    });
    this.scene3d.clear();
  }
}

export function createRaceWorld(scene) {
  return new RaceWorld(scene);
}

export function compositeCanvases(phaserCanvas) {
  const three = getCanvas();
  const out = document.createElement('canvas');
  out.width = phaserCanvas.width;
  out.height = phaserCanvas.height;
  const ctx = out.getContext('2d');
  if (three) ctx.drawImage(three, 0, 0, out.width, out.height);
  ctx.drawImage(phaserCanvas, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}
