// On-screen touch controls for landscape mobile (PRD §4). Steering on the left,
// accelerate/brake on the right, plus an optional tilt-to-steer toggle. Only
// created on touch devices.
import Phaser from 'phaser';
import { FONT } from './format.js';
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

    this.buttons = [];
    this.left = this._button('‹', COLORS.paper, () => (this.state.left = true), () => (this.state.left = false), 'STEER');
    this.right = this._button('›', COLORS.paper, () => (this.state.right = true), () => (this.state.right = false), 'STEER');
    this.gas = this._button('▲', COLORS.sunshine, () => (this.state.gas = true), () => (this.state.gas = false), 'GAS');
    this.brake = this._button('▼', COLORS.red, () => (this.state.brake = true), () => (this.state.brake = false), 'BRAKE');

    this.tiltBtn = scene.add
      .text(0, 0, 'Tilt: off', {
        fontFamily: FONT,
        fontSize: '22px',
        fontStyle: '600',
        color: '#15314b',
        backgroundColor: '#fff8e7',
        padding: { x: 14, y: 8 },
      })
      .setScrollFactor(0)
      .setDepth(1000)
      .setInteractive({ useHandCursor: true });
    this.tiltBtn.on('pointerup', () => this._toggleTilt());

    this._orientationHandler = (e) => {
      // gamma: left/right tilt in degrees. Map ~±30° to full lock.
      const g = e.gamma || 0;
      this.tiltSteer = Phaser.Math.Clamp(g / 30, -1, 1);
    };

    this.layout();
    scene.scale.on('resize', this.layout, this);
    scene.events.once('shutdown', () => {
      scene.scale.off('resize', this.layout, this);
      window.removeEventListener('deviceorientation', this._orientationHandler);
    });
  }

  _button(label, color, onDown, onUp, caption) {
    const scene = this.scene;
    const arc = scene.add
      .circle(0, 0, 68, color, 0.34)
      .setScrollFactor(0)
      .setDepth(999)
      .setStrokeStyle(4, color, 0.95)
      .setInteractive({ useHandCursor: true });
    const text = scene.add
      .text(0, 0, label, {
        fontFamily: FONT,
        fontSize: '54px',
        fontStyle: '700',
        color: '#fff8e7',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000);

    const captionText = scene.add
      .text(0, 0, caption, {
        fontFamily: FONT,
        fontSize: '15px',
        fontStyle: '700',
        color: '#15314b',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000);

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

    const b = { arc, text, caption: captionText, r: 68 };
    this.buttons.push(b);
    return b;
  }

  _place(b, x, y) {
    b.arc.setPosition(x, y);
    b.text.setPosition(x, y - 7);
    b.caption.setPosition(x, y + 39);
  }

  layout() {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const pad = 30;
    const bottom = h - pad - 72;
    // Steering, bottom-left, with generous spacing for thumbs.
    this._place(this.left, pad + 72, bottom);
    this._place(this.right, pad + 224, bottom);
    // Accelerate/brake, bottom-right. Gas is easiest to reach; brake sits inside it.
    this._place(this.gas, w - pad - 76, bottom);
    this._place(this.brake, w - pad - 232, bottom + 4);
    this.tiltBtn.setPosition(pad, pad + 96);
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
