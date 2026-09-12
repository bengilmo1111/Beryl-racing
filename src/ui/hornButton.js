// The horn, sitting below the sound toggle.
//
// It fires on the way down rather than on release, because a horn that waits
// for you to lift your finger feels broken. Muting silences it: the button
// still presses, it just does not sound, which is the same bargain the engine
// and the music make.
import { createIconButton, drawHornIcon } from './iconButton.js';
import { isMuted } from '../audio/sound.js';

export function createHornButton(scene, horn) {
  return createIconButton(scene, {
    row: 2,
    draw: (g, size) => drawHornIcon(g, size),
    onPress: () => {
      if (!isMuted(scene)) horn.play();
    },
  });
}
