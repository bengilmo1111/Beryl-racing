// A small authored story, saved independently of time-trial records. No calendar
// gates: a chapter is there whenever the player has time for the next drive.
export const JOURNEY_KEY = 'beryl-racing.sunday-run.v1';
export const CHAPTERS = [
  {
    id: 'first-box', course: 'otaki', act: 'Friday · Getting people together',
    title: 'The first box', from: 'Nora · market gardener',
    brief: '“The club used to finish its Sunday run at the beach. These days we wave from our cars and go home. Take these seedlings down from the Forks, will you? Jo has a plan for a shared garden.”',
    task: 'Follow Ōtaki Gorge Road to the beach. There is no deadline.',
    arrival: 'Jo lifts the box out of Beryl. “Nora still thinks everyone has a garden. We could make one at the hall. First, we need to get everyone round the same table.”',
  },
  {
    id: 'tea-on-the-hill', course: 'remutaka', act: 'Saturday · A reason to stop',
    title: 'Tea on the hill', from: 'Jo · keeper of the route book',
    brief: '“Arthur used to organise the hill runs. He says nobody wants them now. I think nobody has asked. He is meeting us at the summit. Take the tea; I will bring the cups.”',
    task: 'Climb Remutaka with Jo’s flask. A steady drive matters more than a fast one.',
    arrival: 'Arthur has brought six mugs for three people. “Just in case,” he says. He opens his old route book. The pages are full of roads; the margins are full of people.',
  },
  {
    id: 'a-place-at-the-table', course: 'otaki', act: 'Saturday · The other way through',
    title: 'A place at the table', from: 'Arthur · former run organiser',
    brief: '“Your usual road follows the riverbank. The old-town way passes Mere’s workshop. She kept half these cars going, but we never stopped long enough to invite her. Could you take the town way this time?”',
    task: 'Take the old-town route after the river, then follow Tasman Road to the beach.',
    arrival: 'Mere is already putting folding chairs in her van. “You could have asked years ago.” She takes the route book, crosses out a shortcut and draws a small table in the margin.',
  },
  {
    id: 'room-for-the-view', course: 'remutaka', act: 'Sunday · More than a finish line',
    title: 'Room for the view', from: 'Mere · workshop owner',
    brief: '“Arthur always drove straight over the top. Today we are stopping. Bring the route book into the summit car park. Let him show you the valley before he shows you his best time.”',
    task: 'Reach the summit, pull into the paved car park and stop beside the meeting point.',
    arrival: 'With Beryl parked, Arthur finally looks up from the book. He points out the road below. Jo asks where he would take someone who had never been here. For once, he has to think about it.',
  },
  {
    id: 'the-road-we-choose', course: 'otaki', act: 'Sunday · Make the route your own',
    title: 'The road we choose', from: 'Jo · one last errand',
    brief: '“Nora has more seedlings than we have seats. She says that is a good problem. You know both ways to the beach now. Choose the road for the last delivery; I will tell everyone where to wait.”',
    task: 'Choose the riverbank road or the old-town route for the final box.',
    arrival: 'Nora counts the seedlings, then counts the chairs. There are more chairs. “Good,” she says. “That leaves room for whoever turns up next week.”',
  },
  {
    id: 'next-sunday', course: 'remutaka', act: 'The following weekend · Carry it on',
    title: 'Next Sunday', from: 'Arthur · a new page',
    brief: '“I have left the next page blank. Same hill, different company. Bring the book up and we will plan a route for the people who could not make it. No need to race me.”',
    task: 'One more climb, then park at the summit. The next Sunday run begins with a conversation.',
    arrival: 'Arthur slides the book across the bonnet. Jo writes “Stop for people” above the next route. Mere adds “And tea”. Nora draws a garden beside the hall. Below them is an empty line for your route.',
  },
];

let memory = { version: 1, completed: {}, choice: 'riverbank', checkpoint: null };
export function cleanJourney(value) {
  const result = { version: 1, completed: {}, choice: 'riverbank', checkpoint: null };
  if (!value || value.version !== 1) return result;
  if (value.choice === 'old-town') result.choice = 'old-town';
  for (const chapter of CHAPTERS) {
    const row = value.completed?.[chapter.id];
    if (!row || typeof row !== 'object') break;
    result.completed[chapter.id] = { cargo: ['steady', 'shaken', 'spilled'].includes(row.cargo) ? row.cargo : 'steady',
      route: row.route === 'old-town' ? 'old-town' : 'riverbank' };
  }
  const cp = value.checkpoint;
  const current = CHAPTERS.find(chapter => !result.completed[chapter.id]);
  if (cp && current?.id === cp.chapter && Number.isInteger(cp.gate) && cp.gate >= 1 && cp.gate <= 200
    && Number.isFinite(cp.elapsed) && cp.elapsed >= 0 && cp.elapsed < 7200
    && Number.isFinite(cp.roughSeconds) && cp.roughSeconds >= 0 && cp.roughSeconds < 7200
    && Number.isInteger(cp.contacts) && cp.contacts >= 0 && cp.contacts < 100000) {
    result.checkpoint = { chapter: cp.chapter, gate: cp.gate, elapsed: cp.elapsed,
      roughSeconds: cp.roughSeconds, contacts: cp.contacts, route: cp.route === 'old-town' ? 'old-town' : 'riverbank' };
  }
  return result;
}
function storage() { try { return globalThis.localStorage; } catch { return null; } }
export function readJourney(store = storage()) {
  try {
    const raw = store?.getItem(JOURNEY_KEY);
    if (raw) memory = cleanJourney(JSON.parse(raw));
  } catch { /* Keep this session playable when storage is unavailable. */ }
  return structuredClone(memory);
}
export function writeJourney(value, store = storage()) {
  memory = cleanJourney(value);
  try { if (store) { store.setItem(JOURNEY_KEY, JSON.stringify(memory)); return true; } } catch { /* Session-only fallback. */ }
  return false;
}
export function nextChapter(save) {
  return CHAPTERS.find(chapter => !save.completed[chapter.id]) || null;
}
export function finishChapter(save, chapter, cargo = 'steady') {
  const next = cleanJourney(save);
  // Replaying an earlier chapter never replaces the original story outcome.
  if (!next.completed[chapter.id] && nextChapter(next)?.id === chapter.id) {
    next.completed[chapter.id] = { cargo, route: save.checkpoint?.route || save.choice };
    next.checkpoint = null;
  }
  return cleanJourney(next);
}
export function chapterById(id) { return CHAPTERS.find(chapter => chapter.id === id) || null; }

export function briefFor(chapter, save) {
  if (chapter.id === 'room-for-the-view' && save.completed['tea-on-the-hill']?.cargo === 'spilled') {
    return 'Jo has packed a fresh flask in a padded box. “The tea did not survive that last climb, but Arthur stayed for the conversation. This time let us make a proper stop.” ' + chapter.brief;
  }
  return chapter.brief;
}
export function arrivalFor(chapter, save, outcome = save.completed[chapter.id]) {
  if (chapter.id === 'tea-on-the-hill') {
    const tea = outcome?.cargo === 'spilled'
      ? 'The flask is empty. Jo opens it, laughs, and shares the cold water she brought. “Next time, brake before the bend. We came for the company anyway.”'
      : outcome?.cargo === 'shaken'
        ? 'Jo catches a little tea in the saucer. “A slower entry into the bends next time.” Arthur pours what is left into the mugs.'
        : 'The flask opens with a little cloud of steam. Arthur takes the first cup and settles against Beryl’s wing. Nobody is looking at a stopwatch.';
    return tea + ' ' + chapter.arrival;
  }
  if (chapter.id === 'the-road-we-choose') return (outcome?.route === 'old-town'
    ? 'You arrive by Tasman Road. Mere has followed in the van with the last of the chairs. Your town detour has become part of the club route. '
    : 'You arrive by the riverbank road. Nora asks about the gardens on the way down. Your quieter approach has become part of the club route. ') + chapter.arrival;
  if (chapter.id === 'next-sunday') return chapter.arrival + (save.completed['the-road-we-choose']?.route === 'old-town'
    ? ' The new page includes a stop at Mere’s workshop before the beach.'
    : ' The new page follows the riverbank, with time left to look at Nora’s gardens.');
  return chapter.arrival;
}
