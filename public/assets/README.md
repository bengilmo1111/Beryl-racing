# Assets

- **`beryl-photo.png`** — the real photo of Beryl (turquoise Morris Minor 1000).
  Loaded via `BERYL_PHOTO_URL` in `src/art.js` and shown as the title-screen
  hero. It's also the reference for the top-down driving sprite.
- **`music-race.mp3`** — 1960s Beach Boys-style race music (looping background
  track). Loaded in `BootScene`, played via `src/audio/sound.js`. The driving
  engine sound is synthesised in code (`src/audio/EngineSound.js`), no file.

The **top-down driving car** and the **track** are otherwise **drawn
procedurally in code** (`src/art.js`), so gameplay has no runtime image
dependency and works cleanly beneath the `/beryl-racing/` base path.

## Generating a top-down Beryl sprite

`src/art.js` contains a full specification for an image generator —
`BERYL_TOPDOWN_SPRITE_PROMPT` (a ready-to-use prompt string) plus a detailed
comment block covering the hard requirements (strict top-down, nose-up,
transparent background, canvas size) and Beryl's identity (colours, whitewalls,
chrome, red pinstripe). Feed that prompt to the image agent, using
`beryl-photo.png` here as the visual reference.

## Environment art (optional, to replace the coded track/scenery)

`src/art.js` also has ready-to-use prompts + specs for these. Generate any of
them, save with the **exact filename**, and tell me — I'll wire each in.

| Filename | What | Prompt constant |
|---|---|---|
| `tarmac.png` | Seamless 512×512 opaque asphalt tile | `TARMAC_TEXTURE_PROMPT` |
| `grass.png` | Seamless 512×512 opaque grass tile | `GRASS_TEXTURE_PROMPT` |
| `tree-1.png`, `tree-2.png`, `tree-3.png` | Top-down tree variants, transparent | `TREE_PROMPT` |
| `tyre-barrier.png` | Top-down tyre barrier, transparent | `TYRE_BARRIER_PROMPT` |
| `hay-bale.png` | Top-down straw bale, transparent | `HAY_BALE_PROMPT` |
| `start-gantry.png` | Wide start/finish banner (optional) | `START_GANTRY_PROMPT` |

**Textures (`tarmac.png`, `grass.png`)** must be **seamless** (tile with no
visible seam), **fully opaque**, square, and low-contrast so the car/kerbs stay
readable. **Props** must be **transparent** top-down sprites with a soft shadow
baked underneath.

## Swapping in a generated Beryl sprite later

If you produce a top-down PNG of Beryl (e.g. via an image-generator agent):

1. Save it here as `beryl.png` — top-down, **nose pointing up**, transparent
   background, roughly 128×256 px.
2. In `src/scenes/BootScene.js`, load it with a base-path-aware URL and skip the
   procedural draw:

   ```js
   // preload():
   this.load.image('beryl', `${import.meta.env.BASE_URL}assets/beryl.png`);
   // and remove the drawBeryl(this) call in create()
   ```

Always build asset URLs from `import.meta.env.BASE_URL` (never a root-relative
`/assets/...`) so they resolve under the directory base path.
