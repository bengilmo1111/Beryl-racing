// Background music + global mute, kept on the game registry so state survives
// scene changes. The original race cue is now the title/fallback music; courses
// with dedicated songs switch to them when RaceScene starts.
import { getSelectedTrack } from '../tracks.js';

const TITLE_MUSIC_KEY = 'music-race';
const MUSIC_VOLUME = 0.22;

const TRACK_MUSIC_KEYS = Object.freeze({
  'eastbourne-dash': 'music-eastbourne-dash',
  manfield: 'music-manfield-racetrack',
  remutaka: 'music-remutaka-ascent',
  otaki: 'music-otaki-rally',
});

// BootScene imports this list so asset names and playback keys cannot drift.
export const MUSIC_ASSETS = Object.freeze([
  { key: TITLE_MUSIC_KEY, path: 'assets/music-race.mp3' },
  { key: 'music-eastbourne-dash', path: 'assets/music/eastbourne-dash.mp3' },
  { key: 'music-manfield-racetrack', path: 'assets/music/manfield-racetrack.mp3' },
  { key: 'music-remutaka-ascent', path: 'assets/music/remutaka-ascent.mp3' },
  { key: 'music-otaki-rally', path: 'assets/music/otaki-rally.mp3' },
]);

function musicKeyForScene(scene) {
  if (scene.scene.key !== 'Race') return TITLE_MUSIC_KEY;
  const dedicated = TRACK_MUSIC_KEYS[getSelectedTrack()?.id];
  // New courses automatically inherit the title music until a dedicated cue is
  // added to both TRACK_MUSIC_KEYS and MUSIC_ASSETS.
  return dedicated && scene.cache.audio.exists(dedicated) ? dedicated : TITLE_MUSIC_KEY;
}

function playMusicKey(scene, requestedKey) {
  const reg = scene.game.registry;
  const key = scene.cache.audio.exists(requestedKey) ? requestedKey : TITLE_MUSIC_KEY;
  if (!scene.cache.audio.exists(key)) return;

  const current = reg.get('music');
  const currentKey = reg.get('musicKey');
  if (current && currentKey === key) {
    if (!current.isPlaying) current.play();
    scene.sound.mute = !!reg.get('muted');
    reg.set('musicStarted', true);
    return;
  }

  if (current) {
    current.stop();
    current.destroy();
  }

  // Leave the foreground to Beryl, the tyres and the horn. All five music files
  // use the same gain so the balance established for the real car is preserved.
  const music = scene.sound.add(key, { loop: true, volume: MUSIC_VOLUME });
  music.play();
  reg.set('music', music);
  reg.set('musicKey', key);
  reg.set('musicStarted', true);
  scene.sound.mute = !!reg.get('muted');
}

export function startMusic(scene) {
  playMusicKey(scene, musicKeyForScene(scene));

  // Returning to the course selector should always restore the original title
  // cue. This covers Escape, results-screen exits and future navigation paths
  // without every caller needing to remember an audio transition.
  if (scene.scene.key === 'Race' && !scene.__berylTitleMusicRestoreBound) {
    scene.__berylTitleMusicRestoreBound = true;
    scene.events.once('shutdown', () => playMusicKey(scene, TITLE_MUSIC_KEY));
  }
}

export function isMuted(scene) {
  return !!scene.game.registry.get('muted');
}

export function setMuted(scene, value) {
  scene.game.registry.set('muted', value);
  scene.sound.mute = value; // covers all Phaser-managed music
}

// Ensure the audio context is running (browsers start it suspended until a
// user gesture). Call from within a gesture handler.
export function unlockAudio(scene) {
  const ctx = scene.sound && scene.sound.context;
  if (ctx && ctx.state === 'suspended') ctx.resume();
}
