# Manfeild handling

Manfeild uses progressive steering with its own race tune. Steering builds over a short key press and returns quickly on release; cornering authority retains the race tune as speed builds. The car cannot rotate while stationary. Grass slows the car firmly through drag rather than instantly cutting speed in half, including with the throttle held.

The V8's 220 km/h top speed, acceleration, braking, grip and handbrake settings remain intact. Road courses keep their shared tune. Manfeild uses best-lap storage key v2 because laps with the new handling should be compared separately; old records remain stored.

Validation: `npm test` covers course geometry, placement, road contact, road indexing and handling. The Manfeild handling checks exercise stationary steering, high-speed taps, full-throttle grass slowdown and braking at 30/60/120 Hz, then verify that switching back restores road-car handling. The focused browser test is `node playtest/run.mjs --course=manfield --bot=waypoint --no-journey --no-mobile`.

The focused browser lap passed all 18 checkpoints in 52.767 seconds (existing bounds: 45–61 seconds), with 6% off-road time and no console errors or out-of-bounds events.
