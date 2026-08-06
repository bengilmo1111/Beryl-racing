// Roadside signage: landmark names, advance arrows, the finish marker, and
// Ōtaki's level-crossing crossbuck.
//
// These are upright boards on posts, NOT camera-facing billboards. A billboard
// standing in a 3D world swivels as you drive past and immediately reads as a
// sprite pretending to be an object; a board that stays put reads as a sign. The
// trade is that a sign seen edge-on is unreadable, which is why each one is
// yawed to face oncoming traffic rather than left at an arbitrary angle.
//
// Styling mirrors the 2D text exactly (see the deleted placeFinishAndLandmarks
// at 491875f:src/scenes/RaceScene.js) so the courses still feel like themselves.
import { Group, Mesh, PlaneGeometry, BoxGeometry, DoubleSide } from 'three';
import { metres } from '../scale.js';
import { C, basic, lambert } from './palette.js';
import { labelTexture } from './textures.js';

const BOARD_BOTTOM = 120;
const POST_WIDTH = 9;

// These Eastbourne names now live on the physical landmark models themselves.
// Keeping the old freestanding boards as well produced doubled signs in front of
// Williams Park, Rona Bay and the RSA.
const EASTBOURNE_INTEGRATED_SIGNS = new Set([
  'WILLIAMS PARK',
  'RONA BAY',
  'EASTBOURNE RSA',
]);

// Days Bay Wharf and the village still use roadside labels, but the landmark
// models supply most of the recognition now. Their boards can be smaller and
// less intrusive than the original greybox labels.
const EASTBOURNE_COMPACT_SIGNS = new Set([
  'DAYS BAY WHARF',
  'EASTBOURNE VILLAGE',
]);

// Manfeild has no freestanding signs at all: its marshal numbers are on physical
// huts and its advertising is on trackside boards, both built in themes/manfeild
// and added from the theme hook in index.js like every other theme's scenery.

// Yaw so the board faces back down the road toward an approaching car.
//
// A plane faces its local +Z. The nearest centreline tangent points the way
// traffic travels, so facing +Z along that tangent would show the sign's back;
// turning it 180° puts it in front of the driver.
function facingTraffic(x, y, track) {
  const cl = track.centerline;
  let bestIdx = 0;
  let best = Infinity;
  for (let i = 0; i < cl.length; i++) {
    const dx = cl[i].x - x;
    const dy = cl[i].y - y;
    const d = dx * dx + dy * dy;
    if (d < best) { best = d; bestIdx = i; }
  }
  const a = cl[Math.max(0, bestIdx - 1)];
  const b = cl[Math.min(cl.length - 1, bestIdx + 1)];
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  return { yaw: Math.PI / 2 - angle + Math.PI, height: track.heights ? track.heights[bestIdx] : 0 };
}

function buildSign(text, style, boardHeight) {
  const group = new Group();
  const { texture, aspect } = labelTexture(text, style);
  const board = new Mesh(
    new PlaneGeometry(boardHeight * aspect, boardHeight),
    // DoubleSide so the back of a sign is a solid board rather than a hole.
    basic(0xffffff, { map: texture, fog: true, transparent: true, side: DoubleSide })
  );
  board.position.y = BOARD_BOTTOM + boardHeight / 2;
  group.add(board);

  const post = new Mesh(
    new BoxGeometry(POST_WIDTH, BOARD_BOTTOM + boardHeight / 2, POST_WIDTH),
    lambert(C.cream)
  );
  post.position.y = (BOARD_BOTTOM + boardHeight / 2) / 2;
  group.add(post);
  return group;
}

// Signs must not stack on top of each other.
//
// Landmarks, arrows, the finish board and the crossbuck are authored separately
// and placed separately, so nothing stopped two of them landing within a few
// metres — worst at the Remutaka summit, where the summit landmark, the last
// hairpin arrow and the finish board all converge. From a chase camera they
// overlap into an unreadable pile at exactly the moment one of them matters.
//
// Whatever is placed first wins, so the order signs are built in below is their
// priority order.
const SIGN_CLEARANCE = metres(28);

function makePlacer(group) {
  const placed = [];
  return (sign, x, z) => {
    for (const p of placed) {
      if (Math.hypot(p.x - x, p.z - z) < SIGN_CLEARANCE) return false;
    }
    placed.push({ x, z });
    group.add(sign);
    return true;
  };
}

export function buildSigns(track, def, terrain) {
  // Manfeild's marshal numbers ride on the huts themselves, so it has no
  // freestanding boards to build here.
  if (def.theme === 'manfield') return new Group();

  const group = new Group();
  // Highest priority first: the finish board and the level crossing carry
  // information the road itself does not, so they are placed before the
  // landmarks and arrows that might otherwise crowd them out.
  const place = makePlacer(group);
  placeFinish(place, track, def, terrain);
  placeCrossbuck(place, track, def, terrain);

  // Landmark names: cream on the house ink blue.
  for (const [x, y, text] of def.landmarks || []) {
    if (def.theme === 'eastbourne' && EASTBOURNE_INTEGRATED_SIGNS.has(text)) continue;
    const compact = def.theme === 'eastbourne' && EASTBOURNE_COMPACT_SIGNS.has(text);
    const sign = buildSign(
      text,
      { color: '#fff8e7', background: '#15314bcc', fontSize: compact ? 44 : 60 },
      compact ? 44 : 58
    );
    const aim = facingTraffic(x, y, track);
    sign.position.set(x, terrain.heightAt(x, y), y);
    sign.rotation.y = aim.yaw;
    place(sign, x, y);
  }

  // Advance arrows: cream with the chunky dark outline, no panel.
  for (const a of def.arrows || []) {
    const sign = buildSign(
      a.text,
      { color: '#fff8e7', background: null, stroke: '#15314b', strokeWidth: 10, fontSize: 68 },
      66
    );
    const aim = facingTraffic(a.x, a.y, track);
    sign.position.set(a.x, terrain.heightAt(a.x, a.y), a.y);
    sign.rotation.y = aim.yaw;
    place(sign, a.x, a.y);
  }

  return group;
}

// Finish marker, beside the last gate — sunshine yellow, the loudest sign on
// the course, because it is the one that matters.
function placeFinish(place, track, def, terrain) {
  const finish = track.checkpoints[track.checkpoints.length - 1];
  if (!finish) return;
  const sign = buildSign(
    def.finishLabel || 'FINISH',
    { color: '#15314b', background: '#ffd166', fontSize: 72 },
    74
  );
  const n = { x: Math.cos(finish.angle + Math.PI / 2), y: Math.sin(finish.angle + Math.PI / 2) };
  const px = finish.x + n.x * (track.half + 90);
  const py = finish.y + n.y * (track.half + 90);
  sign.position.set(px, terrain.heightAt(px, py), py);
  sign.rotation.y = facingTraffic(px, py, track).yaw;
  place(sign, px, py);
}

// Ōtaki's level-crossing crossbuck, beside the railway.
function placeCrossbuck(place, track, def, terrain) {
  const sc = def.scenery || {};
  if (def.theme !== 'otaki' || sc.railwayCp == null) return;
  const cp = track.checkpoints[sc.railwayCp];
  if (!cp) return;
  const n = { x: Math.cos(cp.angle + Math.PI / 2), y: Math.sin(cp.angle + Math.PI / 2) };
  const px = cp.x + n.x * (track.half + 60);
  const py = cp.y + n.y * (track.half + 60);
  const sign = buildSign('✕', {
    color: '#fff8e7', background: null, stroke: '#15314b', strokeWidth: 10, fontSize: 76,
  }, 70);
  sign.position.set(px, terrain.heightAt(px, py), py);
  sign.rotation.y = facingTraffic(px, py, track).yaw;
  place(sign, px, py);
}
