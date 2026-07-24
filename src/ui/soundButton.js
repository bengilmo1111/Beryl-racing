// A mute toggle, pinned top-right just below the fullscreen button.
import { FONT, uiScale } from './format.js';
import { isMuted, setMuted } from '../audio/sound.js';

export function createSoundButton(scene) {
  const label = () => (isMuted(scene) ? '🔇  Muted' : '🔊  Sound');
  const btn = scene.add
    .text(0, 0, label(), {
      fontFamily: FONT,
      fontStyle: '600',
      color: '#15314b',
      backgroundColor: '#fff8e7',
    })
    .setOrigin(1, 0)
    .setScrollFactor(0)
    .setDepth(1000)
    .setInteractive({ useHandCursor: true });

  btn.on('pointerup', () => {
    setMuted(scene, !isMuted(scene));
    reposition();
  });

  const reposition = () => {
    const s = uiScale(scene);
    btn.setText(label());
    btn.setFontSize(Math.round(22 * s));
    btn.setPadding(Math.round(14 * s), Math.round(10 * s));
    // Sit just below the fullscreen button (same scaled metrics).
    btn.setPosition(scene.scale.width - 14 * s, 66 * s);
  };
  reposition();
  scene.scale.on('resize', reposition);
  scene.events.once('shutdown', () => scene.scale.off('resize', reposition));

  return btn;
}
