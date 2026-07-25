# Ōtaki Rally — Track Art Brief

**Course:** Ōtaki Rally  
**Route:** Ōtaki Forks → farmland → Ōtaki River → railway crossing → Ōtaki township → Ōtaki Beach picnic  
**Time:** Hot summer lunchtime  
**Mood:** Fast, dusty, open and cheerful

Read with:

- `docs/ART-DIRECTION.md`
- `docs/ART-PRODUCTION.md`

---

## 1. Recognition goal

A player should recognise a compressed journey from the inland Ōtaki country to the coast: gravel farmland, river crossing, railway, town and beach.

The strongest recognition test is:

> Does this feel like racing from Ōtaki Forks through the country and town to a summer picnic at Ōtaki Beach?

The course need not follow one exact real road. Its inland-to-coast sequence, mixed surfaces and local landscape character are the key truths.

---

## 2. Visual story

The course should feel like a change of landscape as much as a race.

1. **Ōtaki Forks:** inland, green and at the edge of the hills.
2. **Farmland:** dry, open, gravelly and fast.
3. **River:** a strong geographic midpoint.
4. **Railway:** a memorable crossing and transition cue.
5. **Town:** sealed, tighter and more built-up.
6. **Beach:** bright, open and rewarding.

The art must make the gravel-to-seal transition immediately obvious.

---

## 3. Required visual anchors

### 3.1 Ōtaki Forks start

Must communicate:

- Inland start near the foothills.
- A country road leading away from bush and river country.
- Clear gravel or gravel-adjacent route character.
- Hot summer day beginning to open out.

Minimum art:

- Start marker.
- Ōtaki Forks sign or route cue.
- Hill and bush backdrop.
- Gravel road treatment.

Important text:

- Use `Ōtaki Forks` with the macron.
- Do not depend on generated text.

### 3.2 Farmland

Recognition features:

- Open paddocks.
- Fences.
- Shelter belts.
- Long gravel straights.
- Sharp 90-degree rural intersections.
- Some broad sweeping curves.

Production approach:

- Use modular fence and shelter-belt assets.
- Keep paddock textures broad and low contrast.
- Roadside grass should clearly differ from the gravel road.
- Intersections should use obvious arrow signs and fence lines to eliminate dead ends.

### 3.3 Ōtaki River crossing

This is a major geographic landmark.

Recognition features:

- Broad river character.
- Bridge or clear crossing structure.
- Riverbank vegetation.
- Strong relationship between country road and water.

Production approach:

- Prefer a modular bridge aligned to authored road geometry.
- Water and banks may be separate assets or code-drawn surfaces.
- The bridge must not create a collision mismatch or apparent gap.
- Do not place a sharp ambiguous turn immediately on the crossing.

### 3.4 Railway crossing

This is a memorable static landmark in the first release.

Required features:

- Rails crossing the road.
- Railway-crossing signs or crossbuck treatment appropriate to the visual style.
- Optional static barrier hardware.
- Clear road continuation.

First-release constraints:

- No moving train.
- No timed barrier.
- No random closure.
- No generated wording that needs to be read at speed.

The crossing may use a small bump animation or sound, but the art must remain simple and obvious.

### 3.5 Ōtaki township

Recognition features:

- Sealed road.
- Compact small-town building rhythm.
- More signs, roofs and roadside structures than the farm section.
- Clear 90-degree turns without plausible side-road dead ends.

The town should be recognisable as Ōtaki through naming, route context and local scale rather than an exact copy of every building.

Important text:

- `Ōtaki` must retain its macron.
- Key town signs should be rendered in code or controlled editing.

### 3.6 Ōtaki Beach picnic finish

This is the emotional reward.

Recognition features:

- Clear arrival at the coast.
- Beach, dunes or coastal vegetation.
- Open sky and brighter coastal palette.
- Simple picnic cue.
- Finish line that does not feel like a professional rally stage.

Possible finish art:

- Picnic rug.
- Basket or chilly bin.
- Simple table.
- Bunting or hand-painted finish board.

Animated people are not required.

Finish message:

> **Made it! Save us a spot at the picnic.**

---

## 4. Surface language

### Gravel

- Warm grey-brown base.
- Fine aggregate and dusty texture.
- Clearly distinct from sealed asphalt.
- Low enough contrast that Beryl remains readable.
- Seamless tile where repeated.
- Optional subtle dust tint around the road edge, applied separately from the base texture.

### Sealed road

- Mid-grey asphalt.
- Smoother and slightly darker than gravel.
- Clear transition zone entering town.
- Road markings used sparingly to reinforce the built-up section.

### Grass and paddocks

- Dry straw-green and ochre under high summer sun.
- Some greener bands near river and shelter belts.
- Roadside grass remains a gameplay penalty and must not resemble a driveable shoulder.

### River

- Broad, calm-to-moving water treatment.
- Grey-blue or green-blue rather than tropical turquoise.
- River stones or banks may be simplified.
- Must remain visibly separate from the road and bridge.

---

## 5. Environmental language

### Farmland

Use:

- Post-and-wire or timber fences.
- Shelter belts.
- Broad paddock shapes.
- Occasional sheds or farm structures as background landmarks.
- Open sightlines along straights.

Avoid:

- Dense crop detail that creates visual noise.
- American barns and silos as dominant imagery.
- Oversized tractors in the first release.
- Paddock shortcuts that look faster than the road.

### Town

Use:

- Modest low-rise buildings.
- Warm roofs and simple verandas.
- Controlled signage.
- Clear sealed road edges.

Avoid:

- Large modern commercial strips.
- Heavy traffic infrastructure.
- Dense urban clutter.

### Coast

Use:

- Bright beach or dune edge.
- Coastal grasses.
- Open blue sky.
- Simple picnic visual.

The finish should feel cooler and more open than the hot inland farmland, while still occurring at lunchtime.

---

## 6. Lighting and palette

Lighting:

- High summer sun.
- Short, soft-edged shadows.
- Bright visibility.
- Slight dusty or heat-haze feeling where performance allows.
- No golden-hour treatment.

Palette emphasis:

- Dry straw grass.
- Warm gravel.
- Strong sky blue.
- Dark shelter-belt green.
- Mid-grey sealed road.
- River blue-green.
- Beryl turquoise as the moving focal colour.

This track should be visibly hotter and drier than Eastbourne and Remutaka.

---

## 7. Road readability and shortcut control

- Fence lines strongly define 90-degree country intersections.
- Arrow signs appear before every major rural turn.
- Grass and paddocks must not look like valid shortcut surfaces.
- Checkpoints and collision prevent field cutting.
- Town side roads are blocked, simplified or visually de-emphasised.
- Railway tracks must not look like an alternate driveable route.
- The bridge must clearly continue the course.

There should be no plausible dead ends.

---

## 8. Initial asset inventory

### Priority 1 — route-defining

- Seamless gravel texture.
- Dry roadside grass/paddock texture.
- Rural fence segment and corner pieces.
- Shelter-belt asset.
- Large directional arrow sign.
- Ōtaki River bridge kit.
- Railway crossing kit.
- Asphalt transition treatment.

### Priority 2 — place character

- Ōtaki Forks sign structure.
- Riverbank vegetation.
- Farm shed/background building variants.
- Ōtaki town building set.
- Town sign structure.
- Beach/dune edge treatment.
- Picnic finish composition.

### Priority 3 — later decoration

- Static farm machinery.
- Parked period cars.
- Picnic visitors.
- Animals.
- Moving train.
- Additional shops and houses.
- Dust animation variants beyond the core particle effect.

Priority 3 is out of scope until mixed-surface readability and performance are proven.

---

## 9. Reference pack required

Gather references for:

- Ōtaki Forks road and landscape character.
- Typical farmland and shelter belts between the Forks and town.
- Ōtaki River crossing character.
- Local railway crossing appearance.
- Ōtaki township scale and roofline.
- Ōtaki Beach arrival and picnic context.

For each landmark, record what the core audience is expected to recognise.

Do not assume generic farm, river or town art will be sufficient merely because the course uses the name Ōtaki.

---

## 10. Macrons and sign production

Player-facing wording must use:

- Ōtaki
- Ōtaki Forks
- Ōtaki Beach
- Kāpiti, where referenced

Generate sign structures without final wording where practical. Add text in code or a controlled graphics-editing step.

Verify that the selected game font contains the required macron glyphs before sign and UI integration.

---

## 11. Do not include in the first art pass

- Moving train.
- Moving traffic.
- Animals.
- Pedestrians.
- Rally spectators.
- Professional rally banners throughout the course.
- American farm iconography.
- Dense town advertising.
- Photoreal aerial scenery.
- Driveable paddock shortcuts.
- Storm, rain or muddy-road treatment.

---

## 12. Art acceptance criteria

- [ ] The course clearly progresses from inland country to the beach.
- [ ] Ōtaki Forks, farmland, river, railway, town and beach appear in the required order.
- [ ] Gravel and sealed surfaces are immediately distinguishable.
- [ ] Farmland feels local rather than generically American or European.
- [ ] Rural intersections are obvious and have no plausible dead ends.
- [ ] The river crossing is a strong recognisable midpoint.
- [ ] The railway crossing is clear without requiring a moving train.
- [ ] Ōtaki township feels tighter and more built-up than the farm section.
- [ ] The picnic finish feels cheerful and family-oriented.
- [ ] Lighting reads as hot summer lunchtime.
- [ ] All player-facing uses of Ōtaki include the macron.
- [ ] The route remains obvious on a landscape phone.
- [ ] Beryl remains the strongest moving focal point.