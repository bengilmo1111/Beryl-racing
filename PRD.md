# Beryl Racing — Product Requirements Document

**Status:** Approved PRD, pre-build
**Owner:** Ben Gilmore
**Last updated:** 2026-07-24

---

## 1. Overview & vision

**Beryl Racing** is a lighthearted, top-down 2D time-trial game where you drive
**Beryl** — a beloved turquoise 1960s Morris Minor 1000 — around a race track,
chasing your best lap time. It's casual, charming, and quick to pick up: hop in,
do a few laps, try to beat your own record.

The tone is warm and family-made, not a hardcore racing sim. Anyone should be
able to load it in a browser and be driving within seconds.

The game is one of the **Gilmore Games** and lives at
**`gilmore.games/beryl-racing/`**.

---

## 2. Target platform

- **Web**, running in modern browsers.
- Works on **desktop** (keyboard) and **landscape-mode mobile** (touch) — both
  are first-class targets for the MVP, not later add-ons.
- **Fullscreen** available from the start (title screen and in-game).
- Built with **[Phaser 3](https://phaser.io/)** (2D game framework) and bundled
  with **[Vite](https://vitejs.dev/)**.
- Deployed as static files to its **own Vercel project**, served under the
  Gilmore Games directory at `gilmore.games/beryl-racing/`.

> Vite is required (not just convenient): it's how the Gilmore directory hosting
> contract configures the production base path. See §11.

---

## 3. Core gameplay loop

1. Player lands on the **title screen** and taps/clicks **Play**.
2. Beryl starts on the track (rolling or standing start at the start/finish line).
3. Player drives laps around a closed circuit.
4. Each completed, valid lap is **timed to the millisecond**.
5. The **best lap** is saved locally (`localStorage`) and shown as the target to beat.
6. Player keeps retrying to improve. A **"New best lap!"** celebration fires on a record.

The HUD always shows: **current lap time**, **last lap**, and **best lap**.

---

## 4. Controls

### Desktop (keyboard)
| Input | Action |
|-------|--------|
| ↑ / W | Accelerate |
| ↓ / S | Brake / reverse |
| ← / A | Steer left |
| → / D | Steer right |
| Space | Handbrake (tighter cornering) — optional |

### Landscape mobile (touch)
- On-screen **steer left / right** buttons on one side of the screen.
- **Accelerate** and **brake** buttons on the other side (thumb-friendly).
- Optional **tilt-to-steer** toggle (device orientation).
- Controls are sized and positioned for landscape thumbs and respect device
  safe-area insets (notches).

Touch controls render only on touch devices; keyboard hints show only on desktop.

---

## 5. Driving model (MVP)

Arcade-style top-down physics — **fun and forgiving**, not a simulation:

- Acceleration up to a **top speed**, with drag/friction decelerating when
  coasting.
- **Steering rate scales with speed** (more responsive at pace, no pivoting on
  the spot).
- **Off-track penalty:** driving onto the grass slows Beryl noticeably, so
  staying on the racing line is rewarded.
- Optional handbrake for tighter turns.

Physics via **Phaser Arcade Physics**. Handling values (accel, top speed, grip,
grass drag) are tunable constants so we can dial in the feel.

---

## 6. Track

- **One closed-loop circuit** for the MVP.
- Distinct **track surface** vs. **off-track (grass)** regions.
- A **start/finish line**.
- **3–5 checkpoints** placed around the lap. A lap only counts when the player
  passes **all checkpoints in order** and then crosses the start/finish line —
  this prevents shortcut cheating and reversing across the line.

---

## 7. Timing & scoring

- **Millisecond lap timer.**
- HUD shows **current**, **last**, and **best** lap times.
- **Best lap persisted** in `localStorage`, keyed per track.
- **Invalid laps are not recorded** (missed checkpoints, wrong direction, etc.).
- New-best-lap moment is clearly celebrated in the UI.

---

## 8. Art & assets

- **Beryl sprite:** a **generated top-down sprite** derived from Beryl's photo
  via the image-generator agent, preserving her identity — **turquoise body,
  whitewall tyres, chrome trim**. Rotates smoothly with steering.
- **Track & grass:** rendered from tiles/textures (procedural or generated).
- **UI:** simple and clean. Menus/HUD may lightly echo the **Gilmore house
  style** (see `gilmore-directory/docs/ART-DIRECTION.md` — Fredoka display
  headings, chunky dark outlines, warm palette) so Beryl Racing feels part of
  the family — without copying the directory page wholesale.

### Beryl sprite asset spec (for the image agent)
- **Orientation:** nose pointing **up** at 0° rotation (Phaser rotates from there).
- **Background:** fully transparent (PNG with alpha).
- **View:** true top-down (bird's-eye), consistent lighting, minimal perspective.
- **Size:** power-of-two friendly, roughly **128×128** or **256×256** px source,
  scaled in-game.
- **Delivery:** dropped into `public/assets/`, loaded via Phaser's loader using
  a base-path-aware URL (see §10).
- **Risk note:** the source photo is a side profile, so a **stylised** top-down
  that reads as "Beryl" is acceptable if a photo-accurate top-down isn't feasible.

---

## 9. Screens & UI flow

```
Title screen  ──Play──▶  Race (track + HUD)  ──lap complete──▶  Results overlay
     ▲                                                              │
     └──────────────────────── Restart / Retry ────────────────────┘
```

- **Title screen:** game name, Play button, fullscreen toggle.
- **Race:** track, Beryl, HUD (current/last/best lap), on-screen touch controls
  on mobile, in-game fullscreen toggle.
- **Results overlay:** lap time, "New best!" when a record is set, retry.
- **Fullscreen toggle** present from the title screen onward (Fullscreen API /
  Phaser `scale.startFullscreen`).
- On **mobile portrait**, show a **"rotate to landscape"** prompt.

---

## 9a. Responsive & mobile behaviour

- Phaser **Scale Manager** set to `FIT` with `autoCenter`, using a landscape
  design resolution, plus resize handling — the canvas fills desktop windows and
  mobile screens without distortion.
- Touch controls appear only on touch devices; keyboard hints only on desktop.
- Respects device **safe-area insets**.
- Targets a smooth **~60fps**.

---

## 10. Technical architecture

**Stack:** Phaser 3 + Vite (vanilla JS/TS).

**Scenes:**
- `BootScene` — preload assets (Beryl sprite, track, UI).
- `TitleScene` — menu + fullscreen toggle.
- `RaceScene` — gameplay: car, track, checkpoints, physics, HUD.

**Suggested layout:**
```
index.html
vite.config.ts
vercel.json
game-manifest.json
public/assets/            # Beryl sprite, track textures
src/
  main.js                 # Phaser game config (scale, physics, scenes)
  config.js               # tunable constants (handling, timing)
  scenes/BootScene.js
  scenes/TitleScene.js
  scenes/RaceScene.js
  entities/Car.js         # Beryl: input → physics → sprite
  ui/Hud.js
  ui/TouchControls.js
```

**Base-path discipline (per directory contract):** every asset load goes through
`import.meta.env.BASE_URL` or a relative `./` path — **never** root-relative
(`/assets/...`). Before deploy, audit the repo for `src="/`, `href="/`, `url(/`,
`fetch('/`, `new URL('/`, `serviceWorker.register('/`.

---

## 11. Deployment & URL structure

Follows `gilmore-directory/docs/ADDING_A_GAME.md`. Each game keeps its own repo
and Vercel project; the directory proxies `gilmore.games/<slug>/` to it.

- **Slug:** `beryl-racing` — production base path `/beryl-racing/`.
- **Vite base path:**
  ```ts
  // vite.config.ts
  base: mode === 'production' ? '/beryl-racing/' : '/'
  ```
  Local dev stays at `/`; production assets emit under `/beryl-racing/`.
- **Own Vercel project** for this repo, with a `vercel.json` **SPA fallback** so
  hard-refresh and direct navigation work under the base path.
- **`game-manifest.json`** in this repo, using the directory's template:
  `id`/`slug: beryl-racing`, `framework: vite`, `genre: racing`, `players: 1`,
  canonical `https://gilmore.games/beryl-racing/`.

### Gateway step (in the `gilmore-directory` repo — done separately, one game at a time)
- Add bare + wildcard rewrites: `/beryl-racing` and `/beryl-racing/:path*` →
  `https://<beryl-vercel-project>.vercel.app/`.
- Add a **directory card** linking to `/beryl-racing/`.

This is a deploy checklist item, **not** part of building this repo.

### Build/deploy verification
- Emitted HTML references assets under `/beryl-racing/assets/...`.
- Test under the base path: initial load, hard refresh, sprites, fullscreen,
  keyboard + touch input, and saved best-lap.

---

## 12. MVP acceptance criteria

- [ ] Beryl is drivable with **keyboard** (desktop) **and on-screen touch
      controls** (landscape mobile).
- [ ] **Lap timer** works to the millisecond; current/last/best shown in HUD.
- [ ] **Checkpoints** validate laps in order; invalid laps aren't recorded.
- [ ] **Best lap persists** across page reloads (`localStorage`).
- [ ] **Off-track** grass slows the car.
- [ ] **Fullscreen toggle** works from the start.
- [ ] Canvas **scales cleanly** on desktop and landscape mobile at ~60fps.
- [ ] **Builds and runs correctly under `/beryl-racing/`** (assets resolve, hard
      refresh works).

---

## 13. Out of scope for MVP (future roadmap)

- Ghost car replay (race your best lap).
- Multiple tracks.
- Leaderboards.
- AI opponents.
- Sound effects and music.
- Drift mechanics / advanced handling.
- Car customisation.

> Note: mobile/touch, fullscreen, and responsive scaling are **in** the MVP —
> only the items above are deferred.

---

## 14. Open questions & risks

- **Sprite fidelity:** Beryl's source photo is a side profile. A photo-accurate
  top-down may not be achievable; a stylised top-down that clearly reads as
  Beryl is the fallback.
- **Track authoring:** hand-drawn track image + collision mask, vs. a Phaser
  tilemap. To be decided at build time based on the generated art.
- **Vercel project name:** the exact `<beryl-vercel-project>.vercel.app` origin
  is needed before wiring the gateway rewrite in the directory repo.
