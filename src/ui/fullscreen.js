// Fullscreen toggle, in the top-right corner of the real viewport.
import { createIconButton, drawFullscreenIcon } from './iconButton.js';

export function createFullscreenButton(scene) {
  return createIconButton(scene, {
    index: 0,
    draw: (g, size) => drawFullscreenIcon(g, size, scene.scale.isFullscreen),
    onTap: () => {
      if (scene.scale.isFullscreen) scene.scale.stopFullscreen();
      else scene.scale.startFullscreen();
    },
  });
}
