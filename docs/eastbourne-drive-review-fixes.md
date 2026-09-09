# Eastbourne drive-through fixes — 9 September 2026

Implemented from the supplied 2:12 recording:

- Extend the seawall about 95 metres toward the first junction, following the western edge of all roads so the northbound arm stays open. Visible wall and collision placements share the same geometry.
- Automatically recover from water with the existing three-second penalty. Show explicit keyboard or touch recovery guidance after sustained off-road driving.
- Map inland-road progress between connected junctions instead of projecting directly onto the coast. Cross streets support travel in either direction, including recovery heading.
- Add edge treatment to branch roads, footpaths with junction clearances, and side garden fences joining the front boundaries.
- Add advance signs for the waterfront/village choices and RSA parking. Delay Eastbourne results for 2.2 seconds to show the arrival.
- Reduce road-car camera FOV and distance growth at speed while retaining Manfeild's race-camera settings.
- Add coloured bush crowns grounded on the measured hill mesh, plus a smoother end taper. Measured elevation profiles remain unchanged.
- Place flowering pōhutukawa along the primary road and Muritai Road. Shared tree placements drive rendering and trunk collisions, with road, building and existing-tree clearance. The test seed fits 33 trees. Mature spreading crowns retain green foliage with crimson flowers placed on the outside for visibility from the car. Norfolk pines remain.

## Validation

The new Node regression exercises the real RaceScene collision and recovery methods using Phaser's actual pure math helpers and a minimal rendering shell. It covers 432 seawall impacts at 20/30/60 Hz, barrier clearance from every road, water recovery and its penalty, valid-road immunity from water recovery, branch progress, and flowering-tree placement. It is included in CI.

Build, shared-car handling, road contact, arrival, coast, settlement and tree-model checks pass locally. CI's initial browser run completed all four course playtests and all 12 gameplay exploration scenarios. Eastbourne's waterfront, Muritai and inland route bots all reached the parking triangle and stopped. All three replay repetitions matched on each course; the measured values are pinned with unchanged Manfeild results.

CI screenshot review showed the red/green pōhutukawa clearly and caught footpath seams and reversed advance-sign lettering. Footpaths now follow the actual clipped terrain triangles; a saddle-cell ray test covers the seam defect. Signs have readable faces on both sides and align to the primary road. The mobile journey advances the paused game clock beyond the intentional 2.2-second arrival hold before checking results, name persistence and retry. These follow-up changes require a final green CI run before merge.
