// Procedural artwork generated into Phaser textures at boot. Keeping the art in
// code means there are no runtime asset URLs, so the game works cleanly beneath
// the /beryl-racing/ base path with nothing to 404.
//
// To swap in a generated PNG of Beryl later: drop it in public/assets/beryl.png
// and load it in BootScene with `this.load.image('beryl',
// `${import.meta.env.BASE_URL}assets/beryl.png`)`, then skip drawBeryl().
import { COLORS } from './config.js';

const BERYL_W = 88;
const BERYL_H = 150;

// Draw a top-down Morris Minor, nose pointing UP (toward -y).
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
