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
| Done | Test-driver stalls can masquerade as collision traps | Eastbourne steeringTaps stopped requesting throttle when misaligned; the bot-only restart fix now completes both fixed seeds | Investigate only a future trace that shows motive input without movement |
| Done | Completed runs need visible presentation evidence | PR #51 covered Eastbourne; PR #63 covers every sprint, and the first scheduled production artifacts contain readable RSA, summit and beach panels with unchanged driving metrics | Inspect future `--results.png` evidence alongside completion metrics |
| In progress | Finish celebration text should not ghost through results cards | All 12 latest sprint result captures show the large celebration beneath the translucent card; the focused fix clears and stops that tween as the card opens | Require the HUD celebration to be empty and transparent in every completed-sprint browser run; inspect the rendered cards |
| Done | Remutaka should keep the cliff on the left, stop Beryl at rails and finish in the summit car park | PR #52 shares rendered/collision rails, fixes the terrain sides and moves arrival into a paved triangular summit area | Record one full player run; check left exposure, rebounds and car-park arrival |
| 1 | Recovery is easier when the camera keeps the road and escape direction visible | Draft PR #62 is a subjective Remutaka recovery-camera preview; all automated checks pass and handling/replay metrics are unchanged | Ben A/B production against PR #62 by reversing away from a right-hand bank; keep it unmerged until judged |
| 1 | Steering taps may feel more predictable with a different return rate | Subjective experiment pending, do not merge unjudged | A/B one steering parameter on the same Days Bay route |
| 2 | More distinct landmarks improve recognition without visual clutter | Earlier Days Bay/Beryl art shipped; player judgement needed | Ask where the player thinks they are at wharf, park and RSA reference views |
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

## 2026-09-10: distinguish stalled test drivers from gameplay traps

Baseline: main `e6570525ebc44d434c477531d867164ff126bf83`, including PRs #40–42
(unified handling, Eastbourne art, full-width finish stripe, Pavilion setback).
No open issues/PRs at start. Do not redo these user-approved changes.

Workflow collection review: scheduled Playtest 34385254933 and Exploration
34385499325 initially failed before game launch on Sept 9 UTC. Logs show an
APT Hash Sum mismatch from dl.google.com during Playwright dependency install.
Both had no artifacts: missing gameplay evidence, not game failures. Retried
failed jobs without weakening checks. Latest Determinism 34344214236 passed on
PR #42; the workflow has no schedule, so no scheduled Determinism pass exists.

Hypothesis: the waypoint controller brakes for a large heading error, then asks
for neither throttle nor brake at low speed. Stationary steering cannot rotate
the car, so imperfect drivers can remain stopped indefinitely on clear roads.
PR #42 exploration 34344214027, steeringTaps/779425, records 147 contacts and
6/7 gates; all final 20 seconds have speed 0, throttle 0 and brake 0. Seed 779426
has 150 contacts and the same noncompletion. The frame-12000 screenshot shows a
clear road at Muritai Road, not an obstacle holding the car. HeldSteering also
fails to finish at 2/7 gates; noncompletion alone does not prove a game bug.
The successful scheduled retry reproduces the steeringTaps metrics against the
previous successful PR #42 run at each matching scenario/seed.

Change: only the imperfect drivers' low-speed, large-heading-error branch now requests
0.3 throttle below 18% speed, retaining high-speed braking. No production handling,
camera, art, route, baselines or collision changes. New regression uses the exact
recorded state, five headings, three imperfect drivers and reference-driver guards.
It failed against the old controller and passes with the fix. CI runs it.

Decision: merge only after replay baselines remain unchanged and browser checks
pass. Changes to imperfect-driver outcomes are expected and are not evidence of
more enjoyable handling. Next test: compare contact counts, gate reach and final
traces for both Eastbourne steeringTaps seeds; investigate any remaining stalls
with throttle applied before proposing a collision or recovery change.

First PR attempt changed the shared waypoint driver and CI correctly rejected a
Remutaka replay drift (124100 versus the pinned 124366.666667 ms). Reverted that
shared change instead of updating baselines; restart now wraps only imperfect
drivers. Exploration from the first attempt demonstrates the restart policy:
seed 779426 finishes at 91916.666667 ms (166 contacts); seed 779425 reaches the
RSA area but keeps circling on grass (162 contacts, 6/7 gates). Its final trace
shows speed around 290 units/s and throttle 0.3, not the original zero-input
deadlock. These are new diagnostic outcomes, not evidence of improved fun.

## 2026-09-13: post-finish-fix audit — no gameplay change

Baseline: main `f419cdd9cfcd7e5b43812f1731619230f206e048`. Reviewed recent
PRs #45–49 and the two subsequent real-car photo-detail commits. No open issues
or PRs. Preserve the newer Remutaka reference pass, ambient traffic, recorded
engine/horn and player-car details; do not repeat earlier work.

Workflow collections: scheduled Playtest
[34707324871](https://github.com/bengilmo1111/Beryl-racing/actions/runs/34707324871)
and Exploration
[34707703299](https://github.com/bengilmo1111/Beryl-racing/actions/runs/34707703299)
passed on this exact main commit on September 12 UTC. Playtest includes all four
courses, mobile shell and combined report. Latest Determinism
[34673025485](https://github.com/bengilmo1111/Beryl-racing/actions/runs/34673025485)
passed on PR #49, before the photo-detail commits; there is still no scheduled
Determinism trigger. Do not describe that older run as current-main replay proof.
Current-main road-contact (1,866 positions/four headings) and Eastbourne arrival
geometry checks passed locally.

Investigated the queued hypothesis that steeringTaps still circles at the RSA.
Compared current exploration artifacts with previous successful PR #49
exploration 34673025517 at the same bot/course/seeds. Both seeds now finish:
779425 at 111400 ms, 141 contact episodes, 55.745% off-road; 779426 at 105700 ms,
150 contact episodes, 52.665% off-road. These gameplay metrics match the prior
run exactly. Reported p95 step cost is 0.3 ms versus 0.2 ms; this is not a real
device-rendering benchmark. Both reports show no runtime errors/out-of-bounds
events. High contact/off-road counts remain diagnostic, not proof of trapping
geometry or evidence of fun.

Matched seed-779425 frame-6000 screenshots show the same road/car position, with
the expected newer car detail. Both final frame-6684 PNGs, however, are solid
yellow: the capture catches the celebration flash. The completed metrics are
valid evidence of finish state, but those images do NOT verify results-screen
visibility. `captureShot` draws at the finishing simulation time; RaceScene's
flash lasts 240 ms and Eastbourne results are delayed 2200 ms. Canvas-only
capture also cannot include DOM results. This is an evidence-quality issue,
not a demonstrated production rendering fault.

Decision: no gameplay or subjective experiment change this iteration. Retire the
old circling outcome as the current baseline; keep the historical entry above.
Next test: add a post-finish presentation capture that advances presentation
without changing recorded finish metrics and includes the DOM results panel.
Require the panel to be visible rather than accepting a successfully written
blank PNG. Keep unfinished-driver shots unchanged. Player check: cross an outer
edge of the RSA stripe after completing the route and confirm results appear.

## 2026-09-14: post-finish results evidence

Baseline: main `51ceed290e35dd76398438518505426d2c922641`. No open issues or
PRs. Scheduled Playtest 34771490851 and Exploration 34771624429 passed on this
exact commit on September 13 UTC. Latest Determinism 34717173258 passed for PR
#50; the workflow still has no schedule, so there is no scheduled Determinism
result to claim.

The current and previous successful scheduled Exploration runs match exactly
for Eastbourne steeringTaps at each seed: 779425 finishes at 111400 ms with 141
contacts and 55.745% off-road; 779426 finishes at 105700 ms with 150 contacts
and 52.665% off-road. Both current final PNGs are 1280x720, one-colour yellow
images. This confirms the previously queued evidence gap persists; passing
metrics are not treated as proof that the results presentation is visible.

Hypothesis: preserve the state at the finish frame, then advance only the
post-finish presentation clock and take a browser screenshot after the delayed
Eastbourne results dialog is visibly present. This should add useful evidence
without changing any recorded driving metric or production behaviour.

Change: completed Eastbourne matrix runs now save an additional `--results.png`
after the results dialog is visible. The harness freezes the full metric state
before those presentation-only frames. A missing dialog or an implausibly small
PNG is a `results-presentation` failure; unfinished runs keep their existing
final screenshot and do not claim results evidence.

Result ([PR #51](https://github.com/bengilmo1111/Beryl-racing/pull/51)):
the standard waypoint artifact and both fixed Eastbourne steeringTaps seeds now
contain 1280x720 `--results.png` images with the visible RSA dialog. The three
files contain 6,141–6,535 colours and are 96,946–102,637 bytes, rather than the
one-colour yellow baseline. Matching steeringTaps metrics are unchanged for both
seeds, including finish time, contacts, off-road fraction and frame-time summary.
On code commit `e91338b`, Determinism 34781849215, Playtest 34781849161 and
Exploration 34781849156 all pass; both deployment checks pass. This is evidence
coverage, not a claim that the UI is fun or that a production bug was fixed.

Decision: accept after this final documentation commit passes the same required
checks. Next test: inspect future `--results.png` evidence alongside completion
metrics. Player check remains crossing an outer edge of the RSA stripe and
confirming the results screen appears.

## 2026-09-15: Remutaka cliff, solid rails and summit arrival

Baseline: main `2fcf661623271c48ab28a57170e9d4a6d42817ff`. There were no open
issues and one active PR, #52, already implementing the user's recorded Remutaka
findings; this iteration reused and audited that work instead of starting a
duplicate. Scheduled Playtest 34886326464 and Exploration 34887083236 passed on
that exact main commit on September 14 UTC. The previous successful scheduled
runs, 34771490851 and 34771624429, also passed. Matching lateBraking seeds 779425
and 779426 were identical across both scheduled Exploration runs: 120966.666667
ms, zero contacts, 10.926% off-road and all 11 gates. Matching waypoint frames
600 through 7200 were pixel-identical. Determinism has no schedule, so no
scheduled Determinism pass is claimed.

Problem and hypothesis: the old visual terrain alternated the cliff side with
corner curvature, decorative rails had no collision, and the route ended on the
road. Keeping the bank on the driver's right and drop on the left, deriving
rendered and swept-collision rails from one segment list, and moving the finish
into a triangular paved summit area should fix those objective mismatches. The
exact summit dimensions remain an authored approximation because the supplied
real-drive clip does not show them.

Result ([PR #52](https://github.com/bengilmo1111/Beryl-racing/pull/52)):
the fixed cliff side, narrower shoulder, shared barrier collision, downhill road
continuation and summit parking finish merged as `1818b8b`. The regression covers
slow and fast barrier impacts, the open entrance, finish crossings in both
directions, rejection of road/grass finishes, parking support and 265,925 terrain
positions plus 565 rendered-mesh rays. On the final PR head, Determinism
34895612837, Playtest 34895612965 and Exploration 34895612834 all passed, as did
both deployment checks. Three deterministic Remutaka replays agreed on 122100 ms,
position (120359.028346296, 16370.836788409) and obstacle fingerprint
`b55a2b03c90e51a0`; the other three course baselines stayed unchanged.

The PR's waypoint run finished at 122100 ms with 32 barrier-contact episodes and
6.484% off-road; both lateBraking seeds finished at 122066.666667 ms with 31
contacts and 6.526% off-road. Those changed metrics are expected from real rails
and the new finish, but do not prove fun. Browser screenshots show a continuous
left-side guardrail/drop and right-side bank through the sampled ascent, plus the
new car park. Decision: accepted after all required checks passed. Next player
test: record one full climb and check that the drop remains on the left, every
rail rebounds Beryl, and crossing the white line inside the summit car park ends
the run. Use that recording to judge the authored summit shape and remaining art.

## 2026-09-17: all-sprint results evidence

Baseline: main `e01c44fd9ede3a4bbe837a2e43c370cfc24878a5`. Draft PR #62 is
the only open PR and remains an unjudged camera experiment; this objective
evidence fix is independent and does not merge or alter it. There are no open
issues. Scheduled Playtest 35132793703 and Exploration 35133114033 passed on
this exact main commit on September 16 UTC. The previous successful scheduled
runs, 35005891203 and 35006476117, passed on `873d5b7`, immediately before the
HUD-only main merge. All 24 matching exploration scenario/seed outcomes,
finish times, gates, contacts, recoveries, out-of-bounds events and off-road
fractions are identical. Small p95 harness timing changes are not treated as a
real-device performance result. Determinism still has no scheduled trigger, so
there is no scheduled Determinism pass to claim.

Problem and hypothesis: completed non-Eastbourne sprint artifacts do not contain
`--results.png` evidence. Their final captures are often the solid yellow
celebration flash; even when the flash has cleared, the frame precedes the
delayed results panel. Advancing only presentation time and asserting the actual
results container should make Remutaka and Ōtaki finishes inspectable without
changing recorded driving state. Manfeild is intentionally excluded because it
is a continuing circuit with no results overlay after each lap.

Change: every completed sprint now freezes its metric state, advances the
presentation clock, waits for either Eastbourne's accessible DOM dialog or the
other courses' visible Phaser results container, and records a plausibly sized
browser screenshot. A missing panel is a `results-presentation` failure.

Decision: merge only after Playtest, Exploration and Determinism pass on the
final commit and the new Remutaka and Ōtaki screenshots visibly contain their
results panels. Next test: inspect all future sprint `--results.png` files next
to completion metrics; do not treat a yellow final frame as presentation proof.

## 2026-09-18: first scheduled all-sprint evidence audit — no gameplay change

Baseline: main `62e3759a530ff7945f9a4dfe5d04ce19caef219e` (PR #63). Draft PR
#62 remains the only open PR and is still an unjudged camera experiment; it was
not merged or modified. There are no open issues.

Workflow collections show scheduled Playtest
[35257387002](https://github.com/bengilmo1111/Beryl-racing/actions/runs/35257387002)
and Exploration
[35258210275](https://github.com/bengilmo1111/Beryl-racing/actions/runs/35258210275)
passed on this exact main commit on September 17 UTC. The matching previous
successful scheduled runs, 35132793703 and 35133114033, passed on `e01c44f`.
Determinism has no scheduled trigger. Its latest relevant result is the passing
PR #63 run 35148034182 on code commit `41767d5`; this is PR evidence, not a
scheduled exact-merge-commit result.

All 24 matching exploration scenario/seed results retain exactly the same
verdict, completion state, finish time, gate progress, contact and recovery
counts, softlock state/frame, out-of-bounds count, off-road fraction, runtime
failures and over-33-ms frame count. Remutaka's reported p95 harness step cost
moves by 0.1 ms in several jobs; as documented above, this is not a real-device
rendering benchmark and is not treated as a gameplay change.

Inspected all twelve scheduled `--results.png` files produced by completed
sprints. The six Eastbourne captures show the RSA dialog, the two Remutaka
captures show `SUMMIT!`, and the four Ōtaki captures show `BEACH!`; none is a
yellow celebration-only frame. Scheduled Playtest also completes the waypoint
run on all four courses and captures the same three sprint result states.
Manfeild is correctly excluded because it is a continuing circuit.

Decision: no gameplay fix or new subjective experiment. The evidence gap is
closed in the first exact-main scheduled run, while the existing camera preview
still needs player preference. Next test: A/B PR #62 by stopping nose-first at
a Remutaka right-hand bank and reversing to the road; merge or close it from the
player verdict. Continue to compare later scheduled reports against matching
scenario/seed evidence rather than treating a missing artifact as a pass.

## 2026-09-19: clear the finish celebration behind result cards

Baseline: main `c2790f4a3a719257846ff31c9a40844149e7cb03` (PR #64). Draft PR
#62 remains the only other open PR and is still an unjudged camera experiment;
this result-presentation fix does not alter or merge it. There are no open issues.

Scheduled Playtest
[35375718027](https://github.com/bengilmo1111/Beryl-racing/actions/runs/35375718027)
and Exploration
[35375993804](https://github.com/bengilmo1111/Beryl-racing/actions/runs/35375993804)
passed on this exact main commit on September 18 UTC. Against the preceding
successful scheduled runs 35257387002 and 35258210275, all 24 matching
scenario/seed verdicts, completion state, finish time, gate progress, contacts,
recoveries, softlocks, out-of-bounds events, off-road fraction, runtime failures
and over-33-ms frames are identical. Harness p95 timing is excluded from that
gameplay comparison. Determinism has no schedule; the latest relevant pass is
PR #64 run 35272604141, not scheduled exact-main evidence.

Problem: all twelve completed-sprint `--results.png` captures contain a faint,
oversized `NEW BEST TIME!` behind the result card. `finishSprint()` starts a
1.9-second HUD tween, while non-Eastbourne cards open after 0.7 seconds. Even on
the longer Eastbourne delay, the tween can retain its text or be advanced by the
presentation harness. The semi-transparent result surfaces make it visible.

Hypothesis and change: when `showResults()` opens, stop every tween targeting the
finish announcement, clear its text and force its alpha to zero. Keep the initial
celebration and camera flash unchanged. Add a completed-sprint browser assertion
that rejects a missing, non-empty or visible HUD announcement before accepting
the screenshot. This changes presentation only: no handling, route, traffic,
camera, art placement, score, timing state or deterministic baseline.

Verification so far: production build, arcade-driving, track-geometry and
placement checks pass locally. The local Playwright Chromium download timed out,
so browser rendering and deterministic replay are missing local evidence rather
than passes. Decision: merge only after Playtest, Exploration and Determinism pass
in CI and every sprint results capture is visually clean. Player check: finish
Eastbourne, Remutaka or Ōtaki and confirm the result card has no giant ghost text
behind it while the scenery remains visible through the panel.
