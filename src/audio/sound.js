// Music + global mute, kept on the game registry so state survives scene
// changes. Music plays through Phaser's sound manager; the engine synth
// (EngineSound) reads the muted flag directly.

export function startMusic(scene) {
  const reg = scene.game.registry;
  if (reg.get('musicStarted')) return;
  if (!scene.cache.audio.exists('music-race')) return;
  const music = scene.sound.add('music-race', { loop: true, volume: 0.5 });
  music.play();
  reg.set('music', music);
  reg.set('musicStarted', true);
  scene.sound.mute = !!reg.get('muted');
}

export function isMuted(scene) {
  return !!scene.game.registry.get('muted');
}

export function setMuted(scene, value) {
  scene.game.registry.set('muted', value);
  scene.sound.mute = value; // covers the music (a Phaser sound)
}

// Ensure the audio context is running (browsers start it suspended until a
// user gesture). Call from within a gesture handler.
export function unlockAudio(scene) {
  const ctx = scene.sound && scene.sound.context;
  if (ctx && ctx.state === 'suspended') ctx.resume();
}
