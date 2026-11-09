# Ōtaki recording review — 9 November 2026

Reviewed the supplied three-minute screen recording at two-second intervals, with a closer look at the river excursion and town junctions. Times below refer to the in-game clock.

| Observed problem | Change |
| --- | --- |
| Road intrusions and strips across side-road mouths | Clip crop plots, riverbank decoration, edging and verges against the actual paved triangles; retain interpolated colours and UVs when clipping. Existing terrain clearance also verified. |
| Empty blue background and repetitive flat horizon | Add a continuous foothill skyline and clouds, increase inland range height to match the rescaled world, and taper ridge ends into the ground. |
| Driving through fences | Use short connected fence spans and swept collision against their exact visible endpoints. |
| Camera pitch swings beside bends/banks | Aim pitch along the road, bound the pitch offset and smooth its changes. |
| No discernible finish or final route guidance | Add physical beach route signs and a finish arch with a chequered strip. Timing requires crossing that strip, from either approach. Brake Beryl after finishing. |
| Station shelter on the carriageway, around 1:10 | Resolve the station beside the railway through the same road-clear structure list used for its collision footprint. |
| Beryl buried in the riverbank, around 1:18 | Sample the actual visual terrain triangles off-road instead of a different bilinear surface; preserve driving/physics grids. |
| Camera obscured by foliage, around 1:24 | Fade nearby canopy fragments with a screen-door shader; retain visible, solid trunks. |
| Shelter-belt trees spanning the road, around 2:20 | Check every individual belt crown against every road, including its overhang. Exclude trees and furniture from water and the coastal strip. |
| Solid bridge parapets initially blocked the town route | Place the river crossing upstream of the route split. Build collision and visible parapets from shared bridge spans. |

## Verification

- `npm test`: geometry, placement, spatial road lookup, road contact and arcade driving checks pass.
- `npm run build`: passes; existing large-bundle warning remains.
- `node playtest/course-art.mjs`: bridge deck and parapets pass at 60 river-crossing samples.
- `node playtest/terrain-clearance.mjs`: 265,925 positions and 565 rendered rays pass; driving grids unchanged.
- `node playtest/otaki-fixes.mjs`: finite finish, fast fence sweeps, bounded camera pitch, station/bridge clearance, road-clear dry belt trees, and 18 riverbank grounding poses pass.
- `node playtest/otaki-review.mjs`: Chrome drives both Riverbank and town routes through all eight gates, finishes, and stops on the road. Captures are in `playtest-out/otaki-review/`. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` if using an installed Chrome rather than Playwright's browser.

Changes are local; the deployed recording's site has not been updated by this work.

## Photo-reference scenery pass

Compared the six user-supplied Ōtaki road, pasture and coastal photos with matching driving and aerial game views. Added greener pasture with broad inland contours and subtle slope lighting, multi-lobed mature tree crowns, broken farm hedges, white roadside delineators and thinner white edge paint. Distant ranges now have separately visible blue-grey layers.

Replaced isolated dune boxes with a continuous low vegetated dune strip, corrected the sand/water boundary, added four broken surf bands and 17 solid beach homes. The coastal water now uses one colour across the near and distant ocean surfaces, avoiding the old rectangular colour seam. Removed the four render-only baches in favour of the shared structure list.

`playtest/otaki-reference.mjs` captures gorge, farm road, inland range, beach road and coastal aerial views in `playtest-out/otaki-reference/`. Browser checks report no console errors. Both Riverbank and town driving routes still finish and stop on the road. Additional geometry checks confirm that all 4,206 surf vertices lie on the water side and that the beach meets the water without overlap. Ground clearance and trunk/canopy attachment regressions also pass.
