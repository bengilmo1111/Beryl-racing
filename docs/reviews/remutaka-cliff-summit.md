# Remutaka: cliff, barriers and summit

Compared sampled frames from the supplied real-drive recording
`Record_2026-09-11-21-10-41.mp4` (36.6 seconds) and game recording
`Record_2026-09-15-08-20-48.mp4` (143.7 seconds).

The real recording shows a close right-hand bank and an exposed left-hand edge.
The game alternated the cut/drop with corner direction, had broad shoulders,
and allowed the car to leave the road through decorative guardrails. The summit
parking shape and downhill continuation follow the user's description; the short
real-drive recording does not establish the summit layout or exact dimensions.

## Changes

- Fix the ascent's bank on the driver's right and drop on the left, independently
  of curvature. In the renderer's X/Z coordinates, (-tz, tx) is driver-right.
- Narrow the shoulder, steepen the terrain and add road-resolution cut/drop faces.
- Derive rendered rails and swept nose/tail collisions from one segment list.
  Impacts preserve tangential velocity and rebound 25% of inward velocity.
- Add a paved triangular car park at the crest, with an open entrance and rails
  on its outer perimeter. Extend the main road into a descent.
- Move the final checkpoint into the parking area. Finishing requires crossing
  its painted band after the ordered checkpoints; driving along SH2 cannot finish.
- Use a new Remutaka best-time key because the arrival and route have changed.

## Verification

- `npm run build`
- `npm run test:track-geometry`
- `npm run test:remutaka`: every side profile; slow/fast rail impacts; unobstructed
  through-road; open entrance; finish from either direction; rejection of road
  and grass finishes; downhill continuation; rendered parking support.
- `node playtest/terrain-clearance.mjs`: 265,925 surface positions and 565 mesh rays.
- `node playtest/eastbourne-arrival.mjs`: shared finish helper regression check.
- `git diff --check`

Browser playtesting and new chase-camera screenshots remain unverified: no
Chromium executable was installed, and the Playwright download timed out.
