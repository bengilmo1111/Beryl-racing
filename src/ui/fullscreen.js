// A small fullscreen toggle button, pinned to the top-right of the camera.
// Available from the title screen onward (PRD §9).
import { FONT, uiScale } from './format.js';

export function createFullscreenButton(scene) {
  const label = () => (scene.scale.isFullscreen ? '⤡  Exit' : '⤢  Full');
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
    if (scene.scale.isFullscreen) scene.scale.stopFullscreen();
    else scene.scale.startFullscreen();
  });

  const refresh = () => {
    const s = uiScale(scene);
    btn.setText(label());
    btn.setFontSize(Math.round(22 * s));
    btn.setPadding(Math.round(14 * s), Math.round(10 * s));
    btn.setPosition(scene.scale.width - 14 * s, 14 * s);
  };
  refresh();
  scene.scale.on('enterfullscreen', refresh);
  scene.scale.on('leavefullscreen', refresh);
  scene.scale.on('resize', refresh);
  scene.events.once('shutdown', () => {
    scene.scale.off('enterfullscreen', refresh);
    scene.scale.off('leavefullscreen', refresh);
    scene.scale.off('resize', refresh);
  });

  return btn;
}
