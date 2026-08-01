// Start line, checkpoint gates and the start gantry — the things that tell the
// player where the course begins and where it wants them to go next.
import { Group, Mesh, PlaneGeometry, BoxGeometry, CylinderGeometry } from 'three';
import { C, basic, lambert } from './palette.js';
import { checkerTexture, labelTexture } from './textures.js';

const START_LINE_Y = 0.4; // above the road, below the kerb lip
const START_LINE_DEPTH = 64; // 4 rows x 16, matching the 2D drawStartLine

// A checkpoint's `angle` is the along-road direction in 2D. A plane rotated flat
// has its local +Z along (sin θ, 0, cos θ); matching that to (cos a, 0, sin a)
// gives θ = π/2 − a.
function yawAlongRoad(angle) {
  return Math.PI / 2 - angle;
}

// The across-road unit vector at a checkpoint, same construction the 2D code
// used for its gate markers.
function acrossRoad(cp) {
  return { x: Math.cos(cp.angle + Math.PI / 2), y: Math.sin(cp.angle + Math.PI / 2) };
}

// Road height at a checkpoint. Checkpoints carry their centreline index, so this
// reads the same per-sample heights the road mesh is built from — furniture
// stays welded to the tarmac rather than floating over a hill.
function roadHeight(track, cp) {
  return track.heights ? track.heights[cp.index] : 0;
}

// Checkered start/finish line, laid on the road surface.
export function buildStartLine(track) {
  const cp = track.checkpoints[0];
  const geometry = new PlaneGeometry(track.half * 2, START_LINE_DEPTH);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new Mesh(
    geometry,
    basic(0xffffff, { map: checkerTexture(10, 4), fog: true, depthWrite: false })
  );
  mesh.position.set(cp.x, roadHeight(track, cp) + START_LINE_Y, cp.y);
  mesh.rotation.y = yawAlongRoad(cp.angle);
  mesh.renderOrder = 1;
  return mesh;
}

// Marker posts either side of the road at each gate.
//
// The 2D game drew these as 10px dots, which worked from a bird's-eye view but
// would be invisible from behind the car — so they stand up as posts instead.
export function buildCheckpointGates(track, { from = 1 } = {}) {
  const group = new Group();
  const geometry = new CylinderGeometry(8, 8, 140, 8);
  const material = lambert(C.sunshine);
  for (let i = from; i < track.checkpoints.length; i++) {
    const cp = track.checkpoints[i];
    const n = acrossRoad(cp);
    const h = roadHeight(track, cp);
    for (const side of [-1, 1]) {
      const post = new Mesh(geometry, material);
      post.position.set(cp.x + n.x * track.half * side, h + 70, cp.y + n.y * track.half * side);
      group.add(post);
    }
  }
  return group;
}

// A friendly arch over the start, replacing the top-down start-gantry.png (which
// could only ever read from directly above).
export function buildStartGantry(track, label = 'START') {
  const cp = track.checkpoints[0];
  const group = new Group();

  // Kept modest on purpose: the car starts directly underneath this, so it is
  // the very first thing the player sees. A taller arch looked imposing in
  // isolation and swamped the opening frame.
  const postX = track.half + 60;
  const postH = 250;
  const postGeom = new BoxGeometry(18, postH, 18);
  const postMat = lambert(C.cream);
  for (const side of [-1, 1]) {
    const post = new Mesh(postGeom, postMat);
    post.position.set(side * postX, postH / 2, 0);
    group.add(post);
  }

  // Cross-beam.
  const beam = new Mesh(new BoxGeometry(postX * 2 + 18, 20, 18), postMat);
  beam.position.set(0, postH, 0);
  group.add(beam);

  // Banner hanging under the beam.
  const { texture, aspect } = labelTexture(label, {
    color: '#15314b', background: '#ffd166', fontSize: 72,
  });
  const bannerH = 52;
  const banner = new Mesh(
    new PlaneGeometry(bannerH * aspect, bannerH),
    basic(0xffffff, { map: texture, fog: true, transparent: true })
  );
  banner.position.set(0, postH - 40, 0);
  // A plane faces its local +Z, which points the way the car drives — i.e. away
  // from the chase camera sitting behind her. Turn it to face the driver, or the
  // banner reads back-to-front.
  banner.rotation.y = Math.PI;
  group.add(banner);

  group.position.set(cp.x, roadHeight(track, cp), cp.y);
  // yawAlongRoad already puts local +Z along the road and local X across it,
  // which is exactly what the posts at ±postX need.
  group.rotation.y = yawAlongRoad(cp.angle);
  return group;
}
