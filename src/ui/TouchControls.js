// On-screen touch controls for landscape mobile (PRD §4). Steering on the left
// and accelerate/brake on the right.
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
    this.state = { left: false, right: false, gas: false, brake: false };
    // Which button (if any) each active pointer id is currently pressing.
    this.pointerButton = new Map();

    // Phaser tracks 2 pointers by default; add more for multi-finger play.
    scene.input.addPointer(3);

    this.layer = scene.add.container(0, 0).setScrollFactor(0).setDepth(999);
    this.buttons = [];
    this.left = this._button('‹', COLORS.paper, 'left', 'STEER');
    this.right = this._button('›', COLORS.paper, 'right', 'STEER');
    this.gas = this._button('▲', COLORS.sunshine, 'gas', 'GAS');
    this.brake = this._button('▼', COLORS.red, 'brake', 'BRAKE');

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

  _button(label, color, stateKey, caption) {
    const scene = this.scene;
    const button = scene.add.container(0, 0);
    const arc = scene.add.circle(0, 0, 80, color, 0.34).setStrokeStyle(5, color, 0.95);
    const text = scene.add
      .text(0, 0, label, { fontFamily: FONT, fontStyle: '700', color: '#fff8e7' })
      .setOrigin(0.5);
    const captionText = scene.add
      .text(0, 0, caption, { fontFamily: FONT, fontStyle: '700', color: '#15314b' })
      .setOrigin(0.5);

    button.add([arc, text, captionText]);
    this.layer.add(button);

    const b = { button, arc, text, caption: captionText, color, stateKey, cx: 0, cy: 0, radius: 80 };
    this.buttons.push(b);
    return b;
  }

  _setPressed(b, pressed) {
    this.state[b.stateKey] = pressed;
    b.arc.setFillStyle(b.color, pressed ? 0.62 : 0.34);
    b.button.setScale(pressed ? 0.95 : 1);
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
