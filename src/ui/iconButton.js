// Small square icon buttons for the top-right corner.
//
// These were word labels ("FULL SCREEN", "SOUND ON"), which ate a lot of a phone
// screen and competed with the HUD for attention. Icons say the same thing in a
// fraction of the space.
//
// The glyphs are drawn as vectors rather than set as text. Font and emoji
// coverage for symbols like ⛶ and 🔇 is genuinely patchy — Android in particular
// substitutes or drops them — and a control that silently renders as a blank box
// is worse than a wordy one. Drawing them also keeps the chunky flat look the
// house style asks for.
import Phaser from 'phaser';
import { uiScale, isCompact, pinUiObject } from './format.js';

const INK = 0x15314b;
const PAPER = 0xfff8e7;

// Corner brackets — the standard "expand to fill" mark.
//
// Arm length matters more than it looks: at a third of the button the four
// brackets meet in the middle and the icon reads as a solid filled square rather
// than four corners. Keep a clear gap between opposing arms.
export function drawFullscreenIcon(g, size, exiting) {
  const arm = size * 0.19;
  // Entering shows brackets hugging the corners; exiting pulls them inward and
  // faces them the other way, so the two states are told apart at a glance.
  const inset = exiting ? size * 0.3 : size * 0.2;
  const w = Math.max(2, Math.round(size * 0.1));
  g.lineStyle(w, INK, 1);
  const corners = [
    [inset, inset, 1, 1],
    [size - inset, inset, -1, 1],
    [inset, size - inset, 1, -1],
    [size - inset, size - inset, -1, -1],
  ];
  for (const [cx, cy, sx, sy] of corners) {
    const dx = exiting ? -sx : sx;
    const dy = exiting ? -sy : sy;
    g.beginPath();
    g.moveTo(cx + dx * arm, cy);
    g.lineTo(cx, cy);
    g.lineTo(cx, cy + dy * arm);
    g.strokePath();
  }
}

// A speaker cone, with either sound waves or a cross through it.
export function drawSoundIcon(g, size, muted) {
  const cx = size * 0.38;
  const cy = size * 0.5;
  const bodyW = size * 0.14;
  const bodyH = size * 0.2;
  const coneW = size * 0.2;
  const coneH = size * 0.44;

  g.fillStyle(INK, 1);
  g.fillRect(cx - bodyW, cy - bodyH / 2, bodyW, bodyH);
  g.fillPoints(
    [
      { x: cx, y: cy - coneH / 2 },
      { x: cx + coneW, y: cy - coneH / 2 },
      { x: cx + coneW, y: cy + coneH / 2 },
      { x: cx, y: cy + coneH / 2 },
    ],
    true
  );

  const w = Math.max(2, Math.round(size * 0.09));
  g.lineStyle(w, INK, 1);
  if (muted) {
    const x0 = size * 0.66;
    const y0 = cy - size * 0.13;
    const s = size * 0.26;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x0 + s, y0 + s);
    g.strokePath();
    g.beginPath();
    g.moveTo(x0 + s, y0);
    g.lineTo(x0, y0 + s);
    g.strokePath();
  } else {
    for (let i = 1; i <= 2; i++) {
      const r = size * 0.12 * i;
      g.beginPath();
      g.arc(cx + coneW, cy, r, -0.9, 0.9, false);
      g.strokePath();
    }
  }
}

// Builds a pinned, tappable square button. `draw(g, size)` renders the glyph
// into a Graphics whose origin is the button's top-left corner.
export function createIconButton(scene, { row = 0, draw, onTap, depth = 1000 }) {
  const layer = scene.add.container(0, 0).setScrollFactor(0).setDepth(depth);
  const bg = scene.add.graphics();
  const icon = scene.add.graphics();
  layer.add([bg, icon]);

  let screenX = 0;
  let screenY = 0;
  let size = 0;
  const pin = () => pinUiObject(scene, layer, screenX, screenY);

  const redraw = () => {
    const s = uiScale(scene);
    const compact = isCompact(scene);
    size = compact ? 44 : Math.round(46 * s);
    const margin = compact ? 12 : Math.round(14 * s);
    const gap = Math.round(size * 0.18);

    // Anchored to the right edge, so the button is measured from its own width.
    screenX = scene.scale.width - margin - size;
    screenY = margin + row * (size + gap);

    bg.clear();
    bg.fillStyle(PAPER, 1);
    bg.fillRoundedRect(0, 0, size, size, Math.round(size * 0.24));
    icon.clear();
    draw(icon, size);

    // The hit area lives on the container's own local box.
    layer.setSize(size, size);
    layer.setInteractive(
      new Phaser.Geom.Rectangle(size / 2, size / 2, size, size),
      Phaser.Geom.Rectangle.Contains
    );
    layer.input.cursor = 'pointer';
    pin();
  };

  redraw();
  layer.on('pointerup', () => {
    onTap();
    redraw();
  });

  scene.scale.on('resize', redraw);
  scene.scale.on('enterfullscreen', redraw);
  scene.scale.on('leavefullscreen', redraw);
  scene.events.on('postupdate', pin);
  scene.events.once('shutdown', () => {
    scene.scale.off('resize', redraw);
    scene.scale.off('enterfullscreen', redraw);
    scene.scale.off('leavefullscreen', redraw);
    scene.events.off('postupdate', pin);
  });

  return layer;
}
