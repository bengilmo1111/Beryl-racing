# World scale, and the bug that keeps coming back

There is one statement of how big the world is, in `src/scale.js`:

```js
export const UNITS_PER_METRE = 57.9;
```

It is derived, not chosen: Beryl's model is 217.6 units long and a Morris Minor
1000 is 3,759 mm. Everything else follows from it. `metres()`, `kmhToUnits()` and
`unitsToKmh()` are there so that no other file has to know the number.

## The rule

> **A number that is a *point on a map* scales with the map.
> A number that is the *size of a thing* does not.
> A number that is a *span* does.**

- A house at `x: 2340` is a point. Rescale the world and it must move.
- A house that is 190 units wide is a size. Rescale the world and it stays 190
  units wide, because a house is still a house.
- A tree standing 105 m back from the road is a span. It scales, because
  `metres(105)` is the same distance in a bigger world.

Getting these confused is the single most productive source of bugs in this
project. It has five entries in `progress.md`, all with the same shape and all
found by looking at a screenshot rather than by any test.

## How it goes wrong

The occurrences so far, and the door each came in by:

1. **The original fault.** The courses were authored roughly ten times too small
   for the car. Beryl did 10–13 km/h on three of the four, and on those three the
   corners were tighter than half the road width — so `buildEdges`' offset crossed
   itself and the tarmac folded through itself. Three separate complaints, one
   cause.
2. **Render themes.** `themes/otaki.js` and `themes/eastbourne.js` carried their
   own authored coordinate lists. `src/tracks.js` rescaled the route; nothing
   rescaled a literal sitting in a different file. Fixed with a per-file
   `AUTHORED` size and `px`/`pz` mappers.
3. **Fog.** Manfeild's `{ near: 3200, far: 9000 }` was tuned at a world diagonal
   of 16,511. At 57,790 the same numbers put a white wall 155 m in front of the
   car. Fog distances are spans; they get a `fogScale`.
4. **Houses.** Eastbourne's seventeen villas were a hand-written coordinate list.
   After the rescale every one of them stood about 900 m from the nearest road.
   The fingerprint faithfully reported "17 buildings" the whole time, because
   they were all still exactly where they had been put.
5. **The coast.** Eastbourne's shoreline was eleven authored coordinates, about
   20 m off Marine Drive in the world they were written for. The rescale
   multiplied the beach along with the course: 80 m of beach at the top of the
   drive, 250 m by the village. The most coastal course in the game read as a
   road through a forest, and its seawall stood in an empty paddock.

Note the pattern: every fix moved the numbers, and the *next* occurrence was
always somewhere the previous fix had not looked. Rescaling harder is not the
answer.

The fifth is the clearest statement of the rule the whole document exists for.
The route's *length* needed multiplying — that was the point of the rescale. The
*beach* did not, because a beach is 20 m wide in any world. One number in the
same file needed scaling and the one beside it did not, and nothing in a list of
coordinates can tell you which is which.

## What to do instead

**Prefer positions that cannot go stale.** The fix for the houses was not to
rescale the list — it was to delete the list. `housesAlong()` walks the
centreline by arc length and sets buildings back from it by a frontage in metres.
There is no coordinate to get out of date because there are no coordinates. The
same idea is why the Ōtaki station hangs off the rail crossing rather than an
authored point, and why the Manfeild grandstand is a fraction of a lap.

In order of preference:

1. **Route-relative** — a fraction along the centreline plus an offset in metres.
   Immune by construction.
2. **World-relative** — a fraction of `world.width` / `world.height`. Survives a
   rescale, but not a change of aspect ratio.
3. **An authored list with an explicit `AUTHORED` world size and a mapper.** Use
   when the shape genuinely is hand-drawn. Never write raw coordinates without
   one.

**Sizes go through `metres()`, not through a mapper.** A shop is 6 m deep in any
world. `metres(22)` for a section frontage; never `22 * 57.9`, which is the
constant escaping `scale.js` again.

## Anything you can see, you must be able to hit

A related fault with the same root: Ōtaki's town used to be eleven boxes drawn
directly in `themes/otaki.js`. They were render-only, so you drove through them,
*and* they were authored coordinates, so they were in the wrong place. Both
symptoms, one mistake — a building whose position lives in the render layer is a
building the simulation has never heard of.

`src/structures.js` owns every solid building. Themes read from it and draw. The
thing you see and the thing you collide with are the same object by construction,
which also means the obstacle fingerprint notices when either one moves.

## What catches it

Not much, honestly, which is why this document exists.

- `npm run test:track-geometry` asserts no road folds through itself (minimum
  corner radius ≥ 1.5× that road's half-width) and builds track, terrain and
  structures for every course in Node. It catches the *consequences* of a bad
  scale on the route, and it catches argument-loss bugs that both `node --check`
  and `vite build` pass.
- The obstacle fingerprint in `test:determinism` notices when things move, but it
  cannot tell "moved because I meant it" from "moved into a paddock".
- **Screenshots.** Every occurrence so far was found by looking at one, and by
  nothing else. That remains the only reliable detector, so look —
  `npm run shots -- eastbourne-dash:3000` takes seconds.

## One footgun while you are in here

`buildTrack()` takes **no arguments**. It reads a module-level `TRACK` that
`applyTrack(def)` sets first — see `playtest/track-geometry.mjs`, which does it
correctly.

So `buildTrack(def)` compiles, runs, and returns a perfectly good track *for
whichever course was selected last*. A quick script written to count Ōtaki's
buildings reported 97 when the real figure was 74, because it had silently
measured Eastbourne. Count from the running game, or call `applyTrack(def)`
first.

