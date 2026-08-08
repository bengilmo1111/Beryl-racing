# Remutaka Hill Climb — Track Art Brief

**Course:** Remutaka Hill Climb  
**Route:** Te Mārua → Remutaka Summit sign  
**Time:** Bright summer morning  
**Mood:** Fresh, energetic, determined and increasingly dramatic

Read with:

- `docs/ART-DIRECTION.md`
- `docs/ART-PRODUCTION.md`

---

## 1. Recognition goal

A player should recognise a compressed drive up the Remutaka Hill Road: broad lower roads, increasing elevation, bush-covered slopes, sweeping corners, tight summit hairpins, cliff barriers and the summit sign.

The strongest recognition test is:

> Does this feel like Beryl climbing from Te Mārua towards the Remutaka Summit rather than driving around a generic mountain racetrack?

The track is not an exact road survey. The progression from valley approach to exposed summit matters most.

---

> **Status note (3D port).** This brief predates the 3D chase-cam port, where
> the climb is now real: the road has a height profile and gravity acts along
> the slope, so Beryl visibly labours up the switchbacks and the summit run takes
> ~42% longer than the flat version did. The line below — "the art should make
> the climb visible before the physics make it felt" — has been overtaken. The
> physics make it felt already; the art's job now is to *justify* what the player
> is feeling: bush-covered slopes falling away, cliff barriers, chevrons on the
> hairpins, and a summit that reads as somewhere you earned.
>
> Also note that this brief's props assume a top-down view. From behind the car,
> anything specified as a flat overhead sprite needs re-thinking as a standing
> object.

## 2. Visual story

The art should make the climb visible before the physics make it felt.

1. **Te Mārua:** broad, open and approachable.
2. **Lower climb:** bush closes in and the road begins rising.
3. **Main hill:** longer views reveal height and distance travelled.
4. **Summit hairpins:** road, barriers and terrain become tighter and more dramatic.
5. **Final charge:** the summit sign becomes a clear visual goal.

Beryl should appear small but determined against the landscape without becoming visually lost.

---

## 3. Required visual anchors

### 3.1 Te Mārua start

Must communicate:

- The foot of the hill.
- A broad road leaving a semi-rural Upper Hutt setting.
- Bush and hills ahead.
- A bright, optimistic beginning.

Minimum art:

- Start marker.
- Lower-road verge treatment.
- Direction sign towards Remutaka.
- Early hill silhouettes.

Do not make the start feel like a race paddock or mountain summit.

### 3.2 Increasing elevation

Elevation must be communicated through:

- Layered slopes.
- Road sections visible below or across valleys where practical.
- Increasing cliff and drop-off cues.
- Distant ridges.
- Changing roadside vegetation density.
- More exposed sky near the summit.

Avoid relying only on the physics or engine sound. The player should see that Beryl is climbing.

### 3.3 Sweeping hill road

Recognition features:

- Broad curves carved into bush-covered slopes.
- Metal or timber road barriers on exposed edges.
- Retaining cuts or rocky banks on the uphill side.
- Clear contrast between road, cliff edge and hillside.

The road should still read clearly at speed and on mobile.

### 3.4 Summit hairpins

This is the most dramatic and technical visual section.

Required features:

- Tight bends.
- Strong advance arrows.
- Barrier-lined outer edges.
- Steep inside banks.
- Visible change in elevation between nearby road segments.

The composition must not make overlapping road sections appear connected when they are at different heights.

### 3.5 Cliff barriers

Barriers are a visual and gameplay requirement.

They must:

- Form an unbroken safety edge where the player could otherwise leave a cliff.
- Match collision closely.
- Be visible before the corner.
- Repeat without obvious seams or snag points.
- Feel like road infrastructure, not racetrack tyre walls.

Possible assets:

- Metal guardrail segment.
- End cap.
- Corner-cap or flexible repeated segment.
- Reflector post.

### 3.6 Remutaka Summit sign

This is the essential finish landmark.

Recognition features:

- Clear summit identity.
- Strong readable silhouette.
- Position that feels like an arrival point.
- Enough space for Beryl and the finish line.

Production approach:

- Generate or draw the sign structure without final wording where practical.
- Add `REMUTAKA SUMMIT` through controlled editing or code.
- Make the sign visible before the finish without dominating the entire final section.

Finish message:

> **We made it. Hope the brakes work on the way down.**

---

## 4. Environmental language

### Bush

Use:

- Dense lower-North-Island bush masses.
- Mixed rounded and irregular canopy shapes.
- Deep greens with bright morning highlights.
- Layered vegetation along road cuts.

Avoid:

- Alpine pine forest as the dominant look.
- Tropical foliage.
- Individually detailed leaves.
- Trees that obscure barriers or the next corner.

### Slopes and rock cuts

- Simplified rock and soil textures.
- Warm grey and brown rather than dramatic fantasy cliffs.
- Clear uphill bank versus downhill drop.
- Low visual detail near the racing line.

### Distant landscape

- Layered ridges.
- Blue-green atmospheric depth.
- Clear morning visibility.
- Broad valley views used as rewards between technical sections.

### Road furniture

Use a restrained set of:

- Guardrails.
- Reflector posts.
- Chevron arrows.
- Simple route signs.
- Retaining structures.

Do not cover the course in formal motorsport barriers, banners or grandstands.

---

## 5. Lighting and palette

Lighting:

- Bright summer morning.
- Clear, crisp visibility.
- Soft directional shadows.
- Fresh highlights on bush and barriers.
- No fog, rain or moody storm treatment in the first release.

Palette emphasis:

- Clear sky blue.
- Fresh bush green.
- Pale asphalt grey.
- Warm rock and soil.
- Bright barrier highlights.
- Beryl turquoise remaining distinct from sky and vegetation.

The track must look cooler and fresher than Eastbourne’s late-afternoon warmth and Ōtaki’s hot midday dust.

---

## 6. Road and elevation readability

- The current road segment must be visually dominant over distant road sections.
- Barriers and banks define road edges.
- Hairpin arrows appear early enough for inexperienced players.
- Distant scenery must not resemble alternate driveable routes.
- Cliff gaps are never visually plausible.
- The summit sign and final road remain visually connected.

Where road segments overlap in screen space, use:

- Height separation.
- Shadows.
- Banks.
- Vegetation.
- Barrier orientation.

Do not use confusing bridge-like overlaps unless the geometry genuinely supports them.

---

## 7. Initial asset inventory

### Priority 1 — route-defining

- Hill asphalt treatment.
- Metal guardrail set.
- Retaining-bank texture or modular edge.
- Hairpin chevron sign.
- Reflector post.
- Summit sign structure.
- Bush canopy variants.

### Priority 2 — place character

- Te Mārua roadside sign or start cue.
- Rock-cut variants.
- Distant ridge layers.
- Valley-floor texture.
- Additional native tree and scrub variants.
- Summit parking/arrival ground treatment.

### Priority 3 — later decoration

- Static lookout visitors.
- Parked period cars.
- Historical roadside detail.
- Wind-blown vegetation animation.
- Small summit structures.
- Distant vehicles.

Priority 3 is out of scope until route clarity, barriers and performance are proven.

---

## 8. Reference pack required

Gather references for:

- Te Mārua approach character.
- Typical lower Remutaka road, vegetation and barriers.
- Recognisable hill-road sweepers and hairpins.
- Summit sign shape, wording and arrival context.
- Valley and ridge views that distinguish the Remutaka setting.

For the summit sign, record:

- Exact wording to display.
- Sign colours.
- Sign support shape.
- Relationship to road and parking area.

Do not allow an image generator to invent the final sign text.

---

## 9. Beryl-specific presentation

The environment should amplify Beryl’s plucky character:

- The hill looks substantial but not threatening.
- Beryl’s body lean is especially visible in hairpins.
- Bright road and barrier values keep her turquoise body distinct.
- Open views provide occasional compositions where her small classic-car shape reads against the landscape.
- The final sign should frame Beryl’s arrival rather than hide her.

Do not make the course so epic or dangerous that Beryl’s comic, family-friendly tone feels inappropriate.

---

## 10. Do not include in the first art pass

- Weather changes.
- Fog.
- Rain.
- Falling rocks.
- Open cliff gaps.
- Moving traffic.
- Spectators.
- Motorsport grandstands.
- Dramatic alpine snow.
- Dense warning-sign clutter.
- Photoreal aerial terrain.

---

## 11. Art acceptance criteria

- [ ] The course reads as a climb from a lower valley approach to a summit.
- [ ] Te Mārua feels broad and lower in elevation than later sections.
- [ ] Bush-covered slopes feel characteristic of the lower North Island.
- [ ] Sweepers, hairpins, barriers and road cuts create clear visual progression.
- [ ] Cliff edges are continuously and visibly protected.
- [ ] Different-height road sections are not visually confusing.
- [ ] The Remutaka Summit sign is readable and recognisable.
- [ ] Lighting reads as a bright summer morning.
- [ ] The route remains obvious on a landscape phone.
- [ ] Beryl remains visible against road, sky and vegetation.
- [ ] The art feels like a real New Zealand hill road remembered affectionately, not a generic mountain racing circuit.