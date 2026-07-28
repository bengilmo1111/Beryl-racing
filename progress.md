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
