// Artwork for the game.
//
// The real photo of Beryl — a turquoise 1960s Morris Minor 1000 — ships at
// public/assets/beryl-photo.png (see BERYL_PHOTO_URL below). Her side profile is
// used as the hero on the title screen, and it is the visual reference every
// other depiction of Beryl is derived from. It is loaded as a normal asset via a
// base-path-aware URL so it resolves under the deployment's base path.
//
// What remains here is the photo loader, the puff texture used for drift smoke
// and dust, and the image-generation prompts. The procedural top-down car, grass
// and tree drawings that used to live here were superseded by generated PNGs and
// then by the 3D renderer; see src/render3d/.

// The real Beryl photo, resolved beneath the directory base path.
export const BERYL_PHOTO_KEY = 'beryl-photo';
export const BERYL_PHOTO_URL = `${import.meta.env.BASE_URL}assets/beryl-photo.png`;

// Load Beryl's photo. Call from a scene's preload().
export function preloadBerylPhoto(scene) {
  scene.load.image(BERYL_PHOTO_KEY, BERYL_PHOTO_URL);
}

// ---------------------------------------------------------------------------
// SPRITE SPECIFICATION FOR AN IMAGE GENERATOR
// ---------------------------------------------------------------------------
//
// ⚠ STALE ON THIS BRANCH — these prompts describe the 2D game on `main`.
//
// The 3D port renders the world from behind the car, where a strict top-down
// sprite is unusable: you would be looking at the roof of a flat cut-out. Every
// prompt below still demands orthographic top-down with no horizon and no tilt,
// so following them would regenerate assets this build cannot use.
//
// They are kept because `main` still needs them and because the identity
// sections (turquoise body, whitewall tyres, chrome trim, 1960s NZ warmth) are
// exactly right and should carry over verbatim. What must be rewritten before
// the next art pass for this branch is the VIEW and ORIENTATION requirements:
// the 3D build wants side/three-quarter references and, if models are ever
// commissioned, glTF rather than PNG. Beryl and the course furniture are drawn
// procedurally in src/render3d/ in the meantime.
//
// Use this to generate a top-down sprite of Beryl for the 2D build. Feed
// BERYL_TOPDOWN_SPRITE_PROMPT to the image agent,
// using public/assets/beryl-photo.png as the visual reference for colour and
// character. Save the result as public/assets/beryl.png and follow the swap-in
// steps in public/assets/README.md.
//
// Hard requirements (the game depends on these — do not deviate):
//   • VIEW: strict orthographic TOP-DOWN (bird's-eye), camera pointing straight
//     down. NO perspective, NO 3/4 view, NO horizon, NO tilt.
//   • ORIENTATION: the car points straight UP — nose (front/bonnet) at the TOP
//     of the image, boot at the BOTTOM, long axis perfectly vertical. The game
//     rotates the sprite around its centre, so any lean will look wrong.
//   • BACKGROUND: fully transparent (PNG alpha). No ground, shadow-on-ground,
//     road, or scenery baked in. A soft shadow directly under the car is OK
//     only if it is symmetric and subtle.
//   • CANVAS: portrait, e.g. 256 × 512 px (car longer than wide, ~2.1 : 1). Car
//     centred with ~8% padding all around so rotation never clips.
//   • The car must read clearly at ~90 px tall (its in-game size).
//
// Subject & identity (match the reference photo):
//   • A 1960s Morris Minor 1000 — cute, rounded, classic British economy car.
//   • Body colour: turquoise / light teal, hex ~ #2EC4D6 (sample from photo).
//   • Roof: same body colour, a touch lighter (~#63D6E4) where light hits it.
//   • Whitewall tyres: black tyres with a distinct white ring, chrome hubcaps
//     with a small red centre.
//   • Chrome bumpers front and rear (bright silver ~#D8DEE2), chrome trim.
//   • A thin RED side pinstripe (~#E84A5F) running front-to-back along the body.
//   • Round chrome headlights at the front; small red tail lights at the rear.
//
// What is visible from directly above (front at top):
//   1. Chrome front bumper (thin bright band across the nose).
//   2. Rounded bonnet with a subtle central crease; two round headlights at the
//      front corners.
//   3. Front windscreen as dark glass (~#22333B) angled across the body.
//   4. Roof panel (body-colour) in the middle.
//   5. Rear windscreen as dark glass.
//   6. Boot lid and thin chrome rear bumper at the bottom; two small red lights.
//   7. Four wheels peeking out at the corners, whitewalls visible, tyres
//      cropped by the wheel arches.
//   8. Red pinstripe down each side; optional tiny wing mirrors near the front.
//
// Style & lighting:
//   • Clean, semi-realistic but slightly stylised and game-friendly; crisp
//     edges, gentle cel-ish shading, readable silhouette. Not photoreal, not
//     flat vector, not cartoonish-wonky.
//   • Even soft lighting from the top-left; a soft specular highlight along the
//     roof and bonnet. Avoid harsh reflections that hide the body colour.
//   • Consistent with the Gilmore Games look: warm, friendly, bold outlines OK.
//
// Output: a single PNG with transparency, sprite centred, no text or borders.
export const BERYL_TOPDOWN_SPRITE_PROMPT = [
  'Top-down (bird\'s-eye) game sprite of a turquoise 1960s Morris Minor 1000,',
  'camera pointing straight down, orthographic, no perspective or tilt.',
  'The car points straight UP: front bumper and bonnet at the top, boot at the',
  'bottom, long axis vertical, centred on a fully TRANSPARENT background.',
  'Body colour light teal/turquoise (#2EC4D6) with a slightly lighter roof,',
  'bright chrome front and rear bumpers, round chrome headlights at the front',
  'corners, small red tail lights at the rear, dark glass windscreens, a roof',
  'panel in body colour, a thin red side pinstripe running front-to-back, and',
  'four whitewall tyres with chrome hubcaps peeking from the wheel arches.',
  'Clean, slightly stylised, game-friendly shading with soft top-left lighting',
  'and a crisp readable silhouette; no ground, road, scenery, text, or border.',
  'Portrait canvas about 256x512, car centred with ~8% padding so it can be',
  'rotated without clipping. Match the reference photo for colour and character.',
].join(' ');

// ===========================================================================
// ENVIRONMENT ART SPECIFICATIONS FOR AN IMAGE GENERATOR
// ===========================================================================
// Generate these to replace the coded track/scenery. Drop each file in
// public/assets/ with the exact filename noted, then tell me and I'll wire it
// in. All top-down (bird's-eye), even lighting, Gilmore Games palette (see
// gilmore-directory/docs/ART-DIRECTION.md: warm, friendly, bold, not photoreal).
//
// TWO CATEGORIES, different rules:
//   • TEXTURES (tarmac, grass) are TILED across the world, so they MUST be
//     SEAMLESS (edges wrap top↔bottom and left↔right with no visible seam),
//     FULLY OPAQUE (no transparency), square, and power-of-two (512×512).
//     Keep them SUBTLE and low-contrast — the car, kerbs and skid marks must
//     stay readable on top. No large one-off features (they'd repeat obviously)
//     and no directional drop-shadows (they break tiling).
//   • PROPS (trees, barriers, bales, gantry) are individual sprites: TRANSPARENT
//     background, top-down, with a soft SYMMETRIC contact shadow baked directly
//     underneath, centred with a little padding.

// --- filename: tarmac.png --------------------------------------------------
// Seamless 512×512 opaque asphalt tile. Base mid-grey ~#53585F with fine,
// even grain and a few faint lighter/darker flecks and hairline cracks. No
// road markings, no racing line, no lane edges (kerbs/lines are drawn in code).
export const TARMAC_TEXTURE_PROMPT =
  'Seamless tileable top-down asphalt road texture, 512x512, fully opaque, ' +
  'mid-grey (#53585F) with fine even grain, subtle lighter and darker flecks ' +
  'and faint hairline cracks. Flat even lighting, no shadows, no road markings, ' +
  'no lines, no seams at the edges — must tile perfectly in every direction. ' +
  'Low contrast and understated so game objects stay readable on top.';

// --- filename: grass.png ---------------------------------------------------
// Seamless 512×512 opaque grass tile. Base green ~#67B85A with faint mown
// stripes (must tile) and a subtle blade/speckle texture. Keep it calm.
export const GRASS_TEXTURE_PROMPT =
  'Seamless tileable top-down grass texture, 512x512, fully opaque, healthy ' +
  'green (#67B85A) with very subtle mown stripes and a fine blade/speckle ' +
  'detail. Flat even lighting, no shadows, no seams at the edges — tiles ' +
  'perfectly in every direction. Calm and low-contrast, not busy.';

// --- filenames: tree-1.png, tree-2.png, tree-3.png -------------------------
// 2–3 top-down tree variants, ~128×128, transparent, soft round shadow beneath.
export const TREE_PROMPT =
  'Top-down (bird\'s-eye) game sprite of a leafy round tree, ~128x128, on a ' +
  'fully transparent background, centred, with a soft symmetric shadow directly ' +
  'underneath. Layered green canopy (#2F7D3F to #54B463) with a gentle ' +
  'top-left highlight, slightly stylised and friendly, bold clean silhouette, ' +
  'no ground or grass baked in. Make a few subtly different shapes/sizes.';

// --- filename: tyre-barrier.png --------------------------------------------
// A short run of stacked racing tyres seen from above, ~160×64, transparent.
export const TYRE_BARRIER_PROMPT =
  'Top-down game sprite of a racing tyre barrier: a tight row of black rubber ' +
  'tyres seen from directly above, ~160x64, transparent background, soft shadow ' +
  'beneath. Dark tyres (#1B1D20) with subtle grey highlights, maybe one or two ' +
  'painted red/white, clean and readable, no ground baked in.';

// --- filename: hay-bale.png ------------------------------------------------
// A round or rectangular straw bale from above, ~96×96, transparent.
export const HAY_BALE_PROMPT =
  'Top-down game sprite of a straw hay bale seen from above, ~96x96, ' +
  'transparent background, soft shadow beneath. Golden straw (#D9B45A) with ' +
  'concentric or banded texture, slightly stylised and friendly, no ground.';

// --- filename: start-gantry.png (optional) ---------------------------------
// A banner that arches across the road over the start/finish line. WIDE sprite
// drawn as if viewed from above, transparent, ~600×140, so it can be laid
// across the tarmac. Two side posts + a checkered banner reading START / FINISH.
export const START_GANTRY_PROMPT =
  'Top-down game sprite of a race start/finish gantry banner spanning a road, ' +
  '~600x140, transparent background. Two chunky side posts and a horizontal ' +
  'banner with black-and-white checkered trim and the word START or FINISH, ' +
  'bold and friendly, soft shadow beneath the posts, no road or ground baked in.';

// Add Beryl's photo to a scene, scaled to a max width/height. Falls back to the
// procedural top-down sprite if the photo failed to load.
export function addBerylPhoto(scene, x, y, maxW, maxH) {
  const key = scene.textures.exists(BERYL_PHOTO_KEY) ? BERYL_PHOTO_KEY : 'beryl';
  const img = scene.add.image(x, y, key).setOrigin(0.5);
  const scale = Math.min(maxW / img.width, maxH / img.height);
  img.setScale(scale);
  return img;
}

// A soft round puff used for drift smoke and off-track dust.
export function drawPuff(scene, key = 'puff') {
  const size = 48;
  const g = scene.add.graphics();
  for (let r = size / 2; r > 0; r -= 2) {
    g.fillStyle(0xffffff, 0.06);
    g.fillCircle(size / 2, size / 2, r);
  }
  g.generateTexture(key, size, size);
  g.destroy();
}

