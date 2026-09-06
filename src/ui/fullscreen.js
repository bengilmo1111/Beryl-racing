// Fullscreen toggle, pinned to the real top-right edge of the viewport.
import { createIconButton, drawFullscreenIcon } from './iconButton.js';

export function createFullscreenButton(scene) {
  return createIconButton(scene, {
    row: 0,
    draw: (g, size) => drawFullscreenIcon(g, size, scene.scale.isFullscreen),
    onTap: () => {
      if (scene.scale.isFullscreen) scene.scale.stopFullscreen();
      else scene.scale.startFullscreen();
    },
  });
}
