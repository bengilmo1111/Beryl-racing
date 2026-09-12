// Photo-informed identity pass for the real Beryl.
//
// The base Morris Minor mesh is shared with traffic, so the generic car stays
// intentionally simple. This pass is applied only to the player's Beryl and
// adds the things that make the actual family car unmistakable from the chase
// camera: the bluer paint, broad rear glass, MGS3 plate, period tail lamps,
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

  // Replace the generic rear bumper and tiny round lamps rather than stacking
  // another set on top. Front trim and the red side pinstripe are untouched.
  chassis.children.forEach((child) => {
    if (!child.isMesh || child.position.z < L * 0.40) return;
    if (child.geometry?.type === 'SphereGeometry') child.visible = false;
    if (child.geometry?.type === 'CylinderGeometry') child.visible = false;
    if (child.geometry?.type === 'BoxGeometry') {
      const p = child.geometry.parameters;
      if (p && Math.abs(p.width - 5) < 0.01 && Math.abs(p.height - 12) < 0.01) {
        child.visible = false;
      }
    }
  });

  // Beryl's real rear bumper is low, nearly full width and has tall overriders
  // well outboard of the number plate.
  const bumperGeom = new CylinderGeometry(3.6, 3.6, W * 0.98, 14);
  bumperGeom.rotateZ(Math.PI / 2);
  const bumper = new Mesh(bumperGeom, chrome);
  bumper.position.set(0, 24.5, L * 0.510);
  chassis.add(bumper);
  for (const sx of [-1, 1]) {
    const overrider = new Mesh(new BoxGeometry(5.5, 18, 5), chrome);
    overrider.position.set(sx * W * 0.35, 31, L * 0.512);
    chassis.add(overrider);
  }

  // The actual car has a small amber indicator above a tall red teardrop lamp,
  // mounted on the outer rear wings. The old model used two red dots near the
  // centre of the boot, which was one of the strongest "not Beryl" cues.
  for (const sx of [-1, 1]) {
    chassis.add(ellipsoid(6.3, 10.5, 5.0, sx * W * 0.405, 38.5, L * 0.466, chrome));
    chassis.add(ellipsoid(4.4, 8.2, 5.2, sx * W * 0.405, 38.0, L * 0.474, red));
    chassis.add(ellipsoid(3.8, 4.1, 4.5, sx * W * 0.405, 51.0, L * 0.468, amber));
  }

  // NZ plate from the supplied photographs: white plate, black MGS3 lettering.
  // It is also much larger than the generic plate previously used in-game.
  const plateZ = L * 0.505 + 3.2;
  const plateMesh = new Mesh(new BoxGeometry(W * 0.47, 14, 1.4), plate);
  plateMesh.position.set(0, 36.5, plateZ);
  chassis.add(plateMesh);
  chassis.add(new Mesh(pixelTextGeometry('MGS3', 2.2, 0, 36.5, plateZ + 0.82), ink));

  // Two-line chrome MINOR 1000 badge above the plate. It is intentionally tiny:
  // from the chase camera it should read as the glinting real badge, not HUD text.
  const badgeZ = L * 0.482 + 1.2;
  chassis.add(new Mesh(pixelTextGeometry('MINOR', 0.72, -W * 0.075, 52.0, badgeZ), chrome));
  chassis.add(new Mesh(pixelTextGeometry('1000', 0.72, -W * 0.075, 47.8, badgeZ), chrome));

  // Low-poly version of the sailor-girl Beryl decal: navy hair/collar, pale face
  // and cap, red cap stripe and the red BERYL signature. At racing distance the
  // colour blocks reproduce the real boot graphic without introducing a texture.
  const decalX = W * 0.16;
  const decalZ = L * 0.481 + 1.6;
  const hair = new Mesh(new CircleGeometry(4.1, 16), navy);
  hair.position.set(decalX, 54.2, decalZ);
  chassis.add(hair);
  const face = new Mesh(new CircleGeometry(2.8, 16), white);
  face.position.set(decalX, 54.4, decalZ + 0.35);
  chassis.add(face);
  const collar = triangle([
    [decalX - 5.4, 50.8],
    [decalX + 5.4, 50.8],
    [decalX, 46.0],
  ], decalZ + 0.3, navy);
  chassis.add(collar);
  const hat = new Mesh(new BoxGeometry(7.4, 2.0, 0.8), white);
  hat.position.set(decalX, 58.0, decalZ + 0.45);
  chassis.add(hat);
  const hatStripe = new Mesh(new BoxGeometry(6.5, 0.55, 0.9), decalRed);
  hatStripe.position.set(decalX, 57.7, decalZ + 0.9);
  chassis.add(hatStripe);
  chassis.add(new Mesh(pixelTextGeometry('BERYL', 0.52, decalX + 0.8, 44.0, decalZ + 0.5), decalRed));
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
        material.emissive.setHex(0x042634);
        material.emissiveIntensity = 0.28;
      }
    } else if (colour === BASE_GLASS) {
      material.color.setHex(0x587d88);
      if (material.specular) material.specular.setHex(0xd4eff7);
      if ('shininess' in material) material.shininess = 110;
    }
  });

  // The real rear window is a broad rounded rectangle occupying most of the
  // cabin width. The generic screen is slightly pinched; expand only Beryl's
  // rear pane and its chrome surround about their own visual centre.
  const rearScreen = [];
  const rearTrim = [];
  rig.chassis.children.forEach((child) => {
    if (!child.isMesh || !child.geometry) return;
    child.geometry.computeBoundingBox();
    const box = child.geometry.boundingBox;
    if (!box) return;
    const cx = (box.min.x + box.max.x) * 0.5;
    const cy = (box.min.y + box.max.y) * 0.5;
    const cz = (box.min.z + box.max.z) * 0.5;
    if (Math.abs(cx) > 3 || cz < L * 0.20) return;
    if (materialColour(child.material) === 0x587d88) rearScreen.push({ child, cy });
    if (child.geometry.type === 'TubeGeometry') rearTrim.push({ child, cy });
  });

  for (const { child, cy } of [...rearScreen, ...rearTrim]) {
    const sy = 1.08;
    child.scale.x = 1.10;
    child.scale.y = sy;
    child.position.y -= cy * (sy - 1);
  }
}

export function applyBerylPhotoPass(rig) {
  if (!rig || !rig.root || !rig.chassis) return rig;
  tunePaintAndGlass(rig);
  addRearIdentity(rig.chassis);
  return rig;
}
