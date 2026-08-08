// Reusable low-poly New Zealand houses for the Eastbourne and Ōtaki themes.
//
// These are deliberately broad architectural caricatures rather than replicas:
// painted weatherboards, corrugated-looking coloured roofs, sash windows,
// verandahs, chimneys and a few strong silhouettes. At chase-camera distance,
// those cues matter more than joinery detail or textures.
import {
  Group,
  Mesh,
  BoxGeometry,
  BufferGeometry,
  Float32BufferAttribute,
} from 'three';
import { lambert } from './palette.js';

const DEFAULT_GLASS = 0x496b78;
const DEFAULT_DARK = 0x3b3b39;
const DEFAULT_BRICK = 0x8d4939;
const DEFAULT_DECK = 0xb99669;

function box(w, h, d, x, y, z, material) {
  const mesh = new Mesh(new BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
}

function materials(palette) {
  return {
    wall: lambert(palette.wall),
    trim: lambert(palette.trim ?? 0xf4edda),
    roof: lambert(palette.roof ?? 0x687078),
    glass: lambert(palette.glass ?? DEFAULT_GLASS),
    door: lambert(palette.door ?? palette.trim ?? 0xf4edda),
    brick: lambert(palette.brick ?? DEFAULT_BRICK),
    deck: lambert(palette.deck ?? DEFAULT_DECK),
    dark: lambert(palette.dark ?? DEFAULT_DARK),
  };
}

// Two thick roof planes make a friendly gable without needing smooth curves or
// textures. The visible thickness helps the roof survive the distant chase view.
function addGableRoof(group, w, d, eaveY, rise, material, overhang = 12) {
  const halfRun = w / 2 + overhang;
  const slope = Math.hypot(halfRun, rise);
  const angle = Math.atan2(rise, halfRun);
  const depth = d + overhang * 2;
  for (const side of [-1, 1]) {
    const panel = box(slope, 5, depth, side * halfRun / 2, eaveY + rise / 2, 0, material);
    panel.rotation.z = side < 0 ? angle : -angle;
    group.add(panel);
  }
}

// A low ridged hip roof: more recognisable as a villa/homestead roof than a
// single pyramid, while still only twelve triangles.
function hipRoofGeometry(w, d, rise, overhang = 12) {
  const hw = w / 2 + overhang;
  const hd = d / 2 + overhang;
  const ridgeHalf = Math.max(0, hd - hw * 0.72);
  const positions = [
    -hw, 0, -hd,
     hw, 0, -hd,
     hw, 0,  hd,
    -hw, 0,  hd,
      0, rise, -ridgeHalf,
      0, rise,  ridgeHalf,
  ];
  const indices = [
    0, 4, 1,
    3, 2, 5,
    0, 3, 5, 0, 5, 4,
    1, 4, 5, 1, 5, 2,
  ];
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addHipRoof(group, w, d, eaveY, rise, material, overhang = 12) {
  const roof = new Mesh(hipRoofGeometry(w, d, rise, overhang), material);
  roof.position.y = eaveY;
  group.add(roof);
}

function addSashWindow(group, x, y, frontZ, w, h, m) {
  group.add(box(w + 10, h + 10, 4, x, y, frontZ, m.trim));
  group.add(box(w, h, 2, x, y, frontZ - 2.5, m.glass));
  group.add(box(w + 2, 3, 3, x, y, frontZ - 4, m.trim));
}

function addSideWindow(group, side, y, z, w, h, houseW, m) {
  const frame = new Group();
  frame.add(box(w + 10, h + 10, 4, 0, 0, 0, m.trim));
  frame.add(box(w, h, 2, 0, 0, -2.5, m.glass));
  frame.add(box(w + 2, 3, 3, 0, 0, -4, m.trim));
  frame.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
  frame.position.set(side * (houseW / 2 + 2), y, z);
  group.add(frame);
}

function addDoor(group, x, y, frontZ, w, h, m) {
  group.add(box(w + 9, h + 7, 4, x, y, frontZ, m.trim));
  group.add(box(w, h, 3, x, y, frontZ - 2.5, m.door));
  group.add(box(3, 3, 2, x + w * 0.28, y, frontZ - 5, m.dark));
}

function addVerandah(group, w, houseDepth, wallH, depth, m, opts = {}) {
  const front = -houseDepth / 2;
  const roofY = wallH * (opts.roofHeight ?? 0.82);
  const centreZ = front - depth / 2 + 2;
  group.add(box(w, 5, depth, 0, 4, centreZ, m.deck));

  const roof = box(w + 10, 5, depth + 8, 0, roofY, centreZ - 2, m.roof);
  roof.rotation.x = -0.08;
  group.add(roof);

  const posts = opts.posts ?? 4;
  for (let i = 0; i < posts; i += 1) {
    const t = posts === 1 ? 0.5 : i / (posts - 1);
    const x = -w * 0.43 + t * w * 0.86;
    group.add(box(6, roofY - 3, 6, x, roofY / 2, front - depth + 8, m.trim));
  }

  if (opts.rail) {
    group.add(box(w * 0.88, 5, 5, 0, 24, front - depth + 8, m.trim));
  }
}

function addSmallPorch(group, x, houseDepth, wallH, m) {
  const front = -houseDepth / 2;
  group.add(box(62, 5, 30, x, 4, front - 13, m.deck));
  const roof = box(72, 5, 38, x, wallH * 0.78, front - 14, m.roof);
  roof.rotation.x = -0.1;
  group.add(roof);
  for (const px of [x - 28, x + 28]) {
    group.add(box(5, wallH * 0.78, 5, px, wallH * 0.39, front - 28, m.trim));
  }
}

function addChimney(group, x, z, baseY, m, height = 48) {
  group.add(box(18, height, 18, x, baseY + height / 2, z, m.brick));
  group.add(box(22, 5, 22, x, baseY + height + 2, z, m.dark));
}

function addFinial(group, frontZ, baseY, rise, m) {
  group.add(box(4, 25, 4, 0, baseY + rise + 10, frontZ, m.trim));
}

function addAwnings(group, xs, y, frontZ, m) {
  for (const x of xs) {
    const awning = box(54, 4, 18, x, y, frontZ - 9, m.roof);
    awning.rotation.x = -0.18;
    group.add(awning);
  }
}

function addBayWindow(group, x, wallH, houseDepth, m) {
  const front = -houseDepth / 2;
  group.add(box(78, wallH * 0.58, 24, x, wallH * 0.35, front - 10, m.wall));
  addSashWindow(group, x, wallH * 0.38, front - 24, 54, 32, m);
  const cap = box(88, 5, 34, x, wallH * 0.66, front - 11, m.roof);
  cap.rotation.x = -0.08;
  group.add(cap);
}

function addLeanTo(group, side, houseW, houseD, wallH, m) {
  const w = 64;
  const d = houseD * 0.68;
  const x = side * (houseW / 2 + w / 2 - 4);
  group.add(box(w, wallH * 0.62, d, x, wallH * 0.31, houseD * 0.08, m.wall));
  const roof = box(w + 10, 5, d + 12, x, wallH * 0.66, houseD * 0.08, m.roof);
  roof.rotation.z = side * 0.12;
  group.add(roof);
}

function addWeatherboardBase(group, w, d, m) {
  group.add(box(w + 6, 12, d + 6, 0, 6, 0, m.trim));
}

// The named palette `structures.js` hands out, resolved to colours.
//
// It hands out *names* — 'warmWhite', 'roofRed' — because a structure is
// simulation data and has no business knowing hex. Eastbourne resolved them
// against its own theme table; Ōtaki passed them straight to THREE.Color, which
// has never heard of "warmWhite", so it warned to a console nobody was reading
// and left every house in the town plain white with a plain white roof. One
// table, used by both, is the fix.
export const VILLA_COLOURS = {
  white: 0xf6f2e8,
  warmWhite: 0xeee6d5,
  paleBlue: 0xdce8ea,
  roofDark: 0x4d585d,
  roofGreen: 0x536f60,
  roofRed: 0x8f554a,
};

export function villaPalette(named) {
  return {
    wall: VILLA_COLOURS[named.wall] ?? VILLA_COLOURS.white,
    trim: VILLA_COLOURS.white,
    roof: VILLA_COLOURS[named.roof] ?? VILLA_COLOURS.roofDark,
    // Doors are authored as hex already — they are the one bit of a NZ house
    // that is not off a standard chart.
    door: named.door,
  };
}

export function buildEastbourneVilla({ variant = 'villa', palette }) {
  const group = new Group();
  const m = materials(palette);

  if (variant === 'bungalow') {
    const w = 210;
    const d = 145;
    const h = 66;
    addWeatherboardBase(group, w, d, m);
    group.add(box(w, h, d, 0, 12 + h / 2, 0, m.wall));
    addGableRoof(group, w, d, 12 + h, 46, m.roof, 18);
    addBayWindow(group, -48, h, d, m);
    addDoor(group, 60, 40, -d / 2 - 2, 30, 54, m);
    addSmallPorch(group, 60, d, h, m);
    addSideWindow(group, 1, 46, -8, 38, 34, w, m);
    return group;
  }

  if (variant === 'cottage') {
    const w = 155;
    const d = 112;
    const h = 64;
    addWeatherboardBase(group, w, d, m);
    group.add(box(w, h, d, 0, 12 + h / 2, 0, m.wall));
    addHipRoof(group, w, d, 12 + h, 38, m.roof, 12);
    addSashWindow(group, -43, 45, -d / 2 - 2, 34, 37, m);
    addSashWindow(group, 43, 45, -d / 2 - 2, 34, 37, m);
    addDoor(group, 0, 40, -d / 2 - 4, 27, 54, m);
    addAwnings(group, [-43, 43], 70, -d / 2 - 2, m);
    addChimney(group, 45, 16, 12 + h, m, 36);
    return group;
  }

  if (variant === 'two-storey') {
    const w = 158;
    const d = 122;
    const h = 112;
    addWeatherboardBase(group, w, d, m);
    group.add(box(w, h, d, 0, 12 + h / 2, 0, m.wall));
    addGableRoof(group, w, d, 12 + h, 50, m.roof, 12);
    for (const y of [43, 91]) {
      addSashWindow(group, -43, y, -d / 2 - 2, 34, 34, m);
      addSashWindow(group, 43, y, -d / 2 - 2, 34, 34, m);
    }
    addDoor(group, 0, 39, -d / 2 - 4, 28, 54, m);
    addSmallPorch(group, 0, d, 72, m);
    addChimney(group, 44, 12, 12 + h, m, 40);
    addFinial(group, -d / 2 - 8, 12 + h, 50, m);
    return group;
  }

  const w = 180;
  const d = 130;
  const h = 76;
  addWeatherboardBase(group, w, d, m);
  group.add(box(w, h, d, 0, 12 + h / 2, 0, m.wall));
  addGableRoof(group, w, d, 12 + h, 54, m.roof, 13);
  addSashWindow(group, -50, 48, -d / 2 - 2, 38, 40, m);
  addSashWindow(group, 50, 48, -d / 2 - 2, 38, 40, m);
  addDoor(group, 0, 43, -d / 2 - 4, 30, 58, m);
  addVerandah(group, w - 8, d, h + 12, 34, m, { posts: 4, rail: true });
  addSideWindow(group, 1, 50, 2, 36, 38, w, m);
  addChimney(group, 52, 16, 12 + h, m, 42);
  addFinial(group, -d / 2 - 8, 12 + h, 54, m);
  return group;
}

function buildFarmShed(palette) {
  const m = materials(palette);
  const group = new Group();
  const w = 115;
  const d = 95;
  const h = 54;
  group.add(box(w, h, d, 0, h / 2, 0, m.wall));
  addGableRoof(group, w, d, h, 34, m.roof, 8);
  group.add(box(58, 42, 4, 0, 22, -d / 2 - 2, m.door));
  group.add(box(4, 42, 6, 0, 22, -d / 2 - 5, m.trim));
  return group;
}

export function buildOtakiFarmhouse({ variant = 'homestead', palette, shed = false }) {
  const group = new Group();
  const m = materials(palette);

  if (variant === 'gabled') {
    const w = 230;
    const d = 142;
    const h = 72;
    addWeatherboardBase(group, w, d, m);
    group.add(box(w, h, d, 0, 12 + h / 2, 0, m.wall));
    addGableRoof(group, w, d, 12 + h, 48, m.roof, 14);
    addVerandah(group, w * 0.84, d, h + 12, 34, m, { posts: 5 });
    addDoor(group, 0, 43, -d / 2 - 4, 31, 58, m);
    addSashWindow(group, -65, 49, -d / 2 - 2, 40, 40, m);
    addSashWindow(group, 65, 49, -d / 2 - 2, 40, 40, m);
    addLeanTo(group, 1, w, d, h + 12, m);
    addChimney(group, -68, 12, 12 + h, m, 44);
  } else if (variant === 'two-storey') {
    const w = 190;
    const d = 138;
    const h = 118;
    addWeatherboardBase(group, w, d, m);
    group.add(box(w, h, d, 0, 12 + h / 2, 0, m.wall));
    addHipRoof(group, w, d, 12 + h, 50, m.roof, 14);
    addVerandah(group, w - 8, d, 78, 36, m, { posts: 5, rail: true });
    addDoor(group, 0, 43, -d / 2 - 4, 31, 58, m);
    for (const x of [-58, 58]) {
      addSashWindow(group, x, 48, -d / 2 - 2, 36, 39, m);
      addSashWindow(group, x, 96, -d / 2 - 2, 36, 35, m);
    }
    addChimney(group, 62, 10, 12 + h, m, 44);
  } else if (variant === 'cottage') {
    const w = 178;
    const d = 122;
    const h = 66;
    addWeatherboardBase(group, w, d, m);
    group.add(box(w, h, d, 0, 12 + h / 2, 0, m.wall));
    addGableRoof(group, w, d, 12 + h, 42, m.roof, 12);
    addSmallPorch(group, 0, d, h + 12, m);
    addDoor(group, 0, 42, -d / 2 - 4, 29, 56, m);
    addSashWindow(group, -52, 46, -d / 2 - 2, 35, 37, m);
    addSashWindow(group, 52, 46, -d / 2 - 2, 35, 37, m);
    addLeanTo(group, -1, w, d, h + 12, m);
    addChimney(group, 49, 15, 12 + h, m, 40);
  } else {
    const w = 250;
    const d = 164;
    const h = 76;
    addWeatherboardBase(group, w, d, m);
    group.add(box(w, h, d, 0, 12 + h / 2, 0, m.wall));
    addHipRoof(group, w, d, 12 + h, 48, m.roof, 16);
    addVerandah(group, w - 10, d, h + 12, 40, m, { posts: 6, rail: true });
    addDoor(group, 0, 44, -d / 2 - 4, 32, 59, m);
    for (const x of [-82, -42, 42, 82]) {
      addSashWindow(group, x, 50, -d / 2 - 2, 31, 39, m);
    }
    addChimney(group, -76, 18, 12 + h, m, 46);
    addChimney(group, 76, 18, 12 + h, m, 46);
  }

  if (shed) {
    const outbuilding = buildFarmShed({
      wall: palette.shedWall ?? 0x9a7859,
      trim: palette.shedTrim ?? 0xe0d6bf,
      roof: palette.shedRoof ?? 0x846254,
      door: palette.shedDoor ?? 0x6f4b36,
    });
    outbuilding.position.set(190, 0, 105);
    outbuilding.rotation.y = -0.18;
    group.add(outbuilding);
  }

  return group;
}
