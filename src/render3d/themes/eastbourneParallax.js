// Distant Eastbourne scenery arranged in depth bands.
//
// Only the seaward side is drawn here. This layer used to carry two inland bush
// bands and a strip of village rooftops as well; both were removed when the
// course was rebuilt around the real road network, because themes/eastbourne now
// builds actual hills and an actual village in exactly that band.
//
// They did not merely duplicate it, they broke: every element here is pinned to a
// fixed height above sea level rather than to the terrain, and the rebuilt course
// climbs to 320 units at the top of Ferry Road. The inland bands ended up buried
// in the hillside with only their peaks showing, which read as detached
// fragments floating on the skyline.
//
// These are deliberately real pieces of 3D geometry rather than a painted
// skybox. The harbour ridge, headlands, inland bush and village roofline sit at
// different distances from the road, so the chase camera creates parallax for
// free as Beryl follows Marine Drive. Everything lives beyond the playable
// route, carries no collision, and uses a handful of flat-colour meshes.
import { Group, Mesh, MeshBasicMaterial, SphereGeometry } from 'three';
import { WORLD } from '../../config.js';
import { addCloud, markDecorative, ridge } from './parallax.js';

const COLOUR = {
  farHarbour: 0x86a9ad,
  harbourHeadland: 0x5f887d,
  cloudWarm: 0xfff3da,
  cloudShade: 0xeadfc9,
  sun: 0xffd889,
};

function addRidges(group, sea) {
  const W = WORLD.width;
  const H = WORLD.height;
  const start = -H * 0.45;
  const end = H * 1.45;
  const bottom = sea - 80;

  // Across Wellington Harbour: a pale, low ridge and a darker nearer headland.
  // The uneven profiles keep the horizon hand-made rather than procedural.
  group.add(
    ridge(
      {
        at: -W * 0.3,
        start,
        end,
        segments: 42,
        bottom,
        driftAt: (t) => Math.sin(t * Math.PI * 5.2) * 70 + Math.sin(t * Math.PI * 13) * 28,
        heightAt: (t) =>
          sea + 120 + Math.sin(t * Math.PI * 6.2 + 0.7) * 54 + Math.sin(t * Math.PI * 17) * 20,
      },
      COLOUR.farHarbour
    )
  );
  group.add(
    ridge(
      {
        at: W * 0.015,
        start,
        end,
        segments: 46,
        bottom,
        driftAt: (t) => Math.sin(t * Math.PI * 7 + 1.8) * 92 + Math.sin(t * Math.PI * 15) * 35,
        heightAt: (t) =>
          sea + 185 + Math.sin(t * Math.PI * 7.4) * 82 + Math.sin(t * Math.PI * 19 + 0.3) * 28,
      },
      COLOUR.harbourHeadland
    )
  );

}

function addSky(group, sea) {
  const W = WORLD.width;
  const H = WORLD.height;

  // A low-poly late-afternoon sun over the harbour. It is a sphere rather than
  // a camera-facing sprite, so it remains stable as the route curves inland.
  const sun = new Mesh(
    new SphereGeometry(92, 12, 8),
    new MeshBasicMaterial({ color: COLOUR.sun, fog: false })
  );
  sun.position.set(-W * 0.18, sea + 820, H * 0.48);
  group.add(sun);

  addCloud(group, { x: -W * 0.12, y: sea + 760, z: H * 0.18, scale: 105, colour: COLOUR.cloudWarm });
  addCloud(group, { x: W * 0.45, y: sea + 900, z: H * 0.42, scale: 82, colour: COLOUR.cloudShade });
  addCloud(group, { x: -W * 0.2, y: sea + 690, z: H * 0.72, scale: 118, colour: COLOUR.cloudWarm });
  addCloud(group, { x: W * 0.5, y: sea + 840, z: H * 1.02, scale: 92, colour: COLOUR.cloudShade });
}

export function buildEastbourneParallax(sea = 0) {
  const group = new Group();
  group.name = 'eastbourne-parallax-backgrounds';

  addRidges(group, sea);
  addSky(group, sea);

  // Background-only: never participate in raycasts or collision assumptions.
  return markDecorative(group);
}
