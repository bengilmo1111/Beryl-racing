# Reference

Art direction notes for Beryl Racing.

The real photo of Beryl — a turquoise 1960s Morris Minor 1000 — is the visual
reference for the game's art (colours: turquoise body, whitewall tyres, chrome
bumpers, red side pinstripe).

The photo itself is shipped as a game asset at **`public/assets/beryl-photo.png`**
(referenced from `src/art.js` as `BERYL_PHOTO_URL`). It is:

- shown as the hero image on the **title screen** (her side profile), and
- the reference the procedural **top-down** driving sprite (`drawBeryl` in
  `src/art.js`) is derived from.

To replace the top-down car with a generated top-down PNG later, follow the
swap-in steps in `public/assets/README.md`.
