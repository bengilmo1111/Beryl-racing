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

// A tiny soft dust/skid puff used when off-track or handbraking.
export function drawPuff(scene, key = 'puff') {
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 1);
  g.fillCircle(8, 8, 8);
  g.generateTexture(key, 16, 16);
  g.destroy();
}
