// Home: back to the course chooser, without reaching for a keyboard.
//
// ESC has always done this, which is no use at all on a phone — the only way
// off a course was to finish it or reload the page. It fires on release rather
// than on the way down, so a finger that lands on it by mistake can slide off
// and cancel: leaving a run is the one thing on this screen you cannot undo.
import { createIconButton, drawHomeIcon } from './iconButton.js';

export function createHomeButton(scene, onHome) {
  return createIconButton(scene, {
    index: 2,
    draw: (g, size) => drawHomeIcon(g, size),
    onTap: () => (onHome ? onHome() : scene.scene.start('Title')),
  });
}
