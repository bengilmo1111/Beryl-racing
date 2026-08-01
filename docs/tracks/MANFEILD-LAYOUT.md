# Manfeild Circuit — layout note

**Course:** Manfeild Circuit (`manfield`)
**Source:** MotorSport New Zealand, *Manfeild Circuit Chris Amon* CRO map, ref
`CRO004d` — <https://motorsport.org.nz/wp-content/uploads/CRO004d_Manfeild_CRO_Map.pdf>

Unlike the other courses, this one is not a caricature. The centreline in
`src/tracks.js` is the real circuit, traced from the official map, so the
sequence of corners you drive is the sequence on the map.

---

## 1. What the map gives us

| From the map | In the game |
|---|---|
| 3.03 km lap | 12,352 world units as authored — ≈0.25 m per unit, ≈0.12 m once `LENGTH_SCALE` has doubled it |
| Clockwise | Anchor order runs clockwise, as the map's arrow does |
| Start/finish line | Anchor 0 / checkpoint 0, at its mapped position on the main straight |
| Marshal posts 1–8 | The eight `landmarks` signs, at their mapped positions |
| 59 South Street, Feilding | Flavour only — the address is not in-game |

The map's red-flag and safety-car control lines have no gameplay meaning here,
so they are not modelled. They sit at world x ≈ 2301 and x ≈ 2543 (pre-scale)
if a use for them ever turns up.

Manfeild is flat, so the course carries no `elevation` block — the same reason
it always has.

## 2. How the trace was done

The map's track outline is a bitmap inside the PDF, not vector art, so the
centreline was recovered from the image rather than read out of the file:

1. Take the ribbon's pixels (the image plus its soft mask).
2. Flood-fill from the page border to separate *outside* from the loop's
   *inside*.
3. Distance-transform from both, and keep the pixels closer to the inside. The
   boundary of that region is the centreline — this is width-independent, so a
   ribbon that thickens or thins does not pull the line off centre.
4. Trace that boundary, resample it, and place anchors on a budget that mixes
   arc length with heading change, so corners get anchors and straights don't.

46 anchors carry the lap with a maximum deviation of ~6.5 px from the traced
line — about **1.5 m** at true scale, on a road 12 m wide.

## 3. Where it is deliberately not real

- **Road width.** 180 units is ≈ 22 m, not the real ~12 m. This is still a
  drifting game and the extra room is the point. It is narrower than the old
  invented oval's 300, which the real layout's tight corners could not take:
  a 300-wide road pinches through the tightest bend.
- **Speed.** Beryl's handling numbers are unchanged from the old course, so a
  lap is around 20 s rather than the couple of minutes a real Morris Minor
  would need.
- **Everything above the tarmac.** Grandstands, pit buildings, the Higgins
  bridge and the rest of the venue are not modelled. The CRO map does not show
  them either.

## 4. If the layout is re-traced

`numCheckpoints` is 18, not the 6 the invented oval used. The playtest waypoint
bot steers straight at the next checkpoint, and on a layout that doubles back on
itself twice, gates further apart than this leave a straight line between them
that crosses the infield instead of the road. `playtest-spec.json` carries the
matching `checkpointsTotal` and the lap-time window, and both need re-recording
if the geometry moves.
