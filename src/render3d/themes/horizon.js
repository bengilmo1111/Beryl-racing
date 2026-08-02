// Bush ranges on the horizon, for the courses that have no bespoke parallax
// layer of their own.
//
// Eastbourne and Manfeild each build a specific view — a harbour, a named
// mountain. Remutaka and Ōtaki did not need one while fog swallowed everything
// past 3000 units, but with the view opened up to a summer haze the far ground
// is visible, and a flat green plain running to the horizon is a poor backdrop
// for a hill climb through a mountain range.
//
// These are deliberately generic: overlapping bush-covered ridges in three
// depths, placed on all four sides so they work whichever way a route wanders.
// They are unfogged like every other parallax band, so they read as the horizon
// rather than dissolving into the haze in front of them.
import { Group } from 'three';
import { WORLD } from '../../config.js';
import { markDecorative, ridge } from './parallax.js';

const BAND = [
  // distance beyond the world, height, colour — palest and lowest furthest out,
  // which is the aerial perspective doing the work.
  { out: 5200, height: 620, colour: 0x9fb7ab, wobble: 3.1 },
  { out: 3100, height: 480, colour: 0x7ea183, wobble: 4.7 },
  { out: 1500, height: 360, colour: 0x5c8664, wobble: 6.3 },
];

function side(group, { along, at, start, end, band, phase }) {
  group.add(
    ridge(
      {
        along,
        at,
        start,
        end,
        segments: 58,
        bottom: -400,
        driftAt: (t) => Math.sin(t * Math.PI * band.wobble + phase) * 220,
        heightAt: (t) =>
          band.height +
          Math.sin(t * Math.PI * (band.wobble + 1.4) + phase) * band.height * 0.28 +
          Math.sin(t * Math.PI * 13 + phase) * band.height * 0.11,
      },
      band.colour
    )
  );
}

export function buildHorizonRanges() {
  const group = new Group();
  group.name = 'horizon-ranges';
  const W = WORLD.width;
  const H = WORLD.height;

  BAND.forEach((band, i) => {
    const phase = i * 1.7;
    // Along X, beyond both long edges.
    side(group, { along: 'x', at: -band.out, start: -W * 0.5, end: W * 1.5, band, phase });
    side(group, { along: 'x', at: H + band.out, start: -W * 0.5, end: W * 1.5, band, phase: phase + 2.3 });
    // Along Z, beyond both short edges.
    side(group, { along: 'z', at: -band.out, start: -H * 0.5, end: H * 1.5, band, phase: phase + 1.1 });
    side(group, { along: 'z', at: W + band.out, start: -H * 0.5, end: H * 1.5, band, phase: phase + 3.4 });
  });

  return markDecorative(group);
}
