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
import { C, basic, lambert } from './palette.js';
import { labelTexture } from './textures.js';
import { buildManfeild } from './themes/manfeild.js';

const BOARD_BOTTOM = 120;
const POST_WIDTH = 9;

const EASTBOURNE_INTEGRATED_SIGNS = new Set([
  'WILLIAMS PARK',
  'RONA BAY',
  'EASTBOURNE RSA',
]);

const EASTBOURNE_COMPACT_SIGNS = new Set([
  'DAYS BAY WHARF',
  'EASTBOURNE VILLAGE',
]);

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

export function buildSigns(track, def, terrain) {
  // Manfeild's marshal labels are integrated into physical huts, and its pit,
  // grandstand and period boards are one coherent venue kit. Returning it here
  // replaces the old freestanding POST signs without adding another render hook.
  if (def.theme === 'manfield') return buildManfeild(track, def, terrain);

  const group = new Group();

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
    group.add(sign);
  }

  for (const a of def.arrows || []) {
    const sign = buildSign(
      a.text,
      { color: '#fff8e7', background: null, stroke: '#15314b', strokeWidth: 10, fontSize: 68 },
      66
    );
    const aim = facingTraffic(a.x, a.y, track);
    sign.position.set(a.x, terrain.heightAt(a.x, a.y), a.y);
    sign.rotation.y = aim.yaw;
    group.add(sign);
  }

  const finish = track.checkpoints[track.checkpoints.length - 1];
  if (finish) {
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
    group.add(sign);
  }

  const sc = def.scenery || {};
  if (def.theme === 'otaki' && sc.railwayCp != null) {
    const cp = track.checkpoints[sc.railwayCp];
    if (cp) {
      const n = { x: Math.cos(cp.angle + Math.PI / 2), y: Math.sin(cp.angle + Math.PI / 2) };
      const px = cp.x + n.x * (track.half + 60);
      const py = cp.y + n.y * (track.half + 60);
      const sign = buildSign('✕', {
        color: '#fff8e7', background: null, stroke: '#15314b', strokeWidth: 10, fontSize: 76,
      }, 70);
      sign.position.set(px, terrain.heightAt(px, py), py);
      sign.rotation.y = facingTraffic(px, py, track).yaw;
      group.add(sign);
    }
  }

  return group;
}
