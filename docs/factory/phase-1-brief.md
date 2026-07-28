# Phase 1 — make Beryl Racing inspectable

Read `PLAN.md` first for principles and context. This brief covers Phase 1 only.

**Repo:** `bengilmo1111/Beryl-racing` (Phaser 3 + Vite, Vercel, base path `/beryl-racing/`)
**Outcome:** every pull request produces a machine-checkable report, and the check goes red when the game actually breaks.

Read the repo before writing anything: `PRD.md`, `game-manifest.json`, `src/`, `vite.config.js`, `vercel.json`. Match existing conventions rather than importing new ones.

## Non-goals

Do not build, and do not scaffold for beyond the seams noted:

- The auto-fix agent loop (Phase 2)
- Art and sound lanes, asset manifest slots (Phase 3)
- The evaluative playtesting agent (Phase 3)
- Extraction into a reusable factory repo (Phase 4)

---

## D1 — Harness

A module gated behind `?harness=1`, lazily imported so the default player bundle is unchanged in size and behaviour.

Exposes on `window.__h`:

| Member | Behaviour |
|---|---|
| `ready` | Promise resolving once the game is booted and steppable |
| `loadCourse(id, { seed })` | Loads a course by manifest id with a seeded RNG; resolves once the countdown is done |
| `setInput({ throttle, brake, steer })` | Virtual input. `steer` in [-1, 1], others in [0, 1] |
| `step(frames)` | Advances exactly N fixed-timestep frames synchronously |
| `state()` | Snapshot: frame, simTimeMs, pos, vel, speed, heading, onSurface, checkpointsHit, checkpointsTotal, lap, finished, finishTimeMs, frameTimesMs |
| `errors()` | Console errors, unhandled rejections, failed network requests |

**Determinism is the hard requirement and the gate for the whole phase.** Same course + seed + input sequence must give an identical `finishTimeMs` and final position, across runs and across machines. That means a seeded PRNG replacing every `Math.random()` reachable from gameplay and scenery placement, a fixed timestep driving Phaser's loop manually rather than via `requestAnimationFrame`, no wall-clock reads in gameplay logic, and a pinned harness viewport so physics can't depend on canvas size.

If determinism can't be reached cleanly, stop and report what's blocking it rather than working around it. A non-deterministic harness produces flaky checks, which is worse than none.

## D2 — Bot drivers

In `playtest/bots/`, each a pure `(state) => input` function:

- `idle` — no input. Catches drift, timer and fail-state behaviour.
- `pedal-to-the-metal` — full throttle, no steering. Catches missing walls and out-of-bounds escapes.
- `random` — seeded, changing every ~15 frames. Fuzzing; catches softlocks and physics explosions.
- `waypoint` — proportional steering toward the next checkpoint, braking on large heading error. Doesn't need to be fast, needs to reliably finish a working course.

Every bot runs against every course in `game-manifest.json`, so new courses are covered with no test changes.

## D3 — Journey scenarios

Distinct from the bots. These drive the *real UI* through Playwright — clicks, keys, touch — not the harness API, because the shell is where breakage ships unnoticed. At minimum:

> **New mobile player completes a first race.** Open at 412×915, rotate to landscape, no saved data. Select the default course. Touch controls only. Complete the course. Retry. Confirm the best time persisted.

Each journey saves video, screenshots, Playwright trace, console log, and a state timeline sampled from the harness. When a journey fails, the trace is what makes it diagnosable rather than merely detected.

## D4 — Metrics and report

Per run, record: finished and finish time; checkpoint reach rate; softlock detection (position variance below threshold for N simulated seconds while input is non-zero); out-of-bounds events; off-road fraction; 95th-percentile frame time and frames over 33ms; console errors, unhandled rejections, HTTP 4xx/5xx (asset 404s are the most common real breakage); and at 390×844 landscape, touch controls present, visible and within the viewport.

Emit to `playtest-out/`:

- `playtest-report.json` — `schemaVersion: 1`. Treat its shape as an API; Phase 2 consumes it.
- `playtest-report.md` — the PR comment. Verdict line first, then a course × bot table, then failures with detail. Readable on a phone.

Also capture a screenshot every ~2 simulated seconds per run plus one at finish, into `playtest-out/shots/`. Nothing consumes these yet — Phase 3 does — but capturing now is nearly free and makes visual regressions diagnosable today.

## D5 — Thresholds as data

`playtest-spec.json` at repo root, `schemaVersion: 1`, with a `global` block (max console errors, max failed requests, max frames over 33ms, mobile controls required) and a per-course block (waypoint bot must finish, finish-time range, minimum checkpoint rate, no softlock for any bot, max out-of-bounds events).

A course present in `game-manifest.json` but absent here must fail loudly rather than be silently skipped.

## D6 — CI

`.github/workflows/playtest.yml` on `pull_request`, `workflow_dispatch` and a daily `schedule`. Never `pull_request_target` — this repo is public.

Checkout, `npm ci`, `npm run build`, serve `dist/`, run the Playwright matrix, upload `playtest-out/` as an artifact always (including on failure), post or update a single sticky PR comment, exit non-zero on any threshold breach. Target under five minutes; parallelise across courses with a job matrix if it creeps.

## D7 — Local script and docs

`npm run playtest` runs the same matrix locally. `npm run playtest -- --course=otaki-rally --bot=waypoint --headed` for debugging one run visibly.

`docs/playtest.md`: how to run it, how to add a bot, a course, or a journey, how to tune thresholds, and what each metric means.

---

## Acceptance criteria

1. `npm run playtest` runs clean on a fresh checkout and writes both report files.
2. Determinism: same course, seed and bot, three times, byte-identical `finishTimeMs` and final position.
3. The workflow runs on a PR and leaves a readable comment.
4. **Fault injection proves the check works.** On a scratch branch, break one thing at a time and confirm each is caught *and named* in the report: (a) delete a checkpoint from a course, (b) rename an asset file so it 404s, (c) make a wall non-colliding, (d) throw inside an update loop, (e) move a touch control off-viewport at mobile size. Revert after; record results in the PR description. This is the evidence the harness is worth trusting, and everything in Phase 2 depends on it.
5. Default player bundle unchanged in size and behaviour without `?harness=1`.
6. Adding a course to `game-manifest.json` puts it under test with no test-code changes.

## Working agreement

- Branch `feat/playtest-harness`. Open a draft PR early so the workflow is exercised against itself.
- Commit in order — D1 and D2 first; demonstrate determinism before building anything on top of it.
- Don't refactor gameplay beyond what determinism requires. If game code must change, call it out in the PR description rather than folding it in silently.
- If a requirement here conflicts with how the game actually works, say so and propose the alternative rather than quietly reinterpreting it.
