// The horn, for players driving with a keyboard and a mouse.
//
// On a touch device the horn is a full-size round button up beside the pedals
// (see TouchControls) — a thumb has no business reaching the top corner of the
// screen at speed. This small one is the desktop half of that pair, where the
// pointer is already halfway there and H does the job anyway.
//
// It fires on the way down rather than on release, because a horn that waits
// for you to lift your finger feels broken. Muting silences it: the button
// still presses, it just does not sound, which is the same bargain the engine
// and the music make.
import { createIconButton, drawHornIcon } from './iconButton.js';
import { isMuted } from '../audio/sound.js';

export function createHornButton(scene, horn) {
  return createIconButton(scene, {
    index: 3,
    draw: (g, size) => drawHornIcon(g, size),
    onPress: () => {
      if (!isMuted(scene)) horn.play();
    },
  });
}
