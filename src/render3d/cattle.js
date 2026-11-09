import { Group, Mesh, BoxGeometry, CylinderGeometry, SphereGeometry } from 'three';
import { lambert } from './palette.js';
import { metres } from '../scale.js';
import { bakeStatic } from './bake.js';

// Friesian dairy cows, built in metres: shoulders, muzzle, ears, four legs,
// separate black patches and a tail keep them recognisable at driving speed.
export function buildCattle(cows, terrain) {
  const herd = new Group();
  const white = lambert(0xf1eee1), black = lambert(0x252c29);
  const pink = lambert(0xb78075), horn = lambert(0xcfc5a4);
  const cube = new BoxGeometry(1, 1, 1);
  const rounded = new SphereGeometry(.5, 12, 8);
  const leg = new CylinderGeometry(metres(.075), metres(.055), metres(.8), 6);
  for (const cow of cows) {
    const root = new Group();
    const box = (w,h,d,x,y,z,mat) => {
      const mesh = new Mesh(cube, mat);
      mesh.scale.set(metres(w),metres(h),metres(d));
      mesh.position.set(metres(x),metres(y),metres(z)); root.add(mesh); return mesh;
    };
    const round = (w,h,d,x,y,z,mat) => {
      const mesh = new Mesh(rounded,mat); mesh.scale.set(metres(w),metres(h),metres(d));
      mesh.position.set(metres(x),metres(y),metres(z)); root.add(mesh); return mesh;
    };
    round(2.05,.92,.92,0,1.12,0,white);
    round(.95,.1,.65,-.25,1.53,0,black);
    for (const side of [-1,1]) {
      round(.70,.60,.24,-.35,1.20,side*.34,black);
      round(.48,.48,.24,.55,1.06,side*.30,black);
      for (const x of [-.72,.72]) {
        const foot = new Mesh(leg, white); foot.position.set(metres(x),metres(.44),metres(side*.31)); root.add(foot);
        box(.17,.13,.18,x,.08,side*.31,black);
      }
    }
    const grazing = !cow.road;
    box(.48,.60,.48,1.02,grazing ? .82 : 1.46,0,black).rotation.z = grazing ? -.5 : .15;
    box(.42,.25,.49,1.29,grazing ? .51 : 1.24,0,pink);
    for (const side of [-1,1]) {
      box(.3,.08,.15,.98,grazing ? 1.09 : 1.78,side*.32,black);
      box(.07,.07,.035,1.18,grazing ? .93 : 1.57,side*.25,white);
      box(.09,.15,.09,.98,grazing ? 1.2 : 1.88,side*.17,horn);
    }
    box(.06,.8,.06,-1.03,.85,.15,white).rotation.z = -.15;
    box(.13,.2,.13,-1.08,.44,.15,black);
    root.position.set(cow.x, terrain.heightAt(cow.x,cow.y), cow.y);
    root.rotation.y = cow.yaw; herd.add(root);
  }
  const result = bakeStatic(herd) || herd;
  result.name = 'otaki-dairy-herd';
  return result;
}
