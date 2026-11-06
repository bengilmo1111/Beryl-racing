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

For the normal edit/check loop:

```sh
npm test
npm run build
```

`npm test` runs browser-free geometry, placement, road-index, rendered-road
contact and driving contracts. These check behaviour and spatial relationships,
without requiring a historical lap time or obstacle hash to remain unchanged.

Run the full driving matrix explicitly before a release or after broad handling
or route changes:

```sh
npm run playtest
```

This builds the production bundle, runs every bot against every manifest course,
inspects touch controls, and runs the new-mobile-player journey. Completion,
checkpoint, bounds, runtime and generous finish-time limits remain hard failures.
Simulation-step timing is a non-blocking diagnostic: it excludes rendering and
is sensitive to the host machine. Check rendered smoothness on a real device.

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

Repeatability is separately available (same recorded inputs replayed three times):

```powershell
npm run test:determinism
```

This checks equality between runs of the current code and prints measured values.
Historical finish times, final positions and obstacle hashes are enforced only
with `npm run test:baselines`. Use that optional diagnostic when investigating
unexpected drift; intentional gameplay or scenery changes need not preserve it.

## Just look at it

The full matrix takes about 26 minutes. Most art and placement questions — *are
the houses beside the road yet?* — are answered by two pictures, so there is a
narrow version:

```powershell
npm run shots
npm run shots -- otaki:5600,6400 eastbourne-dash:8000
```

`course:frame,frame`. It serves from `src/` through Vite, so it needs no build
and cannot invalidate a matrix running against `dist/` at the same time. It also
prints each course's building and obstacle counts from the running game, and any
console errors *or warnings* — THREE warns rather than throws on a colour it
cannot parse, which is how an entire town once rendered white with nothing
failing.

This is not a nicety. Every scale and placement bug this project has had was
found by looking at one of these images and by nothing else; see
`docs/architecture/WORLD-SCALE.md`.

## Outputs

Every run recreates `playtest-out/`:

- `playtest-report.json` — schema-versioned API consumed by later factory work.
- `playtest-report.md` — phone-readable PR comment, with the verdict first.
- `shots/` — each bot run approximately every ten simulated seconds and at finish.
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

## Review a change

- Art or placement: run the relevant Node checks, then `npm run shots --
  eastbourne-dash:3000` (or the changed course/moments) and inspect the images.
- Handling: run `npm test`, drive the changed section yourself, and run a focused
  waypoint completion. Review finish-time changes for their cause, not as a score
  of how good the game feels.
- UI: exercise start, input, finish, retry and saved progress. For the legacy
  mobile racing flow use `npm run playtest -- --mobile-only --journey`.
- Release: full matrix, representative screenshots, and a real mobile drive,
  including rendered smoothness and audio.

Screenshots are evidence only when someone inspects them. Choose start, tight
corner, settlement and finish views for the affected course. Add a targeted
behaviour or placement assertion when a real regression reveals a gap.

## CI

`determinism.yml` is the **Quality** workflow: targeted geometry, placement,
physics, art and browser checks, a production build, and the mobile player
journey run on pull requests. Repeatability runs only on its daily schedule or
manual dispatch. Failed mobile runs retain their screenshots and traces.

`playtest.yml` runs the complete course/bot matrix and mobile journey daily and
on manual dispatch, with merged reports and artifacts. `gameplay-exploration.yml`
runs the twelve broader imperfect-driver combinations daily or manually. Neither
exhaustive suite runs on every PR. There is no automatic second replay to print
replacement historical baselines after a failure.

If repository branch protection requires the old workflow job names, update
those required checks to **Targeted quality checks** when adopting this change.

AC4 fault-injection evidence is recorded in
`docs/factory/ac4-fault-injection.md`.
