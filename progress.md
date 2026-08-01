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
