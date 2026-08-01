// Tree-free, low-poly Manfeild venue art.
//
// Manfeild opened in 1973, so there is no literal 1960s Manfeild to recreate.
// This pass keeps the real traced Manfeild layout and gives it the modest,
// improvised visual language of late-1960s New Zealand club racing: open farm
// country, simple timber stands, corrugated pit sheds, painted boards, marshal
// huts, post-and-wire fencing and straw bales.
import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  PlaneGeometry,
} from 'three';
import { C, basic, lambert } from '../palette.js';
import { labelTexture } from '../textures.js';
import { buildManfeildParallax } from './manfeildParallax.js';

const M = {
  cream: lambert(0xf3ead2),
  weatherboard: lambert(0xd8d1bd),
  paleBlue: lambert(0xa9c9d2),
  fadedRed: lambert(0xa44d45),
  bottleGreen: lambert(0x315d4c),
  corrugated: lambert(0x8f9694),
  darkRoof: lambert(0x535b5d),
  timber: lambert(0x8a6546),
  straw: lambert(0xc9a85d),
  strawLight: lambert(0xddc477),
  ink: lambert(0x24333a),
  white: lambert(C.cream),
  glass: basic(0x294653, { fog: true }),
  grassDry: basic(0x9cab62, { fog: true }),
  grassLight: basic(0xaeba73, { fog: true }),
};

function box(group, w, h, d, material, x = 0, y = h / 2, z = 0) {
  const mesh = new Mesh(new BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

function cylinder(group, rt, rb, h, material, x = 0, y = h / 2, z = 0, sides = 8) {
  const mesh = new Mesh(new CylinderGeometry(rt, rb, h, sides), material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

function textBoard(text, width, height, style = {}) {
  const group = new Group();
  const { texture, aspect } = labelTexture(text, {
    color: '#f7efd8',
    background: '#294653',
    fontSize: 58,
    padX: 22,
    padY: 12,
    radius: 3,
    ...style,
  });
  const boardWidth = Math.min(width, height * aspect);
  const face = new Mesh(
    new PlaneGeometry(boardWidth, height),
    basic(0xffffff, { map: texture, fog: true, transparent: true, side: DoubleSide })
  );
  face.position.z = 3;
  group.add(face);
  box(group, boardWidth + 12, height + 12, 6, M.timber, 0, 0, 0);
  return group;
}

function roadFrame(track) {
  const cp = track.checkpoints[0];
  return {
    x: cp.x,
    z: cp.y,
    y: track.heights ? track.heights[cp.index] : 0,
    yaw: Math.PI / 2 - cp.angle,
  };
}

function addPitchedRoof(group, width, depth, y, material, pitch = 0.34) {
  const roofDepth = depth / Math.cos(pitch);
  for (const side of [-1, 1]) {
    const roof = new Mesh(new BoxGeometry(width / 2 + 10, 12, roofDepth), material);
    roof.position.set(side * width * 0.245, y, 0);
    roof.rotation.z = -side * pitch;
    group.add(roof);
  }
}

function buildGarageBay({ body = M.weatherboard, roof = M.corrugated, accent = M.fadedRed } = {}) {
  const group = new Group();
  box(group, 180, 112, 150, body);
  addPitchedRoof(group, 196, 166, 122, roof, 0.26);
  box(group, 6, 78, 108, M.ink, -93, 48, 0);
  box(group, 7, 60, 34, accent, 92, 38, 45);
  box(group, 7, 34, 44, M.glass, 92, 72, -35);
  return group;
}

function buildPitComplex(track) {
  const group = new Group();
  const side = track.half + 72;

  box(group, 24, 64, 1280, M.cream, side, 32, -30);
  for (let z = -560; z <= 500; z += 106) box(group, 12, 76, 12, M.ink, side, 38, z);

  const palette = [
    { body: M.weatherboard, accent: M.fadedRed },
    { body: M.paleBlue, accent: M.cream },
    { body: M.cream, accent: M.bottleGreen },
    { body: M.weatherboard, accent: M.paleBlue },
    { body: M.cream, accent: M.fadedRed },
    { body: M.paleBlue, accent: M.bottleGreen },
  ];
  palette.forEach((p, i) => {
    const bay = buildGarageBay(p);
    bay.position.set(side + 190, 0, -470 + i * 188);
    group.add(bay);
  });

  const tower = new Group();
  box(tower, 170, 150, 120, M.weatherboard);
  box(tower, 150, 74, 105, M.paleBlue, 0, 187, 0);
  box(tower, 160, 10, 118, M.darkRoof, 0, 230, 0);
  box(tower, 7, 52, 84, M.glass, -79, 187, 0);
  const name = textBoard('MANAWATU CAR CLUB', 260, 40, {
    color: '#15314b', background: '#f2d16b', fontSize: 44,
  });
  name.position.set(-88, 130, 0);
  name.rotation.y = -Math.PI / 2;
  tower.add(name);
  tower.position.set(side + 205, 0, 255);
  group.add(tower);

  for (let i = 0; i < 3; i++) {
    const shed = new Group();
    box(shed, 260, 92, 150, i === 1 ? M.paleBlue : M.weatherboard);
    addPitchedRoof(shed, 276, 166, 102, M.corrugated, 0.2);
    shed.position.set(side + 470, 0, -380 + i * 310);
    group.add(shed);
  }
  for (let i = 0; i < 8; i++) {
    cylinder(group, 20, 20, 48, i % 3 === 0 ? M.fadedRed : M.ink,
      side + 330 + (i % 2) * 48, 24, -510 + i * 130, 12);
  }
  return group;
}

function buildGrandstand(track) {
  const group = new Group();
  const side = -(track.half + 230);
  const stand = new Group();

  for (let i = 0; i < 6; i++) {
    box(stand, 66, 22 + i * 18, 820, i % 2 ? M.weatherboard : M.cream,
      -i * 44, (22 + i * 18) / 2, 0);
    box(stand, 16, 16, 820, M.timber, -i * 44 + 18, 30 + i * 18, 0);
  }
  for (const z of [-390, -130, 130, 390]) {
    box(stand, 18, 250, 18, M.timber, -260, 125, z);
    box(stand, 18, 250, 18, M.timber, 24, 125, z);
  }
  const roof = box(stand, 330, 14, 900, M.corrugated, -120, 255, 0);
  roof.rotation.z = -0.08;

  const board = textBoard('MANFEILD', 430, 58, {
    color: '#f7efd8', background: '#a44d45', fontSize: 66,
  });
  board.position.set(42, 145, 0);
  board.rotation.y = Math.PI / 2;
  stand.add(board);

  stand.position.x = side;
  group.add(stand);
  return group;
}

function buildMarshalPost(label) {
  const group = new Group();
  box(group, 82, 82, 70, M.weatherboard);
  const roof = box(group, 100, 10, 88, M.corrugated, 0, 92, 0);
  roof.rotation.z = 0.08;
  box(group, 5, 38, 50, M.glass, -43, 57, 0);

  const sign = textBoard(label.replace('POST ', ''), 62, 46, {
    color: '#15314b', background: '#f2d16b', fontSize: 64, padX: 12,
  });
  sign.position.set(0, 126, 0);
  group.add(sign);

  const colours = [0xd94b45, 0xf2d16b, 0x4c79ad];
  colours.forEach((colour, i) => {
    box(group, 4, 100, 4, M.timber, 58 + i * 13, 50, -15);
    const flag = new Mesh(new PlaneGeometry(28, 18), basic(colour, { side: DoubleSide, fog: true }));
    flag.position.set(72 + i * 13, 92 - i * 8, -15);
    flag.rotation.y = Math.PI / 2;
    group.add(flag);
  });
  return group;
}

function nearestTrackFrame(track, x, z) {
  let best = 0;
  let dist = Infinity;
  for (let i = 0; i < track.centerline.length; i++) {
    const p = track.centerline[i];
    const d = (p.x - x) ** 2 + (p.y - z) ** 2;
    if (d < dist) { dist = d; best = i; }
  }
  const a = track.centerline[(best - 1 + track.centerline.length) % track.centerline.length];
  const b = track.centerline[(best + 1) % track.centerline.length];
  return { yaw: Math.PI / 2 - Math.atan2(b.y - a.y, b.x - a.x), index: best };
}

function buildMarshalPosts(track, def) {
  const group = new Group();
  for (const [x, z, label] of def.landmarks || []) {
    const post = buildMarshalPost(label);
    post.position.set(x, 0, z);
    post.rotation.y = nearestTrackFrame(track, x, z).yaw + Math.PI;
    group.add(post);
  }
  return group;
}

function buildBaleStack() {
  const group = new Group();
  for (let row = 0; row < 2; row++) {
    const count = row ? 2 : 3;
    for (let i = 0; i < count; i++) {
      const bale = box(group, 76, 42, 44, (i + row) % 2 ? M.straw : M.strawLight,
        (i - (count - 1) / 2) * 78, 22 + row * 40, 0);
      for (const bandX of [-18, 18]) box(bale, 3, 44, 46, M.timber, bandX, 0, 0);
    }
  }
  return group;
}

function buildCornerFurniture(track) {
  const group = new Group();
  const fractions = [0.05, 0.17, 0.31, 0.45, 0.59, 0.73, 0.86, 0.95];
  fractions.forEach((fraction, k) => {
    const i = Math.floor(track.centerline.length * fraction) % track.centerline.length;
    const edge = k % 2 ? track.left[i] : track.right[i];
    const centre = track.centerline[i];
    let nx = edge.x - centre.x;
    let nz = edge.y - centre.y;
    const len = Math.hypot(nx, nz) || 1;
    nx /= len; nz /= len;
    const bale = buildBaleStack();
    bale.position.set(edge.x + nx * 92, 0, edge.y + nz * 92);
    bale.rotation.y = Math.atan2(nx, nz) + Math.PI / 2;
    group.add(bale);
  });

  const boardData = [
    [0.12, 'FEILDING MOTORS', '#a44d45'],
    [0.38, 'MOTOR OIL', '#315d4c'],
    [0.64, 'TYRES', '#294653'],
    [0.82, 'MANAWATU CAR CLUB', '#a44d45'],
  ];
  for (const [fraction, label, colour] of boardData) {
    const i = Math.floor(track.centerline.length * fraction) % track.centerline.length;
    const edge = track.right[i];
    const centre = track.centerline[i];
    let nx = edge.x - centre.x;
    let nz = edge.y - centre.y;
    const len = Math.hypot(nx, nz) || 1;
    nx /= len; nz /= len;
    const board = textBoard(label, 260, 54, {
      color: '#f7efd8', background: colour, fontSize: 54,
    });
    board.position.set(edge.x + nx * 125, 88, edge.y + nz * 125);
    board.rotation.y = nearestTrackFrame(track, edge.x, edge.y).yaw + Math.PI;
    group.add(board);
  }
  return group;
}

function buildMainStraightFence(track) {
  const group = new Group();
  const side = -(track.half + 84);
  for (let z = -620; z <= 620; z += 90) box(group, 10, 92, 10, M.timber, side, 46, z);
  for (const h of [38, 66, 88]) box(group, 4, 4, 1280, M.cream, side, h, 0);
  return group;
}

function buildMownInfield(track) {
  const group = new Group();
  const width = Math.max(900, track.half * 6);
  for (let i = 0; i < 5; i++) {
    const strip = new Mesh(new PlaneGeometry(width, 260), i % 2 ? M.grassDry : M.grassLight);
    strip.geometry.rotateX(-Math.PI / 2);
    strip.position.set(track.centerline[0].x - track.half * 2.5, -6.5, track.centerline[0].y - 900 + i * 300);
    group.add(strip);
  }
  return group;
}

export function buildManfeild(track, def, terrain) {
  const root = new Group();
  const frame = roadFrame(track);

  const venue = new Group();
  venue.add(buildPitComplex(track));
  venue.add(buildGrandstand(track));
  venue.add(buildMainStraightFence(track));
  venue.position.set(frame.x, frame.y, frame.z);
  venue.rotation.y = frame.yaw;
  root.add(venue);

  root.add(buildMarshalPosts(track, def));
  root.add(buildCornerFurniture(track));
  root.add(buildMownInfield(track));

  // The Manawatū beyond the fence: ranges, Taranaki, shelter belts and paddocks,
  // standing outside the world in depth bands. This is what gives the circuit
  // trees on the horizon now that it has none on the ground.
  root.add(buildManfeildParallax(track));

  // Manfeild is flat by design, so the venue sits on the ground plane and never
  // needs to sample terrain height.
  void terrain;
  return root;
}
