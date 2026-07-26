# Beryl Racing 🏁

A lighthearted, top-down 2D **time-trial** game where you drive **Beryl** — a
classic turquoise Morris Minor 1000 — from Days Bay to the Eastbourne RSA.

Part of the **[Gilmore Games](https://gilmore.games)** family, hosted at
**`gilmore.games/beryl-racing/`**.

- **Platform:** web (desktop + landscape mobile), fullscreen supported.
- **Stack:** Phaser 3 + Vite.
- **Status:** 🚗 Two playable courses, selectable from the title screen.

## Courses

Pick a course on the title screen (**Choose your course**):

- **Eastbourne Pootle** — a gentle coastal point-to-point from Days Bay to the
  Eastbourne RSA. One relaxed run against the clock, harbour on your left.
- **Manfield Racetrack** — the original closed drift circuit. Continuous lap
  racing on a fast, wide track; chase your best lap.
- **Remutaka Hill Climb** — a point-to-point climb from Te Mārua up SH2 to the
  Remutaka summit: lower sweepers building to tight switchbacks. Skeleton route
  in place; the final hill-road art is a later pass.
- **Ōtaki Rally** — a gravel-to-coast dash from Ōtaki Forks through the farmland,
  across the Ōtaki River and railway, through town and out to Ōtaki Beach. Mixed
  surfaces: gravel is looser/faster, the sealed town grips better. Scaffold route
  and placeholder scenery in place; the final rally art is a later pass.

Each course has its own world, handling, checkpoints and locally saved best
time, so records don't clash between them.

The current gameplay loop includes the countdown, keyboard and touch driving,
ordered route checkpoints, an off-road penalty, a locally saved best time, and
a retryable finish. The Eastbourne coastal setting and landmark treatment are
an early procedural art pass intended to keep the course playable while the
final artwork is produced.

See **[PRD.md](./PRD.md)** for the full product spec: gameplay, controls,
driving model, art/asset spec, deployment under the Gilmore directory base path,
and MVP acceptance criteria.
