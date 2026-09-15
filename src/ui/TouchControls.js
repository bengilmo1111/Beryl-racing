// On-screen touch controls for landscape mobile (PRD §4). Steering on the left,
// accelerate and brake on the right, and the horn above the throttle.
//
// Input is handled from raw screen-space pointer events rather than per-button
// Phaser interactivity. The race camera follows Beryl and zooms, and Phaser's
// hit-testing of scrollFactor(0) / nested-container buttons under a zoomed
// camera does not line up with where they render — which left the buttons
// untappable. `pointer.x/y` are always plain screen coordinates, so testing
// them against each button's known screen circle is reliable and simple, and
// naturally supports multiple fingers at once.
import Phaser from 'phaser';
import { FONT, pinUiLayer } from './format.js';
import { drawHornIcon } from './iconButton.js';
import { COLORS } from '../config.js';

export function isTouchDevice() {
  return (
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0)
  );
}

export class TouchControls {
  constructor(scene) {
    this.scene = scene;
    this.state = { left: false, right: false, gas: false, brake: false, horn: false };
    // Which button (if any) each active pointer id is currently pressing.
    this.pointerButton = new Map();

    // Phaser tracks 2 pointers by default; add more for multi-finger play.
    scene.input.addPointer(3);

    this.layer = scene.add.container(0, 0).setScrollFactor(0).setDepth(999);
    this.buttons = [];
    this.hornAction = null;
    this.left = this._button({ label: '‹', color: COLORS.paper, stateKey: 'left', caption: 'STEER' });
    this.right = this._button({ label: '›', color: COLORS.paper, stateKey: 'right', caption: 'STEER' });
    this.gas = this._button({ label: '▲', color: COLORS.sunshine, stateKey: 'gas', caption: 'GAS' });
    this.brake = this._button({ label: '▼', color: COLORS.red, stateKey: 'brake', caption: 'BRAKE' });
    // The horn, as a real button rather than a 44-pixel icon in the far corner.
    // It is in Beryl's own colour and it sounds on the way down, so honking is
    // one thumb-press from the throttle instead of a reach across the screen.
    this.horn = this._button({
      color: COLORS.berylBody,
      stateKey: 'horn',
      caption: 'HORN',
      draw: drawHornIcon,
      action: () => this.hornAction && this.hornAction(),
    });

    this.pin = () => pinUiLayer(scene, this.layer);
    this.layout();

    this._onDown = (pointer) => this._press(pointer);
    this._onMove = (pointer) => {
      if (pointer.isDown) this._press(pointer);
    };
    this._onUp = (pointer) => this._release(pointer);
    scene.input.on('pointerdown', this._onDown);
    scene.input.on('pointermove', this._onMove);
    scene.input.on('pointerup', this._onUp);
    scene.input.on('pointerupoutside', this._onUp);

    scene.scale.on('resize', this.layout, this);
    scene.events.on('postupdate', this.pin);
    scene.events.once('shutdown', () => {
      scene.scale.off('resize', this.layout, this);
      scene.events.off('postupdate', this.pin);
      scene.input.off('pointerdown', this._onDown);
      scene.input.off('pointermove', this._onMove);
      scene.input.off('pointerup', this._onUp);
      scene.input.off('pointerupoutside', this._onUp);
    });
  }

  // `label` is a text glyph; `draw(graphics, size, color)` is a vector one, for
  // shapes no font can be trusted to have. `action` fires the moment the button
  // goes down — the horn, as against the pedals, which are read every frame.
  _button({ label = '', color, stateKey, caption, draw = null, action = null }) {
    const scene = this.scene;
    const button = scene.add.container(0, 0);
    const arc = scene.add.circle(0, 0, 80, color, 0.34).setStrokeStyle(5, color, 0.95);
    const text = scene.add
      .text(0, 0, label, { fontFamily: FONT, fontStyle: '700', color: '#fff8e7' })
      .setOrigin(0.5);
    const glyph = draw ? scene.add.graphics() : null;
    const captionText = scene.add
      .text(0, 0, caption, { fontFamily: FONT, fontStyle: '700', color: '#15314b' })
      .setOrigin(0.5);

    button.add(glyph ? [arc, text, glyph, captionText] : [arc, text, captionText]);
    this.layer.add(button);

    const b = { button, arc, text, glyph, draw, caption: captionText, color, stateKey,
      action, cx: 0, cy: 0, radius: 80 };
    this.buttons.push(b);
    return b;
  }

  _setPressed(b, pressed) {
    const changed = this.state[b.stateKey] !== pressed;
    this.state[b.stateKey] = pressed;
    b.arc.setFillStyle(b.color, pressed ? 0.62 : 0.34);
    b.button.setScale(pressed ? 0.95 : 1);
    if (pressed && changed && b.action) b.action();
  }

  // The button whose screen circle contains (x, y), or null.
  _buttonAt(x, y) {
    for (const b of this.buttons) {
      const dx = x - b.cx;
      const dy = y - b.cy;
      if (dx * dx + dy * dy <= b.radius * b.radius) return b;
    }
    return null;
  }

  _press(pointer) {
    const hit = this._buttonAt(pointer.x, pointer.y);
    const prev = this.pointerButton.get(pointer.id) || null;
    if (prev === hit) return;
    // A finger slid off its old button (or onto a new one): update both.
    if (prev && !this._pointerStillOn(prev, pointer.id)) this._setPressed(prev, false);
    if (hit) {
      this.pointerButton.set(pointer.id, hit);
      this._setPressed(hit, true);
    } else {
      this.pointerButton.delete(pointer.id);
    }
  }

  _release(pointer) {
    const b = this.pointerButton.get(pointer.id);
    this.pointerButton.delete(pointer.id);
    if (b && !this._pointerStillOn(b, pointer.id)) this._setPressed(b, false);
  }

  // True if any *other* active pointer is still holding button b.
  _pointerStillOn(b, exceptId) {
    for (const [id, btn] of this.pointerButton) {
      if (id !== exceptId && btn === b) return true;
    }
    return false;
  }

  _place(b, x, y, r) {
    b.cx = x;
    b.cy = y;
    b.radius = r;
    b.button.setPosition(x, y).setScale(1);
    b.arc
      .setPosition(0, 0)
      .setRadius(r)
      .setStrokeStyle(Math.max(3, Math.round(r * 0.06)), b.color, 0.95);
    b.text.setPosition(0, -r * 0.08).setFontSize(Math.round(r * 0.78));
    b.caption.setPosition(0, r * 0.56).setFontSize(Math.round(r * 0.2));
    if (b.glyph) {
      // The drawn glyph's own ink sits at about (0.47, 0.54) of the box it is
      // drawn into, so centring it means offsetting by that, not by half.
      const size = Math.round(r * 1.05);
      b.glyph.clear();
      b.glyph.setPosition(-size * 0.47, -size * 0.54 - r * 0.08);
      b.draw(b.glyph, size, 0xfff8e7);
    }
  }

  // What the horn button should do when pressed. Set by the race scene once it
  // knows whether there is any audio to play at all.
  setHornAction(fn) {
    this.hornAction = fn;
  }

  layout() {
    const scene = this.scene;
    const w = scene.scale.width;
    const h = scene.scale.height;

    const r = Phaser.Math.Clamp(Math.round(Math.min(w, h) * 0.15), 62, 104);
    const edge = Math.max(12, Math.round(r * 0.2));
    const gap = Math.round(r * 2.25);
    const bottom = h - edge - r;

    // Steering against the bottom-left edge.
    this._place(this.left, edge + r, bottom, r);
    this._place(this.right, edge + r + gap, bottom, r);

    // Gas against the bottom-right edge; brake immediately inside it.
    this._place(this.gas, w - edge - r, bottom, r);
    this._place(this.brake, w - edge - r - gap, bottom, r);

    // The horn stacks directly above the throttle, where the same thumb finds
    // it. Everything else along the top edge is a row rather than a column for
    // this reason: on a short landscape phone this button reaches up into what
    // used to be the icon stack's third slot.
    this._place(this.horn, w - edge - r, bottom - 2 * r - Math.round(r * 0.22), r);

    this.pin();
  }

  getInput() {
    let steer = 0;
    if (this.state.left) steer -= 1;
    if (this.state.right) steer += 1;
    steer = Phaser.Math.Clamp(steer, -1, 1);
    const throttle = this.state.gas ? 1 : this.state.brake ? -1 : 0;
    return { steer, throttle, handbrake: false };
  }
}
