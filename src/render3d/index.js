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
import { buildProps } from './props.js';
import { buildSigns } from './signs.js';
import { buildEastbourne } from './themes/eastbourne.js';
import { buildOtaki } from './themes/otaki.js';
import { buildOtakiParallax, updateOtakiParallax } from './themes/otakiParallax.js';
import { buildManfeild } from './themes/manfeild.js';
import { buildRemutaka } from './themes/remutaka.js';
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

    this.terrain = scene.terrain;
    this.otakiParallax = null;
    this.scene3d.add(buildGround(this.terrain));

    // Ground first, then every driveable road, each painted outward-in and
    // bottom-up: apron, road, centre line, kerbs.
    //
    // Branch streets are deliberately bare tarmac. Aprons, kerbs and centre
    // lines are highway markings, and drawing them on every street turned
    // Eastbourne's village into a paved yard: five roads converge there, so ten
    // painted kerb lines, ten run-off bands and five lines of dashes all crossed
    // each other at the junctions. A side street that is simply sealed tarmac
    // joining the main road reads as a street, and is what they look like.
    const roads = scene.track.roads || [scene.track];
    for (const road of roads) {
      const through = road === roads[0];
      if (through) for (const strip of buildApron(road)) this.scene3d.add(strip);
      this.scene3d.add(buildRoad(road));
      // A race circuit has no centre line either — Manfeild gets rumble kerbs
      // and a start/finish line, which is what actually marks a racing surface.
      if (through && scene.def.theme !== 'manfield') {
        this.scene3d.add(buildCentreLine(road));
      }
      if (through) {
        for (const strip of buildKerbs(road, scene.def.theme)) this.scene3d.add(strip);
      }
    }

    // Eastbourne and Ōtaki are geography-led courses: no race gantry, route
    // arrows, floating landmark labels or labelled finish.
    const geographyLed = scene.def.theme === 'eastbourne' || scene.def.theme === 'otaki';
    if (scene.def.theme === 'manfield') this.scene3d.add(buildStartLine(scene.track));
    else if (!geographyLed) this.scene3d.add(buildStartGantry(scene.track, 'START'));

    if (scene.def.theme === 'eastbourne') {
      // Structures are resolved by RaceScene so their visual footprints and
      // collision footprints share the same road-clear positions.
      this.scene3d.add(
        buildEastbourne(scene.track, scene.def, this.terrain, scene.structures)
      );
    }
    if (scene.def.theme === 'otaki') {
      this.scene3d.add(buildOtaki(scene.track, scene.def, this.terrain, scene.structures));
      this.otakiParallax = buildOtakiParallax(this.terrain.seaLevel || 0);
      this.scene3d.add(this.otakiParallax);
    }
    if (scene.def.theme === 'manfield') {
      this.scene3d.add(buildManfeild(scene.track, scene.def, this.terrain));
    }
    if (scene.def.theme === 'remutaka') {
      // Remutaka is not a generic mountain backdrop. The road sits between a
      // near-vertical inboard cut and a guarded drop into an open valley; its
      // bespoke theme uses the same side profile as the visual terrain grid.
      this.scene3d.add(buildRemutaka(scene.track, scene.def, this.terrain));
    }

    this.scene3d.add(buildTrees(scene.scenery.trees, this.terrain));
    this.scene3d.add(buildProps(scene.scenery.props, this.terrain));
    if (!geographyLed) this.scene3d.add(buildSigns(scene.track, scene.def, this.terrain));

    this.skid = new SkidRibbon(this.terrain);
    this.scene3d.add(this.skid.mesh);
    this.puffs = new PuffPool(this.scene3d, this.terrain);

    this.beryl = buildBeryl();
    this.scene3d.add(this.beryl.root);

    this.chase = new ChaseCamera(isCompact(scene));
    showCanvas(true);

    // Phaser emits POST_RENDER from both step() and headlessStep(). The latter
    // passes renderer=null; this guard is what keeps deterministic harness runs
    // draw-free and must not be removed as a seemingly redundant null check.
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
    if (this.otakiParallax) updateOtakiParallax(this.otakiParallax, car, dt);
    this.renderer.render(this.scene3d, this.chase.camera);
  }

  destroy() {
    this.scene.game.events.off(Phaser.Core.Events.POST_RENDER, this._onPostRender);
    showCanvas(false);
    // The renderer/context is a shared singleton; dispose only this scene graph.
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

// Flatten the 3D canvas and transparent Phaser HUD into one playtest image.
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
