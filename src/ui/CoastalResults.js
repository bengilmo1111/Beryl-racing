import { STORAGE_KEY } from '../config.js';
import { formatTime } from './format.js';

function readScores(key) {
  try {
    const rows = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(rows) ? rows.filter((row) => Number.isFinite(row.time) && row.time > 0
      && typeof row.name === 'string').sort((a, b) => a.time - b.time).slice(0, 3) : [];
  } catch { return []; }
}

export function showCoastalResults(scene, timeMs, previousBest) {
  const key = `${STORAGE_KEY}.podium`;
  const rows = readScores(key);
  const entry = { name: 'BERYL', time: Math.floor(timeMs) };
  rows.push(entry);
  rows.sort((a, b) => a.time - b.time);
  rows.splice(3);
  const qualifies = rows.includes(entry);
  const save = () => {
    try { localStorage.setItem(key, JSON.stringify(rows)); } catch { /* Storage may be disabled. */ }
  };
  save();

  const overlay = document.createElement('section');
  overlay.className = 'coastal-results';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Eastbourne results');
  const card = document.createElement('div');
  card.className = 'coastal-results-card';
  overlay.append(card);
  const text = (tag, value, className) => {
    const node = document.createElement(tag);
    node.textContent = value;
    if (className) node.className = className;
    card.append(node);
    return node;
  };
  text('h1', 'MADE IT TO THE RSA!');
  text('p', scene.def.results.message);
  text('strong', formatTime(timeMs), 'coastal-result-time');
  text('p', !previousBest ? 'Your first coastal run. Fancy another?'
    : timeMs < previousBest ? `NEW BEST · ${((previousBest - timeMs) / 1000).toFixed(1)}s quicker!`
      : `${((timeMs - previousBest) / 1000).toFixed(1)}s from your best. One more go?`);
  if (scene.recoveryCount) text('small', `Includes ${scene.recoveryCount * 3}s for road recovery.`);
  text('h2', 'LOCAL TOP THREE');
  const list = text('ol', '');
  const renderRows = () => {
    list.replaceChildren();
    for (const row of rows) {
      const li = document.createElement('li');
      li.textContent = `${row.name} — ${formatTime(row.time)}`;
      if (row === entry) li.className = 'coastal-current-score';
      list.append(li);
    }
  };
  renderRows();
  if (qualifies) {
    const label = text('label', 'Your name ');
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 12;
    input.value = entry.name;
    input.autocomplete = 'off';
    input.setAttribute('aria-label', 'Name for local top three');
    // Names are text nodes, never HTML. Save as the player types so retry is
    // always one action; do not open a phone keyboard automatically on finish.
    input.addEventListener('input', () => {
      entry.name = input.value.trim().toUpperCase().slice(0, 12) || 'BERYL';
      save();
      renderRows();
    });
    label.append(input);
  }
  const button = (label, action) => {
    const node = text('button', label);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  };
  const retry = button('DASH AGAIN', () => scene.scene.restart());
  button('CHANGE COURSE', () => scene.scene.start('Title'));
  document.getElementById('game').append(overlay);
  scene.events.once('shutdown', () => overlay.remove());
  retry.focus({ preventScroll: true });
}
