# AC4 fault-injection evidence

**Date:** 2026-07-29  
**Scratch branch:** `scratch/playtest-fault-injection`  
**Known-good base:** `9aa786d` (`feat/playtest-ci`)

Each fault was introduced alone, run through the production build and focused
playtest command, confirmed red with a specific report code, and reverted before
the next fault.

| Injected fault | Focused command | Named report failure | Result |
|---|---|---|---|
| Eastbourne checkpoint count changed from 10 to 9 | `npm run playtest -- --course=eastbourne-pootle --bot=idle --no-journey --no-mobile` | `checkpoint-count`: expected 10, found 9 | Caught |
| `public/assets/tree-1.png` renamed | same Eastbourne idle command | `failed-request`: invalid content type `text/html` for `./assets/tree-1.png`; Phaser also emitted `console-error` | Caught |
| Manfield world-boundary collision disabled | `npm run playtest -- --course=manfield --bot=pedal-to-the-metal --no-journey --no-mobile` | `out-of-bounds`: 1 event, limit 0 | Caught |
| `RaceScene.update` throws `AC4 injected update-loop failure` | Eastbourne idle command | `runtime-error` with the injected message and update stack | Caught |
| Gas touch control moved beyond the 844×390 viewport | `npm run playtest -- --mobile-only --no-journey` | `mobile-controls-out-of-viewport`: gas | Caught |

## Detector correction discovered by AC4

The first renamed-asset run exposed a gap: Vite’s SPA fallback returned
`index.html` with HTTP 200 for the missing PNG. Phaser named an image decode
error, but an HTTP-status-only network metric did not call it a failed request.

The harness now validates asset extension against response content type. The
same unchanged fault then produced the named `failed-request` above. This fix is
commit `8c48b67` on `feat/playtest-ci`.

## Reversion check

All five gameplay/asset/UI mutations were reverted. Only the content-type
detector improvement was promoted from the scratch branch.
