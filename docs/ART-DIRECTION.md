# Beryl Racing — Art Direction

**Status:** Shared visual source of truth  
**Applies to:** Beryl, all tracks, menus, HUD, landmarks and environment art

---

## 1. Visual north star

**Beryl Racing should look like a fondly remembered New Zealand summer holiday starring a beloved old car.**

The game is not a realistic driving simulator and it is not a generic cartoon racer. Its visual identity comes from three things working together:

1. **Beryl is the hero:** a recognisable turquoise 1960s Morris Minor with a plucky personality.
2. **The places are real:** Eastbourne, Days Bay, the Remutaka Hill Road and Ōtaki must be recognisable in broad geographic strokes.
3. **The world feels timeless:** modern clutter is reduced and the whole game is suffused with warm, affectionate 1960s New Zealand summer nostalgia.

The intended audience includes a 75-year-old and seven-year-old children. Readability, charm and immediate recognition matter more than visual complexity.

---

## 2. Core art principles

### 2.1 Recognition before detail

At gameplay scale, the player must instantly recognise:

- Beryl.
- The road and its boundaries.
- The direction of travel.
- Major landmarks.
- Surface changes.
- Barriers and collision objects.

Small decorative details are secondary. Do not add texture or props that make the road harder to read.

### 2.2 Caricature, not distortion

Everything may be simplified and gently exaggerated, but should preserve its identity.

Good exaggeration includes:

- Beryl being slightly squatter, rounder and more expressive.
- Hills being steeper and corners more dramatic.
- Landmarks being larger and clearer than real life.
- Distances being compressed.
- Road signs being easier to read.

Bad exaggeration includes:

- Turning Beryl into a generic cartoon bubble car.
- Making buildings unrecognisable.
- Using impossible geography that breaks the route’s identity.
- Adding fantasy scenery that overwhelms the real place.

### 2.3 Broad geographic truth

Tracks are not GPS reconstructions. They should be recognisable through:

- Correct place names.
- Broadly correct landmark order.
- Characteristic terrain and vegetation.
- The correct relationship between road, coast, hills, town and countryside.
- A few strong visual anchors.

Distances, road widths and minor intersections may be simplified to create a clear two-minute course.

### 2.4 Warm, handmade and family-made

The game should feel crafted with affection rather than manufactured as a polished commercial racing product.

Use:

- Bold, clean silhouettes.
- Gentle texture.
- Slightly softened shapes.
- Warm, friendly typography.
- Simple, confident compositions.
- Small humorous touches where they do not obstruct play.

Avoid:

- Sterile photorealism.
- Hyper-detailed simulation art.
- Aggressive motorsport branding.
- Glossy mobile-game reward clutter.
- Neon sci-fi effects.
- Generic American roadside scenery.

---

## 3. Beryl: the hero specification

Beryl must always be recognisable as a **turquoise 1960s Morris Minor 1000**.

### 3.1 Non-negotiable identity features

- Rounded Morris Minor silhouette.
- Turquoise/light-teal body.
- Curved bonnet and roof.
- Round headlights.
- Chrome front and rear bumpers.
- Dark front and rear glass.
- Whitewall tyres with chrome hubcaps.
- Thin red side pinstripe where visible.
- Small red rear lights.

The real Beryl photograph in `public/assets/beryl-photo.png` is the primary identity reference.

### 3.2 Gameplay silhouette

- Strict top-down or near-orthographic top-down view.
- Nose points straight up in the source sprite.
- Long axis perfectly vertical.
- No three-quarter perspective.
- No baked road or scenery.
- Transparent background.
- Strong readable silhouette at approximately 90 px tall.
- Enough transparent padding for rotation and body lean.

### 3.3 Character through motion

Beryl is a plucky underdog. Her personality should come mostly through motion and sound, not facial features.

Essential behaviours:

- Noticeable body lean through corners.
- Engine effort that rises with speed and hill load.
- Tyre screech near the grip limit.
- Mild wobble or slide when pushed.
- Bouncy, non-destructive barrier collisions.

Do not add cartoon eyes, a mouth or anthropomorphic facial expressions unless the product direction is explicitly changed later.

### 3.4 Surface and lighting

- Body colour remains clearly turquoise in every track.
- Chrome receives simple bright highlights.
- Shading is clean and game-readable rather than photoreal.
- Avoid reflections that turn the car white, blue-grey or metallic silver.
- Beryl must remain visually dominant over the road beneath her.

---

## 4. Camera and perspective

### 4.1 World perspective

Gameplay uses a top-down or slightly elevated top-down presentation.

All authored assets must share a consistent camera language:

- Props: directly overhead or only minimally tilted.
- Buildings and landmarks: simplified top-down footprints with enough visible roof and facade cues to be recognisable.
- Trees: overhead canopy with a centred contact shadow.
- Vehicles: strict top-down.
- Signs: may be slightly tilted towards the camera when readability requires it, but their bases must still sit convincingly in the top-down world.

Do not mix isometric, side-view and top-down assets in the same scene.

### 4.2 Shadows

- Use soft, restrained shadows.
- Prop shadows should remain close to the object.
- Shadows must be directionally consistent within each track.
- Seamless textures must not contain directional shadows.
- Avoid long opaque shadows that obscure the racing line.

---

## 5. Shared palette and material language

The palette should be warm, slightly faded and cheerful.

### 5.1 Shared colours

Use these as guides, not absolute locks:

- Beryl turquoise: `#2EC4D6`
- Beryl highlight: `#63D6E4`
- Chrome: `#D8DEE2`
- Pinstripe red: `#E84A5F`
- Asphalt: mid-grey around `#53585F`
- Healthy grass: warm greens around `#67B85A`
- Dry summer grass: straw-green and ochre
- Gravel: warm grey-brown rather than cold concrete grey
- UI ink: deep charcoal rather than pure black
- UI cream: warm off-white rather than clinical white

### 5.2 Roads

Roads must be immediately distinguishable from the verge.

- Asphalt is low-contrast and subtly textured.
- Gravel has a warmer, looser texture with visible aggregate at close scale.
- Kerbs and edge markings are bold enough to guide driving.
- Road markings are simplified and used only where they improve recognition.
- Surface texture must never compete with Beryl or navigation arrows.

### 5.3 Vegetation

Vegetation should feel like the lower North Island:

- Bush-covered hills.
- Coastal pōhutukawa where appropriate.
- Shelter belts and farm trees around Ōtaki.
- Mixed native-looking canopy shapes rather than uniform ornamental trees.

Use broad readable masses. Avoid highly detailed individual leaves.

### 5.4 Buildings

Buildings should be:

- Simplified.
- Slightly enlarged when they are landmarks.
- Recognisable through roof shape, signage, position and surrounding context.
- Free of unnecessary modern advertising clutter.

Where a real building is essential, likeness matters more than architectural precision.

---

## 6. Timeless 1960s New Zealand summer

This is an emotional treatment rather than strict period reconstruction.

### Include

- Warm sun.
- Slightly faded print-like colours.
- Simple hand-painted road signs.
- Modest shops and community buildings.
- Beaches, bush, farmland and picnic imagery.
- Period-inspired display type.
- Restrained chrome and check patterns.
- A sense of open roads and uncluttered places.

### Reduce or omit

- Dense modern traffic furniture.
- Large contemporary billboards.
- Modern SUVs as dominant scenery.
- Complex road engineering detail.
- Contemporary corporate branding.
- Excessive lane markings.
- Smartphone-era visual language.

Do not falsely present the tracks as exact historical reconstructions. They are current places viewed through nostalgic memory.

---

## 7. Track-specific visual identities

### 7.1 Eastbourne Pootle

**Mood:** breezy, warm, coastal and relaxed  
**Time:** late afternoon  
**Key colours:** harbour blue, warm cream, pōhutukawa green, golden sunlight

Required anchors:

- Ferry Road start.
- Days Bay Wharf.
- Days Bay Beach.
- Eastbourne shops.
- Eastbourne Beach.
- Eastbourne RSA finish.
- Harbour on the correct broad side of the route.
- Bush-covered hills inland.

Visual rhythm:

- Open harbour views on long bends.
- More enclosed village composition through the shops.
- A clear community-building finish at the RSA.

The player must not be able to drive onto the beach or into the harbour.

### 7.2 Remutaka Hill Climb

**Mood:** fresh, energetic, determined and increasingly dramatic  
**Time:** bright morning  
**Key colours:** clear sky blue, fresh bush green, pale road grey, bright barrier highlights

Required anchors:

- Te Mārua starting character.
- Bush and hill country.
- Increasing elevation.
- Long sweepers and tight hairpins.
- Barrier-lined cliff sections.
- Remutaka Summit sign.

Visual rhythm:

- Broad, open lower road.
- Increasingly compressed corners and steeper terrain.
- Expanding valley views.
- A visible summit-sign goal.

The road edge must always read as safe and physically contained.

### 7.3 Ōtaki Rally

**Mood:** hot, dusty, fast and cheerful  
**Time:** summer lunchtime  
**Key colours:** dry straw grass, warm gravel, strong sky blue, dark shelter-belt green

Required anchors:

- Ōtaki Forks start.
- Gravel farmland.
- Ōtaki River crossing.
- Railway crossing.
- Sealed Ōtaki town section.
- Ōtaki Beach picnic finish.

Visual rhythm:

- Long open country straights.
- Sharp fenced intersections.
- Strong gravel-to-seal transition.
- More built-up town composition.
- Bright coastal finish.

Macrons must be used in player-facing text: **Ōtaki** and **Kāpiti**.

---

## 8. UI and typography

UI should feel like part of Gilmore Games while belonging specifically to Beryl.

### Use

- Large, friendly headings.
- Chunky dark outlines.
- Warm cream panels.
- Turquoise accents taken from Beryl.
- Red accents used sparingly.
- Clear numeric time displays.
- Arcade-style top-three name entry.
- Large tap targets near mobile screen edges.

### Avoid

- Tiny icons without text.
- Dense telemetry.
- Sim-racing gauges.
- Modern glassmorphism.
- Reward currencies, loot effects or mobile-game badges.
- UI clustered over the centre of the road.

The road and Beryl must remain visible. Mobile HUD and controls should hug the real viewport edges.

---

## 9. Landmark text and signage

Generated image text is unreliable. Important names must not depend on text baked into generated artwork.

For critical signs:

- Generate the sign structure without final text where practical.
- Add wording in code or in a controlled graphics-editing step.
- Keep text large and short.
- Verify spelling and macrons manually.
- Use consistent period-inspired lettering.

Critical player-facing names include:

- Days Bay
- Eastbourne
- Eastbourne RSA
- Remutaka Summit
- Ōtaki

---

## 10. Things this game must never look like

- A generic Formula 1 or rally simulator.
- A modern motorsport broadcast.
- A neon arcade racer.
- A photoreal aerial map.
- A toy-car game with plastic roads.
- An American small town with New Zealand labels added.
- A tropical island.
- A crowded traffic-management game.
- A collection of mismatched AI-generated assets.
- A visually busy scene where the route is hard to follow.

---

## 11. Approval test

Before approving any art, ask:

1. Is Beryl or the location immediately recognisable?
2. Does it feel like New Zealand?
3. Does it feel warm, nostalgic and family-made?
4. Is the road and direction of travel obvious?
5. Does it match the top-down perspective of the game?
6. Will it remain readable on a landscape phone?
7. Does it belong with the other approved assets?
8. Is any important text spelled correctly and rendered cleanly?

An attractive image that fails recognition or gameplay readability must not be approved.