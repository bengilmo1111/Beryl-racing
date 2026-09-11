# Remutaka video-reference pass

## Goal

Make the Remutaka Hill Climb feel like the actual Remutaka road rather than a generic forest road.

Reference reviewed: a screen recording of real Remutaka Hill Road footage plus a full screen recording of the current Beryl level.

## What the reference says

The road's identity comes from a few strong things:

- the carriageway is carved into the hillside;
- the inboard bank is close, steep, rough and often rocky;
- the outboard edge falls away hard behind continuous silver Armco;
- exposed views alternate with enclosed cuts;
- the road is narrow and visually unforgiving;
- yellow centre markings, white edge lines, reflectors and chevrons do a lot of the visual work;
- vegetation is mostly low scrub and rough bush on the exposed sections, not a corridor of large tidy trees;
- the road visibly snakes around the hill, with the next bend sometimes readable across the slope.

## Implementation brief

### Must do

1. Reduce Remutaka tree density by roughly half. Keep enough taller vegetation to read as Wellington hill country, but stop the road reading as a forest tunnel.
2. Replace that visual mass with scrub, tussock/gorse-like low cover and more exposed rock/slip debris.
3. Move the terrain drama closer to the carriageway: tighter inboard cut, faster outboard fall-away, bigger visible vertical separation.
4. Start the outboard guardrail earlier and keep it visually continuous through exposed sections.
5. Add more curve warnings/chevrons and roadside delineation before the upper hairpins, not only at the hairpins.
6. Give Remutaka its correct road-marking character: double yellow centre line on the sealed climb, with the existing white/cream public-road edge treatment retained.
7. Add explicit exposed rock faces / cut-bank forms on the inboard side so the hill has mass at chase-camera height.

### Preserve

- Current driving physics and 2-minute-ish target run.
- Current route and summit finish.
- Bright-morning art direction; do not copy the grey weather from the reference video.
- Existing guardrail collision/gameplay behaviour (the visual pass must not create invisible new barriers).
- Deterministic scenery generation.
- Mobile performance: prefer instancing and cheap geometry.

## Acceptance check

A normal run should now produce repeated moments where the player sees:

- steep hill close on one side;
- Armco plus open air/valley on the other;
- low scrub and exposed rock rather than wall-to-wall trees;
- yellow centre markings and NZ-style roadside warnings;
- a stronger enclosed -> exposed -> enclosed rhythm.

The level should read immediately as a dangerous Wellington hill road, not a pleasant drive through a stylised forest.
