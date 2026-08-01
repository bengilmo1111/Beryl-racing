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
