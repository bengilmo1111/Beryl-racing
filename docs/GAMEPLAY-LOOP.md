# Gameplay improvement loop

Goal: a forgiving, lively coastal drive in a recognisable Morris Minor and Eastbourne.
Production is the 3D game on `main`, at https://www.gilmore.games/beryl-racing/.

## Player loop

Open https://www.gilmore.games/beryl-racing/?playtest=1 and drive for two minutes.
When something feels wrong, tap **Report this moment** (or press F8). Attach the
downloaded JSON in chat with one sentence: what you expected and what happened.
The file contains up to 20 seconds of inputs, position, velocity, frame timing,
road surface, checkpoint progress, collision episodes and recoveries, plus course,
build, handling settings and obstacle positions. It stays local until you share it.
It contains no name or stored leaderboard. Recording is opt-in and bounded.
This is a diagnostic trace, not an exact physics replay or video; normal scenery
is unseeded. The test harness provides seeded reproduction for automated runs.

## Automatic loop

Every PR and overnight, run:

1. **Playtest**: existing 16 course/bot combinations, mobile journey, gateway-path
   smoke check and Eastbourne/car reference screenshots.
2. **Gameplay exploration**: 3 imperfect drivers × 2 fixed seeds × 4 courses.
   Driver/course pairs run in parallel (12 jobs, two seeds each).
   Each run has a 200-second simulation limit. Artifacts retain ordered screenshots,
   a final 20-second state/input trace, JSON metrics and a Markdown summary for 14 days.
3. **Determinism** on PRs: road contact, placement, geometry, handling, sound and
   fixed replay baselines. Do not casually regenerate baselines to hide a regression.

Exploration records completion, gate progress, off-road fraction, contact episodes,
stalls, out-of-bounds events, runtime failures and frame costs. Stalls/non-completion
are diagnostic signals for these deliberately imperfect drivers, not automatic
failures. Invalid state, runtime errors and existing boundary/network/performance
checks still fail. Contact episodes count transitions into contact, not impacts
with each obstacle; surface chatter can split an episode. Bot frame costs are not
a substitute for measuring real device rendering performance.

Reproduce with `npm ci`, `npx playwright install chromium`, `npm run build`, then
`npm run playtest:explore -- eastbourne-dash` (or another course ID). Seeds are
779425 and 779426. Compare only matching commit/scenario/seed evidence. Inspect
the full screenshot sequence around a suspected failure before changing handling.

The scheduled assistant reviews results after the overnight runs. It may make
one focused bug-fix PR and merge after all checks pass, or prepare one subjective
experiment PR. Check existing PRs/issues first, preserve user work, and record the
hypothesis and outcome here. If artifacts or execution are unavailable, report
the limitation; do not claim to have played or verified anything.

## Subjective experiments

Change one variable family per PR: steering, camera, collision recovery, or scenery.
Keep the current production build as A and the PR's Vercel preview as B. Include
both URLs, the commit IDs, one two-minute route, and one question: which version
would you choose for another run, and why? Wait for Ben's preference before
merging subjective changes. Avoid comparing best times across different handling
versions; previews have their own origin/local scores. No automated winner based
on faster bots. Automatic replay video and an in-game A/B switch are future work.

## Improvement queue

| Priority | Hypothesis | Evidence / status | Next test |
|---|---|---|---|
| Done | Coarse terrain can obscure climbing roads despite correct wheel support | PR #38 fixed Remutaka; the follow-up reproduces and clears Ōtaki's smaller overlaps across every alternate road | Player check on Remutaka's later bends and Ōtaki's gorge/town transitions |
| 2 | Repeated contact or missed gates may explain frustrating recovery | Exploration artifacts now exist; Remutaka lateBraking passes both seeds, not evidence about Eastbourne recovery | Inspect the worst Eastbourne trace and screenshots; distinguish driver error from trapping geometry |
| 2 | Steering taps may feel more predictable with a different return rate | Subjective experiment pending, do not merge unjudged | A/B one steering parameter on the same Days Bay route |
| 3 | More distinct landmarks improve recognition without visual clutter | Earlier Days Bay/Beryl art shipped; player judgement needed | Ask where the player thinks they are at wharf, park and RSA reference views |
| Done | Long test runs duplicated the growing timing history every frame | Fixed internal steps to return current state; final report retains all timings | Verify lightweight-step contract and deterministic baselines |
| Done | Reports and controlled mistakes shorten diagnosis | This release adds opt-in trace downloads and 24 exploration runs | Verify CI and obtain first player report |

For every iteration append: date, problem, hypothesis, baseline commit and metrics,
change/PR, verification, player preference if needed, merge/revert decision, next
test. Keep unproven ideas labelled as hypotheses.

## 2026-09-07: waterfront route and RSA arrival

Baseline: main `0f313278cd1d105e48be8331912f6257089b229d` and the player's
23:18 recording. The supplied 23:47 route map confirms Marine Parade as the
recommended line while retaining inland alternatives. The 23:49 aerial identifies
the triangular parking area at P as the finish and the building labelled Crust
Eastbourne as the RSA. The earlier aerial locates the start at 28 Ferry Road.

This pass shortens Ferry Road, adds its northbound T-junction arm, follows Marine
Parade, retains Muritai Road and inland cross streets, and shares a triangular
parking surface between rendering, road support and on-road detection. Required
gates precede the village split; the final gate is inside the parking area. The
car slows at arrival and the HUD displays completion. Version 4 scores separate
these times from the old route. Junction overlays follow road triangles, gable
ends are closed, and trees clear building footprints and the parking area.

Verification: geometry, surface raycasts, network-index equivalence and dedicated
parking/branch checks locally; browser replay and rendered views in PR CI.
Eastbourne's deterministic baseline intentionally changes with the route and
obstacle layout. Other course baselines must remain pinned unless evidence shows
an intentional shared junction correction. Do not infer enjoyment from bot time.

Next visual pass: measured foothill profiles (GWRC BQ32 1m contours), settlement
zones, property entrances/fences and more legible shops. Terrain is not yet a
measured reconstruction. References:
- https://opendata.gw.govt.nz/maps/058ad87d107944a59974db6c6ffab1dc/about
- https://www.gw.govt.nz/assets/Documents/2009/07/East-Harbour-northen-block-map.pdf

## 2026-09-08: Remutaka road/terrain clearance

Baseline: main `accbe65363ea5793625ca91f5c6405f0c5964870` (PR #37).
No open issues/PRs at the start; reuse the existing Remutaka intrusion finding,
not another guardrail polish pass. PR #37 already fixed the non-Eastbourne
garage roof, guardrail heights, street-facing facades and crop-ground contact.

Evidence checked through workflow collections, not only commit-filtered runs:
- Scheduled Playtest [34152765893](https://github.com/bengilmo1111/Beryl-racing/actions/runs/34152765893),
  Sept 7 UTC, passed on `0e25d77c`. Previous successful scheduled run
  [34047292920](https://github.com/bengilmo1111/Beryl-racing/actions/runs/34047292920)
  on `c3091e4c`: Remutaka waypoint/seed 779425 takes 124383.333333 ms in both,
  all 11 gates, zero off-road fraction/runtime errors. Both frame-6000 screenshots
  show the same hillside triangle covering the right lane. Older reports lack
  contact/recovery counters and input traces: missing evidence, not zero events.
- Scheduled exploration [34152942990](https://github.com/bengilmo1111/Beryl-racing/actions/runs/34152942990)
  passed on `0e25d77c`; no earlier scheduled exploration in the collection.
  Inspected Remutaka lateBraking reports for seeds 779425/779426 and compared
  with the newer successful PR #37 run 34160199252: both finish in 124383.333333 ms,
  zero contacts/recoveries/off-road fraction. These bots do not detect occlusion
  and cannot establish fun or player recovery quality.
- Latest Determinism [34160199174](https://github.com/bengilmo1111/Beryl-racing/actions/runs/34160199174)
  passed for PR #37. This workflow has no schedule, so there is no scheduled
  Determinism result to claim. Latest scheduled runs predate current main.
- PR #37 Playtest 34160199175 reproduces the intrusion at the same frame/seed;
  it is not a regression introduced by that merge.

Hypothesis: pinning nearest road heights at coarse grid vertices does not keep
the intervening ground triangles below a curved, sloping road. A local geometry
reproduction finds 7,486 intrusions among 83,025 positions, worst 197.02 units
(about 3.4 m). Wheel-contact checks previously tested only the road mesh.

Change: Remutaka-only clearance constraints at every road/ground intersection
polygon vertex. Lower only affected ground vertices; preserve physicsGrid and
drivingGrid, road geometry, handling, route, random stream and replay baselines.
Adjacent scenery reads the corrected visual field. No Eastbourne/2D changes.

Result ([PR #38](https://github.com/bengilmo1111/Beryl-racing/pull/38)): new regression passes all 83,025 positions and 175 raycasts against
the rendered mesh, with both winding directions and tiny interior overlaps
covered. Production build passes. CI now runs this regression. On code commit
`c63e6c9`, Determinism 34161565024 and Exploration 34161565027 pass; all Playtest
34161565052 jobs pass, including mobile/gateway and combined report. All four
course replay/obstacle baselines remain unchanged. Remutaka's four standard bot
reports and lateBraking's two seeds have identical metrics to PR #37. Matching
waypoint/seed-779425 frames 2160 and 6000 show continuous edge lines and no former
grass wedges, exposed road holes or new floating scenery in those views.
Decision: accept this objective geometry fix once the final documentation commit
also passes required checks. No handling/art preference inferred from bot times.
PR records final check and merge status.

Next test: drive Remutaka's later uphill bends and check that tarmac/white edge
lines stay continuous with no grass wedges. Inspect matched frame 2160 and 6000
for exposed road edges or floating scenery. Keep tree-density/camera preferences
for a separate player-judged preview; small Otaki terrain/road overlaps remain
queued rather than expanding this fix to another course without rendered review.

## 2026-09-08: Ōtaki road/terrain clearance

Baseline: main `f787e9b9ac47bbf274f599afae2874a8f45d1eb8` (PR #38).
The same independent ground/road scan now covers Ōtaki's primary gorge-to-beach
route and all five alternate town roads. It reproduces 471 visible intrusions
among 175,975 sampled positions, worst 7.77 world units, compared with
Remutaka's 7,486 / 83,025 and 197.02 units. The smaller magnitude explains the
occasional grass sliver rather than Remutaka's large hillside wedges.

Change: apply the existing visual-only intersection-polygon clearance to Ōtaki
after relief is added. Road geometry, `drivingGrid`, `physicsGrid`, handling,
route choice and seeded scenery stay unchanged. The regression now checks both
elevated courses across 259,000 positions and 550 rays against the rendered
ground mesh, including every Ōtaki branch. It also keeps the reversed-winding
interior-triangle fixture and proves clearance only lowers visual terrain.

Result ([PR #39](https://github.com/bengilmo1111/Beryl-racing/pull/39)):
clearance, production build, track geometry, placement, road index,
rendered-road contact and arcade-driving checks pass locally. On code commit
`404405e`, Determinism 34277334402, Playtest 34277334366 and Exploration
34277334467 all pass. All four replay/obstacle baselines remain unchanged;
Ōtaki still finishes at 140966.666667 ms in each of three deterministic runs.
The four standard-bot reports and lateBraking seeds 779425/779426 have identical
metrics to the matching successful main artifacts. Matched waypoint/seed-779425
frames 6000, 6720 and 7080 show continuous road edges, with no new verge holes
or floating scenery in those views. The browser evidence comes from CI because
this workspace lacks its pinned Playwright Chromium binary; that earlier local
absence was not counted as a pass.

Decision: accept the objective geometry fix after this documentation-only commit
also passes required checks. Do not infer fun from unchanged bot completion.
Next player check: drive the gorge bends and both town routes, looking for grass
slivers at road edges or exposed gaps beneath the verge.
