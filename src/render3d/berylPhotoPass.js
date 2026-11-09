// Photo-informed identity pass for the real Beryl.
//
// The base Morris Minor mesh is shared with traffic, so the generic car stays
// intentionally simple. This pass is applied only to the player's Beryl and
// fits the identifying details to the photoBody shell from the chase camera:
// bluer paint, black rear-window seal, MGS3 plate, period tail lamps,
// chrome bumper/overriders, Minor 1000 badge and sailor decal.
import {
  PlaneGeometry,
  Mesh,
  MeshLambertMaterial,
  MeshPhongMaterial,
  SphereGeometry,
  Raycaster,
  Vector3,
  TubeGeometry,
  CatmullRomCurve3,
} from 'three';
import { BERYL } from './beryl.js';

const W = BERYL.width;
const L = BERYL.length;

const REAL_BERYL_TURQUOISE = 0x13b9e2;
const BASE_BERYL_TURQUOISE = 0x19bdd0;
const BASE_GLASS = 0x426b78;

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

function addRearIdentity(chassis, texture) {
  const chrome = new MeshPhongMaterial({ color: 0xdbe6e3, specular: 0xffffff, shininess: 100 });
  const red = new MeshPhongMaterial({ color: 0xb9232d, specular: 0xffa0a0, shininess: 70 });
  const amber = new MeshPhongMaterial({ color: 0xdc8628, specular: 0xffdf9b, shininess: 65 });
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
  const bootPanels = panels.filter(p => p.name !== 'wing');
  const surfaceZ = (x, y, targets) => {
    ray.set(new Vector3(x, y, L), new Vector3(0, 0, -1));
    const hit = ray.intersectObjects(targets, false)[0];
    if (!hit) throw new Error(`Beryl rear detail misses body at ${x}, ${y}`);
    return hit.point.z;
  };
  const rearZ = (x, y, wing = false) => surfaceZ(x, y, wing ? panels : bootPanels);

  // The small atlas contains only the markings from the owner's photographs.
  // Subdivide each print so its edges follow the metal or glass underneath.
  const print = new MeshPhongMaterial({ map: texture, transparent: true, depthWrite: false });
  const marking = (name, rect, x, y, width, height, depthAt) => {
    const geometry = new PlaneGeometry(width, height, 8, 6);
    geometry.translate(x, y, 0);
    const { position, uv } = geometry.attributes;
    const [left, top, w, h] = rect;
    for (let i = 0; i < position.count; i++) {
      position.setZ(i, depthAt(position.getX(i), position.getY(i)));
      uv.setXY(i, (left + uv.getX(i) * w) / 512, 1 - (top + (1 - uv.getY(i)) * h) / 256);
    }
    geometry.computeVertexNormals();
    const mesh = new Mesh(geometry, print);
    mesh.name = name;
    chassis.add(mesh);
    return mesh;
  };
  const line = (points, radius, material, name) => {
    const mesh = new Mesh(new TubeGeometry(new CatmullRomCurve3(
      points.map(p => new Vector3(...p))), Math.max(40, points.length), radius, 8, false), material);
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
    const x = sx * W * 0.35;
    line([[x, 20, L * 0.525], [x, 26, L * 0.53],
      [x, 29, L * 0.523], [x, 32, L * 0.514]], 2.8, chrome, 'rear-overrider');
  }

  // The actual car has a small amber indicator above a tall red teardrop lamp,
  // mounted on the outer rear wings. The old model used two red dots near the
  // centre of the boot, which was one of the strongest "not Beryl" cues.
  for (const sx of [-1, 1]) {
    const x = sx * W * 0.405;
    const lens = (rx, ry, depth, y, offset, material) => {
      const mount = ellipsoid(rx, ry, depth, x, y, rearZ(x, y, true) + offset, material);
      // Tilt the long lenses against the falling crown of the wing.
      const slope = (rearZ(x, y + ry, true) - rearZ(x, y - ry, true)) / (2 * ry);
      mount.rotation.x = Math.atan(slope);
      chassis.add(mount);
    };
    lens(3.6, 6.6, 2, 34.5, 0.8, chrome);
    lens(2.9, 5.7, 2.2, 34.5, 2, red);
    lens(2.7, 2.7, 1.5, 43.3, 0.7, chrome);
    lens(2.2, 2.2, 1.6, 43.3, 1.7, amber);
  }

  const aboveBoot = (x, y) => rearZ(x, y) + 0.55;
  marking('MGS3-plate', [164, 44, 235, 82], 0, 39, W * 0.277, 8.7, aboveBoot);
  // Use Beryl's own registration at both ends. Rotating the outward-facing
  // print keeps the letters readable when viewed from the front.
  const frontPlate = marking('front-MGS3-plate', [164, 44, 235, 82], 0, 16.2,
    W * 0.31, 8.8, () => L * 0.516);
  frontPlate.rotation.y = Math.PI;
  marking('Minor-1000-badge', [164, 4, 130, 32], 0, 49, W * 0.14, 2.7, aboveBoot);
  marking('sailor-and-signature', [4, 4, 152, 208], W * 0.20, 54.5, 16, 14, aboveBoot);
  const glass = [chassis.getObjectByName('rear-window')];
  marking('rear-window-sticker', [282, 132, 46, 46], 26, 71, 3.9, 3.5,
    (x, y) => surfaceZ(x, y, glass) + 0.45);
  const bumper = [chassis.getObjectByName('curved-rear-bumper')];
  marking('bumper-sticker', [164, 132, 110, 32], -W * 0.27, 24, 13, 3.1,
    (x, y) => surfaceZ(x, y, bumper) + 0.45);

  chassis.add(ellipsoid(4.3, 1.4, 1.8, 0, 33.4, rearZ(0, 33.4) + 1, chrome));
  line([-5, 0, 5].map(x => [x, 28.5, rearZ(x, 28.5) + 1]), 0.7, chrome, 'boot-handle');

  // Two long external boot hinges just below the rear glass.
  for (const sx of [-1, 1]) {
    const x = sx * W * 0.224;
    line([63, 60, 57].map(y => [x, y, rearZ(x, y) + 0.9]), 0.8, chrome, 'boot-hinge');
  }
  // A fine panel seam follows the boot edge, rather than a bar across the lid.
  const seam = new MeshLambertMaterial({ color: 0x1683a0 });
  const outline = [[0, 63], [-23, 62], [-30, 59], [-31, 50], [-31, 39], [-30, 29],
    [-26, 27], [0, 26.8], [26, 27], [30, 29], [31, 39], [31, 50], [30, 59], [23, 62]];
  const perimeter = new CatmullRomCurve3(outline.map(([x, y]) => new Vector3(x, y, 0)), true);
  line(perimeter.getSpacedPoints(80).map(({ x, y }) => [x, y, aboveBoot(x, y)]),
    0.38, seam, 'boot-seam');
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

export function applyBerylPhotoPass(rig, texture = null) {
  if (!rig || !rig.root || !rig.chassis) return rig;
  tunePaintAndGlass(rig);
  addRearIdentity(rig.chassis, texture);
  // Bring the visual track in towards the narrow saloon in the photograph.
  rig.root.scale.x = 0.86;
  return rig;
}
