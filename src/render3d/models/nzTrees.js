// Standalone low-poly tree models for Beryl Racing.
//
// This module deliberately does not place anything in a course. It is an art
// library: later track passes can choose species, scale, yaw, terrain position
// and collision behaviour without rebuilding the silhouettes.
import {
  BufferGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  Mesh,
  Quaternion,
  Vector3,
} from 'three';
import { basic, lambert } from '../palette.js';

const UP = new Vector3(0, 1, 0);
const RIGHT = new Vector3(1, 0, 0);

const COLOURS = {
  barkDark: 0x594a3b,
  barkWarm: 0x745744,
  barkPale: 0x928274,
  leafDeep: 0x285a3d,
  leafDark: 0x346b43,
  leafMid: 0x4b8550,
  leafLight: 0x6a9a59,
  leafOlive: 0x657a46,
  leafBlue: 0x3f745d,
  pohutukawaRed: 0xc64f46,
  kowhaiYellow: 0xe5bd3e,
  flowerCream: 0xefe8d1,
  shadow: 0x17251d,
};

export const NZ_TREE_CATALOG = Object.freeze({
  pohutukawa: {
    label: 'Pōhutukawa',
    scientificName: 'Metrosideros excelsa',
    nominalHeight: 270,
    nominalWidth: 390,
    collisionRadius: 68,
    variants: 3,
    cues: ['broad wind-shaped crown', 'gnarled multi-trunk base', 'summer red flower clusters'],
  },
  tiKouka: {
    label: 'Tī kōuka',
    scientificName: 'Cordyline australis',
    nominalHeight: 350,
    nominalWidth: 180,
    collisionRadius: 30,
    variants: 3,
    cues: ['forked corky trunk', 'separate leaf rosettes', 'long drooping blade leaves'],
  },
  kowhai: {
    label: 'Kōwhai',
    scientificName: 'Sophora microphylla',
    nominalHeight: 275,
    nominalWidth: 285,
    collisionRadius: 48,
    variants: 3,
    cues: ['open twisted branching', 'light broken canopy', 'hanging yellow spring flowers'],
  },
  totara: {
    label: 'Tōtara',
    scientificName: 'Podocarpus totara',
    nominalHeight: 365,
    nominalWidth: 245,
    collisionRadius: 48,
    variants: 3,
    cues: ['strong trunk', 'irregular layered crown', 'dense dark podocarp foliage'],
  },
  kanuka: {
    label: 'Kānuka',
    scientificName: 'Kunzea ericoides',
    nominalHeight: 260,
    nominalWidth: 220,
    collisionRadius: 38,
    variants: 3,
    cues: ['slender multi-stem habit', 'fine airy crown', 'small pale flower flecks'],
  },
  rimu: {
    label: 'Rimu',
    scientificName: 'Dacrydium cupressinum',
    nominalHeight: 450,
    nominalWidth: 240,
    collisionRadius: 44,
    variants: 3,
    cues: ['tall podocarp form', 'tiered limbs', 'olive drooping foliage curtains'],
  },
  norfolkPine: {
    label: 'Norfolk Island pine',
    scientificName: 'Araucaria heterophylla',
    nominalHeight: 540,
    nominalWidth: 250,
    collisionRadius: 38,
    variants: 3,
    cues: ['single straight trunk', 'widely separated branch tiers', 'five horizontal branches per whorl'],
  },
});

function materials() {
  return {
    barkDark: lambert(COLOURS.barkDark),
    barkWarm: lambert(COLOURS.barkWarm),
    barkPale: lambert(COLOURS.barkPale),
    leafDeep: lambert(COLOURS.leafDeep, { flatShading: true }),
    leafDark: lambert(COLOURS.leafDark, { flatShading: true }),
    leafMid: lambert(COLOURS.leafMid, { flatShading: true }),
    leafLight: lambert(COLOURS.leafLight, { flatShading: true }),
    leafOlive: lambert(COLOURS.leafOlive, { flatShading: true }),
    leafBlue: lambert(COLOURS.leafBlue, { flatShading: true }),
    red: lambert(COLOURS.pohutukawaRed, { flatShading: true }),
    yellow: lambert(COLOURS.kowhaiYellow, { flatShading: true }),
    cream: lambert(COLOURS.flowerCream, { flatShading: true }),
    shadow: basic(COLOURS.shadow, {
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      fog: true,
      side: DoubleSide,
    }),
  };
}

function addBlob(group, position, scale, material, detail = 0) {
  const mesh = new Mesh(new IcosahedronGeometry(1, detail), material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  group.add(mesh);
  return mesh;
}

function addCone(group, radius, height, material, position, sides = 7) {
  const mesh = new Mesh(new ConeGeometry(radius, height, sides), material);
  mesh.position.set(position[0], position[1], position[2]);
  group.add(mesh);
  return mesh;
}

function addCylinderBetween(group, from, to, radius, material, sides = 7, endRadius = radius * 0.72) {
  const a = new Vector3(from[0], from[1], from[2]);
  const b = new Vector3(to[0], to[1], to[2]);
  const direction = b.clone().sub(a);
  const length = direction.length();
  const mesh = new Mesh(new CylinderGeometry(endRadius, radius, length, sides), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(UP, direction.normalize());
  group.add(mesh);
  return mesh;
}

function addEllipsoidBetween(group, from, to, thickness, width, material, detail = 0) {
  const a = new Vector3(from[0], from[1], from[2]);
  const b = new Vector3(to[0], to[1], to[2]);
  const direction = b.clone().sub(a);
  const length = direction.length();
  const mesh = new Mesh(new IcosahedronGeometry(1, detail), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.scale.set(length * 0.5, thickness, width);
  mesh.quaternion.copy(new Quaternion().setFromUnitVectors(RIGHT, direction.normalize()));
  group.add(mesh);
  return mesh;
}

function addShadow(group, radiusX, radiusZ, material) {
  const mesh = new Mesh(new CircleGeometry(1, 18), material);
  mesh.geometry.rotateX(-Math.PI / 2);
  mesh.position.y = 0.8;
  mesh.scale.set(radiusX, 1, radiusZ);
  mesh.renderOrder = -1;
  group.add(mesh);
}

function leafBladeGeometry(length, width, drop) {
  const positions = [
    -width * 0.5, 0, 0,
    width * 0.5, 0, 0,
    width * 0.28, -drop * 0.55, length * 0.68,
    0, -drop, length,
    -width * 0.28, -drop * 0.55, length * 0.68,
  ];
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex([0, 1, 2, 0, 2, 4, 4, 2, 3]);
  geometry.computeVertexNormals();
  return geometry;
}

function addLeafRosette(group, position, radius, material, variant = 0) {
  material.side = DoubleSide;
  const leafCount = 11 + (variant % 3) * 2;
  for (let i = 0; i < leafCount; i++) {
    const angle = (i / leafCount) * Math.PI * 2 + variant * 0.17;
    const length = radius * (0.78 + ((i * 7 + variant * 3) % 5) * 0.055);
    const leaf = new Mesh(
      leafBladeGeometry(length, radius * 0.13, radius * (0.22 + (i % 3) * 0.055)),
      material
    );
    leaf.position.set(position[0], position[1], position[2]);
    leaf.rotation.y = angle;
    leaf.rotation.x = -0.08 + (i % 2) * 0.05;
    group.add(leaf);
  }
  addBlob(group, position, [radius * 0.17, radius * 0.12, radius * 0.17], material);
}

function tagTree(root, id, variant, shadow, scale) {
  const spec = NZ_TREE_CATALOG[id];
  root.name = `tree:${id}:v${variant}`;
  root.userData.treeAsset = {
    id,
    label: spec.label,
    scientificName: spec.scientificName,
    variant,
    nominalHeight: spec.nominalHeight,
    nominalWidth: spec.nominalWidth,
    collisionRadius: spec.collisionRadius,
  };
  if (shadow) root.userData.includesContactShadow = true;
  root.scale.setScalar(scale);
  return root;
}

export function buildPohutukawa(options = {}) {
  const variant = Math.abs(options.variant ?? 0) % 3;
  const scale = options.scale ?? 1;
  const flowered = options.flowered ?? true;
  const m = materials();
  const root = new Group();
  const wind = variant === 1 ? -1 : 1;
  addShadow(root, 176, 126, m.shadow);

  const trunkForks = [
    [[-28, 0, 0], [-50, 92, 8]],
    [[4, 0, 2], [14, 112, -4]],
    [[30, 0, -3], [62, 88, -10]],
  ];
  trunkForks.forEach(([a, b], i) => {
    addCylinderBetween(root, a, b, 16 - i * 1.5, i === 1 ? m.barkDark : m.barkWarm, 7);
    addCylinderBetween(root, b, [b[0] + wind * (55 + i * 18), b[1] + 54 + i * 8, b[2] + (i - 1) * 38], 9, m.barkWarm, 6);
  });

  const canopy = [
    [-115 * wind, 174, -18, 94, 54, 72],
    [-45 * wind, 205, 10, 108, 62, 86],
    [45 * wind, 196, -24, 102, 58, 82],
    [126 * wind, 175, 8, 88, 50, 68],
    [10 * wind, 236, 28, 82, 46, 70],
  ];
  canopy.forEach((c, i) => addBlob(root, c.slice(0, 3), c.slice(3), i % 2 ? m.leafDark : m.leafMid, i === 1 ? 1 : 0));

  if (flowered) {
    const flowers = [
      [-156 * wind, 207, -28], [-112 * wind, 218, 18], [-63 * wind, 238, -18],
      [-10 * wind, 253, 36], [35 * wind, 233, -36], [88 * wind, 216, 22],
      [142 * wind, 199, -8], [2 * wind, 222, -54],
    ];
    flowers.forEach((p, i) => addBlob(root, p, [16 + (i % 3) * 3, 8, 13], m.red));
  }
  return tagTree(root, 'pohutukawa', variant, true, scale);
}

export function buildTiKouka(options = {}) {
  const variant = Math.abs(options.variant ?? 0) % 3;
  const scale = options.scale ?? 1;
  const m = materials();
  const root = new Group();
  addShadow(root, 68, 62, m.shadow);

  const crownCount = [3, 2, 5][variant];
  const mainTop = 220 + variant * 12;
  addCylinderBetween(root, [0, 0, 0], [4, mainTop, 0], 13, m.barkPale, 7, 9);
  const crownPositions = [
    [-54, 292, 4], [55, 304, -4], [2, 338, 5], [-78, 260, -18], [78, 272, 18],
  ].slice(0, crownCount);
  crownPositions.forEach((p, i) => {
    const join = [i % 2 ? 4 : -2, mainTop - 12 + (i % 3) * 10, 0];
    addCylinderBetween(root, join, [p[0], p[1] - 26, p[2]], 7.5, m.barkPale, 6, 5);
    addLeafRosette(root, p, 67 - (i % 2) * 7, i % 2 ? m.leafOlive : m.leafMid, variant + i);
  });
  return tagTree(root, 'tiKouka', variant, true, scale);
}

export function buildKowhai(options = {}) {
  const variant = Math.abs(options.variant ?? 0) % 3;
  const scale = options.scale ?? 1;
  const flowered = options.flowered ?? true;
  const m = materials();
  const root = new Group();
  addShadow(root, 118, 94, m.shadow);

  const lean = variant === 2 ? -18 : 12;
  addCylinderBetween(root, [0, 0, 0], [lean, 118, 2], 13, m.barkWarm, 7, 9);
  const limbs = [
    [[lean, 106, 0], [-92, 190, -12]],
    [[lean, 118, 0], [72, 208, 10]],
    [[lean, 126, 0], [4, 238, -8]],
    [[-28, 148, -4], [-132, 220, 28]],
    [[34, 158, 4], [124, 232, -30]],
  ];
  limbs.forEach(([a, b], i) => addCylinderBetween(root, a, b, i < 3 ? 7 : 5, m.barkWarm, 6));

  const canopy = [
    [-112, 218, 0, 62, 38, 54], [-48, 242, -26, 72, 42, 58],
    [30, 252, 22, 78, 45, 64], [102, 230, -14, 65, 40, 54],
    [4, 205, -48, 58, 36, 48],
  ];
  canopy.forEach((c, i) => addBlob(root, c.slice(0, 3), c.slice(3), i % 2 ? m.leafLight : m.leafMid));

  if (flowered) {
    const drops = [
      [-128, 214, 18], [-86, 226, -36], [-38, 234, 10], [4, 240, 38],
      [44, 244, -28], [88, 224, 18], [126, 214, -26], [18, 198, -58],
    ];
    drops.forEach((p, i) => {
      const flower = addCone(root, 7 + (i % 2), 24, m.yellow, [p[0], p[1] - 10, p[2]], 6);
      flower.rotation.z = Math.PI;
    });
  }
  return tagTree(root, 'kowhai', variant, true, scale);
}

export function buildTotara(options = {}) {
  const variant = Math.abs(options.variant ?? 0) % 3;
  const scale = options.scale ?? 1;
  const m = materials();
  const root = new Group();
  addShadow(root, 95, 86, m.shadow);

  const lean = (variant - 1) * 10;
  addCylinderBetween(root, [0, 0, 0], [lean, 220, 0], 18, m.barkDark, 8, 10);
  const branchLevels = [95, 145, 190, 230, 270];
  branchLevels.forEach((y, level) => {
    const reach = 92 - level * 11 + variant * 4;
    for (let arm = 0; arm < 3; arm++) {
      const angle = arm * (Math.PI * 2 / 3) + level * 0.58 + variant * 0.31;
      const end = [Math.cos(angle) * reach + lean * (y / 220), y + 18, Math.sin(angle) * reach];
      addCylinderBetween(root, [lean * (y / 220), y, 0], end, 5.8 - level * 0.45, m.barkDark, 6);
      addBlob(root, end, [42 - level * 3, 31, 36 - level * 2], level % 2 ? m.leafDeep : m.leafDark);
    }
  });
  addBlob(root, [lean + 2, 315, 0], [56, 70, 52], m.leafDeep, 1);
  addBlob(root, [lean - 18, 276, 8], [72, 52, 64], m.leafDark);
  return tagTree(root, 'totara', variant, true, scale);
}

export function buildKanuka(options = {}) {
  const variant = Math.abs(options.variant ?? 0) % 3;
  const scale = options.scale ?? 1;
  const flowered = options.flowered ?? variant !== 2;
  const m = materials();
  const root = new Group();
  addShadow(root, 92, 78, m.shadow);

  const stems = [
    [[-18, 0, 0], [-42, 164, -10]],
    [[4, 0, 2], [12, 188, 4]],
    [[24, 0, -2], [52, 156, 12]],
  ];
  stems.forEach(([a, b], i) => {
    addCylinderBetween(root, a, b, 8 - i * 0.5, m.barkPale, 7, 4.8);
    const tip = [b[0] + (i - 1) * 22, b[1] + 52 + variant * 5, b[2] + (1 - i) * 18];
    addCylinderBetween(root, b, tip, 4.5, m.barkPale, 6, 2.5);
  });

  const wisps = [
    [-92, 206, -8, 56, 33, 42], [-36, 232, 18, 62, 38, 48],
    [26, 244, -18, 68, 40, 52], [88, 210, 8, 54, 32, 42],
    [10, 194, 40, 54, 34, 44],
  ];
  wisps.forEach((c, i) => addBlob(root, c.slice(0, 3), c.slice(3), i % 2 ? m.leafBlue : m.leafMid));

  if (flowered) {
    const flecks = [
      [-116, 216, -12], [-72, 238, 24], [-26, 252, -20], [22, 262, 12],
      [66, 238, -18], [106, 218, 14], [2, 214, 52],
    ];
    flecks.forEach((p) => addBlob(root, p, [5, 4, 5], m.cream));
  }
  return tagTree(root, 'kanuka', variant, true, scale);
}

export function buildRimu(options = {}) {
  const variant = Math.abs(options.variant ?? 0) % 3;
  const scale = options.scale ?? 1;
  const m = materials();
  const root = new Group();
  addShadow(root, 92, 86, m.shadow);

  const lean = (variant - 1) * 7;
  addCylinderBetween(root, [0, 0, 0], [lean, 372, 0], 16, m.barkDark, 8, 7);
  const levels = [110, 170, 230, 286, 334];
  levels.forEach((y, level) => {
    const branchLength = 105 - level * 14;
    for (let arm = 0; arm < 4; arm++) {
      const angle = arm * Math.PI / 2 + level * 0.43 + variant * 0.19;
      const base = [lean * (y / 372), y, 0];
      const end = [base[0] + Math.cos(angle) * branchLength, y + 8, Math.sin(angle) * branchLength];
      addCylinderBetween(root, base, end, 4.6 - level * 0.45, m.barkDark, 6, 2.5);
      const droop = 48 + level * 5 + (arm % 2) * 8;
      addEllipsoidBetween(root, end, [end[0] + Math.cos(angle) * 12, end[1] - droop, end[2] + Math.sin(angle) * 12], 13, 18, m.leafOlive);
      addEllipsoidBetween(root, [end[0] * 0.78, end[1] - 4, end[2] * 0.78], [end[0] * 0.84, end[1] - droop * 0.78, end[2] * 0.84], 11, 15, m.leafDark);
    }
  });
  addCone(root, 44, 112, m.leafOlive, [lean, 398, 0], 8);
  return tagTree(root, 'rimu', variant, true, scale);
}

function addNorfolkFoliageArm(root, start, end, tier, material) {
  addCylinderBetween(root, start, end, Math.max(2.4, 5.2 - tier * 0.35), material.barkDark, 6, 1.8);
  const direction = new Vector3(end[0] - start[0], end[1] - start[1], end[2] - start[2]);
  const side = new Vector3(-direction.z, 0, direction.x).normalize();
  for (let i = 1; i <= 4; i++) {
    const t = i / 4.4;
    const centre = new Vector3(start[0] + direction.x * t, start[1] + direction.y * t, start[2] + direction.z * t);
    const half = 18 - tier * 0.9 - i * 1.2;
    addEllipsoidBetween(root, [centre.x - side.x * half, centre.y - 2, centre.z - side.z * half], [centre.x + side.x * half, centre.y + 2, centre.z + side.z * half], 7, 10, tier % 2 ? material.leafDeep : material.leafDark);
  }
}

export function buildNorfolkPine(options = {}) {
  const variant = Math.abs(options.variant ?? 0) % 3;
  const scale = options.scale ?? 1;
  const m = materials();
  const root = new Group();
  addShadow(root, 86, 82, m.shadow);

  const mature = variant === 2;
  const trunkHeight = mature ? 520 : 490 + variant * 16;
  const trunkLean = mature ? 8 : (variant === 1 ? -5 : 0);
  addCylinderBetween(root, [0, 0, 0], [trunkLean, trunkHeight, 0], 14, m.barkDark, 9, 4.8);

  const tierCount = mature ? 8 : 7;
  const baseY = mature ? 118 : 90;
  const tierGap = mature ? 50 : 56;
  for (let tier = 0; tier < tierCount; tier++) {
    const y = baseY + tier * tierGap;
    const taper = 1 - tier / (tierCount + 1.6);
    const maxLength = (mature ? 118 : 126) * taper + 24;
    for (let arm = 0; arm < 5; arm++) {
      const angle = arm * Math.PI * 2 / 5 + tier * 0.37 + variant * 0.11;
      const length = maxLength * (mature && tier < 2 && arm === 3 ? 0.72 : 1);
      const start = [trunkLean * (y / trunkHeight), y, 0];
      const end = [start[0] + Math.cos(angle) * length, y + (tier > tierCount - 3 ? 13 : -2) - (arm % 2) * 2, Math.sin(angle) * length];
      addNorfolkFoliageArm(root, start, end, tier, m);
    }
  }

  // Keep a narrow spire above the last whorl. The separated tiers, rather than
  // a solid Christmas-tree cone, remain the defining silhouette.
  addCone(root, mature ? 32 : 38, 104, m.leafDeep, [trunkLean, trunkHeight + 38, 0], 8);
  return tagTree(root, 'norfolkPine', variant, true, scale);
}

export function buildNzTreeAsset(id, options = {}) {
  switch (id) {
    case 'pohutukawa': return buildPohutukawa(options);
    case 'tiKouka': return buildTiKouka(options);
    case 'kowhai': return buildKowhai(options);
    case 'totara': return buildTotara(options);
    case 'kanuka': return buildKanuka(options);
    case 'rimu': return buildRimu(options);
    case 'norfolkPine': return buildNorfolkPine(options);
    default: throw new Error(`Unknown New Zealand tree asset: ${id}`);
  }
}

// Optional review helper. It is not imported or placed by any course; a future
// debug scene can add this group to inspect the complete library at once.
export function buildNzTreeShowcase({ spacing = 470, shadows = true } = {}) {
  const root = new Group();
  const ids = Object.keys(NZ_TREE_CATALOG);
  ids.forEach((id, index) => {
    const tree = buildNzTreeAsset(id, { variant: index % NZ_TREE_CATALOG[id].variants });
    tree.position.x = (index - (ids.length - 1) / 2) * spacing;
    if (!shadows) {
      tree.children
        .filter((child) => child.material && child.material.transparent && child.material.opacity === 0.16)
        .forEach((child) => child.removeFromParent());
    }
    root.add(tree);
  });
  root.name = 'nz-tree-showcase';
  return root;
}
