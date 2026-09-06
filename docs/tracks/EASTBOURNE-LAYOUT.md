# Eastbourne Dash — route and environment pass

## Purpose

Replace the short, single-spline Eastbourne prototype with a longer, recognisable drive from 28 Ferry Road to the Eastbourne RSA.

The route is an architectural and geographic caricature rather than a GIS trace. It prioritises the sequence and spatial relationships a local notices while preserving enough width and clarity for an arcade driving game.

## References

Primary visual references were the two supplied Google Maps route screenshots:

1. 28 Ferry Road down to the coast and through Days Bay.
2. The Eastbourne village approaches, showing Muritai Road, Marine Parade, the doctors, Muritai School and the alternate routes to the RSA.

Additional research:

- Greater Wellington, **East Harbour northern block map**: https://www.gw.govt.nz/assets/Documents/2009/07/East-Harbour-northen-block-map.pdf
- Stantec / Wellington Regional Leadership Committee, **Eastern Bays Transport Assessment**: https://wrlc.org.nz/assets/Documents/2022/03/App-L-Eastern-Bays-Transport-Assessment-Lodgement.pdf

These sources confirm the broad north–south relationship of Ferry Road, Marine Drive, Marine Parade and Muritai Road; the chain of bays; the shoreline-hugging character of the corridor; and the abrupt native-forest backdrop.

## Route decisions

### Ferry Road

- The start now has a long, steep descent rather than a short introductory bend.
- It ends in a deliberately hard left onto the coastal road.
- The elevation profile drops from the hill to a low coastal shelf before the long harbour run.

### Days Bay to Eastbourne

- The main road follows the shoreline for most of the drive.
- A thin beach ribbon runs continuously along the harbour side.
- Days Bay Wharf projects at 90 degrees from the beach and finishes in a T-head.
- Williams Park creates an open green break in the otherwise residential edge.
- Norfolk pines punctuate the beach side while generic tree scatter is kept inland.

### Eastbourne street network

The final section is no longer one prescribed road. It includes:

- the main Muritai Road approach;
- a seaward Marine Parade route;
- an inland village route;
- two cross streets that allow the player to swap between them;
- a shared convergence on the final RSA approach.

All required intermediate checkpoints occur before the split. The only required gate inside the village network is the finish, so each visible route is a valid way to complete the dash.

## Built form and landscape

- Most houses are white or warm-white low-poly villas, cottages and bungalows.
- The clinic, shop strip, Muritai School and RSA are represented by building form rather than text labels.
- Shops are grouped between the clinic and school, with awnings and glazed fronts distinguishing them from houses.
- The inland half of the course rises into exaggerated green, bush-covered hills.
- Water, beach, buildings, hills and roads are all real Three.js geometry; no new raster artwork or imported models are used.

## Signage rule

Eastbourne does not render the generic start gantry, roadside landmark boards, direction arrows or finish sign. Recognition must come from route geometry, shoreline, vegetation and architecture.

## Technical design

`src/eastbourneRoute.js` contains the live-scale route and branch-road data. `src/track.js` builds a primary spline plus optional branch splines and treats the collection as one driveable network for road-distance checks. `src/terrain.js` pins every road into one shared height field. The 3D renderer draws each road ribbon and lets intersections overlap naturally.
