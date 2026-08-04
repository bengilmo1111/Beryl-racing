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

## 2026-08-01 — Manfeild art pass (PR #23)

A tree-free period club-racing venue for the circuit: six corrugated pit
garages, pit wall, timing tower, paddock sheds and fuel drums; a timber
grandstand; eight numbered marshal huts with flag racks that replace the
freestanding `POST n` boards; post-and-wire fencing along the main straight;
straw-bale stacks at eight corners; painted period advertising boards; and
subtle mown infield bands. All code-built geometry — no sprites, textures or
imported models, with sign lettering rendered at runtime.

Manfeild opened in 1973, so there is no literal 1960s Manfeild. The pass keeps
the real traced layout and borrows the visual language of late-1960s NZ club
racing. `docs/tracks/MANFEILD-ART-PASS.md` carries the research and that caveat.

### Three things fixed on merge

**The venue was dispatched from `signs.js`.** `buildSigns()` returned the entire
Manfeild kit — pit complex, grandstand, fencing, bales — on the grounds that it
avoided "adding another render hook". That is the wrong trade: `index.js`
already has theme hooks for Eastbourne and Ōtaki, and routing a venue through
the signage module hides it from the one place a reader looks for scenery. Now
dispatched from `index.js` beside the other two; `buildSigns()` returns an empty
group for Manfeild, which is honest — it has no freestanding signs.

**`buildCheckpointGates()` was left as a stub returning an empty Group**, still
imported and called. Removed outright, along with its now-unused `acrossRoad`
helper, with a comment recording why the posts went: they marked all eighteen
invisible simulation gates and made the circuit read like a driving test.

**Dead hull code.** With Manfeild returning early from `scatterScenery` and
being the only `mode: 'circuit'` course, `centerlineHull`/`insideHull` became
unreachable. Removed — but the reasoning behind them is preserved in a comment,
because it is the non-obvious part and any future circuit will need it: on a
layout that folds back on itself, the gap between two parallel straights is
*outside* the closed centreline, so an enclosure test leaves woodland in exactly
the gap that looks worst.

Also restored the load-bearing comments the PR stripped from `scenery.js`,
`signs.js` and `markers.js` — the RNG draw-order contract, the `TREE_TEXTURE_SIZE`
rationale, the `facingTraffic` yaw derivation, the DoubleSide note and the
per-theme placement filters.

Added one comment that was missing: a course wanting no trees must return
*before* the loop, as Manfeild does, rather than filter every candidate away
inside it. Bailing out early consumes no draws; rejecting 1200 candidates would
consume 2400 and move the stream for anything seeded after it.

### Verification

Manfeild's obstacle fingerprint is now `4f53cda18c2baa0c` — the SHA-256 of `[]`,
since the circuit has no collision circles left at all. Its finish time and
position did not move, which is the check that the trees being removed were ones
the bot never touched. Eastbourne, Remutaka and Ōtaki are byte-identical.

Matrix 16/16, no failures.

### Noted, not fixed

This reverses part of the previous entry: PR #22 deliberately kept trees *ringing*
the circuit as shelter belts and only cleared the infield. The art pass removes
them entirely, which leaves the far side of the lap — away from the pits and
grandstand — very bare. The bales and advertising boards are spread around the
lap, but between them there is now open grass and nothing else.

## 2026-08-01 — Manfeild parallax, and fog becomes per-course

### The Manawatū beyond the fence

`themes/manfeildParallax.js`, replacing the outer ring of trees the art pass
removed with distance instead of objects. What makes that skyline recognisable
is two things: the long wall of the **Tararua and Ruahine ranges** across the
eastern horizon, and **Mount Taranaki** alone to the north-west. Between them and
the track is farmland, so the middle distance is **shelter belts** — the dark,
hard-edged macrocarpa and poplar rows on every Manawatū paddock boundary. That is
what gives the circuit trees on the horizon without putting a ring of collidable
trunks around a course meant to be driven flat out.

Also paddock bands in two greens, five farm sheds for scale, and high cumulus.

Taranaki is one cone with a snow cap and nothing else: its silhouette *is* the
recognition, so detail would only dilute it.

### Extracted the shared parallax kit

Eastbourne's ridge builder assumed the band runs along Z, which is right for a
north-south coast road and wrong for a circuit that is twice as wide as it is
deep. `themes/parallax.js` now holds `ridgeGeometry`/`ridge`/`addCloud`/
`markDecorative` with an `along` axis, and both themes use it. Eastbourne's
numbers are unchanged and its bands render identically.

### Bands are placed off the track's bounding box, not the world's

Worth recording, because the first attempt used fractions of the world and two
of them landed on the racing surface. **The circuit fills z 0.15–0.84 of its
world**, so "safely peripheral" world fractions are nothing of the sort: a
shelter belt at 0.66 H sat across the infield and a paddock at 0.8 H sat on the
main straight. Placement now derives from the centreline's real z extent
(1208–6614) plus a margin that also clears the venue.

A second bug in the same pass: the paddock bands were at y = −30, which is
*below* `road.js`'s `GROUND_Y` of −8. The ground quad spans six times the world,
so they were completely hidden. They sit at −3 now — above the ground, below the
road.

### Fog is per-course now

`FOG` in `config.js`, filled by `applyTrack` from an optional per-course `fog`
block, defaulting to the old 1200–3000. The engine-wide constants in `palette.js`
are gone.

The old band was tuned for the point-to-point courses, where fog hiding the road
round the next headland is a feature. On a circuit it is not: 3000 units is about
fourteen car lengths, which erased the pit complex, the grandstand and the
opposite straight — the things that tell you where you are on a lap that folds
back on itself twice. Manfeild runs **3200–9000**, which keeps the venue legible
and still washes the horizon into the ranges. The other three are unchanged.

### `CAMERA_FAR` 14000 → 24000

Same class of bug as the Eastbourne cloud popping, found before it shipped:
unfogged background bands must be inside the far plane for the whole route, and
**Manfeild's world diagonal alone is 16,511**. Ōtaki's 14,708 was already
fractionally over. 24000 clears the largest world with room for bands placed
outside it, and costs well under a percent of depth resolution — precision is
dominated by the near plane, which has not moved.

Render-only: all four AC2 baselines and obstacle fingerprints byte-identical,
matrix 16/16.

## 2026-08-01 — Eastbourne rebuilt around the real road network (PR #25)

A much longer route: 28 Ferry Road, a long steep descent and the hard left onto
the coast, Marine Drive hugging a continuous narrow beach, then Eastbourne
village as a **network** — Marine Parade, an inland route and two cross streets —
so the run to the RSA is a choice of streets rather than one ribbon. The clinic,
shop strip and Muritai School sit in map order. No signs, gantry or finish label:
the place is communicated by geography and architecture.

Waypoint bot 63.2 s → **108.1 s**. Baselines deliberately re-recorded; Manfeild,
Remutaka and Ōtaki byte-identical.

### Branch roads

`buildTrack()` now returns `roads[]`, and each `centerline` array carries a
**non-enumerable `network` back-reference** to the whole set. That is the neat
part: `distanceToCenterline()` follows it, so every existing simulation call site
— the on-track test, scenery placement, the harness — treats all five streets as
driveable without a single change. Branch heights are copied from the nearest
primary sample so junctions do not step.

### Fixed on merge

**The route was patched in at apply time.** `applyTrack()` called
`applyEastbourneRoute(def)`, overwriting world, geometry, storage key and
landmarks — while `tracks.js` still held the old prototype route, looking
authoritative and doing nothing. Editing it would have had no effect. Exactly the
two-sources-of-truth failure fixed in PR #21 and PR #22. The route now *is* the
`tracks.js` entry (importing its data from `eastbourneRoute.js`, which is just a
big data file), with a new `preScaled` flag so `scaleCourse` leaves already-final
coordinates alone while still applying the physics scaling every course gets.

**`render3d/landmarks/` was orphaned.** The new theme builds the wharf, clinic,
shops, school and RSA itself from `EASTBOURNE_LAYOUT.places`, so nothing imported
the landmark module any more. Deleted.

**Restored the stripped comments**, in `index.js`, `scenery.js` and `track.js`.
One of them matters more than the rest: the note on `POST_RENDER` explaining that
Phaser emits it from *both* `step()` and `headlessStep()` and that the
`renderer = null` argument is the discriminator. That guard is the only reason
deterministic harness runs stay draw-free, and without the comment it looks like
a redundant null check. Also restored the RNG draw-order contract in
`scenery.js`, and moved the roadWidth-ceiling explanation into `buildEdges` in
`track.js`, which is where the failure actually happens.

**Two render defects the new course exposed.**

*Floating fragments on the skyline.* Eastbourne's parallax carried two inland
bush bands and a village roofline, all pinned to a fixed height above sea level.
The rebuilt course climbs to 320 units at the top of Ferry Road and now builds
real hills and a real village in that same band, so the parallax was buried in
the hillside with only its peaks showing — reading as debris in the sky. All
three inland elements removed; the theme supersedes them. The seaward harbour
bands stay.

*The village read as a paved yard.* Five roads converge there, and each was
drawing its own apron, kerbs and centre line, so ten painted edge lines, ten
run-off bands and five lines of dashes all crossed at the junctions. Branch roads
are now bare tarmac — which is both what a village side street looks like and
what makes the junctions read as junctions.

### Noted, not fixed

Some buildings clip the road edge. Measured against the world AABB (conservative,
so true overlap is smaller), the worst are about 29 units into a 360-wide road,
and the shops and RSA anchor points are inside their nearest carriageway. The
fix is the one used for the landmark models in PR #21 — push each building out
along the road normal until its footprint clears the kerb — but the theme places
~127 objects at hand-authored positions, so it is a bigger change than it looks.
Nothing reads as broken in play.

## 2026-08-02 — Buildings are solid

Every building on every course is now something Beryl cannot drive through, and
the buildings that were clipping Eastbourne's roads have been pushed properly
clear.

### `src/structures.js`

The two halves of the problem turned out to be one problem. Buildings were
authored inside `render3d/`, which is a **lazily-loaded chunk the simulation must
never import** — so collision could not see them, and any fix that added
collision separately would have created a second set of positions to drift out of
sync. That is the same failure mode as the seawall, PR #21's landmarks and PR
#25's route.

So footprints moved into simulation-land as one list. `buildStructures(def,
track)` returns `{ x, z, w, d, yaw, kind, ... }` per building; `RaceScene` turns
them into collision circles, and each render theme places its models at exactly
those poses. Nothing consumes RNG — positions are authored — so the seeded
scenery placement in `scenery.js` is untouched; only the obstacle list changes.

Coverage: Eastbourne's 17 coastal villas, park shelter, clinic, shop strip,
school and RSA; Ōtaki's six farmhouses and their sheds; Manfeild's pit wall, six
garages, timing tower, three paddock sheds, grandstand and eight marshal huts.
Remutaka has no buildings.

### Clearing the roads

`pushClear()` moves a building out along the road normal until its footprint
clears the kerb by 70 units, measured against **every road on the course** and
re-measured after each push. Iterating matters for the same reason it did for the
landmark models: a footprint hundreds of units wide, sitting beside a curving
road — or beside a *second* road it was never measured against, which is what
Eastbourne's village has — swings back over the carriageway even after its near
corner cleared. Worst clearance is now +72 on Eastbourne and +111 on Ōtaki,
against −29 and worse before.

### Two things this surfaced

**Manfeild's grandstand was standing on the ess.** It was placed directly
opposite the pits, which is the right instinct on a normal circuit and wrong
here: Manfeild's layout folds back on itself, so the ground across from the
start/finish line is not open infield — the ess runs through it. Its footprint
overlapped the racing surface by 225 units. Moved along the main straight
(`MANFEILD_STAND_Z`, shared with the theme so model and footprint agree).

**The seawall was derived from the wrong numbers.** It still used fractions of
the world from the prototype course, which after the rebuild happened to land
within ~55 units of the beach edging the theme draws. That is luck, not
agreement. It now walks `EASTBOURNE_LAYOUT.shoreline` — the same polyline the
beach is drawn from.

### Collision shape

A long building becomes a row of circles along its major axis, since the car
collides against circles and one circle round a 900-unit grandstand would block
half the paddock. The result is a stadium: very slightly inside the rectangle at
the corners, which is the right way to be wrong — better to clip a corner you can
see than be stopped by a wall that is not there.

### Verification

Eastbourne's and Manfeild's finish times and final positions are **identical** to
the run before; only their obstacle fingerprints moved. That is the check that
the buildings sit off the racing line rather than in it — the bots never touch
one. Ōtaki shifted 50 ms, because the push-clear pass nudged two farmhouses it
drives past. Remutaka is untouched. Matrix 16/16.

## 2026-08-02 — Header without a panel, and summer haze instead of fog

### The progress header

`TO EASTBOURNE` / `LAP 1` sat on a **fixed-width** rounded rect
(`lapPanelW = 150 * s`), which cannot work for copy that varies that much: the
short label floated in a box too big for it and the long one spilled out of both
ends. Panel removed. The text now carries a chunky ink outline instead — the
same treatment the roadside advance arrows already use, and it stays readable
over sky, tarmac or grass at any length.

### Fog was doing much less than its comment claimed

The old comment said fog "doubles as draw-distance management … instead of
needing any culling scheme". That is not true: **fog culls nothing in Three**.
Every mesh is submitted to the GPU either way and the fragment shader just
blends toward the fog colour. A tight band bought no performance at all — it only
decided how much of the world the player was allowed to see.

And it was very tight. At ~59 units/metre, 1200–3000 is about 20–50 m of
visibility. On a summer afternoon that read as sea fog rolling in.

Now 5000–15000 by default and 6000–20000 on Manfeild, and fading to a new
`COLORS.haze` (`0xd4e7e9`) rather than to the sky. Fading to a separate colour is
what makes it read as hot air rather than as weather: the horizon goes milky and
slightly warm while the sky above stays a clean blue.

### What the tight fog had been hiding

**The terrain runs out.** The height grid only covers the world plus 960 units,
and elevated courses draw *only* that grid — so opening the view up showed the
mesh simply stop, with sky underneath. The outer ring of the terrain mesh is now
dragged 30,000 units outward at its own edge height, which continues the ground
to the horizon for no extra cells.

**Remutaka and Ōtaki have no distant scenery.** Eastbourne and Manfeild each
build a specific view; the other two never needed one while fog ate everything
past 3000 units. Without it they showed a flat green plain running to the
horizon, which is a poor backdrop for a climb through a mountain range. Added
`themes/horizon.js`: three depths of overlapping bush ridge, on all four sides so
they work whichever way a route wanders, using the shared parallax kit.

All render-only — four baselines byte-identical, matrix 16/16.

## 2026-08-02 — NZ tree model library (PR #24)

Seven code-built native species — pōhutukawa, tī kōuka, kōwhai, tōtara, kānuka,
rimu, Norfolk pine — with three variants each, a catalogue of nominal
dimensions and collision radii, and `scripts/validate-nz-tree-models.mjs`, which
checks every variant builds with finite bounds, a sane height against its nominal
and a triangle count in budget.

**Not yet used by anything, deliberately.** The roadside scatter needs 90 trees
in a handful of draw calls, which is what the existing `InstancedMesh` in
`trees.js` delivers; the library builds a full `Group` per tree. Swapping the
scatter over is real work — instancing per species, or a much smaller tree count
— not an import swap, and doing it naively would be a draw-call regression on
exactly the landscape phones CI cannot measure.

### Fixed on merge

The library was re-exported from `trees.js` "to make the build parse and validate
it". That pulled ~500 lines of unused builders into the **shipped bundle** for no
runtime benefit, and the validator imports the module directly anyway. Re-export
removed; the library now costs nothing until something renders from it.

`npm run build` had been changed to run the art validator first. That couples a
Vercel deploy to art linting — a broken tree model would block shipping a
gameplay fix. Moved to the determinism workflow instead, so CI still catches it.

## 2026-08-02 — Ōtaki rebuilt Forks-to-coast (PR #26)

The rally course is now the real route: Ōtaki Forks, the gravel upper gorge, the
sealed lower gorge, market-garden flats, the river crossing, a rail overbridge,
the old-town road network and the beach settlement. Eight gates, a
sealed/gravel split matching DOC's description of the last five kilometres to
the Forks, branch roads through town, and its own parallax layer.

It correctly follows the `preScaled` / route-data-in-`tracks.js` pattern
established when Eastbourne was rebuilt, which was good to see.

### The change worth arguing about: the playtest driver

The PR added a `driveTarget` to the harness — a look-ahead point on the primary
road — and had the waypoint bot steer to it. That is a change to the *test
driver*, which is the sharpest tool in the suite, so it deserved scrutiny.

**Testing the premise first.** With it disabled, Ōtaki's bot still finishes: 100%
of gates, 132.7 s, but **68% off-road**. So the change was not needed to pass —
it was needed to stop the bot driving across paddocks between sparse gates.

**Why the gates are sparse is legitimate.** A branching course must keep every
required gate *before* its routes split, or one arbitrary street becomes the
"correct" one. That leaves 44% of Ōtaki with no gate. Manfeild solved the same
problem by adding gates (6 → 18), but Ōtaki cannot: measured against the primary,
its branches run 460–1,500 units away through that span, far outside the ~350
unit capture radius, so any gate there would invalidate the routes the sparse
gates exist to protect.

So the mechanism is justified. Two things about it were not.

**It was keyed off `def.id === 'otaki'`** — one course hard-coded into a harness
that is meant to know nothing about them. Removed.

**Generalising it naively breaks Remutaka.** Made unconditional, the bot fails to
finish at all: a fixed 18-sample look-ahead is a chord across a hairpin, and it
cuts the switchbacks. So the rule is now about geometry, not identity — follow
the road only while the next gate is more than 1,600 units away, aim at the gate
once it is close. Courses whose gates are denser than that behave exactly as
before.

The result is a test driver that actually drives the road:

| course | off-road, waypoint bot | before | after |
|---|---|---:|---:|
| eastbourne-dash | | 27% | **1%** |
| manfield | | 32% | **4%** |
| otaki | | 68% | **31%** |
| remutaka | (gates dense — unchanged by design) | 63% | 62% |

That also makes the off-road percentage a real signal about a *course* rather
than about the bot's cornering, which it never was before.

### Also fixed on merge

The PR deleted the whole baseline history from `ac2-determinism.mjs`, replacing
~50 lines of *why* with three lines of generic policy. That history is what makes
a baseline change auditable — each entry records not just that numbers moved but
which check the move proved (Manfield unchanged proving the `grade !== 0` guard
is free; Eastbourne's finish state unchanged proving buildings sit off the racing
line). Restored, condensed to a list, with a note saying why it is kept.

Also restored the module header and lighting-rig rationale in `render3d/index.js`.

All four baselines re-recorded — every course moves, because the bot corners on
the road now. Matrix 16/16.

### Regression caught after the Ōtaki merge: farmhouses came unstuck

Merging PR #26 quietly undid the single-list rule for Ōtaki. Its rebuilt theme
went back to owning a copy of the farmhouse positions, so `buildOtaki` was still
*handed* `scene.structures` and simply ignored them — while `structures.js` went
on returning the pre-rebuild coordinates.

The result on the live branch: five farmhouses you could drive straight through,
and nine invisible collision blobs sitting thousands of units away, at positions
that meant nothing in the new 19000×11000 world. Rendered (14350, 3900) against a
collision circle at (14067, **6727**).

Positions moved back under `src/structures.js`; the theme keeps only palettes.
Worth noting what did and did not catch it: `node --check` passed, `npm run
build` passed (Vite does not resolve free variables), and the playtest matrix
passed — because the bot never drove into either set. It was only visible by
comparing the two lists directly. The determinism run *did* catch the follow-up
slip, where `buildOtaki`'s signature had lost its `structures` parameter, because
that threw at scene creation.

Ōtaki's fingerprint moved; its finish time and position did not, which is how we
know the bot was touching neither set. Matrix 16/16.

## 2026-08-02 — Remutaka becomes a cliff road (PR #28)

The climb now reads as the real thing: a steep inboard rock cut on one side, a
guarded drop into the valley on the other, continuous silver guardrail with
red/white reflectors, chevron boards into the tight bends, and Tararua-style
ranges close in at the summit with much paler ridges across the valley.

### The interesting decision: two height fields

Remutaka now has a **visual** terrain grid distinct from the **physics** one.
`heightAt()` returns the visual field and `gradeAlong()` reads `physicsGrid`, so
the cliffs are geography while Beryl still climbs the exact profile the recorded
baselines were taken against.

That is normally the failure mode this codebase keeps stamping out — see-but-
don't-hit. It is safe here because the split is drawn in the right place:
**everything visual reads one grid consistently**, including Beryl's own height
and the chase camera, so she sits on the ground you can see; and the *only*
simulation consumer of terrain is `gradeAlong`, which reads the other. Road cells
are pinned in both, so the two agree exactly where the car actually drives. All
four baselines are unchanged, which is the proof.

Worth being explicit that this is a narrow licence, not a general one: it works
because a single, named function is the entire simulation surface. If anything
else in the simulation ever reads terrain height, the two fields have to be
reconciled first.

### Fixed on merge

**`Terrain` was reaching into `tracks.js` for `getSelectedTrack()`** to decide
whether to build the cliff field. That is a hidden global dependency, and a wrong
one the moment anything constructs a `Terrain` for a course that is not the
selected one — which the harness is entitled to do. The course definition is
passed in from `RaceScene` now, which already has it.

**`themes/horizon.js` is deleted.** The generic four-sided bush ridge added two
days ago existed only because Remutaka and Ōtaki had no distant scenery; both now
have bespoke layers, so it had no callers left.

Determinism unchanged on all four courses, matrix 16/16.

### PR #27 (lower, rounder Beryl): merged, then reverted

Merged, attempted the fix, reverted. Recording why, because the *engineering*
finding is reusable even though the art did not land.

**The diagnosis was right but incomplete.** The review predicted one defect —
pillars hard-coded at `x = ±W * 0.418, y = 70` against a shell that is only
`W * 0.36` wide with a top of 76 at that station. Fixing it by deriving the pose
from `cabinAt(z)` worked, and then the *same bug* appeared twice more:

1. **Pillars** — 6 units outboard, standing proud of the roof.
2. **Side glass** — pinned at `x = ±W * 0.414` while the shell tapers to
   `W * 0.3765` by the front of the door glass. The dark slivers that looked like
   detached struts in side view were the windows themselves.
3. **Windscreen and rear screen** — 17 units tall centred on y 72 reaches 80.5
   where the cabin top is 76; the rear screen reached 78 against 75.3. Both
   speared out through the roofline.

Every one is the same mistake: **a fixed coordinate measured against a lofted
surface that moves**. It is the fourth, fifth and sixth time this model has hit
it (the pinstripe floating 13 units off the bodywork and the bonnet seam above
the bonnet were the earlier ones). The lesson for the next attempt: when the
cabin loft changes, nothing may keep a literal x or y — pillars, glass, screens
and trim must all be derived from `cabinAt(z)`.

**Why it was reverted anyway.** With all three fixed the silhouette is clean, but
the greenhouse has become a shallow dark band and the front three-quarter shows
almost no windscreen. Against `public/assets/beryl-photo.png` — which has a tall
greenhouse with generous windows, one of the Minor's strongest cues — it reads
less like a Morris Minor than the model it replaces. The height figure itself is
sound (91/217.6 = 0.418 against the real car's 1.55/3.73 = 0.416; the current 106
is 0.487, genuinely too tall), so a future pass should keep the lower body and
*raise the glass into it* rather than shrinking the cabin with the roof.

### PR #27, second time: merged

The finding above was acted on, and it turned out the derivation fix alone was
never going to be enough — the art problem it left behind had a structural
cause, not a tuning one.

**One cross-section profile cannot describe both a body and a greenhouse.** The
loft built every station from the same rounded ring, whose widest point sits at
39% of the section height. That is right for a body: it is what gives the wings
and the boot their bulge. On the cabin it means the shell reaches full width down
at the belt and has already turned over by the time the glass gets there, so the
windows can only ever be a shallow band cut into a dome. There are now two
profiles, and the greenhouse's carries its width high with gentle tumblehome.

**Two more shape faults, both from the same reading of the reference photo.** The
cabin narrowed towards the front as well as dropping, leaving the windscreen
sitting on a ridge with nothing wide enough underneath it to be a scuttle; and
the bonnet was as wide as the body, when on a Minor the width at the front comes
from faired wings either side of a distinctly narrow bonnet.

**A flat quad spanning a curved shell sinks inside it.** This is the same class
of bug as the fixed coordinate, one level down: even glass whose *corners* are
derived correctly disappears, because the chord between them passes under the
surface. Measured at the windscreen, the shell stood 5.2 units above the chord at
its midpoint. Glass is now built with `sheet()`, a quad grid that samples the
shell along its whole span.

**And a derived pane that grazes the shell z-fights into shards.** Offsetting a
whole row along one normal leaves the outer columns exactly coplanar. Each vertex
is now lifted along the true local surface normal, obtained by central difference
of `topAt`/`skinAt`.

**No pillar meshes at all.** The shell left between the windows is what the eye
reads as the A, B and C pillars. This is the actual fix for the recurring bug:
not deriving the pillar's coordinates more carefully, but deleting the thing that
had coordinates to get wrong.

The queries the trim hangs off — `skinAt` (flank at a height), `topAt` (upper
surface above a lateral offset) and `stationAt` (interpolate between authored
stations) — are the ones to reach for next time anything is added to this model.

Render-only: all four courses match their pinned finish times, positions and
obstacle fingerprints.

## 2026-08-04 — Stage 1: making the engine scale-proof

Groundwork for the rescale, and deliberately a no-op: **all four courses finish
on exactly their pinned times, positions and obstacle fingerprints.** That was
the acceptance criterion, because everything here is preparation for a change
that will move every number, and a preparation step that moves numbers of its own
cannot be told apart from a regression later.

### What the measurements said

Beryl does **104 km/h at Manfeild and 10–13 km/h everywhere else**. Manfeild's
`maxSpeed` is 940 units/s against Eastbourne's 88, Remutaka's 100 and Ōtaki's
115, and its world is authored at 16.7 units/metre against the others' ~58. Both
gaps compound, and the result is that one course is a car and three are a brisk
jog.

The same authoring is why three of the four courses have **corners tighter than
half their own road width**, so the tarmac folds through itself where the edges
cross: Eastbourne min radius 45 against a half-width of 180, Remutaka 62 against
120 on 6% of its samples, Ōtaki 36 against 140. Manfeild is the only clean one
(238 against 225) and the only one that feels right. That is not a coincidence.

### The road index

`distanceToCenterline` and `surfaceAt` were linear scans over every sample of
every road, run twice a frame plus 1,200 times at load for scenery rejection.
That is free at 800 samples and is about to stop being free.

Both now take a coarse pass first: every 16th sample, plus the longest arc gap
between consecutive anchors. The anchors are on the polyline, so the nearest one
bounds the true answer from above; every point on the polyline is within half a
gap of arc length — hence at most that far in a straight line — of some anchor.
So nothing beyond `nearestAnchor + span / 2` can win.

**That bound is exact, not a tolerance**, which matters more than the speed:
both callers compare the result against a threshold, so a value differing in the
last bit is a different course and a different baseline. `npm run test:road-index`
checks 120,000 points per course — out in the world, hard against the
carriageway, and exactly on samples where ties decide which surface wins —
against the full scan, which is kept and exported for exactly that purpose.
2.6–7.8× today, and the margin grows with route length because the coarse pass is
O(n/16) and the refine pass is O(stride).

### Constants that were secretly per-course

Four view and grid distances were absolute world units, which is a trap rather
than a bug: correct at the size they were tuned for, silently wrong at any other.
The terrain grid is the sharp one — it is sized from the world, so a route ten
times longer at a fixed 120-unit cell is a hundred times the cells, three blur
passes deep.

Each now derives from the world with a **floor set to the value it replaces**, so
every current course reproduces its old number exactly. Only Ōtaki changed at
all, and only its fog: its 21,932-unit diagonal finally earns more than the
15,000 every course was getting regardless of size. Fog feeds nothing in the
simulation, so no baseline moved.

`gradeAlong`'s sample step was `CELL * 0.5`. Fine while the cell size was fixed;
a trap the moment it is not, because how steep a hill feels would have started
depending on how big the course is. Grade is a property of the car on the road,
so it is a car-sized distance now — and the value is what `CELL * 0.5` already
came to, so no course changed.

`src/scale.js` is the one statement of how big the world is. `coords.js` claimed
70 units/metre, prose in three other files claimed 59, and Beryl's own mesh says
57.9. Nothing read the 70, so nothing was wrong on screen — but it was the kind
of second opinion that eventually gets believed.

### Three courses had no drift FX at all

`Car.js` gated drifting on `|vForward| > 140`, hard-coded. That is 88% of
Eastbourne's top speed, 78% of Remutaka's, 68% of Ōtaki's — and **8% of
Manfeild's**. So drift was unreachable on three courses and permanent on the
fourth, and since the flag is what gates skid marks and tyre smoke, three
quarters of the game silently had none.

It is a fraction of top speed now, matched to the `maxSpeed * 0.3` gate `applyFx`
already used for handbrake skids, so the two ways of laying a skid mark agree.
The flag is written at the end of `Car.update` and read only by `applyFx`, which
does render-side writes — it never feeds back into the simulation, which is why
a real behaviour fix still moved no baseline.

### Deferred to Stage 2, deliberately

Per-course top speed in km/h, `samplesPerSegment` becoming a target sample
spacing, and the playtest driver's `FOLLOW_ROAD_ABOVE`. All three only bite once
the routes actually change, all three move baselines, and all three want tuning
against the new geometry rather than the old.

## 2026-08-04 — Stage 2: the rescale

The world was authored roughly ten times too small for the car driving through
it, and that one fault produced three separate complaints. Fixing it moves every
recorded number, deliberately.

| course | route | top speed | run | min corner radius |
|---|---:|---:|---:|---:|
| eastbourne-dash | 15,589 u → **265,022 u (4.58 km)** | 158 u/s → **100 km/h** | 88 s → **162 s** | 0.25× half → **3.79×** |
| manfield | 50,643 u → **177,254 u (3.06 km)** | 104 → **110 km/h** | 31 s → **100 s** | 1.06× → **3.70×** |
| remutaka | 13,551 u → **169,437 u (2.93 km)** | 180 u/s → **85 km/h** | 0.52× → **3.50×** |
| otaki | 21,953 u → **219,557 u (3.79 km)** | 207 u/s → **95 km/h** | 113 s → **141 s** | 0.26× → **2.41×** |

Manfeild is 3.06 km against the real circuit's 3.03. It was 875 m.

### Why one fault produced three complaints

**Pace.** Perceived speed is car lengths per second, and nothing else. Beryl is
217.6 units long, so 158 units/s is 0.73 car lengths per second — about 10 km/h.
Manfeild's 1,692 was 7.8, or 104 km/h. Same car, same screen, ten times the pace.

**Layout.** `buildEdges` offsets the centreline by ±half along its normal, which
holds only while half is under the local corner radius. Three courses were over
that line, so the edges crossed and the tarmac passed through itself. You cannot
fix that by narrowing the road — it was already 1.1 car lengths on Remutaka, a
single-track goat road on a state highway. Corner radius scales with the route
and road width does not, so scaling up is the only lever, and it lifted
Remutaka's ceiling from 240 to about 930. It is now an ordinary two-lane road at
420, and Ōtaki's rally road is 400.

**Density.** Not fixed here — it gets worse here, and is Stage 4's problem. But
the space to fill is the same space the pace needed.

### Two numbers per course, both checkable against the real place

`topSpeedKmh` and `lengthScale`. That replaces three global multipliers
(`LENGTH_SCALE` 2, `SPEED_SCALE` 1.8, `ACCEL_SCALE` 1.3), a `preScaled` flag that
made two of the four courses skip the geometry pass entirely, and top speeds
written directly in units per second.

The layering is what hid the bug. No single line was wrong. `maxSpeed: 940` and
`maxSpeed: 88` sat in the same file, in the same shape, four courses apart — and
they are 104 km/h and 10 km/h. Nothing in the codebase could compare them,
because the thing they needed to be compared against, the size of the world, was
stated in three different files as 70, 59 and 57.9 units per metre.

Everything else about the car is now a multiple of its top speed, so each course
keeps its own character — Manfeild still reaches top speed in 0.8 s against the
others' 1.5 — while the pace is set by one legible number.

### `samplesPerSegment` was never a resolution

It was 20 on every course, which is only a resolution if every anchor gap is the
same length. They are not: the same 20 gave Eastbourne a sample every 30 units
and Manfeild one every 55, and after the rescale it would have given 500-unit
steps — a visibly faceted corner and an on-road test that steps across the kerb
between samples. Spacing was the thing actually wanted, so it is the thing
authored: 50 units, about a quarter of a car length.

That also fixed the playtest driver's look-ahead for free. `primaryDriveTarget`
aims 18 samples ahead and its comment claims "about half a second of road" — true
only on Manfeild, and 3.4 seconds on Eastbourne. With spacing pinned it is 0.5 to
0.66 s everywhere, which is what it always said it was.

### The bug this project keeps rediscovering

`otakiStructures()` lost its `def` argument in this change. `node --check`
passed. `vite build` passed — Vite does not resolve free variables. The first
thing to notice was a browser run several minutes later, which is exactly how the
same bug behaved when `buildOtaki` lost its `structures` parameter.

`npm run test:track-geometry` now builds the track, terrain and structure list
for every course in Node. It costs nothing and it fails in a second.

It also asserts what this stage fixed: **no sample on any road may have a corner
radius under 1.5× that road's half-width.** A folded road still builds, still
renders and still lets a bot finish, which is why nothing caught it for months.

### The route data files were half-scaled

Scaling the anchors is not scaling the course. `eastbourneRoute.js` and
`otakiRoute.js` also carry a shoreline polyline, the offset of the coast, and
named places — the doctor's, the shops, the school, the RSA, the Forks, the
railway — that the village buildings and the farm structures are hung off. All
world coordinates, none of them anchors.

Left alone they would have stayed at a seventeenth of the distance: the village
bunched into a knot in one corner while the road it belongs to ran past two
kilometres away. The layout is scaled in place rather than copied, because
`structures.js` and `render3d/themes/eastbourne.js` both import it directly and
must agree to the unit — one places the collision footprints and the other places
the buildings you see.

The check that it worked: after the fix, only Eastbourne's obstacle fingerprint
moved, and its finish time and final position did not change by a digit. The
village moved; the bot never touched it.

### Positions that were secretly pinned to one course size

`OTAKI_FARMHOUSES` were absolute coordinates against a 19,000-unit world, and
`MANFEILD_STAND_Z` was 1,750 units along the main straight. At ten and 3.5 times
the size, the farmhouses would have collapsed into a corner miles from their road
and the grandstand would have stood in the first corner. Both are fractions now —
of the world and of the lap. This is the same see-it-versus-hit-it split that
`structures.js` exists to prevent, arriving by a different route.
