# Eastbourne landmark polish — 9 September 2026

User corrections after PR #40:

- Start outside a two-storey old villa marked 28 Ferry Road, with a wide entrance path. The existing road start sits beside the property; no route or driving parameters change. The cream weatherboards, red roof and porch are an interpretation of the supplied description, not a surveyed replica.
- Summer pōhutukawa are twice as tall and three times as wide. Trunks and placement clearances scale with the models. Candidate setbacks find room for the larger crowns without removing existing trees or placing them through buildings. The deterministic test seed fits 18 mature trees.
- Move the shops from the distant inland route to the landward side of Marine Parade, near the northern village cross street, following the user's map of the Rimu/Oroua retail cluster. Four Square identifies the retail row.
- Align Williams Park's lawn to the road and terrain, and subtract actual road triangles from its footprint. Trim Eastbourne edge markings against every other road and paved parking area, including acute intersections missed by midpoint junction masks.
- Add a solid Days Bay Pavilion opposite the wharf. Its low cream frontage, dark roof, red awning, timber glazing and picnic terrace use the contemporary exterior reference below. The smaller existing park shelter remains separate.

References:

- User-supplied satellite screenshot: Four Square, Rona Bay Beach, Marine Parade, Rata Street and Muritai School.
- Four Square official store page, 10 Oroua Street: https://www.foursquare.co.nz/lower-north-island/wellington/eastbourne
- Pavilion exterior/location: https://localista.co.nz/listing/days-bay-pavilion?place=days+bay,+nz
- Exterior photo inspected: https://images.localista.com.au/eatingout/662387_lrg.jpg

Local verification: build, placement, settlement, shared handling, course art and coastal recovery checks. The landmark regression samples 59,660 positions in actual lawn/edge-marking polygons and checks villa, shop and pavilion placement. CI screenshots include the start and Pavilion. Changed building/tree collisions require a measured Eastbourne replay fingerprint; the pinned baseline gate stays enabled, and the other courses must remain unchanged.

Browser validation on PR #41 / run 34341352635: all three Eastbourne route variants finish, and all four courses replay identically three times. Only Eastbourne's obstacle fingerprint changes, to `5f143069064d0fd1`; its finish time and position, and every baseline value for the other courses, remain unchanged. All four course playtests and 12 gameplay exploration scenarios pass. CI screenshots confirm the villa at the start, the larger flowering canopy, relocated shops, Pavilion frontage and clear lawn/road boundaries.

Additional owner request: eight-metre white flagpole beside the RSA entrance, clear of the parking approach, with a gently folded New Zealand Blue Ensign (Union Jack and four red, white-bordered Southern Cross stars). The 2:1 flag is drawn locally in code; it needs no downloaded texture or new asset request. An RSA reference screenshot is included in CI.
