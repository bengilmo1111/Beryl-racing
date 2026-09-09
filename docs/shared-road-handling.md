# Shared road-car handling — 9 September 2026

Eastbourne, Remutaka and Ōtaki now copy one immutable road-car profile before unit conversion. It is the existing Eastbourne profile: 100 km/h, progressive steering, gentler acceleration, gradual grass slowdown, and matching brakes, reverse and grip. Ōtaki gravel uses the same grip as the other road courses, as requested. Slopes still influence speed.

The arcade switch also enables road-surface grade sampling, glancing-contact rebound and camera look-ahead on Remutaka and Ōtaki. Eastbourne-specific recovery UI, place names and results remain explicitly scoped to Eastbourne. Manfeild keeps its existing 220 km/h race physics. Remutaka and Ōtaki use new best-time keys because old times were set with different physics; old stored values are retained.

## Verified locally

- Build succeeds.
- Actual Car.update traces match exactly across all three road courses for acceleration, steering, gravel, grass, handbrake, braking/reversing and slopes.
- Existing stationary steering, tap steering, grass transition and 30/60/120 Hz acceleration checks pass.
- Manfeild retains non-arcade handling, 220 km/h and stronger acceleration without inherited steering settings.
- Road-contact check passes 1,866 positions and four headings.
- Track geometry checks pass for all four courses.

## Required before release

Full browser replay could not run: Chromium is absent and the Playwright download timed out. Existing pinned Remutaka and Ōtaki replay baselines describe the old handling and will need deliberate re-recording. They have not been guessed, removed or bypassed.

With Chromium available, run `RECORD_BASELINES=1 npm run test:determinism`. Confirm all courses finish and repeat exactly; verify Eastbourne and Manfeild remain at their current pinned values and Remutaka/Ōtaki/Manfeild obstacle fingerprints remain unchanged (the subsequent Eastbourne coastal/tree fixes intentionally change its obstacle fingerprint). Update only the measured Remutaka/Ōtaki finish times and positions, document the intentional handling change in baseline history, then run `npm run test:determinism` normally. Browser-check the two changed courses for cornering, verge recovery, camera behaviour and their own results copy.

## Submitted recording

The attached MP4 is 4.580067 seconds long. Sampled frames show only the Eastbourne course-selection screen, with no driving. A drive-through review and evidence-based course fixes require the full recording.
