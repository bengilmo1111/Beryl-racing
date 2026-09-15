// Photo-informed identity pass for the real Beryl.
//
// The base Morris Minor mesh is shared with traffic, so the generic car stays
// intentionally simple. This pass is applied only to the player's Beryl and
// fits the identifying details to the photoBody shell from the chase camera:
// bluer paint, black rear-window seal, MGS3 plate, period tail lamps,
// chrome bumper/overriders, Minor 1000 badge and sailor decal.
import {
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Mesh,
  MeshLambertMaterial,
  MeshPhongMaterial,
  SphereGeometry,
  Raycaster,
  Vector3,
  TubeGeometry,
  CatmullRomCurve3,
  DoubleSide,
} from 'three';
import { BERYL } from './beryl.js';

const W = BERYL.width;
const L = BERYL.length;

const REAL_BERYL_TURQUOISE = 0x12b6e5;
const BASE_BERYL_TURQUOISE = 0x19bdd0;
const BASE_GLASS = 0x426b78;

const GLYPHS = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '3': ['111', '001', '111', '001', '111'],
  B: ['110', '101', '110', '101', '110'],
  E: ['111', '100', '110', '100', '111'],
  G: ['111', '100', '101', '101', '111'],
  I: ['111', '010', '010', '010', '111'],
  L: ['100', '100', '100', '100', '111'],
  M: ['101', '111', '111', '101', '101'],
  N: ['101', '111', '111', '111', '101'],
  O: ['111', '101', '101', '101', '111'],
  R: ['110', '101', '110', '101', '101'],
  S: ['111', '100', '111', '001', '111'],
  Y: ['101', '101', '010', '010', '010'],
};

function materialColour(material) {
  return material && material.color && typeof material.color.getHex === 'function'
    ? material.color.getHex()
    : null;
}

function ellipsoid(rx, ry, rz, x, y, z, material) {
  const mesh = new Mesh(new SphereGeometry(1, 16, 8), material);
  mesh.scale.set(rx, ry, rz);
  mesh.position.set(x, y, z);
  return mesh;
}

function pixelTextGeometry(text, size, centerX, centerY, z) {
  const patterns = [...text].map((char) => GLYPHS[char] || GLYPHS.O);
  const totalCols = patterns.reduce((sum, pattern) => sum + pattern[0].length, 0)
    + Math.max(0, patterns.length - 1);
  const startX = centerX - (totalCols - 1) * size * 0.5;
  const half = size * 0.41;
  const positions = [];
  let cursor = 0;

  for (const pattern of patterns) {
    for (let row = 0; row < pattern.length; row += 1) {
      for (let col = 0; col < pattern[row].length; col += 1) {
        if (pattern[row][col] !== '1') continue;
        const x = startX + (cursor + col) * size;
        const y = centerY + (2 - row) * size;
        positions.push(
          x - half, y - half, z,
          x + half, y - half, z,
          x - half, y + half, z,
          x - half, y + half, z,
          x + half, y - half, z,
          x + half, y + half, z
        );
      }
    }
    cursor += pattern[0].length + 1;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function triangle(points, z, material) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([
    points[0][0], points[0][1], z,
    points[1][0], points[1][1], z,
    points[2][0], points[2][1], z,
  ], 3));
  geometry.computeVertexNormals();
  return new Mesh(geometry, material);
}

function addRearIdentity(chassis) {
  const chrome = new MeshPhongMaterial({ color: 0xdbe6e3, specular: 0xffffff, shininess: 100 });
  const plate = new MeshPhongMaterial({ color: 0xf2f0e8, specular: 0xffffff, shininess: 45 });
  const ink = new MeshLambertMaterial({ color: 0x11181d });
  const red = new MeshPhongMaterial({ color: 0xb9232d, specular: 0xffa0a0, shininess: 70 });
  const amber = new MeshPhongMaterial({ color: 0xdc8628, specular: 0xffdf9b, shininess: 65 });
  const navy = new MeshLambertMaterial({ color: 0x244f79 });
  const white = new MeshLambertMaterial({ color: 0xf4efe4 });
  const decalRed = new MeshLambertMaterial({ color: 0xc34b54 });

  // Retire the generic rear fittings before attaching the photo-based ones.
  chassis.children.forEach((child) => {
    if (child.name === 'generic-rear-plate' || child.name === 'generic-rear-lettering') child.visible = false;
    if (!child.isMesh || child.position.z < L * 0.40) return;
    if (child.geometry?.type === 'SphereGeometry') child.visible = false;
    if (child.geometry?.type === 'CylinderGeometry') child.visible = false;
    if (child.geometry?.type === 'BoxGeometry') {
      const p = child.geometry.parameters;
      if (p && ((Math.abs(p.width - 5) < 0.01 && Math.abs(p.height - 12) < 0.01)
        || (Math.abs(p.width - W * 0.30) < 0.01 && p.height < 2))) {
        child.visible = false;
      }
    }
  });

  // Query the actual reshaped panels, so badges, hinges and lamps cannot float
  // ahead of the boot or disappear inside it when the profile changes.
  chassis.updateMatrixWorld(true);
  const panels = chassis.children.filter(c => c.name === 'body-shell' || c.name === 'wing' || c.name === 'cabin-shell');
  const ray = new Raycaster();
  const rearZ = (x, y, wing = false) => {
    ray.set(new Vector3(x, y, L), new Vector3(0, 0, -1));
    const hit = ray.intersectObjects(wing ? panels : panels.filter(p => p.name !== 'wing'), false)[0];
    if (!hit) throw new Error(`Beryl rear detail misses body at ${x}, ${y}`);
    return hit.point.z;
  };
  const conform = (mesh, lift = 0.5) => {
    mesh.updateMatrix();
    mesh.geometry.applyMatrix4(mesh.matrix);
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.set(1, 1, 1);
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, rearZ(p.getX(i), p.getY(i)) + lift);
    p.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    chassis.add(mesh);
    return mesh;
  };
  const line = (points, radius, material, name) => {
    const mesh = new Mesh(new TubeGeometry(new CatmullRomCurve3(
      points.map(p => new Vector3(...p))), 40, radius, 8, false), material);
    mesh.name = name;
    chassis.add(mesh);
    return mesh;
  };
  const paint = panels[0].material;
  const bumperPoints = [-1, -0.75, -0.35, 0, 0.35, 0.75, 1].map(t =>
    [t * W * 0.5, 24, L * 0.52 - 10 * Math.pow(Math.abs(t), 3)]);
  line(bumperPoints, 3.3, chrome, 'curved-rear-bumper');
  line(bumperPoints.map(([x, y, z]) => [x, y + 3.2, z - 0.6]), 1.8, paint, 'painted-bumper-top');
  for (const sx of [-1, 1]) {
    const x = sx * W * 0.34;
    line([[x, 20, L * 0.525], [x, 26, L * 0.53],
      [x, 35, L * 0.523], [x, 39, L * 0.514]], 2.8, chrome, 'rear-overrider');
  }

  // The actual car has a small amber indicator above a tall red teardrop lamp,
  // mounted on the outer rear wings. The old model used two red dots near the
  // centre of the boot, which was one of the strongest "not Beryl" cues.
  for (const sx of [-1, 1]) {
    const x = sx * W * 0.405;
    chassis.add(ellipsoid(4.5, 8, 2.6, x, 36.5, rearZ(x, 36.5, true) + 0.8, chrome));
    chassis.add(ellipsoid(3.4, 6.7, 2.8, x, 36.5, rearZ(x, 36.5, true) + 1.9, red));
    chassis.add(ellipsoid(3.0, 3.0, 2, x, 47.5, rearZ(x, 47.5, true) + 1, chrome));
    chassis.add(ellipsoid(2.5, 2.5, 2.1, x, 47.5, rearZ(x, 47.5, true) + 2, amber));
  }

  // Plate sits in the lower middle of the sloping boot, with its own small
  // chrome number-plate lamp underneath. Keep it legible at mobile distance.
  const plateZ = rearZ(0, 37.5) + 1.5;
  const plateMesh = new Mesh(new BoxGeometry(W * 0.38, 12.5, 1.4), plate);
  plateMesh.position.set(0, 37.5, plateZ);
  plateMesh.rotation.x = -0.42;
  chassis.add(plateMesh);
  const plateInk = new Mesh(pixelTextGeometry('MGS3', 2.1, 0, 0, 0.8), ink);
  plateMesh.add(plateInk);
  chassis.add(ellipsoid(4.5, 1.8, 2, 0, 29.5, rearZ(0, 29.5) + 1.7, chrome));
  line([[-4, 26.5, rearZ(-4, 26.5) + 1], [0, 26.5, rearZ(0, 26.5) + 1.6],
    [4, 26.5, rearZ(4, 26.5) + 1]], 0.7, chrome, 'boot-handle');

  conform(new Mesh(pixelTextGeometry('MINOR', 0.72, -W * 0.015, 51.5, 0), chrome));
  conform(new Mesh(pixelTextGeometry('1000', 0.72, -W * 0.015, 48.5, 0), chrome));

  // Two long external boot hinges just below the rear glass.
  for (const sx of [-1, 1]) {
    const x = sx * W * 0.265;
    line([63, 61, 58].map(y => [x, y, rearZ(x, y) + 0.9]), 0.8, chrome, 'boot-hinge');
  }
  // A fine panel seam follows the boot edge, rather than a bar across the lid.
  const seam = new MeshLambertMaterial({ color: 0x1683a0 });
  const outline = [[-28, 62], [-34, 59], [-35, 50], [-35, 39], [-33, 29],
    [-28, 25], [0, 24.5], [28, 25], [33, 29], [35, 39], [35, 50], [34, 59], [28, 62]];
  line(outline.map(([x, y]) => [x, y, rearZ(x, y) + 0.45]), 0.25, seam, 'boot-seam');

  // Small graphic built from curved, surface-fitted shapes. Navy bob, sailor
  // cap/collar and red signature are the distinctive colours of Beryl's decal.
  navy.side = white.side = decalRed.side = DoubleSide;
  const decalX = W * 0.195;
  const disc = (r, x, y, material, lift) => {
    const mesh = new Mesh(new CircleGeometry(r, 20), material);
    mesh.position.set(x, y, 0);
    return conform(mesh, lift);
  };
  disc(4.0, decalX, 55.4, navy, 0.65);
  disc(2.6, decalX, 55.5, white, 0.8);
  conform(triangle([[decalX - 5.5, 52.8], [decalX + 5.5, 52.8], [decalX, 48]], 0, navy), 0.7);
  conform(triangle([[decalX - 4, 52.7], [decalX + 4, 52.7], [decalX, 49.2]], 0, white), 0.8);
  const cap = new Mesh(new CircleGeometry(3.6, 20).scale(1, 0.4, 1), white);
  cap.position.set(decalX, 58.3, 0);
  conform(cap, 0.95);
  conform(triangle([[decalX - 3, 58], [decalX + 3, 58], [decalX + 2.6, 57.4]], 0, decalRed), 1);
  // Eyes and smile give the decal a face even in close inspection.
  for (const dx of [-0.9, 0.9]) disc(0.28, decalX + dx, 55.7, navy, 1);
  conform(triangle([[decalX - 0.7, 54.5], [decalX + 0.7, 54.5], [decalX, 54]], 0, decalRed), 1);
  conform(new Mesh(pixelTextGeometry('BERYL', 0.5, decalX + 0.6, 46, 0), decalRed), 0.85);

}

function tunePaintAndGlass(rig) {
  // The photographs are notably bluer than the old green-leaning teal. A small
  // emissive lift stops the rear panel falling back to muddy teal in shade while
  // still leaving the sun to model the rounded shell.
  rig.root.traverse((object) => {
    const material = object.material;
    if (!material || Array.isArray(material)) return;
    const colour = materialColour(material);
    if (colour === BASE_BERYL_TURQUOISE) {
      material.color.setHex(REAL_BERYL_TURQUOISE);
      if (material.emissive) {
        material.emissive.setHex(0x08759b);
        material.emissiveIntensity = 0.32;
      }
    } else if (colour === BASE_GLASS) {
      material.color.setHex(0x587d88);
      if (material.specular) material.specular.setHex(0xd4eff7);
      if ('shininess' in material) material.shininess = 110;
    }
  });

  const seal = rig.chassis.children.find(child => child.name === 'rear-window-seal');
  if (seal) seal.material = new MeshPhongMaterial({ color: 0x26343b, shininess: 35 });

}

export function applyBerylPhotoPass(rig) {
  if (!rig || !rig.root || !rig.chassis) return rig;
  tunePaintAndGlass(rig);
  addRearIdentity(rig.chassis);
  return rig;
}
