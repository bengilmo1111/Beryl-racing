// A fullscreen toggle pinned to the real top-right edge of the viewport.
// The inverse camera transform keeps it there even while the race camera zooms.
import { FONT, uiScale, isCompact, pinUiObject } from './format.js';

export function createFullscreenButton(scene) {
  const label = () => (scene.scale.isFullscreen ? 'EXIT FULL' : 'FULL SCREEN');
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

  let screenX = 0;
  let screenY = 0;
  const pin = () => pinUiObject(scene, btn, screenX, screenY);

  btn.on('pointerup', () => {
    if (scene.scale.isFullscreen) scene.scale.stopFullscreen();
    else scene.scale.startFullscreen();
  });

  const refresh = () => {
    const s = uiScale(scene);
    const compact = isCompact(scene);
    const fontSize = compact ? 20 : Math.round(22 * s);
    const padX = compact ? 18 : Math.round(14 * s);
    const padY = compact ? 12 : Math.round(10 * s);
    const margin = compact ? 12 : Math.round(14 * s);

    screenX = scene.scale.width - margin;
    screenY = margin;
    btn.setText(label());
    btn.setFontSize(fontSize);
    btn.setPadding(padX, padY);
    pin();
  };

  refresh();
  scene.scale.on('enterfullscreen', refresh);
  scene.scale.on('leavefullscreen', refresh);
  scene.scale.on('resize', refresh);
  scene.events.on('postupdate', pin);
  scene.events.once('shutdown', () => {
    scene.scale.off('enterfullscreen', refresh);
    scene.scale.off('leavefullscreen', refresh);
    scene.scale.off('resize', refresh);
    scene.events.off('postupdate', pin);
  });

  return btn;
}
