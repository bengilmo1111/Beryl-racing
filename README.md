# Beryl Racing 3D 🏁

A lighthearted **time-trial** game where you drive **Beryl** — a classic
turquoise Morris Minor 1000 — from behind the wheel, chasing your best time.

> **3D is the production game on `main`.** Play at
> [gilmore.games/beryl-racing/](https://gilmore.games/beryl-racing/).
> The former top-down 2D version is retired; its source remains in Git history.
> Send future pull requests to `main`. `3d-port` is the historical development
> branch, not the production branch.

**Eastbourne now has its own arcade driving prototype:** a compact 2.15 km
coastal run, smoother steering, progressive grass slowdown, road recovery and
a named local top three. It has its own handling settings. See [the active prototype brief](docs/EASTBOURNE-ARCADE-PROTOTYPE.md).

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

**Controls:** arrow keys or WASD to drive, Space for the handbrake, **H for the
horn** — or the on-screen controls on a phone, with fullscreen, sound and horn
buttons stacked in the top-right corner.

**She sounds like herself.** The engine is Beryl's own, recorded from the front
of the car and from behind it, the two loops pitched to the crankshaft speed a
four-speed gearbox model says she is doing and mixed by how hard she is working
— so you hear her change gear, and you hear her labour up the Remutaka climb at
a steady speed. The horn is hers too. Manfeild is the exception: that V8 is
synthesised, because it does not exist. See
[`reference/audio/README.md`](reference/audio/README.md).

Beryl and the course furniture are drawn procedurally in `src/render3d/` rather
than loaded as models, so there is no art pipeline to wait on and everything
stays editable in the repo. The generated PNGs in `public/assets/` are strict
top-down views from the 2D build and are not usable from a chase camera; the
image-generation prompts in `src/art.js` still describe that top-down brief and
need rewriting before the next art pass.

See **[PRD.md](./PRD.md)** for the full product spec: gameplay, controls,
driving model, art/asset spec, deployment under the Gilmore directory base path,
and MVP acceptance criteria.

## Gameplay improvement loop

[Workflow and improvement queue](docs/GAMEPLAY-LOOP.md). Use
[playtest mode](https://www.gilmore.games/beryl-racing/?playtest=1) to download
a report of the last 20 seconds and share it in chat.
