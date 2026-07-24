// Artwork for the game.
//
// Two sources feed the look of Beryl:
//   1. The real photo of Beryl — a turquoise 1960s Morris Minor 1000 — shipped
//      at public/assets/beryl-photo.png (see BERYL_PHOTO_URL below). Her side
//      profile is used as the hero on the title screen. This photo is the
//      visual reference the top-down sprite is derived from.
//   2. A procedural top-down sprite (drawBeryl) drawn in code from that
//      reference, used for gameplay where a bird's-eye car is needed.
//
// The top-down car is drawn procedurally (rather than loaded) so gameplay has
// no runtime asset dependency; the photo is loaded as a normal asset via a
// base-path-aware URL so it resolves under /beryl-racing/.
import { COLORS } from './config.js';

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
// Use this to generate a top-down sprite of Beryl to replace the procedural
// `drawBeryl` car below. Feed BERYL_TOPDOWN_SPRITE_PROMPT to the image agent,
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

const BERYL_W = 88;
const BERYL_H = 150;

// Draw a top-down Morris Minor, nose pointing UP (toward -y). This is the
// code-drawn placeholder; see BERYL_TOPDOWN_SPRITE_PROMPT above to generate a
// higher-fidelity sprite that follows the same orientation and identity.
export function drawBeryl(scene, key = 'beryl') {
  const g = scene.add.graphics();
  const cx = BERYL_W / 2;

  // Soft shadow.
  g.fillStyle(0x000000, 0.18);
  g.fillRoundedRect(10, 16, BERYL_W - 16, BERYL_H - 20, 26);

  // Main body.
  g.fillStyle(COLORS.berylBody, 1);
  g.fillRoundedRect(8, 6, BERYL_W - 16, BERYL_H - 14, 30);
  g.lineStyle(3, COLORS.berylBodyDark, 1);
  g.strokeRoundedRect(8, 6, BERYL_W - 16, BERYL_H - 14, 30);

  // Bonnet (front, top) subtle shading.
  g.fillStyle(COLORS.berylBodyDark, 0.18);
  g.fillRoundedRect(16, 14, BERYL_W - 32, 34, 16);

  // Chrome bumpers front & rear.
  g.fillStyle(COLORS.chrome, 1);
  g.fillRoundedRect(18, 3, BERYL_W - 36, 9, 4); // front
  g.fillRoundedRect(18, BERYL_H - 12, BERYL_W - 36, 9, 4); // rear

  // Headlights (front) and tail lights (rear).
  g.fillStyle(0xfff2c4, 1);
  g.fillCircle(22, 14, 5);
  g.fillCircle(BERYL_W - 22, 14, 5);
  g.fillStyle(COLORS.red, 1);
  g.fillCircle(22, BERYL_H - 14, 4);
  g.fillCircle(BERYL_W - 22, BERYL_H - 14, 4);

  // Wheels: dark tyre with a whitewall ring, poking out at the corners.
  const wheel = (wx, wy) => {
    g.fillStyle(0x181a1d, 1);
    g.fillRoundedRect(wx - 8, wy - 15, 16, 30, 6);
    g.fillStyle(0xe9e9e2, 1);
    g.fillRoundedRect(wx - 5, wy - 12, 10, 24, 5); // whitewall/hub hint
    g.fillStyle(0x2b2d31, 1);
    g.fillRoundedRect(wx - 3, wy - 9, 6, 18, 4);
  };
  wheel(9, 34);
  wheel(BERYL_W - 9, 34);
  wheel(9, BERYL_H - 40);
  wheel(BERYL_W - 9, BERYL_H - 40);

  // Red side pinstripe (Beryl has one).
  g.fillStyle(COLORS.red, 0.85);
  g.fillRect(14, 70, 3, 40);
  g.fillRect(BERYL_W - 17, 70, 3, 40);

  // Roof (lighter turquoise) between the windows.
  g.fillStyle(COLORS.berylRoof, 1);
  g.fillRoundedRect(20, 58, BERYL_W - 40, 42, 16);

  // Windscreen (front) and rear window.
  g.fillStyle(COLORS.glass, 1);
  g.fillRoundedRect(19, 44, BERYL_W - 38, 18, 10); // windscreen
  g.fillRoundedRect(19, 96, BERYL_W - 38, 18, 10); // rear window
  // Glass glint.
  g.fillStyle(0x8fd6e2, 0.5);
  g.fillRoundedRect(24, 47, 18, 6, 3);

  g.generateTexture(key, BERYL_W, BERYL_H);
  g.destroy();
  return { width: BERYL_W, height: BERYL_H };
}

// A 128px grass tile with subtle mown-stripe variation and speckle.
export function drawGrass(scene, key = 'grass') {
  const size = 128;
  const g = scene.add.graphics();
  g.fillStyle(COLORS.hill, 1);
  g.fillRect(0, 0, size, size);
  // Mowing stripes.
  g.fillStyle(COLORS.deepHill, 0.16);
  for (let y = 0; y < size; y += 32) {
    g.fillRect(0, y, size, 16);
  }
  // Speckle for texture.
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const dark = Math.random() > 0.5;
    g.fillStyle(dark ? 0x4f9e46 : 0x7fca6f, 0.5);
    g.fillRect(x, y, 2, 2);
  }
  g.generateTexture(key, size, size);
  g.destroy();
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

// A dark tyre-skid stamp; many overlapping stamps build a trail.
export function drawSkid(scene, key = 'skid') {
  const size = 14;
  const g = scene.add.graphics();
  g.fillStyle(0x1a1a1a, 0.5);
  g.fillCircle(size / 2, size / 2, size / 2);
  g.fillStyle(0x1a1a1a, 0.5);
  g.fillCircle(size / 2, size / 2, size / 2 - 3);
  g.generateTexture(key, size, size);
  g.destroy();
}

// A simple top-down tree: round canopy with an offset shadow, for roadside life.
export function drawTree(scene, key = 'tree') {
  const size = 72;
  const c = size / 2;
  const g = scene.add.graphics();
  // Shadow.
  g.fillStyle(0x123a22, 0.35);
  g.fillCircle(c + 6, c + 8, 26);
  // Canopy layers.
  g.fillStyle(0x2f7d3f, 1);
  g.fillCircle(c, c, 26);
  g.fillStyle(0x3f9a4f, 1);
  g.fillCircle(c - 6, c - 6, 18);
  g.fillStyle(0x54b463, 1);
  g.fillCircle(c - 9, c - 9, 9);
  g.generateTexture(key, size, size);
  g.destroy();
}
