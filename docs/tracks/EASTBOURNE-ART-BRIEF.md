# Eastbourne Pootle — Track Art Brief

**Course:** Eastbourne Pootle  
**Route:** Ferry Road → Days Bay Wharf → Days Bay Beach → Eastbourne shops → Eastbourne Beach → Eastbourne RSA  
**Time:** Warm late afternoon  
**Mood:** Breezy, familiar, relaxed and gently celebratory

Read with:

- `docs/ART-DIRECTION.md`
- `docs/ART-PRODUCTION.md`

---

## 1. Recognition goal

A player who knows Eastbourne and Days Bay should recognise the course from its broad coastal geography, landmark order and atmosphere without expecting an exact aerial map.

The strongest recognition test is:

> Does this feel like driving along the Eastbourne waterfront from Days Bay towards the RSA?

Recognition depends more on the relationship between harbour, road, bush-covered hills and landmark sequence than on exact building dimensions.

---

## 2. Visual story

The course begins with open coastal promise on Ferry Road, settles into long waterfront bends around Days Bay, tightens through the Eastbourne shops, opens briefly beside Eastbourne Beach, then becomes technical again near the RSA.

The art should support that rhythm:

1. **Open and scenic** at the start.
2. **Harbour-focused and flowing** through Days Bay.
3. **More enclosed and detailed** through the shops.
4. **Open coastal relief** beside Eastbourne Beach.
5. **Clear community destination** at the RSA.

---

## 3. Required visual anchors

### 3.1 Ferry Road start

Must communicate:

- A local coastal-road starting point rather than a formal racetrack.
- Clear direction towards Days Bay.
- Harbour and hillside context beginning to appear.

Minimum art:

- Simple start marker or banner.
- Coastal roadside treatment.
- Directional signage.
- Warm late-afternoon light.

Do not overbuild the start area. Players should begin moving quickly.

### 3.2 Days Bay Wharf

This is the strongest course landmark.

Recognition features:

- Long wharf projecting into the harbour.
- Visible relationship between wharf, beach and road.
- Simple shelter or structure cues where useful.
- Large enough to read clearly from the driving camera.

Production approach:

- Prefer a modular or standalone transparent landmark positioned outside the drivable road.
- The wharf may extend over water but must not create a false driveable route.
- Any sign wording should be added separately, not generated into the sprite.

### 3.3 Days Bay Beach

Recognition features:

- Curving shoreline.
- Beach beside the road.
- Harbour water.
- Bush and established coastal vegetation.

Gameplay rule:

- The beach and water are visible but unreachable.
- Barriers, walls, vegetation or road geometry must clearly prevent access.

### 3.4 Eastbourne shops

This is the main built-up and technical section.

Recognition features:

- A compact village shopping strip.
- Modest low-rise buildings.
- Clear shopfront rhythm without dense modern advertising.
- A visibly narrower and more enclosed street character.

Production approach:

- Prefer a small modular building set over one giant baked streetscape.
- Use roof shapes, awnings and a restrained set of signs to imply the shops.
- Side roads should be visually closed, simplified or de-emphasised.

### 3.5 Eastbourne Beach

Recognition features:

- Return to an open coastal view.
- Beach and harbour visible beside the road.
- Distinct from Days Bay through surrounding road shape and village context rather than a completely different art style.

### 3.6 Eastbourne RSA

This is the finish anchor.

Recognition features:

- Community-building character.
- Clearly readable destination.
- A sign or finish treatment identifying the RSA.
- Enough surrounding space for the finish line and results moment.

Important text:

- Generate the building/sign structure separately from the final words.
- Add `EASTBOURNE RSA` through code or controlled editing.

Finish tone:

- Small-scale celebration.
- Bunting, a finish board or warm UI flourish is appropriate.
- A crowd is not required.

Finish message:

> **Phew! Just in time for a beer.**

---

## 4. Environmental language

### Harbour

- Calm blue water.
- Warm late-afternoon reflections.
- Low visual contrast so it does not compete with the road.
- Shoreline must remain visually distinct.

### Hills

- Bush-covered hills rise inland.
- Broad layered green masses.
- Avoid tropical jungle shapes.
- Use enough height and density to give Eastbourne its enclosed coastal-valley character.

### Vegetation

Preferred:

- Pōhutukawa and mature coastal trees.
- Native-looking rounded canopy variants.
- Small areas of lawn and planted verge.

Avoid:

- Palm-tree resort imagery.
- Uniform suburban ornamental trees.
- Dense vegetation that hides road edges.

### Roadside structures

Use a restrained set of:

- Coastal barriers.
- Retaining walls.
- Simple fences.
- Period-inspired direction signs.
- Modest homes or sheds as background silhouettes.

---

## 5. Lighting and palette

Lighting:

- Warm late-afternoon sun.
- Soft long shadows directed consistently.
- Golden highlights on roofs, road edges and Beryl’s chrome.
- No sunset darkness; visibility must remain excellent.

Palette emphasis:

- Harbour blue.
- Warm cream.
- Deep coastal green.
- Faded red accents.
- Sun-warmed asphalt grey.
- Beryl turquoise as the strongest moving colour.

---

## 6. Road readability

- The coastal route must always appear to continue forward.
- Harbour barriers create a strong outer edge.
- Inland buildings, walls or vegetation create the opposite edge.
- Tight shop turns use large advance arrows.
- The RSA approach must not be confused with side streets or car parks.
- Decorative beach access paths must not look driveable.

No dead ends should be visually plausible.

---

## 7. Initial asset inventory

### Priority 1 — route-defining

- Coastal asphalt texture or treatment.
- Harbour-edge barrier set.
- Inland retaining wall or verge set.
- Large directional arrow sign.
- Days Bay Wharf landmark.
- Eastbourne shops modular set.
- Eastbourne RSA landmark/sign.

### Priority 2 — place character

- Pōhutukawa variant.
- Native coastal tree variants.
- Beach edge treatment.
- Harbour-water treatment.
- Coastal house/building background variants.
- Days Bay roadside sign.
- Eastbourne roadside sign.

### Priority 3 — later decoration

- Static ferry.
- Parked period cars.
- Picnic tables.
- Beachgoers or swimmers.
- People outside shops.
- Additional residential detail.

Priority 3 is out of scope until the course is readable and performant.

---

## 8. Reference pack required

Before producing the three major landmarks, gather references for:

- Days Bay Wharf from the road and from above/side.
- The Eastbourne shopping area’s recognisable roofline and street relationship.
- Eastbourne RSA facade, sign and road approach.
- General Ferry Road/Days Bay coastal road character.

For each landmark, record which two or three features the user’s father and children are expected to recognise.

---

## 9. Do not include in the first art pass

- Moving ferry.
- Moving traffic.
- Pedestrians.
- Beach access for Beryl.
- Dense modern signs.
- Exact recreation of every shop.
- Photoreal water.
- Crowded finish event.
- Racing-circuit tyre walls along the entire route.

This is a public coastal road transformed into a time trial, not a purpose-built circuit.

---

## 10. Art acceptance criteria

- [ ] Days Bay Wharf is immediately identifiable.
- [ ] Harbour, road and bush-covered hills have the correct broad relationship.
- [ ] The landmark order reads correctly while driving.
- [ ] The shops feel tighter and more enclosed than the waterfront sections.
- [ ] Eastbourne RSA is a clear finish destination.
- [ ] Beaches and water are visible but not apparently driveable.
- [ ] Lighting reads as warm late afternoon.
- [ ] The route remains obvious on a landscape phone.
- [ ] Beryl remains the strongest focal point.
- [ ] The art feels like a remembered New Zealand summer, not a generic seaside town.