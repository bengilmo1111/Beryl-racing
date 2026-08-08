# Manfeild Circuit — period art pass

**Course:** Manfeild Circuit (`manfield`)  
**Implementation:** `src/render3d/themes/manfeild.js`  
**Visual premise:** the real Manfeild layout presented through the visual language of late-1960s New Zealand club racing

## Historical constraint

Manfeild did not exist in the 1960s. The Manawatu Car Club built the circuit in 1973, with a 3.033 km course, pit and garage areas, and public facilities. The game therefore does **not** claim to be a reconstruction of a 1960s Manfeild.

Instead, this pass combines:

1. The real circuit layout already traced in `MANFEILD-LAYOUT.md`.
2. Manfeild's original open-farmland setting and modest early facilities.
3. The practical, improvised character of New Zealand motor-racing venues in the early and mid 1960s.

Primary references:

- Manfeild, official history: <https://www.manfeild.co.nz/post/waikato-racers-stoked-about-move-to-manfeild>
- Manawatū Heritage early aerial and venue history: <https://manawatuheritage.pncc.govt.nz/item/d1c2a2d0-c7e8-4307-a400-4073d5e65e0f>
- *New Zealand Listener*, “The View from the Pits”, 17 February 1961: <https://paperspast.natlib.govt.nz/periodicals/NZLIST19610217.2.9>
- National Library aerial of Pukekohe during the 1963 New Zealand Grand Prix: <https://natlib.govt.nz/records/22333528>
- *New Zealand Listener*, “The Circuit-Breakers”, 5 January 1968: <https://paperspast.natlib.govt.nz/periodicals/NZLIST19680105.2.2>

## Art direction

The venue should feel:

- Open, flat and rural.
- Purpose-built but still club-run.
- Warm, handmade and slightly faded.
- Busy around the main straight but sparse around the rest of the lap.
- Free of modern corporate architecture and large contemporary safety systems.

The track must not imply that the depicted buildings are exact historical replicas.

## Asset set

All assets are low-poly Three.js geometry built in code:

- Six corrugated-roof pit garages.
- Low pit wall and open pit counter.
- Timing and commentary tower.
- Paddock sheds and fuel drums.
- Timber grandstand with corrugated roof.
- Eight numbered marshal huts with flag racks.
- Main-straight post-and-wire fence.
- Straw-bale stacks at selected corners.
- Painted period-style advertising boards using generic wording.
- Subtle mown infield bands.

No generated images, sprites, downloaded textures or imported 3D models are used.

## Tree-free rule

Manfeild has no procedural trees in this treatment. `scatterScenery()` returns no trees or tree obstacles for the `manfield` theme, so there are also no invisible tree collisions.

The visual hierarchy is therefore:

1. Beryl and the tarmac.
2. Red-and-white kerbs and checkpoint furniture.
3. Pit complex and grandstand on the main straight.
4. Marshal huts, fencing, bales and painted boards around the lap.
5. Open grass and sky.

## Text and branding

The art uses controlled runtime text on physical signboards. It avoids fabricated period sponsorship claims by using generic or local labels such as:

- `MANFEILD`
- `MANAWATU CAR CLUB`
- `FEILDING MOTORS`
- `MOTOR OIL`
- `TYRES`

## Acceptance criteria

- [ ] No trees are rendered on Manfeild.
- [ ] No tree collision circles are created on Manfeild.
- [ ] The venue remains visibly open and rural.
- [ ] The main straight has a clear pit, tower and grandstand identity.
- [ ] The eight mapped marshal posts are represented by physical huts.
- [ ] Straw bales and painted boards evoke period club racing without obscuring the track.
- [ ] The road remains readable on landscape mobile.
- [ ] The additions do not alter the traced circuit geometry or driving physics.
- [ ] The treatment is presented as period-inspired rather than a false reconstruction.
