# Beryl Racing 3D 🏁

A lighthearted **time-trial** game where you drive **Beryl** — a classic
turquoise Morris Minor 1000 — from behind the wheel, chasing your best time.

> **This is the 3D port.** It is a separate deployment from the shipping
> top-down 2D game, which continues to live on `main` and at
> `gilmore.games/beryl-racing/`. Everything except the view is the same: same
> courses, same handling model, same checkpoints, timing and best times. Best
> times are stored under their own keys, so the two builds never collide.

Part of the **[Gilmore Games](https://gilmore.games)** family.

- **Platform:** web (desktop + landscape mobile), fullscreen supported.
- **Stack:** Phaser 3 (simulation, HUD, input, audio) + Three.js (the 3D world)
  + Vite. The Phaser canvas is a transparent overlay above the Three.js canvas;
  see `src/render3d/`.
- **Status:** 🚗 All four courses drivable in 3D, with roadside scenery, signage
  and drift FX ported. Remutaka, Ōtaki and Eastbourne have real elevation —
  gravity acts along the slope, so climbs cost you and descents pay you back.

## Courses

Pick a course on the title screen (**Choose your course**):

- **Eastbourne Dash** — a coastal point-to-point from Days Bay to the Eastbourne
  RSA. One run against the clock, harbour on your left, starting with a steep
  drop off Ferry Road to get you moving.
- **Manfeild Circuit** — the real Manfeild Chris Amon circuit at Feilding,
  traced from MotorSport NZ's official circuit map: 3.03 km clockwise, main
  straight, the infield loop and ess, the top loop and the long return.
  Continuous lap racing; chase your best lap.
- **Remutaka Hill Climb** — a point-to-point climb from Te Mārua up SH2 to the
  Remutaka summit: lower sweepers building to tight switchbacks. The hill is
  real — gravity acts along the slope, so Beryl genuinely labours up the
  ~13–14% switchback grades and the climb takes noticeably longer than the
  distance alone suggests. The final hill-road art is a later pass.
- **Ōtaki Rally** — a gravel-to-coast dash downhill from Ōtaki Forks through the farmland,
  across the Ōtaki River and railway, through town and out to Ōtaki Beach. Mixed
  surfaces: gravel is looser/faster, the sealed town grips better. Scaffold route
  and placeholder scenery in place; the final rally art is a later pass.

Each course has its own world, handling, elevation profile, checkpoints and
locally saved best time, so records don't clash between them. Manfeild is
deliberately flat — it is a purpose-built circuit.

The current gameplay loop includes the countdown, keyboard and touch driving,
ordered route checkpoints, an off-road penalty, a locally saved best time, and
a retryable finish.

Beryl and the course furniture are drawn procedurally in `src/render3d/` rather
than loaded as models, so there is no art pipeline to wait on and everything
stays editable in the repo. The generated PNGs in `public/assets/` are strict
top-down views from the 2D build and are not usable from a chase camera; the
image-generation prompts in `src/art.js` still describe that top-down brief and
need rewriting before the next art pass.

See **[PRD.md](./PRD.md)** for the full product spec: gameplay, controls,
driving model, art/asset spec, deployment under the Gilmore directory base path,
and MVP acceptance criteria.
