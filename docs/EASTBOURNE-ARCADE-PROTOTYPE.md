# Eastbourne: the first arcade driving slice

This is the active 3D gameplay direction for Eastbourne. It supersedes the
"only the view changes" rule in PRD.md and the top-down camera requirements in
ART-DIRECTION.md on this branch. The other three courses retain their handling
while we validate this first slice.

## Promise

A cheerful coastal road trip in a recognisable turquoise Morris Minor. Preserve
the places and their order; choose distance, steering and recovery for a clear,
enjoyable drive. Children and older non-gamers should be able to finish their
first attempt and want another go.

## This iteration

- Eastbourne is compressed from 4.58 km to 2.15 km, with a 6.9 m main road.
  Target a roughly 90-second confident run; first-time drivers may take longer.
  Ferry Road, the wharf, coastal drive, village alternatives and RSA remain.
- Acceleration takes about 4.5 seconds to reach the flat-road top speed.
  Steering ramps in over a short hold, returns promptly, and is gentler at
  high speed. There is no stationary pivot. Normal cornering has more grip;
  handbraking remains optional and is not required on touch.
- Grass slows progressively. Glancing contacts preserve along-wall motion
  with a small rebound. BACK ON ROAD (or R) restores the latest safe pose in
  the validated route section and adds three seconds. It cannot skip a gate.
- The camera previews the upcoming road with a bounded yaw offset. Location,
  progress and tight-bend hints appear in the small top HUD label.
- The finish compares the previous best, stores a local named top three, and
  offers retry/change course. The results panel scrolls on short displays.
- A v3 best-time key keeps the new route's records separate from the old run.

## Road-clipping correction

The road mesh used fine per-segment heights, while the car sampled a blurred
world-sized terrain grid. Their heights disagreed on slopes. RoadSurface now
queries the exact two triangles used by each road segment, including branch
overlaps and junction overlays. The car, camera and skid marks use that surface
when on the road. The older courses retain their existing physics grade query.

The car's root also used XYZ Euler rotation: pitch acted around world X after
yaw, rolling the car sideways on east/west headings. YXZ makes pitch local to
the car. Road pitch follows contact immediately; the suspension still eases.
Wheel support lifts the model above the surface at crests.

## Verification

- `npm run test:road-contact`: compares the support query against raycasts on
  actual Three road meshes, checks tyre clearance across all four road networks,
  and checks uphill pitch in four compass directions. It needs no WebGL.
- `npm run test:arcade-driving`: tests tap input, no stationary pivot, progressive
  grass drag, acceleration at 30/60/120 Hz, reset and course isolation.
- Existing geometry, placement, road-index, replay, bot, audio and mobile gates
  remain. Eastbourne's replay baseline changes deliberately for this prototype;
  the other three must not change.
- Mobile journey covers finishing, naming a local score, retrying, persistence
  and touching recovery without changing checkpoint progress.

## Human acceptance before expanding

Compare this PR with parent commit 711ed3c. Ask a child, an older non-gamer and
a comfortable driver to try the opening and a full run without coaching.
Record completion, navigation mistakes, recovery usage and whether they choose
to retry. Ask what they would improve on the next run. These outcomes, not a
passing bot, decide whether to spread the handling to the other courses.

Next iterations: tune from those drives, then use the same driving foundation
for the other tracks. Sector comparisons and a personal-best ghost remain later
work. This change does not claim human playtesting has established the feel.
