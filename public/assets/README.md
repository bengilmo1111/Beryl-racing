# Assets

Beryl and the track are currently **drawn procedurally in code**
(`src/art.js`), so there are no runtime image files to load. This keeps the
game working cleanly beneath the `/beryl-racing/` base path (nothing to 404).

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
