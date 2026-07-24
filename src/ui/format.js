// mm:ss.mmm formatting for lap times.
export function formatTime(ms) {
  if (ms == null || !isFinite(ms)) return '--:--.---';
  const totalMs = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const millis = totalMs % 1000;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(
    millis
  ).padStart(3, '0')}`;
}

export const FONT = 'Fredoka, Nunito, system-ui, sans-serif';

// A responsive scale factor for UI elements. In RESIZE mode this.scale.width /
// height equal the real viewport size, so a 320px-wide phone would otherwise
// get the same pixel-sized HUD as a 1280px desktop. We scale UI relative to the
// 1280x720 reference, clamped so it never gets uncomfortably tiny on small
// phones or oversized on large tablets/desktops.
export function uiScale(scene, min = 0.62, max = 1.15) {
  const w = scene.scale.width;
  const h = scene.scale.height;
  const s = Math.min(w / 1280, h / 720);
  return Math.max(min, Math.min(max, s));
}

// True for narrow/short viewports (phones), where controls and text need to be
// proportionally larger and layouts tighter.
export function isCompact(scene) {
  return scene.scale.width < 820 || scene.scale.height < 480;
}

// setScrollFactor(0) stops camera scrolling, but Phaser still applies camera
// zoom. That pulls objects placed at the viewport edges toward the centre.
// These helpers apply the inverse transform so UI remains pinned to the actual
// screen edges while the race camera zooms in and out.
function cameraTransform(scene) {
  const cam = scene.cameras.main;
  const zoom = cam && cam.zoom ? cam.zoom : 1;
  const originX = (cam?.x || 0) + (cam?.width || scene.scale.width) * (cam?.originX ?? 0.5);
  const originY = (cam?.y || 0) + (cam?.height || scene.scale.height) * (cam?.originY ?? 0.5);
  return { zoom, originX, originY };
}

export function pinUiObject(scene, object, screenX, screenY, baseScale = 1) {
  const { zoom, originX, originY } = cameraTransform(scene);
  object.setPosition(
    originX + (screenX - originX) / zoom,
    originY + (screenY - originY) / zoom
  );
  object.setScale(baseScale / zoom);
}

// Children in the layer use normal viewport coordinates. Moving and inversely
// scaling the layer cancels the world camera's zoom for every child at once.
export function pinUiLayer(scene, layer) {
  const { zoom, originX, originY } = cameraTransform(scene);
  layer.setPosition(originX - originX / zoom, originY - originY / zoom);
  layer.setScale(1 / zoom);
}
