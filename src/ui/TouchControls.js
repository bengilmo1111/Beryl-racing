// On-screen touch controls for landscape mobile (PRD §4). Steering on the left,
// accelerate/brake on the right, plus an optional tilt-to-steer toggle. The UI
// layer cancels the following camera's zoom so controls stay at the phone edges.
import Phaser from 'phaser';
import { FONT, uiScale, pinUiLayer } from './format.js';
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
    this.tiltEnabled = false;
    this.tiltSteer = 0;

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

    this.tiltBtn = scene.add
      .text(0, 0, 'Tilt: off', {
        fontFamily: FONT,
        fontStyle: '600',
        color: '#15314b',
        backgroundColor: '#fff8e7',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.layer.add(this.tiltBtn);
    this.tiltBtn.on('pointerup', () => this._toggleTilt());

    this._orientationHandler = (e) => {
      // gamma: left/right tilt in degrees. Map ~±30° to full lock.
      const g = e.gamma || 0;
      this.tiltSteer = Phaser.Math.Clamp(g / 30, -1, 1);
    };

    this.pin = () => pinUiLayer(scene, this.layer);
    this.layout();
    scene.scale.on('resize', this.layout, this);
    scene.events.on('postupdate', this.pin);
    scene.events.once('shutdown', () => {
      scene.scale.off('resize', this.layout, this);
      scene.events.off('postupdate', this.pin);
      window.removeEventListener('deviceorientation', this._orientationHandler);
    });
  }

  _button(label, color, onDown, onUp, caption) {
    const scene = this.scene;
    const arc = scene.add
      .circle(0, 0, 80, color, 0.34)
      .setStrokeStyle(5, color, 0.95)
      .setInteractive({ useHandCursor: true });
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

    this.layer.add([arc, text, captionText]);

    const press = () => {
      onDown();
      arc.setFillStyle(color, 0.62);
      arc.setScale(0.95);
    };
    const release = () => {
      onUp();
      arc.setFillStyle(color, 0.34);
      arc.setScale(1);
    };
    arc.on('pointerdown', press);
    arc.on('pointerup', release);
    arc.on('pointerout', release);
    arc.on('pointerupoutside', release);

    const b = { arc, text, caption: captionText, color };
    this.buttons.push(b);
    return b;
  }

  _place(b, x, y, r) {
    b.arc
      .setPosition(x, y)
      .setRadius(r)
      .setStrokeStyle(Math.max(3, Math.round(r * 0.06)), b.color, 0.95);
    b.text.setPosition(x, y - r * 0.08).setFontSize(Math.round(r * 0.78));
    b.caption.setPosition(x, y + r * 0.56).setFontSize(Math.round(r * 0.2));
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

    const s = uiScale(scene, 0.7, 1.1);
    this.tiltBtn
      .setFontSize(Math.round(22 * s))
      .setPadding(Math.round(16 * s), Math.round(10 * s))
      .setPosition(w / 2, h - Math.round(18 * s));

    this.pin();
  }

  async _toggleTilt() {
    if (!this.tiltEnabled) {
      // iOS 13+ requires an explicit permission request from a user gesture.
      const DOE = window.DeviceOrientationEvent;
      if (DOE && typeof DOE.requestPermission === 'function') {
        try {
          const res = await DOE.requestPermission();
          if (res !== 'granted') return;
        } catch {
          return;
        }
      }
      window.addEventListener('deviceorientation', this._orientationHandler);
      this.tiltEnabled = true;
      this.tiltBtn.setText('Tilt: on');
    } else {
      window.removeEventListener('deviceorientation', this._orientationHandler);
      this.tiltEnabled = false;
      this.tiltSteer = 0;
      this.tiltBtn.setText('Tilt: off');
    }
  }

  getInput() {
    let steer = 0;
    if (this.state.left) steer -= 1;
    if (this.state.right) steer += 1;
    if (this.tiltEnabled && steer === 0) steer = this.tiltSteer;
    steer = Phaser.Math.Clamp(steer, -1, 1);
    const throttle = this.state.gas ? 1 : this.state.brake ? -1 : 0;
    return { steer, throttle, handbrake: false };
  }
}
