// On-screen touch controls for landscape mobile (PRD §4). Steering on the left
// and accelerate/brake on the right. The UI layer cancels the following camera's
// zoom so controls stay at the phone edges.
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

    // Phaser tracks 2 pointers by default; add more for multi-finger play.
    scene.input.addPointer(3);

    this.layer = scene.add.container(0, 0).setScrollFactor(0).setDepth(999);
    this.buttons = [];
    this.left = this._button(
      '‹',
      COLORS.paper,
      () => (this.state.left = true),
      () => (this.state.left = false),
      'STEER'
    );
    this.right = this._button(
      '›',
      COLORS.paper,
      () => (this.state.right = true),
      () => (this.state.right = false),
      'STEER'
    );
    this.gas = this._button(
      '▲',
      COLORS.sunshine,
      () => (this.state.gas = true),
      () => (this.state.gas = false),
      'GAS'
    );
    this.brake = this._button(
      '▼',
      COLORS.red,
      () => (this.state.brake = true),
      () => (this.state.brake = false),
      'BRAKE'
    );

    this.pin = () => pinUiLayer(scene, this.layer);
    this.layout();
    scene.scale.on('resize', this.layout, this);
    scene.events.on('postupdate', this.pin);
    scene.events.once('shutdown', () => {
      scene.scale.off('resize', this.layout, this);
      scene.events.off('postupdate', this.pin);
    });
  }

  _button(label, color, onDown, onUp, caption) {
    const scene = this.scene;
    const button = scene.add.container(0, 0).setSize(160, 160);
    const arc = scene.add.circle(0, 0, 80, color, 0.34).setStrokeStyle(5, color, 0.95);
    const text = scene.add
      .text(0, 0, label, {
        fontFamily: FONT,
        fontStyle: '700',
        color: '#fff8e7',
      })
      .setOrigin(0.5);

    const captionText = scene.add
      .text(0, 0, caption, {
        fontFamily: FONT,
        fontStyle: '700',
        color: '#15314b',
      })
      .setOrigin(0.5);

    button.add([arc, text, captionText]);
    this.layer.add(button);

    const press = () => {
      onDown();
      arc.setFillStyle(color, 0.62);
      button.setScale(0.95);
    };
    const release = () => {
      onUp();
      arc.setFillStyle(color, 0.34);
      button.setScale(1);
    };
    button.on('pointerdown', press);
    button.on('pointerup', release);
    button.on('pointerout', release);
    button.on('pointerupoutside', release);

    const b = { button, arc, text, caption: captionText, color, radius: 80 };
    this.buttons.push(b);
    this._refreshHitArea(b);
    return b;
  }

  _refreshHitArea(b) {
    b.button.setSize(b.radius * 2, b.radius * 2);
    b.button.setInteractive(
      new Phaser.Geom.Circle(0, 0, b.radius),
      Phaser.Geom.Circle.Contains
    );
    b.button.input.cursor = 'pointer';
  }

  _place(b, x, y, r) {
    b.radius = r;
    b.button.setPosition(x, y).setScale(1);
    b.arc
      .setPosition(0, 0)
      .setRadius(r)
      .setStrokeStyle(Math.max(3, Math.round(r * 0.06)), b.color, 0.95);
    b.text.setPosition(0, -r * 0.08).setFontSize(Math.round(r * 0.78));
    b.caption.setPosition(0, r * 0.56).setFontSize(Math.round(r * 0.2));
    this._refreshHitArea(b);
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
