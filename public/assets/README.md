# Assets

## Art documentation

The authoritative art documents are:

- [`docs/ART-DIRECTION.md`](../../docs/ART-DIRECTION.md) — the shared visual identity for Beryl, the game world, UI and all tracks.
- [`docs/ART-PRODUCTION.md`](../../docs/ART-PRODUCTION.md) — the workflow for reference gathering, asset specification, image generation, approval, optimisation and integration.
- [`docs/tracks/EASTBOURNE-ART-BRIEF.md`](../../docs/tracks/EASTBOURNE-ART-BRIEF.md)
- [`docs/tracks/REMUTAKA-ART-BRIEF.md`](../../docs/tracks/REMUTAKA-ART-BRIEF.md)
- [`docs/tracks/OTAKI-ART-BRIEF.md`](../../docs/tracks/OTAKI-ART-BRIEF.md)

`src/art.js` contains implementation helpers and useful legacy prompt constants. It is not the primary creative brief for new track art. New work must follow the shared art direction, production guide and relevant track brief.

## Current assets

- **`beryl-photo.png`** — the real photo of Beryl, a turquoise 1960s Morris Minor 1000. Loaded via `BERYL_PHOTO_URL` in `src/art.js`, shown on the title screen and used as the primary identity reference for the gameplay sprite.
- **`music-race.mp3`** — the current looping 1960s-inspired race music. Loaded in `BootScene` and played through `src/audio/sound.js`.
- **`tarmac.png`** — seamless asphalt surface texture. Not currently loaded; kept for the 3D road material (see `src/render3d/road.js`, which generates the UVs for it).
- **`grass.png`** — seamless grass texture. Used on the title screen and the 3D ground plane.
- **`tree-1.png`, `tree-2.png`, `tree-3.png`** — top-down tree variants. `src/scenery.js` pins their 128×128 size as a constant, so tree collision radii do not depend on these textures being loaded.
- **`start-gantry.png`** — start/finish gantry, top-down.

`tyre-barrier.png` and `hay-bale.png` were removed: the code that placed them
had been unreachable since the Manfield-only build.

The driving engine sound is synthesised in code by `src/audio/EngineSound.js`.

The current top-down gameplay version of Beryl is drawn procedurally in `src/art.js`. A generated sprite may replace it after approval and in-game testing.

## Target structure

The repository may migrate incrementally towards:

```text
public/assets/
  shared/
    beryl/
    surfaces/
    vegetation/
    roadside/
    ui/
  tracks/
    eastbourne/
    remutaka/
    otaki/
```

Do not move existing assets solely to match this structure if doing so would break current paths. New track-specific assets should use the target structure unless the implementation requires a deliberate transitional path.

## Generating a top-down Beryl sprite

Use all of the following:

1. `public/assets/beryl-photo.png` as the visual identity reference.
2. The Beryl section in `docs/ART-DIRECTION.md`.
3. The production workflow in `docs/ART-PRODUCTION.md`.
4. The hard orientation and transparency requirements in `src/art.js`.

Hard requirements:

- Strict top-down view.
- Nose pointing up.
- Transparent background.
- Centred with rotation-safe padding.
- Recognisable turquoise Morris Minor shape.
- Readable at gameplay scale.

Do not wire the sprite into the game until it has been explicitly approved and checked in-game on desktop and landscape mobile.

## Shared environment assets

### Textures

Textures such as asphalt, gravel and grass must be:

- Seamless.
- Fully opaque.
- Square and preferably power-of-two.
- Low contrast.
- Free of baked road markings and directional shadows unless they are intentionally non-tiled.

### Props

Props such as trees, barriers, fences, bales and signs must be:

- Top-down.
- Transparent PNGs.
- Centred with appropriate padding.
- Lit consistently.
- Readable at final gameplay scale.
- Supplied with a simple intended collision footprint.

### Landmarks

Real-place landmarks must be generated from a small reference pack and an explicit asset specification. Important sign text should be added in code or controlled editing rather than trusted to image generation.

## Base-path requirement

Always build asset URLs from `import.meta.env.BASE_URL` or a safe relative path. Never introduce root-relative `/assets/...` references, because production is served beneath `/beryl-racing/`.

Example:

```js
this.load.image(
  'beryl',
  `${import.meta.env.BASE_URL}assets/shared/beryl/beryl-topdown.png`,
);
```

## Asset completion check

An asset is complete only when:

- It has explicit approval.
- Its dimensions, transparency and filename are correct.
- It matches the shared art direction and track brief.
- It is optimised without visible corruption.
- It loads beneath `/beryl-racing/`.
- Scale, collision and readability have been checked in-game.
- It works on desktop and landscape mobile.