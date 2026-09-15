// Guard the player-only body cache and geometry lifetime across race restarts.
import assert from 'node:assert/strict';
import { buildBeryl, resetBerylGeometry } from '../src/render3d/beryl.js';
import { applyBerylPhotoPass } from '../src/render3d/berylPhotoPass.js';
const traffic = buildBeryl({ identity: false, bodyColor: 0xdd4444 });
const shell = traffic.chassis.getObjectByName('body-shell').geometry;
const original = Array.from(shell.attributes.position.array);
const player = applyBerylPhotoPass(buildBeryl({ photoBody: true }));
assert.notEqual(player.chassis.getObjectByName('body-shell').geometry, shell);
assert.deepEqual(Array.from(shell.attributes.position.array), original);
assert.equal(traffic.chassis.getObjectByName('body-shell').material.color.getHex(), 0xdd4444);
assert.equal(buildBeryl({identity:false}).chassis.getObjectByName('body-shell').geometry, shell);
assert.equal(player.chassis.getObjectByName('generic-rear-plate').visible, false);
assert.equal(player.chassis.getObjectByName('generic-rear-lettering').visible, false);
for (const rig of [traffic, player]) rig.root.traverse(o => {
  if (!o.isMesh) return;
  for (const attr of Object.values(o.geometry.attributes)) {
    assert.ok(attr.array.every(Number.isFinite), `Non-finite ${o.name} geometry`);
  }
});
// The new shape variant must not survive disposal at race teardown.
resetBerylGeometry();
const restarted = applyBerylPhotoPass(buildBeryl({photoBody:true}));
assert.notEqual(restarted.chassis.getObjectByName('body-shell').geometry,
  player.chassis.getObjectByName('body-shell').geometry);
assert.notEqual(buildBeryl().chassis.getObjectByName('body-shell').geometry, shell);
console.log('Beryl model PASS: player isolation, rear details, finite buffers and restart cache');
