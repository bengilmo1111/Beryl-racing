// Sound toggle, sitting just below the fullscreen control.
import { createIconButton, drawSoundIcon } from './iconButton.js';
import { isMuted, setMuted } from '../audio/sound.js';

export function createSoundButton(scene) {
  return createIconButton(scene, {
    row: 1,
    draw: (g, size) => drawSoundIcon(g, size, isMuted(scene)),
    onTap: () => setMuted(scene, !isMuted(scene)),
  });
}
