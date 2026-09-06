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
| 1 | Repeated contact or missed gates may explain frustrating recovery | Await first imperfect-driver artifacts; no conclusion yet | Inspect the worst Eastbourne trace and screenshots; distinguish driver error from trapping geometry |
| 2 | Steering taps may feel more predictable with a different return rate | Subjective experiment pending, do not merge unjudged | A/B one steering parameter on the same Days Bay route |
| 3 | More distinct landmarks improve recognition without visual clutter | Earlier Days Bay/Beryl art shipped; player judgement needed | Ask where the player thinks they are at wharf, park and RSA reference views |
| Done | Reports and controlled mistakes shorten diagnosis | This release adds opt-in trace downloads and 24 exploration runs | Verify CI and obtain first player report |

For every iteration append: date, problem, hypothesis, baseline commit and metrics,
change/PR, verification, player preference if needed, merge/revert decision, next
test. Keep unproven ideas labelled as hypotheses.
