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

## Browser validation

GitHub Actions run 34338579552 measured three identical replays per course. The measured finish times and positions are pinned in `playtest/ac2-determinism.mjs`: Eastbourne 67.350 s, Remutaka 124.366667 s, Ōtaki 141.066667 s. Eastbourne's new seawall and trees intentionally change its collision fingerprint and finish result. Remutaka and Ōtaki retain their obstacle fingerprints. Manfeild remains exactly at its original 52.716667 s, position and fingerprint. All 16 short bot-state comparisons also passed. The ordinary pinned replay gate remains required.

All four course browser playtests and all 12 gameplay exploration scenarios passed on the initial PR. The supplied second recording (2:12) was reviewed for the subsequent Eastbourne fixes; see `eastbourne-drive-review-fixes.md`.
