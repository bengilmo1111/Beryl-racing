// A mute toggle, pinned top-right just below the fullscreen button.
import { FONT } from './format.js';
import { isMuted, setMuted } from '../audio/sound.js';

export function createSoundButton(scene) {
  const label = () => (isMuted(scene) ? '🔇  Muted' : '🔊  Sound');
  const btn = scene.add
    .text(scene.scale.width - 16, 58, label(), {
      fontFamily: FONT,
      fontSize: '22px',
      fontStyle: '600',
      color: '#15314b',
      backgroundColor: '#fff8e7',
      padding: { x: 12, y: 6 },
    })
    .setOrigin(1, 0)
    .setScrollFactor(0)
    .setDepth(1000)
    .setInteractive({ useHandCursor: true });

  btn.on('pointerup', () => {
    setMuted(scene, !isMuted(scene));
    btn.setText(label());
  });

  const reposition = () => btn.setPosition(scene.scale.width - 16, 58);
  scene.scale.on('resize', reposition);
  scene.events.once('shutdown', () => scene.scale.off('resize', reposition));

  return btn;
}
