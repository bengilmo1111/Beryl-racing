// The 3D view of a race.
//
// Phaser still owns the simulation, the HUD, input, audio and the playtest
// harness. This module owns everything the player sees of the world: it reads
// car and track state and draws it, and never writes back.
import Phaser from 'phaser';
import { Scene, HemisphereLight, DirectionalLight } from 'three';
import { C, makeFog } from './palette.js';
import { getRenderer, showCanvas, syncSize, getCanvas } from './renderer.js';
import { buildRoad, buildKerbs, buildApron, buildGround } from './road.js';
import { buildStartLine, buildCheckpointGates, buildStartGantry } from './markers.js';
import { buildBeryl, updateBeryl } from './beryl.js';
import { buildTrees } from './trees.js';
import { buildSigns } from './signs.js';
import { buildEastbourne } from './themes/eastbourne.js';
import { buildOtaki } from './themes/otaki.js';
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

    // Soft and restrained, per docs/ART-DIRECTION.md, and deliberately bright.
    //
    // The rig is tuned so a vertical surface still reads close to its authored
    // colour. A hemisphere light gives a horizontal normal the midpoint of its
    // sky and ground colours, so a dim rig with a deep-grass ground colour left
    // Beryl's turquoise rear reading as a muddy teal — the one face the player
    // looks at all race. Bright sky, pale warm ground bounce, and a gentle sun
    // that models form without carving out dark sides.
    //
    // No shadow maps: they cost, SwiftShader in CI is happier without them, and
    // flat contact-shadow discs read fine at this scale.
    this.scene3d.add(new HemisphereLight(0xdfefff, 0xa9c69a, 1.35));
    const sun = new DirectionalLight(0xfff3d0, 0.55);
    sun.position.set(-1, 2, -0.6);
    this.scene3d.add(sun);

    // Ground first, then apron, road, kerbs — painted outward-in and bottom-up.
    this.terrain = scene.terrain;
    this.scene3d.add(buildGround(this.terrain));
    for (const strip of buildApron(scene.track)) this.scene3d.add(strip);
    this.scene3d.add(buildRoad(scene.track));
    for (const strip of buildKerbs(scene.track, scene.def.theme)) this.scene3d.add(strip);

    // Course furniture, matching what each theme had in 2D: the purpose-built
    // circuit gets a checkered line and gate markers, the public roads get a
    // gantry over the start.
    if (scene.def.theme === 'manfield') {
      this.scene3d.add(buildStartLine(scene.track));
      this.scene3d.add(buildCheckpointGates(scene.track));
    } else {
      this.scene3d.add(buildStartGantry(scene.track, 'START'));
    }

    // Theme setpieces sit under the trees and signage.
    if (scene.def.theme === 'eastbourne') this.scene3d.add(buildEastbourne(this.terrain));
    if (scene.def.theme === 'otaki') this.scene3d.add(buildOtaki(scene.track, scene.def, this.terrain));

    this.scene3d.add(buildTrees(scene.scenery.trees, this.terrain));
    this.scene3d.add(buildSigns(scene.track, scene.def, this.terrain));

    this.skid = new SkidRibbon(this.terrain);
    this.scene3d.add(this.skid.mesh);
    this.puffs = new PuffPool(this.scene3d, this.terrain);

    this.beryl = buildBeryl();
    this.scene3d.add(this.beryl.root);

    this.chase = new ChaseCamera(isCompact(scene));
    showCanvas(true);

    // The render hook.
    //
    // Phaser emits POST_RENDER from BOTH step() and headlessStep(); the
    // difference is that headlessStep passes renderer = null (verified in
    // phaser/src/core/Game.js). That argument is the clean discriminator, and
    // the guard below is the whole reason deterministic harness runs stay
    // draw-free. Without it every simulated frame would do a full 3D draw and
    // the harness's frameTimesMs budget would blow up.
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

  // --- FX hooks --------------------------------------------------------------
  // RaceScene decides *when* an effect happens (inside update(), as pure data
  // writes, so headless simulation stays draw-free) and this layer decides how
  // it looks.

  addSkid(from, to) {
    this.skid.add(from, to);
  }

  emitSmoke(at, count) {
    this.puffs.emit('smoke', at, count);
  }

  emitDust(at, count) {
    this.puffs.emit('dust', at, count);
  }

  // Pull render-only state off the simulation and draw. Called once per real
  // rendered frame, never from the simulation step.
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
    // Dispose the scene graph but NOT the renderer or its context — that is a
    // module singleton shared across races (see renderer.js).
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

// Flatten both canvases into one image for playtest screenshots.
//
// The Phaser canvas is transparent now, so reading it alone gives HUD-on-nothing
// — which would keep CI green while quietly making every screenshot useless.
// Both source canvases are read in the same task as the render, so the drawing
// buffer is still intact.
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
