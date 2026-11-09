# The Sunday run

A six-chapter story for Beryl, centred on Ōtaki and Remutaka. Nora, Jo, Arthur
and Mere turn a delivery of seedlings into a revived Sunday club run. The route
book remembers conversations, the road chosen for the final delivery and how
the flask fared on the hill. The existing courses remain freely available.

The design hypothesis is that familiar people, new purposes for familiar roads
and an unfinished conversation give players a reason to return. This is not yet
player evidence of retention. The first story is finite: six roughly 2–4-minute
drives, with chapter revisits, not an endless or calendar-gated campaign.

## Three implemented rounds

1. **Connect the drives.** Added a route book, six briefings and arrivals, ordered
   story progression and browser-local persistence. Browser checks covered the
   title → briefing → race → arrival → next chapter after reload, including
   keyboard activation without accidentally starting a free drive.
2. **Make the driving different.** Added a real itinerary through Ōtaki’s
   Rāhui/Mill/Tasman branch, a flask sensitive to rough ground, hard cornering
   and contact, and a Remutaka delivery that requires stopping in the paved
   summit meeting area. The road itself cannot satisfy the parking task.
   Testing exposed the old physics field acting as a slope in the flat car park;
   story parking now uses that paved surface. A dedicated arrival view keeps
   Beryl and the meeting ring visible. The old-town route is a different route,
   not necessarily a longer one; the briefing was corrected after measuring it.
3. **Let the book remember.** Added an actual route choice, later dialogue and
   a finale responding to earlier outcomes, readable completed pages, chapter
   revisits that preserve the original story, and continuation from a safe route
   gate with cargo condition intact. Saved gates survive reload and returning to
   the chooser. Added keyboard focus containment, visible actions on short
   landscape screens, and honest session-only status if storage is denied.

## Chapters

| Chapter | Course / task | Story development |
|---|---|---|
| The first box | Ōtaki, riverbank route | Nora’s seedlings bring Jo’s garden idea into the open |
| Tea on the hill | Remutaka, careful flask delivery and parking | Arthur opens the old route book; the conversation reflects the tea’s condition |
| A place at the table | Ōtaki, required old-town branch | Mere is finally invited rather than driven past |
| Room for the view | Remutaka, summit meeting | The flask’s previous fate changes the briefing; the club starts looking beyond times |
| The road we choose | Ōtaki, riverbank or old-town itinerary | The selected road becomes part of the club route |
| Next Sunday | Remutaka, return to the meeting point | The finale remembers the selected Ōtaki route and leaves the group planning together |

There is no deadline in story mode. The main panel shows distance to the
arrival, not a time to beat. A spilled flask changes the scene rather than
blocking a chapter. Progress and best times use separate keys. Replaying a page
cannot erase a later saved drive or silently rewrite the first outcome.

## Implementation boundaries

`src/journey/story.js` owns authored chapters, validated versioned saves and
narrative callbacks. `drive.js` owns story-only itineraries and driving state;
`race.js` integrates these with the race. Original track checkpoints stay
unchanged because river and railway scenery read their indices. Story branches
use existing road meshes and surfaces; no new road is invented by the UI.

Continuations save a completed route gate rather than an arbitrary position.
Beryl starts stationary on that road with the saved route, elapsed time and
cargo state. Pauses do not consume cargo or drive time. Completed and paused
chapters are stored in this browser; there is no account or cross-device sync.

The new parking camera and flat-pavement grade apply only to story drives.
Story arrivals settle Beryl instead of letting her coast away behind the page.
The earlier Ōtaki recognition and Remutaka sign changes in this workspace are
preserved.

## Verification

- `npm run build`
- `npm run test:story`: ordered progression, save validation, denied storage,
  revisit safety, branch paths, stopped delivery, cargo and later callbacks.
- `npm run test:journey`: actual DOM navigation, keyboard controls, reload,
  continuation with the saved route/cargo, phone route selection and action
  visibility, narrative arrival, time-trial isolation and return to free drive.
  Includes a browser denying all localStorage access.
- `npm run test:journey-driving`: full automated drives and completed saves for
  all six chapters; required town branch visited and hill delivery stopped for
  two seconds. Seed 780385. The controller deliberately brakes early to park;
  these runs are completion checks, not evidence of player enjoyment.
- Course-art, track-geometry and Remutaka barrier/summit checks pass.
- An isolated `3cc5182` source copy and the working code were driven in the same
  local Chrome, seed 780385. All four ordinary courses have exactly matching
  finish times, final positions, gate counts and obstacle fingerprints:
  Eastbourne 69650 ms; Manfeild 52716.666667 ms; Ōtaki 141066.666667 ms;
  Remutaka 151350 ms. No pinned baseline was regenerated. This comparison is
  distinct from the pinned determinism suite, which previously stopped on a
  roughly 5e-9-unit Eastbourne position difference in this Chrome environment.

Artifacts are under `playtest-out/journey/` (ignored by Git). Production was
inspected directly before implementation; the full chapter evidence here was
collected locally before release.

Next player review: do the conversations make you want the next drive; does
choosing a road feel worthwhile; does the flask encourage a satisfying slower
climb? Test those before expanding the cast or writing another season.
