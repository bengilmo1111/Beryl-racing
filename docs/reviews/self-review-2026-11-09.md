# Independent game review — 9 November 2026

Follow-up: Ben requested fixes. Shared recovery, contextual mobile reset,
recovery-camera framing, bank foliage fading, personal-best splits, sprint
comparisons and the Eastbourne starting-road extension are now implemented
locally. The Ōtaki timing discrepancy is explained by traffic and the acceptance
cap is updated from 163 to 240 seconds. See the
[verification record](../GAMEPLAY-LOOP.md#2026-11-09-recovery-and-personal-best-feedback)
and [new evidence](../../playtest-out/polish/report.json). The observations below
describe the review baseline; subjective pacing and rivalry remain human checks.

Recommendation: polish recovery and feedback before adding another course. The
existing four courses have distinct identities, working starts and finishes, and
enough content for a useful human review. Eastbourne is the most complete player
experience; use it as the standard for the others. After that, checkpoint splits
against a personal best are a smaller, more useful extension than another map.

## Scope and evidence

Reviewed the local working tree initially based on `4ab3721`, including the
pre-existing Ōtaki, Remutaka and story-removal changes. During the review, the
shared workspace advanced to `c3d0711`, incorporating those changes and the
results-card fix and review scripts. This review made no commit or deployment;
the evidence describes the local game, not verification of the deployed site.

Used installed desktop Chrome through Playwright. Ran a reference driver and a
deliberately imperfect held-steering driver on every course, inspected start,
mid-course, collision/recovery and settled finish screenshots, and exercised
actual keyboard events through the course chooser on all four courses. Those
keyboard drives use an accelerated game clock, not real-time human reactions.
The separate mobile journey uses actual touch events, with waypoint decisions.
Bots have privileged route information, so completion does not establish that a
new player can navigate without help.

Raw evidence: [driving and keyboard report](../../playtest-out/self-review/report.json),
[mobile journey report](../../playtest-out/self-review/journey-report.json),
[course views](../../playtest-out/shots-adhoc/), and
[finish-layout regressions](../../playtest-out/results-layout/).
Generated evidence is git-ignored and may be replaced by later test runs.

## Driving outcomes

One fixed query seed (`779425`, reported internally as `2715766179`) was used.
Times measure these scripted drives, not an ideal lap or a human difficulty score.

| Course | Reference drive | Deliberate steering mistakes | Assessment |
| --- | --- | --- | --- |
| Eastbourne | Finished, 7/7 gates, 1:09.650 | Finished, 2:52.217 | Strongest complete loop: clear coastal identity, progress, recovery and a named local score. |
| Manfeild | Completed lap, 18/18 gates, 0:52.767 | Completed lap, 1:12.000 | Fast and legible. The reference driver is already first by the sampled 25-second view; rivals are absent from that and the 50-second view. Sustained competition needs a human check. |
| Remutaka | Finished, 11/11 gates, 2:31.333 | Reached 2/11 gates; still against a bank at the five-minute limit | Strongest visual change of pace, but recovery deserves attention. |
| Ōtaki | Finished, 8/8 gates, 3:23.117 | Finished, 4:03.517 | The beach arrival reads clearly. Long farm/town stretches look repetitive in sampled views; pacing and unaided route choice need human judgement. |

The eight driving runs and four keyboard runs reported no browser runtime errors.
High bot contact counts are collision episodes, not a count of distinct crashes.
The imperfect driver is intentionally bad and does not know how to reverse.

## Defect fixed during this review

**Remutaka and Ōtaki finish actions could leave the screen.** Their canvas cards
were always 620 by 400 pixels and retained desktop coordinates after resizing.
At 667 by 375, the desktop-created Remutaka card showed only its upper-left
portion and neither action was available on screen.

The cards now centre and scale to the current viewport on creation and resize.
Restart clears the old panel reference. They also display the recorded finish
time directly rather than copying the HUD's most recently rendered time.

Evidence: [before](../../playtest-out/self-review/remutaka-results-667x375-before.png),
[after a real completed run](../../playtest-out/self-review/remutaka-results-667x375.png).
The dedicated regression creates synthetic finishes on a phone-sized viewport,
checks every text/action bound after resizing, verifies the recorded time, and
clicks both retry and change course. Both courses pass. This test now runs in
the Quality workflow. Synthetic finish tests are separate from the real course
completion evidence above.

## Next priorities

1. **Make recovery consistent, especially on Remutaka.** Only Eastbourne has
   “Back on road” and the R shortcut. On the others, R does nothing. Actual
   keyboard drives confirmed that braking enters reverse and Escape returns to
   the menu on every course. In the stalled Remutaka scenario, three seconds of
   reverse moved Beryl about 499 world units (8.6 metres) away from the bank,
   toward the opposite rail. This disproves an immovable trap in that scenario;
   it does not establish that a novice will understand how to escape. Consider
   extending safe, checkpoint-preserving recovery to the other courses.
2. **Review the camera while recovering.** Facing the Remutaka bank fills most
   of the view with the bank and foliage. Reversing brings the road into view,
   but the rail can sit across the car in the foreground. Start with this
   specific situation for any camera comparison; ordinary forward views were
   substantially clearer. [Bank view](../../playtest-out/self-review/remutaka-heldSteering-end.png),
   [after reverse](../../playtest-out/self-review/remutaka-stall-after-reversing.png).
   No camera or handling preferences were changed during this review.
3. **Add useful performance feedback.** All courses save a best time, but
   Eastbourne alone explains the difference and offers the local top three.
   Remutaka/Ōtaki results mainly say “finished” and show the time. Bring their
   best-time comparison up to the Eastbourne standard, then try checkpoint
   splits. A personal-best ghost can follow.
4. **Judge Ōtaki pacing and Manfeild rivalry with people.** The sampled Ōtaki
   farm and town views repeat houses, trees and long road stretches; add or
   strengthen landmarks only where people lose their sense of progress. On
   Manfeild, establish whether players have meaningful racing after the early
   overtakes before changing rival speed. Neither observation establishes that
   the courses are boring or too easy.

Lower-priority visual finding: Eastbourne's opening road visibly ends beneath
Beryl, leaving the rear of the car over grass at countdown/retry. Ōtaki already
has an approach extension. This is a presentation issue in the inspected
frames, not evidence of lost wheel support or a driving failure.

Release-check discrepancy: the observed Ōtaki reference run takes 203.117 seconds,
while `playtest-spec.json` currently caps it at 163 seconds. Reconcile the longer
current route/traffic with that expectation before release. The full matrix was
not run, and the threshold was not relaxed to hide the discrepancy.

## Verification and limits

Passed: `npm test`, production build, title layouts, mobile HUD controls,
fullscreen/rotation/pause checks, browser audio checks, the new finish-layout
regression, and the full touch-only Eastbourne journey. The latter finished in
1:32.567, saved a named score, retained the best on retry, kept the camera aspect
ratio correct, and applied the three-second recovery penalty without advancing a
checkpoint. [Mobile results](../../playtest-out/self-review/journey/new-mobile-player/05-results.png).

Audio checks exercised decoded recordings, four gear changes, tyre scrub/gravel,
mute, and horn input through H and the on-screen button. This is functional audio
evidence, not a subjective listening/mix review. The build retains its existing
large-chunk warning. The screenshot helper emits a multiple-Three-instance warning
when its inspection code imports Three separately; no associated runtime failure
was observed.

The first mobile attempt was interrupted by Vite reloading while the results fix
was being edited. It was discarded and rerun after source edits settled; the
completed rerun passed. An initial keyboard-review attempt clicked the edge of
course choices and kept selecting Eastbourne; it was corrected to click their
centres, assert the actual loaded course, and rerun. Only the corrected four-course
keyboard evidence is used here.

Not established: real-phone frame rate, physical touch ergonomics, Safari/iOS
behaviour, unaided human navigation, steering enjoyment, sustained race balance,
all alternate town routes, all seeds, or the exhaustive release matrix. No
automatic winner is claimed for subjective changes.

For the human review, the most useful observations are: can they recover without
coaching; can they find the Ōtaki beach finish; do they stay engaged after leading
Manfeild; and do they voluntarily retry knowing what they would improve?

Reproduce evidence gathering with `node playtest/self-review.mjs` and
`node playtest/self-review.mjs --journey`. Use
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` to point at installed Chrome if the Playwright
browser is absent. The review runner preserves other playtest output.
