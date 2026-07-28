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
