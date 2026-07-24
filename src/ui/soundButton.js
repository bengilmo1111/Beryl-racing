// A sound toggle pinned below the fullscreen control.
// Use clear text labels and a minimum phone-sized hit area rather than relying
// on tiny emoji glyphs that render inconsistently across Android devices.
import { FONT, uiScale, isCompact } from './format.js';
import { isMuted, setMuted } from '../audio/sound.js';

export function createSoundButton(scene) {
  const label = () => (isMuted(scene) ? 'SOUND OFF' : 'SOUND ON');
  const btn = scene.add
    .text(0, 0, label(), {
      fontFamily: FONT,
      fontStyle: '700',
      color: '#15314b',
      backgroundColor: '#fff8e7',
      align: 'center',
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
    const compact = isCompact(scene);
    const fontSize = compact ? 20 : Math.round(22 * s);
    const padX = compact ? 18 : Math.round(14 * s);
    const padY = compact ? 12 : Math.round(10 * s);
    const margin = compact ? 12 : Math.round(14 * s);
    const rowY = compact ? 70 : Math.round(66 * s);

    btn.setText(label());
    btn.setFontSize(fontSize);
    btn.setPadding(padX, padY);
    btn.setPosition(scene.scale.width - margin, rowY);
  };

  reposition();
  scene.scale.on('resize', reposition);
  scene.events.once('shutdown', () => scene.scale.off('resize', reposition));

  return btn;
}
