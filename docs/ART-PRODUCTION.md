# Beryl Racing — Art Production Guide

**Status:** Production source of truth  
**Purpose:** Define how artwork is researched, specified, generated, reviewed, prepared and integrated

Read this together with:

- `docs/ART-DIRECTION.md`
- `public/assets/README.md`
- The relevant track art brief in `docs/tracks/`

`docs/ART-DIRECTION.md` defines what the game should look like. This file defines how the assets are produced and shipped.

---

## 1. Production principles

1. **Gameplay readability comes first.** An attractive asset that hides the road, direction or Beryl is not usable.
2. **Real-place recognition must be intentional.** Landmark art must be based on reference material, not invented from a place name alone.
3. **Beryl’s identity is protected.** The real Beryl photograph remains the main vehicle reference.
4. **One approved asset at a time.** Generated art is reviewed before it is wired into the game.
5. **The game must keep working without optional art.** Procedural or simple fallback rendering should remain available until a replacement is proven in-game.
6. **Performance is a requirement.** Assets must work on landscape mobile, not only in a desktop mock-up.
7. **Important text is controlled.** Do not trust generated text for landmark names, signs or UI.

---

## 2. Proposed asset structure

```text
public/assets/
  shared/
    beryl/
      beryl-photo.png
      beryl-topdown.png
    surfaces/
      asphalt.png
      gravel.png
      grass-coastal.png
      grass-bush.png
      grass-dry.png
    vegetation/
      tree-native-01.png
      tree-native-02.png
      tree-native-03.png
      pohutukawa-01.png
      shelterbelt-01.png
    roadside/
      barrier-metal.png
      barrier-timber.png
      fence-rural.png
      arrow-sign.png
    ui/
      ...

  tracks/
    eastbourne/
      days-bay-wharf.png
      eastbourne-shops.png
      eastbourne-rsa.png
      coastal-building-01.png
      ...
    remutaka/
      summit-sign.png
      hill-barrier.png
      lookout-detail-01.png
      ...
    otaki/
      river-bridge.png
      railway-crossing.png
      town-building-01.png
      picnic-finish.png
      ...
```

Migration from the current flat `public/assets/` directory may happen incrementally. Do not break existing asset paths merely to achieve the target structure.

All asset loads must remain base-path aware through `import.meta.env.BASE_URL` or equivalent relative paths. Never introduce root-relative `/assets/...` references.

---

## 3. Asset classes

Every proposed asset must be classified before production.

### 3.1 Seamless surface texture

Examples:

- Asphalt.
- Gravel.
- Grass.
- Dry paddock ground.

Requirements:

- Square power-of-two source, normally 512 × 512 px.
- Fully opaque.
- Seamless on all four edges.
- Flat, even lighting.
- Low contrast.
- No unique large feature that repeats obviously.
- No road markings or directional shadows unless the texture is not tiled.

### 3.2 Standalone prop sprite

Examples:

- Tree.
- Barrier.
- Fence segment.
- Hay bale.
- Road sign.

Requirements:

- Transparent PNG.
- Top-down perspective.
- Centred with safe padding.
- Soft contact shadow directly beneath or consistently offset for the track lighting.
- Clear collision footprint.
- Readable at final gameplay size.

### 3.3 Modular landmark kit

Examples:

- Eastbourne shops.
- RSA building.
- Railway crossing.
- River bridge.

A kit is preferred when the landmark must align with authored road geometry.

Possible components:

- Main building or structure.
- Sign face.
- Roof or facade variants.
- Fence or platform pieces.
- Foreground details.

Requirements:

- Separate elements where the road must pass between or beneath them.
- Transparent backgrounds.
- Consistent scale and lighting.
- No baked road unless specifically approved.

### 3.4 Landmark composition

A single larger sprite may be used when:

- The landmark is outside the drivable road.
- Its exact collision shape is simple.
- It will not need to adapt to multiple road layouts.
- A single composition gives significantly better recognition.

Large compositions must not contain important roadway that needs collision or surface behaviour.

### 3.5 UI asset

Requirements:

- Crisp at multiple resolutions.
- Designed for large touch targets.
- No essential meaning conveyed by colour alone.
- Text normally rendered by the game rather than baked into images.
- SVG or code-drawn UI preferred where it improves scaling and accessibility.

### 3.6 Audio artwork and music identity

Album-style art is not required. Track-specific music should be managed as production assets with:

- Clear filenames.
- Loop points checked in-game.
- Normalised perceived volume.
- Rights and provenance recorded.
- Distinct identity matching the art brief.

---

## 4. Reference collection

Real landmarks must not be generated from memory alone.

For each landmark, collect a compact reference pack containing:

- One broad location image.
- One image showing the recognisable shape or facade.
- One image showing the relationship to the road.
- Optional detail images for signs, colours or roofs.
- A short written note explaining what the core audience is expected to recognise.

References may come from:

- User-provided family photographs.
- Photographs taken specifically for the project.
- Publicly viewable maps or street imagery used as visual reference only.
- Other legally usable sources.

Do not commit third-party reference photographs into the public repository unless their use and licence are clear. A local or private reference pack may be used during generation without being shipped in the game.

For each real landmark, record:

```text
Landmark:
Recognition features:
Position relative to road:
Required wording:
Features that may be simplified:
Features that must not be invented:
Reference source notes:
```

---

## 5. Asset specification template

Before generating an asset, create or complete this specification:

```markdown
### Asset name

- Track:
- Asset class:
- Filename:
- Purpose in game:
- Final approximate display size:
- Source canvas size:
- Perspective:
- Orientation:
- Background:
- Lighting direction:
- Required identity features:
- Simplifications allowed:
- Collision footprint:
- Must not include:
- Reference images supplied:
- Approval owner:
```

The relevant track brief supplies the creative context. The individual asset specification supplies the exact deliverable.

---

## 6. Image-generation workflow

### Stage 1 — Define

- Confirm the asset class.
- Gather references.
- Write the asset specification.
- Confirm exact filename and dimensions.
- Identify whether text should be omitted and added later.

### Stage 2 — Generate concepts

- Generate one to three meaningfully different concepts.
- Use the real reference image when landmark or Beryl identity matters.
- Keep perspective, lighting and transparency requirements explicit.
- Do not integrate concepts directly into the repository.

### Stage 3 — Visual review

Review concepts against:

- Recognition.
- Art direction.
- Perspective.
- Lighting.
- Gameplay readability.
- Mobile-scale readability.
- Lack of unwanted text or scenery.

Select one concept or request a focused correction.

### Stage 4 — Production correction

Typical corrections include:

- Remove background.
- Straighten top-down perspective.
- Correct Beryl’s proportions or turquoise colour.
- Simplify texture.
- Increase silhouette clarity.
- Remove invented signage.
- Create more transparent padding.
- Align the landmark to the road-facing orientation.

### Stage 5 — Explicit approval

Do not upload or wire an image into the game until the user explicitly approves it.

Record approval in the conversation, issue or pull request where practical.

### Stage 6 — Prepare asset

- Export to required format.
- Verify transparency.
- Crop and pad correctly.
- Resize without softening critical edges.
- Optimise file size.
- Verify filename and case.
- Inspect for corruption.

### Stage 7 — Integrate behind a safe path

- Add the file under `public/assets/`.
- Load it with a base-path-aware URL.
- Preserve the procedural or previous asset until the replacement is verified.
- Add collision or masks separately from the image where practical.
- Test desktop and landscape mobile.

### Stage 8 — In-game review

An asset is not finished merely because the PNG looks good.

Verify:

- Correct scale.
- Correct rotation.
- Road remains visible.
- Collision matches the visible object.
- No clipping.
- No shimmering or severe scaling blur.
- Consistent shadows.
- Acceptable performance.
- Asset resolves under `/beryl-racing/`.

### Stage 9 — Finalise

- Remove unused test variants.
- Update asset documentation.
- Keep source or prompt notes where they will help future regeneration.
- Commit with a clear message naming the asset and track.

---

## 7. Prompt construction

A production prompt should contain these sections in this order:

1. **Asset type and view** — top-down sprite, seamless texture, landmark kit, etc.
2. **Subject identity** — what it is and why it is recognisable.
3. **Reference instruction** — which supplied image controls shape, colour or layout.
4. **Art style** — warm, friendly, slightly stylised Beryl Racing look.
5. **Lighting** — track-specific direction and time of day.
6. **Hard output constraints** — dimensions, transparency, orientation and padding.
7. **Exclusions** — no road, no text, no perspective, no people, as appropriate.

Example structure:

```text
Create a [ASSET CLASS] for Beryl Racing, viewed [PERSPECTIVE].
It depicts [SUBJECT] and must preserve [RECOGNITION FEATURES] from the supplied reference.
Use the warm, slightly faded, friendly top-down style defined in ART-DIRECTION.md.
Lighting is [TRACK LIGHTING].
Output [DIMENSIONS/FORMAT/BACKGROUND/ORIENTATION].
Do not include [EXCLUSIONS].
The asset must read clearly at approximately [FINAL SIZE] in a landscape mobile game.
```

Prompts in `src/art.js` may remain useful implementation references, but `docs/ART-DIRECTION.md`, this production guide and the relevant track brief are the authoritative source for new work.

---

## 8. Text, signs and macrons

Do not rely on image generation to render final sign wording.

Preferred methods:

1. Generate a blank sign and render text in code.
2. Generate a blank sign and add text in a controlled image-editing step.
3. Use vector signage assembled in code.

Required checks:

- Correct spelling.
- Correct capitalisation.
- Correct macrons.
- Sufficient contrast.
- Readable at gameplay scale.

Player-facing text must use:

- Ōtaki
- Kāpiti
- Remutaka

Do not silently remove macrons because of font or tooling limitations. Fix the production method instead.

---

## 9. Technical specifications

### 9.1 File formats

- PNG for transparent sprites and landmark art.
- PNG or WebP for opaque textures after browser and quality testing.
- SVG for simple scalable UI or signs where supported safely.
- MP3 or OGG for music according to the existing audio pipeline.

### 9.2 Dimensions

Use the smallest source that remains crisp at the largest intended display size.

Typical starting points:

- Beryl sprite: approximately 256 × 512 px source.
- Small prop: 128 × 128 or 256 × 256 px.
- Long barrier/fence: 256 × 64 or 512 × 128 px.
- Landmark: 512–1024 px on the longest side depending on final display size.
- Seamless texture: 512 × 512 px.
- Course thumbnail: sized to the final UI design, normally 16:9 or 4:3.

Power-of-two dimensions are encouraged for repeating textures, not mandatory for every sprite.

### 9.3 Transparency

For transparent assets:

- Verify alpha is genuinely transparent.
- Remove white or coloured edge halos.
- Keep enough padding for rotation and shadows.
- Avoid semi-transparent pixels far outside the visible sprite.

### 9.4 File-size targets

Targets are guides and may be adjusted after profiling:

- Small prop: preferably under 150 KB.
- Medium landmark: preferably under 400 KB.
- Large landmark or hero image: preferably under 800 KB.
- Seamless texture: preferably under 500 KB.

Do not sacrifice recognisability merely to hit an arbitrary number. Optimise after visual approval.

### 9.5 Naming

- Lowercase kebab-case.
- Use stable descriptive names.
- Include numbered variants: `tree-native-01.png`.
- Do not use names such as `final-final-2.png`.
- Do not overwrite an approved asset with an unrelated new interpretation without review.

---

## 10. Collision and gameplay clearance

Artwork and collision are related but should not be inseparable.

For each solid prop, specify:

- Collision shape.
- Collision centre.
- Radius or polygon.
- Whether Beryl should bounce, slide or be channelled.

Prefer simple collision primitives even when the visual asset is detailed.

Landmarks next to the road must leave enough clearance for inexperienced players. Visual overhangs must not imply passable space where collision blocks the car.

For barriers:

- The collision line should match the visible barrier.
- Gaps must not allow cliff or water access.
- Repeated segments should not create invisible snag points.

For grass and non-road surfaces:

- Surface behaviour should be driven by track geometry or masks, not inferred from the decorative image alone.

---

## 11. Track assembly rules

Road geometry should normally be authored in code or track data rather than painted into one large image.

Benefits:

- Accurate collision.
- Easy tuning of road width and corners.
- Reusable textures.
- Reliable surface changes.
- Better mobile memory use.
- Easier landmark repositioning.

Use generated art primarily for:

- Surface textures.
- Vegetation.
- Barriers and fences.
- Buildings.
- Signs.
- Bridges and wharves.
- Finish scenes.

A full-track background image may be used only if it does not compromise collision, scaling, landmark order or surface behaviour.

---

## 12. Review gates

### Gate A — Concept approval

Questions:

- Is the subject recognisable?
- Is the style correct?
- Is the perspective usable?

### Gate B — Asset approval

Questions:

- Are dimensions, transparency and padding correct?
- Is important text controlled?
- Does it match the other assets?

### Gate C — In-game approval

Questions:

- Is it readable on mobile?
- Does collision align?
- Does it improve the place recognition?
- Does it maintain frame rate?

An asset is complete only after Gate C.

---

## 13. Per-track production sequence

For each track, produce art in this order:

1. Greybox the complete route and prove the two-minute drive.
2. Confirm landmark positions and checkpoint order.
3. Add shared surface textures.
4. Add route-defining barriers and fences.
5. Add the three most important landmark assets.
6. Test recognition with the intended audience.
7. Add supporting vegetation and buildings.
8. Add track-specific lighting and colour treatment.
9. Add finish presentation.
10. Add optional decorative life only after readability and performance are secure.

Do not produce a large inventory of props before the route and landmark positions are proven.

---

## 14. Track brief links

- `docs/tracks/EASTBOURNE-ART-BRIEF.md`
- `docs/tracks/REMUTAKA-ART-BRIEF.md`
- `docs/tracks/OTAKI-ART-BRIEF.md`

These briefs define the minimum recognisable visual set for each course.

---

## 15. Definition of done

An art asset is done when:

- It has explicit approval.
- It follows the shared art direction.
- It follows the relevant track brief.
- It has the correct filename and format.
- It is optimised without visible damage.
- It is committed to the correct path.
- It loads beneath `/beryl-racing/`.
- It has been checked in-game on desktop and landscape mobile.
- It does not obscure Beryl, navigation or the road.
- Its collision and scale have been verified.
- Any required wording and macrons are correct.