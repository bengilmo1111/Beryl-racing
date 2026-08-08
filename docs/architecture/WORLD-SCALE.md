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
project. It has seven entries below, all with the same shape, and every one up
to the sixth was found by looking at a screenshot rather than by any test.

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
   car. Fog distances are spans. Written up at the time as fixed with a
   `fogScale`; see entry 6, where it turns out that never landed.
4. **Houses.** Eastbourne's seventeen villas were a hand-written coordinate list.
   After the rescale every one of them stood about 900 m from the nearest road.
   The fingerprint faithfully reported "17 buildings" the whole time, because
   they were all still exactly where they had been put.
5. **The coast.** Eastbourne's shoreline was eleven authored coordinates, about
   20 m off Marine Drive in the world they were written for. The rescale
   multiplied the beach along with the course: 80 m of beach at the top of the
   drive, 250 m by the village. The most coastal course in the game read as a
   road through a forest, and its seawall stood in an empty paddock.
6. **Fog.** Again, and still live weeks after entry 3 was written up as fixed.
   Manfeild's `{ near: 3200, far: 9000 }` override was never converted, so a car
   doing 220 km/h had 155 m of visibility — two and a half seconds — while the
   other three courses saw 0.90 of their diagonal. Nobody noticed, including the
   person who wrote entry 3. Fog is expressed in `fogSpans` now: fractions of the
   diagonal, directly comparable with the default.
7. **The village.** Williams Park's shelter 460 m from Marine Drive, the doctors
   126 m, the school 97 m — authored points in `EASTBOURNE_LAYOUT.places`, all
   multiplied by 17 along with the gap they sat in. Found by the placement test
   below, on its first run, on a course that had just been gone over by hand.

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

There are two mechanisms, and they catch different halves of the problem.

### A number must say what kind of number it is

`src/courseSchema.js` declares every numeric path in a course definition as one
of `map`, `span`, `size`, `fraction`, `angle`, `count`, `physics` or `meta`. The
scaling pass walks the definition generically and **throws on any number that is
not declared**, naming the exact path.

That is the fix for the *silent skip*. The pass used to be a hand-written list of
field names: anything nobody remembered to add was quietly left at a seventeenth
of its proper distance, and anything wrongly on it was quietly multiplied. Both
failures are silent, which is the whole problem — a number in the wrong units
does not throw, it just puts the beach out to sea. Adding a field without
deciding what it is is now a startup error, so it fails in CI and in the first
second of every playtest.

It caught one the day it was written: `engine.cylinders`.

### And everything must be measured against what it belongs to

`npm run test:placement` checks the *result* rather than the source, in metres:

- every building within a per-kind distance of a road (a villa has street
  frontage; a farmhouse may be up a drive);
- Eastbourne's beach the authored width from its coastal road, at every sample;
- fog far distance within a sane band of the world diagonal;
- roads between 3 and 14 m wide;
- the route inside its own world, and filling a reasonable share of it.

That is the fix for the *wrong number* — scaled correctly, declared correctly,
and still 400 m from where it belongs, which no schema can see. Every occurrence
listed above would have failed it. Thresholds are deliberately loose: this is
looking for the difference between "beside the road" and "in the next paddock",
which is a factor of thirty, and a check that gets re-tuned to pass is not a
check.

It found three more the first time it ran, on a course that had just been gone
over by hand: Williams Park's shelter 460 m from Marine Drive, the doctors at
126 m, the school at 97 m.

### And still, look at it

- `npm run test:track-geometry` asserts no road folds through itself and builds
  track, terrain and structures for every course in Node, which also catches
  argument-loss bugs that both `node --check` and `vite build` pass.
- The obstacle fingerprint in `test:determinism` notices when things move, but it
  cannot tell "moved because I meant it" from "moved into a paddock".
- **Screenshots.** Every occurrence up to the sixth was found by looking at one,
  and by nothing else. The two mechanisms above are what changed that, and they
  cover the simulation's own data — they cannot see a coordinate authored inside
  a render theme, because those need a browser to build. So keep looking:
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

