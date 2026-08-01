# Eastbourne Villas and Ōtaki Farmhouses — 3D Art Research

**Status:** implementation reference  
**Applies to:** `src/render3d/houses.js`, Eastbourne and Ōtaki 3D themes  
**Goal:** create recognisably local low-poly houses without reproducing any one private home.

## Visual direction

The houses should look like broad local types remembered from the road, not architectural reconstructions. Use shape, roofline, cladding rhythm, verandahs, windows and colour to make the place read. Avoid detailed textures, realistic weathering, interiors or exact copies of reference properties.

## Eastbourne

### Recurring cues

- Painted timber weatherboards, often white, cream or pale colour.
- Compact single-storey cottages and seaside bungalows.
- Front-facing gables and occasional taller two-storey villas.
- Corrugated or visually simple dark, green or red roofs.
- Sash-like windows with strong pale trim.
- Small verandahs, porches, bay windows and simple window awnings.
- Houses sit close to bush, gardens and the coastal road rather than in large open grounds.
- Colour variation is important: white-and-blue, cream-and-red, sage-and-cream, faded pink and pale yellow all feel plausible.

### Low-poly forms implemented

1. **Compact villa** — front gable, full verandah, central door and paired sash windows.
2. **Seaside bungalow** — low wide roof, broad eaves, bay window and small porch.
3. **Weatherboard cottage** — narrow single storey, hipped roof and window awnings.
4. **Two-storey villa** — narrow footprint, stacked sash windows, porch and chimney.

## Ōtaki rural houses

### Recurring cues

- Timber/weatherboard construction and simple rectangular footprints.
- Corrugated-iron-looking gabled or hipped roofs.
- Broad verandahs and shaded front elevations.
- Brick chimneys and regular sash-window rhythms.
- Larger homestead footprints than Eastbourne houses.
- Lean-to additions and detached sheds are common rural visual cues.
- Farmhouses appear as small clusters in paddocks, with outbuildings and space around them.
- Useful palette range: off-white, cream, pale green, muted yellow and weathered grey; roofs in iron grey, dull green, faded red or rusty brown.

### Low-poly forms implemented

1. **Broad homestead** — hipped roof, deep verandah, four front windows and two chimneys.
2. **Long gabled farmhouse** — front verandah, chimney and side lean-to.
3. **Farm cottage** — compact gable, small porch, chimney and lean-to.
4. **Two-storey homestead** — hipped roof, upper and lower sash windows and verandah.
5. **Detached farm shed** — simple gable, large split door and muted timber/iron colours.

## Placement rules

- Houses remain visual scenery only; no collision or simulation changes.
- Eastbourne houses sit inland of the coastal road through Days Bay, Rona Bay and the village section.
- Ōtaki farmhouses sit through the middle farmland section, away from the bush-clad Forks start, river channel, railway and beach.
- Terrain height is sampled at each house origin so buildings follow the current 3D terrain.
- Form and colour are hard-coded for deterministic rendering and repeatable screenshots.

## Sources consulted

- Heritage New Zealand Pouhere Taonga: **The Glen**, Eastbourne.
- Heritage New Zealand Pouhere Taonga: **The Bungalow** and **Johnstone Farmhouse** for New Zealand villa, bungalow and farmhouse cues.
- Ōtaki Heritage: historical **Houses** collection, including Simcox Farm, Kaiangaraki and Manakau examples.
- Rail Heritage Trust of New Zealand: **Ōtaki Station**, for local rusticated weatherboards, gabled corrugated roof, chimneys, sash windows and verandah language.
- Contemporary Eastbourne and Kāpiti property imagery was used only as a broad visual spot-check for colour, roof and cladding variety; no individual private house is reproduced.

## Approval test

- Does Eastbourne read as a compact, colourful coastal weatherboard settlement?
- Does Ōtaki read as open rural land with larger homesteads and sheds?
- Are the silhouettes clear from the chase camera?
- Do the houses support the road rather than compete with it?
- Is the result low-poly, warm and family-made rather than realistic?
