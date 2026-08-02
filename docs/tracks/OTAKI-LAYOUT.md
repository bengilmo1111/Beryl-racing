# Ōtaki Rally — route and art basis

## Intent

Replace the first-cut invented zig-zag with a longer, locally legible journey from Ōtaki Forks to Ōtaki Beach. The course is still an arcade caricature rather than GIS data, but its sequence, road character and choices should match the place:

1. a long winding descent on Ōtaki Gorge Road;
2. the modern overbridge / old-highway / rail corridor;
3. the broad Ōtaki River crossing;
4. a choice of genuine town-side routes;
5. a coastal finish beside the dunes and Tasman Sea.

## Research findings

- The Department of Conservation describes Ōtaki Forks as 19 km inland from the township. Its directions use Ōtaki Gorge Road, and describe the final 5 km as unsealed, narrow and winding. That is why only the upper part of the rally is gravel; the old prototype incorrectly kept gravel through most of the farmland and returned to gravel at the beach.
- DOC currently says Ōtaki Gorge Road and the Forks campsite are closed because of a major slip. This game keeps the traditional Forks-to-town journey as a driveable setting; it is not representing current public-road access.
- Waka Kotahi project material shows Ōtaki Gorge Road carried over the expressway and rail line on Bridges 6 and 7. The course therefore uses a short overbridge treatment instead of an at-grade railway crossing.
- Waka Kotahi identifies old SH1 through Ōtaki between Riverbank Road and Waerenga Road, and its expressway material describes Rāhui Road as the important east-west connection over the expressway and railway.
- Kāpiti Coast District Council describes Tasman Road and Main Street as one continuous corridor through the roundabout near Te Wānanga o Raukawa to Rangiuru Road. A current council road-closure notice also places Marine Parade between Koromiko Street and Tasman Road and gives Moana Street as the local detour.

These relationships support the town network rather than a single prescribed ribbon:

- **Direct route:** Riverbank Road → Rangiuru Road → Marine Parade.
- **Old-town route:** old SH1 → Rāhui / Mill Road → Main / Tasman Road → Marine Parade.
- **Links:** Aotaki Street, Waerenga Road, Rangiuru Road and a small beach-town grid let the player move between the two.

## Sources

- Department of Conservation, Tararua Southern Crossing / Ōtaki Forks access: <https://www.doc.govt.nz/parks-and-recreation/places-to-go/wellington-kapiti/places/tararua-forest-park/things-to-do/tracks/tararua-southern-crossing/>
- Department of Conservation, current Forks closure notice: <https://www.doc.govt.nz/parks-and-recreation/places-to-go/wellington-kapiti/places/tararua-forest-park/things-to-do/tracks/tararua-peaks-main-range-circuit/>
- Waka Kotahi, Peka Peka to Ōtaki construction update, Bridges 6 and 7: <https://www.nzta.govt.nz/projects/wellington-northern-corridor/peka-peka-to-otaki-expressway/newsletters/may-2019/>
- Waka Kotahi, old SH1 Ōtaki corridor description: <https://www.nzta.govt.nz/projects/wellington-northern-corridor/wellington-northern-corridor-improvements/peka-peka-to-otaki-corridor-improvements/old-sh1-peka-peka-to-otaki-new-speed-limits>
- Kāpiti Coast District Council, Tasman Road / Main Street works: <https://www.kapiticoast.govt.nz/council/projects/our-towns-improvements/otaki/tasman-road-water-main/>
- Kāpiti Coast District Council, Marine Parade / Tasman Road / Moana Street road notice: <https://www.kapiticoast.govt.nz/council/news-and-information/public-notices/?noticeid=200>

## Geometry decisions

- Authored at final scale in `src/otakiRoute.js`; `tracks.js` imports the data and remains the one authoritative course catalogue.
- The primary route is about 21,700 world units long before spline smoothing, over twice the old prototype's authored route.
- Road width stays at 280. Width is not scaled with length because the offset-edge builder folds a road through itself when half-width exceeds a corner's radius.
- Seven required gates sit before or at the Ōtaki River crossing; only the final gate is beyond the town split. Any branch is therefore valid and no street is silently the correct route.
- Branch roads are plain sealed tarmac without kerb/apron/centre-line furniture, preventing a knot of overlapping markings at intersections.
- Best times use a new `v2` key because the route, surfaces, elevation, checkpoints and obstacles are not comparable with the prototype.

## Visual language

- steep green gorge and scattered rural homes;
- long market-garden blocks and dark windbreaks on the flats;
- rail corridor below the road overbridge;
- broad braided-river bed with pale gravel banks;
- two loose town ribbons rather than dense urban blocks;
- baches, dunes, pines, a thin beach and open Tasman water;
- no floating route labels, arrows, START gantry or labelled finish.

### Directional parallax

The two ends deliberately carry opposite distant backgrounds. The coast side has a very low, flat Tasman horizon with broad open sky and no invented island or headland, so the last northward run opens into sea. The Forks side has three progressively darker and steeper bush-covered range silhouettes beyond the eastern world edge.

Both sets are real meshes at different depths, not a painted skybox. Their visibility is blended from Beryl's position and heading: the sea horizon grows in as she approaches and faces the beach, while the ranges appear when she turns inland and become strongest near the Forks. This prevents distant mountain peaks showing as detached fragments above fogged foreground terrain during the normal coastward drive.

## Deliberate departures

- Distances and street spacing are compressed and rotated to fit a chase-camera game.
- The current slip closure is not modelled; this is the remembered / traditional road journey.
- Not every local street is included. The selected network exists to make route choice legible while keeping the finish reachable by the automated and human drivers.
- Architecture is representative low-poly scenery, not a reconstruction of individual properties.
