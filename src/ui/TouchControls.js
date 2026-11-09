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
    this.left = this._button({ color: 0xc1e6d8, stateKey: 'left', caption: 'STEER' });
    this.right = this._button({ color: 0xc1e6d8, stateKey: 'right', caption: 'STEER' });
    this.gas = this._button({ color: 0xe9c878, stateKey: 'gas', caption: 'GAS' });
    this.brake = this._button({ color: 0xe9a092, stateKey: 'brake', caption: 'BRAKE' });
    // The horn, as a real button rather than a 44-pixel icon in the far corner.
    // It is in Beryl's own colour and it sounds on the way down, so honking is
    // one thumb-press from the throttle instead of a reach across the screen.
    this.horn = this._button({
      color: 0x8dd8cd,
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

  // `draw(graphics, size, color)` renders a consistent vector symbol.
  // `action` fires the moment the button
  // goes down — the horn, as against the pedals, which are read every frame.
  _button({ color, stateKey, caption, draw = null, action = null }) {
    const scene = this.scene;
    const button = scene.add.container(0, 0);
    const shadow = scene.add.circle(0, 3, 80, 0x071e20, 0.25);
    const arc = scene.add.circle(0, 0, 80, 0x153e40, 0.88).setStrokeStyle(1.5, color, 0.7);
    const ring = scene.add.circle(0, 0, 73, 0x153e40, 0).setStrokeStyle(1, color, 0.13);
    // Draw the driving symbols too, so their weight matches the utility icons.
    if (!draw) draw = (g, size, ink) => {
      g.lineStyle(Math.max(2, size * 0.055), ink, 1);
      if (stateKey === 'left' || stateKey === 'right') {
        const sign = stateKey === 'left' ? -1 : 1;
        g.beginPath();
        g.moveTo(size * (0.5 - sign * 0.12), size * 0.26);
        g.lineTo(size * (0.5 + sign * 0.12), size * 0.5);
        g.lineTo(size * (0.5 - sign * 0.12), size * 0.74);
        g.strokePath();
      } else {
        // Pedal plate with grip bars: throttle is tall, brake is wide.
        const gas = stateKey === 'gas';
        const x = size * (gas ? 0.33 : 0.22);
        const y = size * (gas ? 0.18 : 0.3);
        const w = size * (gas ? 0.34 : 0.56);
        const h = size * (gas ? 0.64 : 0.4);
        g.strokeRoundedRect(x, y, w, h, size * 0.06);
        for (let i = 1; i <= 3; i++) g.lineBetween(x + w * 0.22, y + h * i / 4, x + w * 0.78, y + h * i / 4);
      }
    };
    const glyph = scene.add.graphics();
    const captionText = scene.add
      .text(0, 0, caption, { fontFamily: FONT, fontStyle: '700', color: '#f3eedf' })
      .setOrigin(0.5);

    button.add([shadow, arc, ring, glyph, captionText]);
    this.layer.add(button);

    const b = { button, shadow, arc, ring, glyph, draw, caption: captionText, color, stateKey,
      action, cx: 0, cy: 0, radius: 80 };
    this.buttons.push(b);
    return b;
  }

  _setPressed(b, pressed) {
    const changed = this.state[b.stateKey] !== pressed;
    this.state[b.stateKey] = pressed;
    b.arc.setFillStyle(pressed ? 0x36645d : 0x153e40, pressed ? 0.98 : 0.88);
    b.arc.setStrokeStyle(pressed ? 2.5 : 1.5, b.color, pressed ? 1 : 0.7);
    b.ring.setStrokeStyle(1, b.color, pressed ? 0.4 : 0.13);
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
      .setStrokeStyle(1.5, b.color, 0.7);
    b.shadow.setRadius(r);
    b.ring.setRadius(r - 6);
    b.caption.setPosition(0, r * 0.56).setFontSize(Math.round(r * 0.18)).setLetterSpacing(1);
    if (b.glyph) {
      // The drawn glyph's own ink sits at about (0.47, 0.54) of the box it is
      // drawn into, so centring it means offsetting by that, not by half.
      const size = Math.round(r * 1.05);
      b.glyph.clear();
      b.glyph.setPosition(-size * 0.47, -size * 0.54 - r * 0.08);
      b.draw(b.glyph, size, b.color);
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

    for (const b of this.buttons) this._setPressed(b, this.state[b.stateKey]);
    this.pin();
  }

  // Let go of everything. A pointerup that lands while the game is paused is
  // never delivered to the scene, so a phone turned portrait mid-corner would
  // otherwise come back with the gas still held down.
  releaseAll() {
    this.pointerButton.clear();
    for (const b of this.buttons) this._setPressed(b, false);
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
