import { CHAPTERS, nextChapter, readJourney, writeJourney, briefFor, arrivalFor } from './story.js';
import { setSelectedTrack } from '../tracks.js';
import { unlockAudio, startMusic } from '../audio/sound.js';

function element(tag, text, parent, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  parent?.append(node);
  return node;
}
function button(parent, text, action, primary = false) {
  const node = element('button', text, parent, primary ? 'primary' : '');
  node.type = 'button'; node.addEventListener('click', action); return node;
}
function dialog(scene, label) {
  const overlay = element('section', '', document.getElementById('game'), 'journey-overlay');
  overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-label', label);
  const card = element('div', '', overlay, 'journey-card');
  overlay.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const items = [...overlay.querySelectorAll('button:not(:disabled)')];
    const first = items[0], last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  scene.journeyDialog = overlay;
  const onShutdown = () => overlay.remove();
  scene.events.once('shutdown', onShutdown);
  const previousFocus = document.activeElement;
  const close = () => { scene.events.off('shutdown', onShutdown); overlay.remove(); if (scene.journeyDialog === overlay) scene.journeyDialog = null; if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); };
  return { overlay, card, close };
}
function launch(scene, chapter, fresh = false) {
  scene.game.registry.set('__journeyFresh', fresh);
  setSelectedTrack(chapter.course);
  scene.game.registry.set('__journeyChapter', chapter.id);
  unlockAudio(scene); startMusic(scene);
  scene.scene.start('Race');
}
export function installJourneyEntry(scene) {
  scene.game.registry.remove('__journeyChapter');
  const save = readJourney(), next = nextChapter(save);
  const entry = button(document.getElementById('game'), next
    ? `${Object.keys(save.completed).length ? 'Continue' : 'Start'} the Sunday run · ${next.title}`
    : 'The Sunday run · Open the route book', () => showRouteBook(scene));
  entry.className = 'journey-entry';
  scene.events.once('shutdown', () => entry.remove());
  return entry;
}
export function showRouteBook(scene) {
  if (scene.journeyDialog) return;
  const { card, close } = dialog(scene, 'The Sunday run');
  const save = readJourney(), next = nextChapter(save);
  element('div', 'Beryl’s route book', card, 'journey-eyebrow');
  element('h1', 'The Sunday run', card);
  element('p', 'A few errands become a reason to get people together. Six connected drives through Ōtaki and over Remutaka, with Nora, Jo, Arthur and Mere.', card);
  element('p', 'Each chapter is a short drive. Come back whenever you like; your place is saved in this browser.', card, 'journey-note');
  if (next) {
    element('h2', next.title, card);
    element('p', next.act, card, 'journey-eyebrow');
    element('p', save.checkpoint ? 'Beryl is waiting at your last route stop.' : next.from, card);
    element('p', next.task, card, 'journey-task');
  } else {
    element('p', 'The first Sunday run is written. You can revisit any chapter below, or take Beryl out for a free drive.', card);
  }
  const actions = element('div', '', card, 'journey-actions journey-footer');
  const first = next ? button(actions, 'Read the chapter & drive', () => { close(); showChapter(scene, next); }, true) : null;
  const back = button(actions, 'Back to free driving', close);
  element('h2', 'In the book', card);
  const list = element('ol', '', card, 'journey-chapters');
  for (const chapter of CHAPTERS) {
    const item = element('li', '', list);
    const done = !!save.completed[chapter.id];
    const b = button(item, `${chapter.title} · ${done ? 'Read or revisit' : chapter.id === next?.id ? 'Next drive' : 'Later in the story'}`,
      () => { close(); showChapter(scene, chapter); });
    b.disabled = !done && chapter.id !== next?.id;
  }
  (first || back).focus({ preventScroll: true });
}
export function showChapter(scene, chapter) {
  const { card, close } = dialog(scene, chapter.title);
  const save = readJourney(), done = !!save.completed[chapter.id];
  const resume = save.checkpoint?.chapter === chapter.id;
  element('div', chapter.act, card, 'journey-eyebrow');
  element('h1', chapter.title, card);
  element('p', chapter.from, card, 'journey-eyebrow');
  element('p', done ? arrivalFor(chapter, save) : briefFor(chapter, save), card);
  element('p', chapter.task, card, 'journey-task');
  if (resume) element('p', 'Continue from your last completed route stop, with Beryl safely on the road. Your route and what you are carrying come with you.', card, 'journey-note');
  if (chapter.id === 'tea-on-the-hill' && !done) {
    element('p', 'Brake before bends and keep off the rough verge. The flask can be steady, shaken or spilled. Everyone will still meet you; what arrives changes the conversation.', card, 'journey-note');
  }
  if (chapter.id === 'the-road-we-choose' && !resume) {
    element('h2', 'Which way shall we go?', card);
    const choices = element('div', '', card, 'journey-actions');
    const controls = [];
    for (const [route, label] of [['riverbank', 'Riverbank · gardens and the coast'], ['old-town', 'Old town · Rāhui, Mill and Tasman']]) {
      const b = button(choices, label, () => {
        const current = readJourney(); current.choice = route; writeJourney(current);
        controls.forEach(({ node, value }) => {
          node.setAttribute('aria-pressed', String(value === route));
          node.classList.toggle('primary', value === route);
        });
      }, save.choice === route);
      b.setAttribute('aria-pressed', String(save.choice === route)); controls.push({ node: b, value: route });
    }
    element('p', 'This changes the roads you follow and the route written into the book.', card, 'journey-note');
  }
  const actions = element('div', '', card, 'journey-actions journey-footer');
  const drive = button(actions, resume ? 'Continue from the last stop' : done ? 'Revisit this drive' : 'Take Beryl out',
    () => { close(); launch(scene, chapter); }, true);
  if (resume) button(actions, 'Start this chapter from the beginning', () => { close(); launch(scene, chapter, true); });
  button(actions, 'Back to the book', () => { close(); showRouteBook(scene); });
  drive.focus({ preventScroll: true });
}

export function showChapterResults(scene) {
  const chapter = scene.journeyChapter;
  const { card } = dialog(scene, `${chapter.title} — arrival`);
  element('div', 'A page in the route book', card, 'journey-eyebrow');
  element('h1', chapter.title, card);
  const save = readJourney();
  element('p', arrivalFor(chapter, save, { cargo: scene.journeyDrive.roughSeconds >= 20 ? 'spilled' : scene.journeyDrive.roughSeconds >= 8 ? 'shaken' : 'steady',
    route: scene.journeyRoute.oldTown ? 'old-town' : 'riverbank' }), card);
  const next = nextChapter(readJourney());
  element('p', scene.journeyRevisit ? 'A return visit. The original page and your place in the story stay as they were.' : scene.journeySaved ? 'Written in the book. You can leave here and carry on another day.' : 'Progress is kept for this visit. Browser storage is unavailable, so it may not survive closing the game.', card, 'journey-note');
  const actions = element('div', '', card, 'journey-actions journey-footer');
  if (next) button(actions, `Next: ${next.title}`, () => { scene.scene.start('Title', { openJourney: true }); }, true);
  button(actions, 'Put the book away', () => scene.scene.start('Title'));
  button(actions, 'Drive this chapter again', () => { scene.game.registry.set('__journeyFresh', true); scene.scene.restart(); });
  actions.querySelector('button').focus({ preventScroll: true });
}

