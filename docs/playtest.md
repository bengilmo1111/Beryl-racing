# Playtesting Beryl Racing

The Phase 1 playtest suite answers one question: did the game regress? It uses
fixed-step simulation, pure bot drivers, a real mobile UI journey, and
data-owned thresholds. It is not an evaluative “is this fun?” playtester.

## Run it locally

Install the locked dependencies and Chromium once:

```powershell
npm ci
npx playwright install chromium
```

Run the same complete suite used by CI:

```powershell
npm run playtest
```

The command builds the production bundle, runs every bot against every course
in `game-manifest.json`, inspects touch controls, and runs the new-mobile-player
journey. It exits non-zero on any threshold breach.

For a focused visible run:

```powershell
npm run playtest -- --course=otaki-rally --bot=waypoint --headed
```

`--course=otaki-rally` is accepted as an alias for the current manifest id
`otaki`. Supplying `--course` or `--bot` makes this a focused simulation run:
the unrelated mobile inspection and journey are skipped unless explicitly
requested. Other useful switches:

- `--skip-build` — reuse the current `dist/` while iterating.
- `--no-journey` — skip the real-UI journey.
- `--no-mobile` — skip the separate mobile-control bounds inspection.
- `--mobile-only --journey` — run shell checks without the bot matrix.
- `--journey` — explicitly include the mobile inspection and journey with a
  focused simulation.

The determinism acceptance check remains separately available:

```powershell
npm run test:determinism
```

## Outputs

Every run recreates `playtest-out/`:

- `playtest-report.json` — schema-versioned API consumed by later factory work.
- `playtest-report.md` — phone-readable PR comment, with the verdict first.
- `shots/` — each bot run approximately every two simulated seconds and at finish.
- `mobile-controls.png` — the 844×390 landscape touch-control inspection.
- `journeys/new-mobile-player/` — screenshots, WebM video, Playwright trace,
  console log, and harness state timeline.

`playtest-out/` is generated and ignored by git.

## Metrics

- **Finished / finish time:** whether a sprint or the first circuit lap completed,
  and its fixed-clock duration.
- **Checkpoint reach rate:** highest ordered checkpoint reached divided by the
  course total.
- **Softlock:** less than the configured displacement for a configured number of
  consecutive driven frames. Deliberate stops at world boundaries are excluded.
- **Out-of-bounds events:** transitions from inside to outside the declared world.
- **Off-road fraction:** sampled frames whose harness surface is grass.
- **95th-percentile frame time / frames over 33 ms:** harness simulation-step
  timings. Rendering captures are excluded so this measures the simulation.
- **Console/runtime errors:** console errors, thrown update exceptions, page
  errors, and unhandled rejections.
- **Failed requests:** failed network requests and HTTP 4xx/5xx responses.
- **Mobile controls:** all four touch controls must exist, be visible, and have
  their full circles inside the 844×390 landscape viewport.

Failure codes are stable and intentionally specific, including
`checkpoint-count`, `failed-request`, `out-of-bounds`, `runtime-error`, and
`mobile-controls-out-of-viewport`.

## Tune thresholds

Edit `playtest-spec.json`, never the reporter code. The root contract has
`schemaVersion: 1`, one `global` block, and one entry for every manifest course.
A manifest course without a threshold entry fails with `course-spec-missing`.

Finish-time ranges should leave deliberate tuning room while still catching a
material handling or route regression. Threshold changes should be reviewed as
gameplay changes.

## Add a bot

1. Add a pure `(state) => input` module in `playtest/bots/`.
2. Export it from `playtest/bots/index.js`.
3. Add its public CLI id and export name to `BOT_MODULE_NAMES` in
   `playtest/lib/matrix.mjs`.
4. Add a frame limit in `playtest-spec.json`.
5. Run it focused, then run the complete suite.

Bots must not read clocks, DOM state, or mutable global RNG state.

## Add a course

1. Add the course definition to `src/tracks.js`.
2. Add its id, title, and mode to `game-manifest.json`.
3. Add its threshold block to `playtest-spec.json`.
4. Run `npm run test:determinism`.
5. Run `npm run playtest`.

No test-code course list needs editing. Omitting step 3 fails loudly.

## Add a journey

Journey modules live in `playtest/journeys/`. They must drive the rendered UI
through Playwright mouse, keyboard, or touch input rather than `setInput`.
Harness state may be sampled for diagnosis. Each journey should save screenshots,
trace, video, console log, and a concise state timeline, then return named
failures to `playtest/run.mjs`.

The current `new-mobile-player` journey starts with empty storage at 412×915,
rotates to 915×412, selects the default course, finishes using trusted touch
events only, retries, and verifies the best time persisted.

## CI

`.github/workflows/playtest.yml` runs on `pull_request`, manual dispatch, and a
daily schedule. It never uses `pull_request_target`.

Four course jobs run in parallel and a fifth job runs the mobile shell journey.
An always-running report job downloads the partial artifacts, merges them into
one schema-versioned report, uploads the complete `playtest-out/`, and creates or
updates one sticky PR comment. The final verdict step fails the workflow on any
threshold breach.

AC4 fault-injection evidence is recorded in
`docs/factory/ac4-fault-injection.md`.
