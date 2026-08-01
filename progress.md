Original prompt: Read docs/factory/PLAN.md then docs/factory/phase-1-brief.md. Then read the repo — PRD.md, game-manifest.json, src/, vite.config.js. Before writing any code, give me a plan covering two things: how you'll make the simulation deterministic in this codebase specifically — where Math.random() is reachable from gameplay, how Phaser's loop is currently driven, whether anything reads wall-clock time — and anything in the brief that conflicts with how the game actually works. Then start on D1 and D2. Don't move past determinism until AC2 passes. Flag anywhere where you think Plan.md needs updating.

## 2026-07-28

- Audited the factory docs and runtime. Phaser 3.90 normally uses rAF through `TimeStep`; race timing uses Phaser's scene clock.
- Randomness reachable during race creation/steps includes scenery placement, particles, and camera shake through global `Math.random`.
- Brief conflicts: course IDs were absent from `game-manifest.json`; circuit mode never sets `finished`; waypoint/random pure bots need checkpoint/seed state beyond the listed snapshot.
- D1 implementation in progress: harness-only lazy chunk, fixed 60 Hz manual `game.step`, seeded RNG, pinned 1280x720 viewport, virtual input, state and error capture.
- Added the four course IDs to `game-manifest.json`, pure D2 bot modules, and a three-run AC2 Playwright check using recorded waypoint inputs.
- AC2 passed after final cleanup for all four courses, three identical runs each:
  - eastbourne-pootle: 57500 ms, final (1303.754703483, 4589.579565675)
  - manfield: 6666.666667 ms, final (579.197769253, 1389.561818839)
  - remutaka: 75200 ms, final (4714.025951455, 748.980532353)
  - otaki: 72583.333333 ms, final (590.352777626, 601.012195558)
- Added `window.advanceTime` and `window.render_game_to_text` harness adapters for the standard web-game browser client.
- D2 smoke matrix passed: idle, pedal-to-the-metal, random, and waypoint each ran on all four courses without non-finite physics or captured harness errors.
- `npm run build` passes. Harness code emits as a separate lazy chunk; the loaded default chunk is 1,522.64 kB (354.37 kB gzip), versus the pre-change baseline 1,520.78 kB (353.51 kB gzip).
- Standard client headless screenshots were black even for the unchanged default title (SwiftShader capture issue). A headed rerun rendered the Eastbourne race correctly and its text snapshot matched the visible start state.
- The headed client logged one generic 404 console line (likely browser favicon); the AC2 pages, with external Google Fonts stubbed for offline CI, reported no page or harness errors.
- Generated screenshot directories were removed after visual inspection; no dev server was left running.
- TODO before D3+: decide whether AC5 means literal byte-for-byte default bundle size. Lazy loading excludes the 4.45 kB harness chunk from the normal request, but shared export/bootstrap overhead adds ~1.86 kB raw / 0.86 kB gzip to the default chunk.
- Do not proceed to D3+ until AC2 passes.

## 2026-07-29 — Phase 1 continuation

- Created `feat/playtest-ci` from merged D1/D2.
- Added responsive `?harness=1&ui=1` support for real mobile shell journeys while preserving the pinned deterministic harness by default.
- D3 `new-mobile-player` journey now passes using only real canvas taps and trusted CDP touch input: portrait open, landscape rotation, default course selection, touch-only finish, retry, and persisted best-time verification.
- Journey artifacts verified: trace, WebM video, checkpoint/result/retry screenshots, console log, and harness state timeline. Console/page/network logs are clean.
- Added the schema-versioned D5 threshold contract and the initial D4 matrix/report/mobile-control pipeline. A filtered Eastbourne idle run and waypoint run pass with named metrics and screenshots.
- Full matrix performance still needs validation; screenshot readback is the dominant cost. CI may need course-level parallelism to stay below five minutes.
- Full baseline passes: 16/16 course×bot runs, mobile controls, and the touch-only journey. Runtime is 423.9s without rebuilding, so D6 must parallelize by course and run shell checks separately.
- Added `npm run playtest`, focused/headed/debug switches, generated-output ignore rules, and `docs/playtest.md`.
- AC4 completed on `scratch/playtest-fault-injection` before any D6 work. All five faults went red and were named: `checkpoint-count`, `failed-request`, `out-of-bounds`, `runtime-error`, and `mobile-controls-out-of-viewport`.
- The missing-asset fault revealed that Vite's SPA fallback returns HTML/200 for a missing PNG. Added extension/content-type validation to classify this as `failed-request`; evidence is in `docs/factory/ac4-fault-injection.md`.
- D6 implemented only after AC4: four parallel course jobs, a separate mobile journey job, always-uploaded artifacts, combined schema report, sticky PR comment, and final verdict enforcement. Triggers are `pull_request`, `workflow_dispatch`, and daily `schedule`; there is no `pull_request_target`.
- Final production build passes. The standard headed web-game client renders the harness state correctly; after adding an explicit data favicon its console error log is empty.
- Local report aggregation was exercised with multiple partial artifacts and produced one combined schema-v1 JSON/Markdown report.
- The first live PR run exposed shell escaping in the catalog step: Node failed, but the surrounding `echo` returned success, so no course matrix was created. Replaced it with `playtest/catalog.mjs` and made report merging fail closed when any course/bot run, mobile inspection, or journey artifact is absent.
- D7 follow-up: focused `--course`/`--bot` runs now skip unrelated shell checks by default, so the documented `npm run playtest -- --course=otaki-rally --bot=waypoint --headed` command runs exactly one visible simulation. The full unfiltered command retains the complete CI-equivalent matrix, mobile inspection, and journey.
- A live D7 PR rerun exposed GitHub retaining the previous attempt's combined artifact. The merger now ignores reports already marked with `ci`, preventing aggregate re-ingestion, duplicate runs, and stale failures during partial job reruns.

## 2026-08-01 — 3D chase-cam pivot, Phase 0

Pivoting the game from top-down 2D to a 3D behind-the-car view, shipped as a
**second Vercel project** off `claude/3d-driving-game-pivot-urguck` so the live 2D
game on `main` is untouched. Plan: Three.js world canvas layered under a
transparent Phaser canvas that keeps sim, HUD, touch controls and the harness.

Phase 0 is deliberately behaviour-neutral groundwork:

- Branch identity: `game-manifest.json` → slug/id `beryl-racing-3d`, `package.json`
  renamed, and the four `storageKey` values namespaced to `beryl-racing-3d.*` so a
  3D best time can never overwrite a 2D record if both are ever proxied under the
  same `gilmore.games` origin.
- Extracted `RaceScene.scatterTrees()` placement into `src/scenery.js`. This is
  simulation, not decoration — it seeds the obstacle list — so the RNG draw order
  is preserved exactly and `displayWidth` is pinned to the tree textures' 128×128
  size rather than read off a Phaser GameObject.
- Deleted verified-dead code: `placeHayBales`, `placeTyreBarriers`, `offsetLoop`,
  `toPoints`, `closed` (RaceScene); `drawBeryl`, `drawGrass`, `drawTree`,
  `drawSkid` (art.js); the unused Arcade Physics config block and `void COLORS`
  (main.js); the `tarmac`/`tyre-barrier`/`hay-bale` texture loads (BootScene).
  Removed `tyre-barrier.png` and `hay-bale.png`.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE` now overrides the browser binary in
  `ac2-determinism.mjs` and `run.mjs`, for sandboxes whose Chromium build differs
  from the one Playwright would fetch. Unset in CI, so CI is unaffected.

### The AC2 baselines in the 2026-07-28 entry above were stale

`ac2-determinism.mjs` only ever asserted run-to-run equality across three runs —
it never checked the recorded values — so nothing caught it when 8bf33c6
("Longer/faster courses, bigger Beryl sprite") scaled every route ×2 and Beryl's
speed ×1.5. Three identical wrong runs pass that check.

It now asserts against pinned baselines **and** a SHA-256 fingerprint of the
scene's obstacle circles, which fails in seconds if the seeded scenery placement
drifts. `RECORD_BASELINES=1` re-records deliberately.

Re-recorded on 8bf33c6 (seed 0x0be4a1, waypoint bot), superseding the
2026-07-28 numbers:

| course | finish (ms) | final pos | obstacles |
|---|---|---|---|
| eastbourne-pootle | 100633.333333 | (2607.891752503, 9260.87269146) | `94932d480a8bac9b` |
| manfield | 12950 | (1267.719065648, 2845.114155003) | `e9472f88b60d3f2a` |
| remutaka | 142933.333333 | (9482.258917054, 1460.035772636) | `7ce0cd7df381210a` |
| otaki | 114900 | (1117.056728411, 1169.167557303) | `b18d1bde99ea4b85` |

Verified by recording the same four values on a clean `origin/main` worktree and
on this branch: **identical on every course**, including frame counts and obstacle
fingerprints. Phase 0 changes nothing the simulation can observe.

- `npm run build` passes; default chunk 1,521.79 kB (354.14 kB gzip), marginally
  below the 1,522.64 kB / 354.37 kB baseline.

### `playtest-spec.json` finish-time windows were stale too

Same root cause, same commit. A focused run confirmed `finish-time-range` was the
*only* failure — checkpoints 100%, no softlock, zero out-of-bounds — so the
simulation is healthy and the thresholds simply never got updated after 8bf33c6.
`npm run playtest` was therefore already red on `main`.

Re-baselined to −15%/+20% around the measured waypoint times:

| course | was | now | measured |
|---|---|---|---|
| eastbourne-pootle | 50000–70000 | 86000–121000 | 100633 |
| manfield | 5000–10000 | 11000–16000 | 12950 |
| remutaka | 65000–90000 | 121000–172000 | 142933 |
| otaki | 65000–90000 | 98000–138000 | 114900 |

No other threshold in the spec was touched.

## 2026-08-01 — 3D chase-cam pivot, Phase 1 (layering spike)

The world now renders in 3D from behind the car. Phaser keeps the simulation,
HUD, touch controls, audio, scene flow and the harness; its canvas is a
transparent overlay, and a Three.js canvas underneath draws the world.

- `src/render3d/`: `coords` (the single 2D↔3D mapping), `renderer` (singleton
  canvas + size mirroring), `palette`, `road` (ribbon + ground), `chaseCamera`,
  `index` (scene assembly + render hook). Beryl is a placeholder box this phase.
- The road mesh is built straight from `buildTrack()`'s existing `left`/`right`
  polylines — no new track maths — with per-quad vertex colours carrying the
  Ōtaki gravel/sealed split.
- Phaser is now `Phaser.CANVAS` with `transparent: true`. It draws only text and
  rounded rects, so a Canvas2D overlay keeps the page to **one** WebGL context
  rather than two — which matters most in headless CI, where SwiftShader has
  produced black captures before.
- The `uiCamera` workaround is gone. It only ever existed because the world
  camera zoomed and stranded HUD hit-areas in world space; with no world objects
  left in the Phaser scene, screen space and world space coincide again.
- three.js is dynamic-imported in `BootScene.create()` during the loading splash
  and passed to `RaceScene` via the registry, so it lands in its own chunk.

### Verified

- Heading mapping confirmed visually: at the start line the car sits centred on
  the road facing along it, camera squarely behind, on all four courses.
- The render hook is `POST_RENDER` guarded on its `renderer` argument.
  `headlessStep` emits that event with `renderer = null` and `step` passes the
  real renderer (checked in `phaser/src/core/Game.js`), so deterministic runs
  stay completely draw-free.
- `npm run build`: default chunk **1,516.03 kB (352.44 kB gzip)** — slightly
  *below* the pre-pivot 1,522.64 kB / 354.37 kB — plus a lazy
  **514.48 kB (130.41 kB gzip)** three.js chunk.

### Two real bugs this surfaced

**The harness never stopped the Title scene.** `loadCourse` starts Race directly
rather than going through TitleScene, so Title stayed active underneath. That was
invisible while the race painted an opaque ground rect over the viewport; with a
transparent HUD canvas, Title's grass backdrop covered the entire 3D world. Fixed
in the harness.

**Phaser `Text` consumes the seeded RNG.** Its constructor keys the text's canvas
texture with a UUID built from `Math.random`, so every text object quietly drew
from the stream the harness seeds. Ōtaki's crossbuck label was the only one
created *before* tree placement, so removing the 2D scenery shifted that course's
trees — and therefore its collision circles. Ōtaki's baseline is re-recorded
below; the other three courses are byte-identical to `main`.

This is now structurally fixed rather than worked around: `scatterScenery()` runs
at the top of `RaceScene.create()`, before any text or HUD exists, so UI churn can
no longer perturb gameplay placement.

| course | finish (ms) | obstacles | vs main |
|---|---|---|---|
| eastbourne-pootle | 100633.333333 | `94932d480a8bac9b` | unchanged |
| manfield | 12950 | `e9472f88b60d3f2a` | unchanged |
| remutaka | 142933.333333 | `7ce0cd7df381210a` | unchanged |
| otaki | 117433.333333 | `d06a791d3b7d28f2` | **changed** (see above) |

Ōtaki's new time still sits inside its re-baselined 98–138 s spec window.

## 2026-08-01 — 3D chase-cam pivot, Phases 2–3 (Beryl, road dressing)

- **Beryl** (`src/render3d/beryl.js`): procedural low-poly Morris Minor — turquoise
  body, lighter roof shell, dark glass band, chrome bumpers and hubcaps, round
  headlights, red pinstripe and tail lights, whitewall tyres. Built to the exact
  108.8 × 217.6 collision footprint. Visual-only body roll from `car.lateral`,
  pitch from acceleration, wheel spin from speed, front wheels following steering
  input, plus a flat contact-shadow disc. `buildBeryl()` returns
  `{ root, chassis, wheels, shadow }` so a glTF model can swap into `chassis`
  later without touching anything else.
- `Car.js` now uses `scene.make.sprite({ add: false })`. The texture-backed sprite
  still defines the collision footprint — `collideRadius` 54.4, `axleOffset`
  60.928, `boundsMargin` 108.8 — it simply never joins the display list.
- **Road dressing** (`road.js`, `markers.js`, `textures.js`): the road, kerbs and
  run-off apron now share one `buildRibbon()` builder. Manfield gets red/white
  rumble kerbs, a checkered start line and gate markers; the public roads get
  cream edging and a start gantry. The top-down `start-gantry.png` is replaced by
  a modest procedural arch — it sits directly over the car at the start, and a
  taller one swamped the opening frame.
- Checkpoint gate markers stand up as posts rather than the old 10px dots, which
  would have been invisible from behind the car.

### Tuning notes

- **Lighting.** A hemisphere light gives a horizontal normal the midpoint of its
  sky and ground colours, so the first rig (dim, deep-grass ground colour) left
  Beryl's turquoise rear panel — the one face the player looks at all race —
  reading as a muddy teal. Brighter sky, pale warm bounce, gentler sun.
- **Road and ground are unlit** (`MeshBasicMaterial`). They are flat horizontal
  surfaces, so Lambert shades every triangle by the same constant anyway; all the
  lighting rig added was a layer between the authored palette and the screen, and
  it had `COLORS.tarmac` reading as near-black. Meshes with real form stay lit.
- **Camera** raised and pulled back (dist 430, height 235, lookAhead 520). A chase
  camera shows far less of the route ahead than a bird's-eye view, so the rig buys
  back what forward visibility it can.
- `CAMERA_NEAR` 10 → 50 and the ground plane dropped to y = −8. Nothing renders
  between the chase camera and Beryl, so the tighter near plane was free
  resolution, and the road stack (ground, apron, road, start line, future skid
  decals) has enough near-coplanar surfaces to want the headroom.

### Playtest

Full matrix: **15/16**, mobile controls PASS, touch-only journey PASS.

The one failure — `manfield/pedal-to-the-metal`, softlock — is **pre-existing and
unrelated**. Verified by running the same focused case on a clean `origin/main`
worktree: identical result, identical 17% checkpoints / 86% off-road. That bot
holds full throttle with no steering, drives into the world bounds and is pinned
there by the clamp in `Car.js`. It is a bot artifact rather than a game defect,
so it is flagged rather than papered over by loosening the softlock rule.

## 2026-08-01 — Elevation (Phase 4)

Hills are a **gameplay** feature, not a visual one: gravity acts along the slope,
so climbs bleed speed and descents give it back. The point of Remutaka is a slow
car struggling up a steep windy road, and a chase camera made a dead-flat hill
climb absurd.

- **Eastbourne** — a ~20% drop off Ferry Road (28 Ferry Road is anchor 0, the top
  of the hill) onto the flat harbour road, then a gentle rise inland to the RSA.
- **Remutaka** — gentle rise through the lower sweepers hardening into a sustained
  ~13–14% grind through the summit switchbacks.
- **Ōtaki** — steep loose descent out of the valley, easing across the farm flats,
  near-flat through the township to the beach.
- **Manfield** — deliberately flat. It is a purpose-built circuit.

### Design

- `geometry.elevation.profile` is a list of `{ at, h }` control points keyed to a
  fraction of the route, smoothstepped between (`sampleProfile` in `track.js`).
  Linear interpolation put a visible crease across the road at every control
  point. `buildTrack()` returns `heights[]` per sample, mirroring `surfaces[]`.
- Profile heights scale with `LENGTH_SCALE` alongside the anchors, so the
  **grade** is preserved. Without that, doubling route length would have halved
  every gradient and quietly turned the climb back into a ramp.
- `gravity` joins `SPEED_FIELDS` for the same reason — it is px/s² like `accel`,
  and if it did not scale with it the climb penalty would shrink relative to
  Beryl's power.
- **`src/terrain.js` is one grid with one query.** Each cell takes the height of
  its nearest centreline sample, a few blur passes soften the Voronoi seams into
  a hillside, and cells near the road are re-stamped to exact road height so the
  road stays embedded rather than hovering over a smoothed version of itself.
  Beryl's height, the camera, the physics grade, the ground mesh and (next) the
  scenery all read `heightAt()`. The obvious alternative — road height on-road,
  terrain height off-road — steps at the boundary and floats the car the moment
  she leaves a switchback, which on a hill climb is most of the time.
- **The hill never wins.** The climb penalty is capped below Beryl's own
  acceleration (`maxClimbPenalty`), so full throttle always nets forward
  progress. She crawls and strains, but is never stopped dead.
- Descents earn a little over the flat top speed (`downhillOverspeed`). Without
  it the existing hard clamp to `maxV` swallowed everything gravity gave back and
  a descent felt identical to the flat. Measured: Beryl hits 156 down Ferry Road
  against a flat top speed of 132.

### Results

| course | was | now | note |
|---|---|---|---|
| eastbourne-pootle | 100633 | **98650** | net faster — the descent outweighs the inland rise |
| manfield | 12950 | **12950** | flat, and unchanged to the last digit |
| remutaka | 142933 | **204383** | **+43%** — the climb, exactly the point |
| otaki | 117433 | **110183** | net faster — inland-to-coast descent |

Obstacle fingerprints are unchanged on all four: elevation touches no RNG.

**Manfield being byte-identical is the real check.** Flat courses pass `grade = 0`
and the `if (grade !== 0)` guard in `Car.update` means not one extra
floating-point operation runs, so a course with no hills cannot drift.

### Two render bugs found and fixed

- The chase camera tracked the slope ahead exactly, which on a 14% grade pitched
  it so far that Beryl slid off the bottom of the frame — the road ahead framed
  beautifully, the car you are driving gone. It now follows 45% of the slope.
- The slope tilt was applied to the chassis, which is the parent of the body but
  not the wheels, so the shell tipped over four wheels lying flat. The terrain
  tilt now goes on the root (wheels included) and only weight transfer stays on
  the chassis. The root also needs `rotation.order = 'YXZ'`, or pitch is applied
  in world space and shears the car sideways whenever she is turned *and* on a
  slope at once.

## 2026-08-01 — Scenery, signage and FX (Phases 5–7)

The port is now feature-complete against the 2D build.

- **Trees** (`render3d/trees.js`): three instanced low-poly variants with distinct
  silhouettes — broad pōhutukawa, tall shelter-belt conifer, wide macrocarpa — plus
  instanced contact shadows, seated on `terrain.heightAt()`. Canopy diameter tracks
  the sprite width the collision radius derives from, so what you bump is what you
  see. Yaw comes from a positional hash, never `Math.random`.
- **Eastbourne** (`themes/eastbourne.js`): harbour water, foam line along the shore,
  and the seawall as a **real mesh**. In 2D it was an invisible row of collision
  circles you bumped into for no visible reason.
- **Ōtaki** (`themes/otaki.js`): the river running under the road as a proper
  bridge crossing, with banks and parapets, plus the railway sleepers and rails and
  the beach.
- **Signage** (`render3d/signs.js`): landmarks, arrows, the finish marker and the
  crossbuck as upright boards on posts, yawed to face oncoming traffic. Not
  billboards — a board that swivels as you drive past instantly reads as a sprite
  pretending to be an object.
- **FX**: skid marks as a 2000-quad ring buffer whose corners follow the terrain,
  and a 120-sprite puff pool with one material per particle so each fades on its
  own schedule. Both use local seeded PRNGs, never the global stream.

### Water needs the ground carved out from under it

The height field follows the road, so anything at a *fixed* level starts out
buried. Eastbourne's harbour sat inside the Ferry Road hill (every cell out in the
water took its height from a road sample 200 units up the slope) and Ōtaki's river
vanished under the bridge it runs beneath.

`Terrain` now carves regions to a fixed level before blurring — oriented
rectangles, so a river can cut across the road at an angle; a coastline is just
the angle-0 case. Road cells are pinned first, so the bridge deck stays up while
the land either side drops to the water. The river region is generated in
`buildTrack()` rather than authored, because it has to line up with the checkpoint
the crossing scenery is already keyed to.

Tightening `ROAD_PIN_FACTOR` (so water reaches closer to the bridge) changes the
height field, and therefore the grade, and therefore the physics — the three
elevated courses were re-recorded again. Manfield, being flat, did not move.

## 2026-08-01 — A real steering bug, found by the hill

Elevation made `remutaka/waypoint` softlock in the playtest matrix: the bot
finished the course, but spent minutes at a near standstill on the way.

The first two diagnoses were wrong and are worth recording, because both looked
convincing:

1. *"The climb penalty cap isn't working."* It was. Full throttle on a 26% slope
   still nets ~+18 px/s². Softening the profile and dropping `gravity` from 270 to
   200 changed nothing.
2. *"She's wedged head-on against a tree."* She was, once — at frame 5660, nose
   exactly on a trunk, full throttle, zero steer, going nowhere for 56 seconds.
   But a tangential escape nudge only moved the stall somewhere else. (My first
   attempt scaled the nudge by the overlap, which is *zero* once the push-out has
   done its job — a fraction of a pixel per frame. The second recomputed the
   escape direction every frame, so the contact normal swung and she vibrated
   sideways at 21 px/s instead of leaving.)

The actual bug is in `Car.update` and predates all of this:

```js
const dir = vForward >= 0 ? 1 : -1;   // steering inverts when reversing
```

Taking the raw sign of `vForward` makes `dir` chatter whenever speed hovers
around zero. A car nudged back and forth — stopped on a hill, or resting against
scenery — gets its steering direction flipped every few frames, so it jitters on
the spot and can never turn to point anywhere. The bot was steering hard the
whole time and going nowhere.

A small deadband (`vForward < -maxSpeed * 0.01`) fixes it: steering only inverts
once she is genuinely reversing. The longest near-static window on Remutaka went
from ~9,000 frames to 10.

The hill did not cause this. It only made Beryl stop often enough to expose it —
which is a fair argument for keeping a dumb bot in CI.

**Baselines after the fix:** eastbourne, manfield and otaki are byte-identical to
their pre-fix values; only remutaka moved (202817 → 204383 ms). The deadband can
only matter where a car actually hovers around zero speed, and only the hill
climb does.

The tangential-escape experiments were reverted. They did not fix the real
problem, and "you can never rest against a tree" is a gameplay change that should
be argued on its own merits rather than smuggled in as a bug fix.

### Known failure: `remutaka/waypoint` softlock (RESOLVED — see the road-width entry below)

> **Update, later the same day:** this stopped failing when `roadWidth` doubled.
> The wider road keeps the waypoint bot away from the tree line on the
> switchbacks, so she never reaches the head-on contact described here. The sharp
> edge in `resolveObstacles()` is still there and still worth reworking — nothing
> below is wrong — but it is no longer reachable from a normal racing line, and
> the matrix now passes this case. Kept in full because the diagnosis stands.


The playtest matrix fails this one case. Beryl drives head-on into a tree at full
throttle and stops dead for ~5 seconds — under 3px of movement across 300 frames,
which is exactly what the softlock rule is meant to catch. She does finish the
course afterwards; the run is not lost.

The mechanism is a sharp edge in `resolveObstacles()` that predates elevation. A
head-on contact cancels the entire inbound velocity *and* the geometric push-out
re-seats her on the obstacle surface every frame, so nothing she does with the
throttle can free her — only a tangential escape can, and she has none.

Four fixes were tried and all reverted:

| attempt | result |
|---|---|
| tangential escape scaled by overlap | overlap is zero once the push-out has run — worth a fraction of a pixel |
| tangential escape at 14% of top speed, direction recomputed per frame | contact normal swings, so the side flips every frame and she vibrates in place |
| same, direction latched | frees her, but shoulders her far enough off line that she never finishes |
| same at 5% | worse — stuck outright elsewhere |
| partial collision response below a crawl | no effect; the position push-out, not the velocity, is what holds her |
| widening tree clearance from the road | no effect on this contact |

Elevation did not introduce this; it made it reachable, by giving Beryl somewhere
she actually comes to a stop. Fixing it properly means reworking the collision
resolver so a stationary contact can be escaped — worth scoping deliberately
rather than bodging, so it is left failing and visible.

Two genuine bugs *were* found on the way here and are fixed: the steering-direction
chatter in `Car.update` (above), and the harness leaving the Title scene running
under the race.

## 2026-08-01 — Fullscreen fix, icon controls, more pep, Pootle → Dash

### Fullscreen blanked the world

Going fullscreen left the HUD and buttons working over a completely black world.

`ScaleManager.getFullscreenTarget()` creates its own wrapper div and moves **only
`this.canvas`** into it. The Three.js canvas is a sibling in `#game`, so it was
left behind outside the fullscreen element — Phaser's transparent HUD canvas went
fullscreen on its own, with nothing underneath it.

Fixed with `scale.fullscreenTarget: 'game'`, so the container and both canvases go
in together. Verified: the target is now `#game`, `_createdFullscreenTarget` is
false, and both canvases report as inside it.

### Controls are icons

"FULL SCREEN" and "SOUND ON" ate a lot of a phone screen and competed with the
HUD. They are now square icon buttons (`src/ui/iconButton.js`).

The glyphs are **drawn as vectors, not set as text**. Font and emoji coverage for
⛶ and 🔇 is patchy — Android substitutes or drops them — and a control that
renders as a blank box is worse than a wordy one.

One geometry note worth keeping: the fullscreen brackets first shipped with arms
a third of the button long, which made all four meet in the middle and read as a
solid filled square. Opposing arms need a clear gap.

### More pep

`SPEED_SCALE` 1.5 → 1.8, plus a new `ACCEL_SCALE` of 1.3 applied to acceleration
and braking only. Top speed is what a course is capable of; acceleration is what
it *feels* like, and a car that takes three seconds to wind up feels slow however
high the number at the end is. Braking rises with it so the cars don't become
quick to gather speed and hopeless at losing it. `GRIP_SCALE` 1.25 → 1.4 to keep
the faster car on the same-width roads.

About 18% off every course:

| course | was | now |
|---|---|---|
| eastbourne-dash | 98650 | **81967** |
| manfield | 12950 | **10617** |
| remutaka | 204383 | **168733** |
| otaki | 110183 | **90333** |

Obstacle fingerprints are unchanged — speed does not touch scenery placement.

### Eastbourne Pootle → Eastbourne Dash

Renamed throughout, including the course id (`eastbourne-pootle` →
`eastbourne-dash`), its `storageKey`, the HUD and results copy, `game-manifest.json`,
`playtest-spec.json`, the AC2 baseline key, and `docs/tracks/EASTBOURNE-DASH-PRD.md`.
No "pootle" remains outside this progress log, which is a historical record.

Because the course id is also the best-time storage key, any local best time saved
under the old name is orphaned. That is fine here: this is a separate deployment
with its own keys and no published records.

## 2026-08-01 — Eastbourne parallax backgrounds (PR #20)

Merged. Distant harbour ridges, inland bush, a village roofline, sun and clouds,
placed as real geometry in depth bands beyond the playable route, so the chase
camera gets parallax for free rather than needing per-frame background code.
Render-only, no collision, no RNG — determinism verified unchanged.

The harbour previously faded to a bare flat horizon; it now reads as Wellington
Harbour with a far shore, and the inland turn toward the RSA has hills behind it.

### One defect fixed on merge: the far plane

The background bands are deliberately `fog: false` — they sit well past `FOG_FAR`,
so with fog on they would wash entirely to sky and be invisible. That is the right
call, but it left them at the mercy of the camera's far plane: `CAMERA_FAR` was
3600, and the clouds and sun sit at fixed world points along a 10,000-unit route.
A cloud simply vanished at the far plane instead of fading, then popped back as
the camera closed on it.

`CAMERA_FAR` is now 14000. This is close to free: depth precision is dominated by
the *near* plane, and with near at 50 the change costs well under a percent of
resolution. Nothing extra is really shaded either, since everything beyond the fog
band already resolves to sky colour.

Worth remembering for other courses: an unfogged background layer has to be inside
the far plane for the whole route, not just where it was authored.

### Noted, not fixed

The `28 FERRY ROAD` landmark sign sits about 200 units from the start line, so at
the opening frame it fills most of the screen. It predates this PR (it came in
with the signage pass) and it is arguably charming — it is Beryl's home address —
but it does bury the first thing a player sees.

## 2026-08-01 — Two-lane roads and a dashed centre line

### The roads were one lane wide

Doubled `roadWidth` on every course: Eastbourne 180 → 360, Manfield 300 → 600,
Remutaka 150 → 300, Ōtaki 160 → 320. The default in `config.js` moved with them.

Worth writing down why the request and the scale agree. Beryl is 217.6 units for
a ~3.7m car, so the world runs at about 59 units/metre. That made Eastbourne's
180-unit road **3 metres** wide — a single lane with just enough room for one
car, which is why a centre line had nowhere to go. At 360 it is a little over 6m:
a real two-lane road, and now wide enough to mark.

Nothing needed rewiring. Everything downstream already derived from
`TRACK.roadWidth` or `track.half`: the offset edge polylines, the on-track test,
tree clearance, terrain road-pinning, signage and gate-post offsets. `roadWidth`
is still deliberately *not* scaled by `LENGTH_SCALE` — that would change apparent
road width with route length, which is not what the scale pass is for.

### It is a gameplay change, and the bots say so

All four AC2 baselines and every finish-time window were re-recorded. The width
reaches the simulation three ways: the on-track test covers twice the area, so
the grass speed penalty applies far less often; tree placement rejects anything
within `roadWidth / 2 + 90`, moving the whole obstacle field outward and changing
every fingerprint; and the terrain pinning radius grows with it.

| course | was | now |
|---|---|---|
| eastbourne-dash | 81967 | **63167** |
| manfield | 10617 | **8383** |
| remutaka | 168733 | **82317** |
| otaki | 90333 | **79050** |

Remutaka halving is the headline. The bots are not faster — they are no longer
falling off the switchbacks and grinding along the grass, which is also why the
`remutaka/waypoint` softlock above stopped reproducing. The matrix is 15/16, with
only the pre-existing `manfield/pedal-to-the-metal` softlock left.

### The centre line

`buildCentreLine()` in `render3d/road.js`, one mesh and one draw call for the
whole course.

The dashes are laid by walking the centreline and **clipping each segment against
accumulated arc length**, not by painting every Nth sample. Samples are evenly
spaced in *parameter*, not distance — a long straight anchor span and a tight
hairpin produce very differently sized steps — so per-sample dashes would visibly
stretch on the straights and bunch in the corners. Clipping keeps every dash the
same length on the ground, which is the thing the eye actually checks.

Two places it deliberately does not paint:

- **Gravel.** Ōtaki's unsealed section has no seal to mark, so the loop skips any
  sample where `surfaces[i] === 'gravel'`.
- **Manfield.** A race circuit has no centre line. It already has rumble kerbs and
  a start/finish line, which is what actually marks a racing surface. One
  condition in `render3d/index.js`, trivially flipped if that reads wrong.

Sits at y = 0.4 — above the apron at 0.2, below the kerb lip at 5 — so it stacks
cleanly in the existing road-surface ordering without z-fighting.

## 2026-08-01 — Eastbourne landmark models (PR #21)

Days Bay Wharf, Williams Park, Rona Bay, the village shop strip and the RSA, as
real low-poly geometry rather than a name on a board. All code-built; the only
raster surfaces are runtime-drawn text labels on physical signboards, using the
`labelTexture()` path the course furniture already uses.

`signs.js` now suppresses the freestanding board for any name a model carries
(`WILLIAMS PARK`, `RONA BAY`, `EASTBOURNE RSA`) and shrinks the two that remain,
so the names appear once each.

### Fixed on merge: two sources of truth for where a landmark is

As submitted, the models were positioned by world proportions (`W * 0.46`,
`H * 0.32`, …) invented in the landmark file, while `def.landmarks` — the list
the signs are built from — said something different. They disagreed by 300–740
units, and Rona Bay was on the *opposite side of the road* in the two. Because
the PR also deletes the roadside board, the name would have silently moved to
wherever the model happened to be.

Placement now reads `def.landmarks`, so there is one authored position per
landmark and these follow any re-authoring of the route or change of
`LENGTH_SCALE` for free. `buildEastbourne()` takes `(track, def, terrain)` to
match `buildOtaki()`.

### Fixed on merge: models sitting in the road

The authored point is where a *sign* stood — at the roadside. A building on that
point is in the carriageway, so each model is pushed outward along the road
normal until it clears the kerb by 90 units, with the setback measured from the
model's own bounding box.

A single perpendicular setback is not enough, and the reason is worth keeping.
These models are 400–740 units wide and sit parallel to the tangent at their
anchor, but Eastbourne's road curves away underneath them — so the far end
swings back over the carriageway even though the near corner cleared. Measured
against the whole centreline, the village shops overlapped the road by **163
units** and the RSA by **74**. The push is therefore iterative: seat, measure the
footprint against the entire route, push again. Distance is computed
point-to-rectangle against the world AABB, which is exact for a box and
conservative for the model inside it.

Measured clearance past the kerb, after: wharf 380, Williams Park 90, Rona Bay
93, shops 93, RSA 94.

This was only visible because the roads had just doubled. At the old width the
RSA cleared by 58 units and the flaw would have shipped looking fine.

### Rona Bay goes inland

Its name marker is authored on the seaward side, but the strip between the road
and the seawall is about 320 units — narrower than the shelter once set back, so
honouring that side buried it *inside* the seawall mesh. It sits inland instead.
The name, which is what the landmark is for, is unchanged.

Render-only throughout: all four AC2 baselines and obstacle fingerprints are
byte-identical, and the matrix is 15/16 with no console errors.

## 2026-08-01 — Manfeild: the real layout

The circuit course is no longer an invented oval. Its centreline is now the
actual Manfeild Circuit Chris Amon layout, traced from MotorSport New Zealand's
official CRO map (`CRO004d`). Method, source and the deliberate departures from
reality are in `docs/tracks/MANFEILD-LAYOUT.md`; the short version is that the
map's track outline is a bitmap, so the line was recovered by separating the
loop's inside from the page's outside and keeping the pixels equidistant from
both. 46 anchors hold it to ~1.5 m at true scale.

The lap is the real 3.03 km, clockwise, starting at the real start/finish line,
with the eight marshal posts signed where the map puts them.

### Three things had to move with it

- **Road width 300 → 180.** The real layout's tightest corner has a ~14 m
  radius. A 300-wide road pinches its inside edge to nothing; 180 (≈22 m, still
  nearly twice the real 12 m) clears it with room to drift.
- **Checkpoints 6 → 18.** Not a gameplay call. The waypoint bot steers straight
  at the next checkpoint, and this layout doubles back on itself twice, so gates
  6 apart put the bot's target line across the infield rather than along the
  road. At 6 it wandered into the grass and never finished a lap; at 18 it drives
  the circuit.
- **Lap-time window 9–13 s → 16–25 s**, for a lap that is now roughly twice as
  long. `playtest-spec.json` carries both this and the checkpoint count.

Beryl's handling numbers are untouched.

### Baselines

The waypoint bot laps in **19867 ms**, 100% of checkpoints, no softlock, zero
out-of-bounds. Off-road time went *down*, 62% → 25%: with gates this close
together the bot follows the road instead of cutting across the middle of it.
The AC2 determinism baseline for `manfield` is re-recorded — geometry this
different necessarily moves the finish position and the scenery fingerprint.
The other three courses are untouched and byte-identical.

The full suite has one failure, `remutaka/waypoint` softlock, and it is not
this change: stashing the change and re-running gives the identical failure,
and remutaka's recorded finish time and obstacle fingerprint never moved.

### And then the trees

The first cut left the tree scatter alone, and on a folded layout that meant
woodland in every gap between the straights. `scatterScenery` now keeps trees
out of a circuit's footprint entirely (`def.mode === 'circuit'`), so the site is
open grass and the trees ring it, the way the shelter belts around the real
place do.

The filter is the convex hull of the centreline, and the first attempt — testing
whether a point is *enclosed by* the centreline — was wrong in an interesting
way. On a layout that folds back on itself, the gap between two parallel
straights is **outside** the closed centreline: you cross the track once going
in and once coming out, so parity puts you back where you started. It cleared
the three genuinely enclosed pockets and left the big middle gap, which is the
one you actually look at. The hull treats the whole site as one venue and does
not care how the loop is folded.

Placement stayed inside its try budget: the hull covers 45% of the world, so
about a third of candidate positions are still accepted and all 90 trees place.

The obstacle fingerprint moved, so `manfield`'s baseline is re-recorded again.
Its finish time and position did not move between the two tree attempts — the
trees that shifted were ones the bot never touched.

### Merge notes: road width, and building Manfeild bigger than the map

Two things were reconciled when this landed on `3d-port`.

**The road-width regression this exposed.** Doubling every `roadWidth` for the
two-lane pass was geometrically wrong on three of four courses, and reviewing
this PR is what surfaced it. `track.js` offsets the centreline by ±half along
its own normal, so once half exceeds a corner's radius the two edges cross and
the road folds through itself — visible at Remutaka's switchbacks as the kerb
line cutting diagonally over the tarmac. Measured minimum corner radius, and so
the ceiling on `roadWidth`:

| course | min radius | ceiling | had been | now |
|---|---:|---:|---:|---:|
| eastbourne-dash | 301 | 602 | 360 | 360 |
| remutaka | 130 | 260 | 300 | 240 |
| otaki | 150 | 299 | 320 | 280 |
| manfield (old oval) | 170 | 339 | 600 | — |

**Manfeild is built bigger than the map.** At the traced layout's own
proportions the tightest corner has a 122-unit radius, capping the road at 244 —
too narrow for a drifting game, and well short of the 450 asked for. `roadWidth`
is deliberately not scaled, but every corner radius is, so a new optional
per-course `lengthScale` (2.05 here, applied on top of `LENGTH_SCALE` in
`scaleCourse`) enlarges the site until 450 fits with margin: minimum radius 250,
ceiling 501.

The trade is lap length. The bot laps in 34.9 s rather than the 20.0 s it ran at
map scale — sub-linear, because the gentler corners let it carry more speed, but
still a longer lap. A racetrack is a place with a size, and its size is the part
that was safe to change: what makes Manfeild recognisable is the *sequence* of
corners, and that is untouched. 450 at ~30 s was not available; ~400 would have
been.

No centre line, per the circuit's existing treatment — rumble kerbs and a
start/finish line are what mark a racing surface.

**The matrix is 16/16 for the first time.** The `manfield/pedal-to-the-metal`
softlock, which had failed since the playtest harness was built and reproduced
identically on `main`, is gone: it lived in a wedge in the invented oval that the
real layout does not have. The `remutaka/waypoint` softlock went earlier, with
the wider roads. There are now no known failing cases.
