# Days Bay and Beryl: driving-camera art pass

The intended look is a New Zealand holiday postcard you can drive through: recognisable proportions and place relationships, with readable, simplified shapes.

## References and decisions

- Beryl: `public/assets/beryl-photo.png` is the colour and identity reference. The model specification remains useful for wheelbase and body layout; its old instruction to exaggerate cabin width is superseded by this pass. Preserve the turquoise roof, red pinstripe, whitewalls and chrome. No invented contrast roof or character face.
- Days Bay: [Hutt City Council's Williams Park / Days Bay beach description](https://www.huttcity.govt.nz/environment-and-sustainability/parks-and-sportsgrounds/parks%2C-gardens-and-reserves/williams-parkdays-bay-beach) identifies the pavilion, beach, wharf and open green space. These are the composition anchors. This remains a compressed interpretation of the place, not a surveyed reconstruction or replica of a specific ferry.
- The first pass's ten-metre wharf and roughly car-sized houses made the place unreadable. A 65-metre wharf, house doors around two metres high, lower roadside tree crowns and a continuous bush backdrop establish a shared scale.

## Implementation

The route and driving settings are unchanged. Williams Park moves alongside the Days Bay section, and nearby front-row houses make room for its open frontage. House meshes and collision footprints share the same scale. Clinic, school and shop footprints now use the same local axes as their visible models.

Beryl uses a narrower cabin, rounded glass surrounds, more pronounced rear wings with actual wheel openings, chrome hubcaps, door handles and a dark BERYL plate. A small Phong paint/chrome material adds directional highlights without environment maps or large downloaded assets. Wharf/ferry geometry and plate lettering are batched to keep draw calls down. Road contact still comes from the same tested wheel supports.

Named signs are attached to the park and buildings. They supersede the old blanket ban on text signs in the Eastbourne art brief; floating landmark labels remain unnecessary. The ferry and wharf are decorative beyond the coastal wall. Distant ridges are intentionally exaggerated enough to survive the driving camera.

## Review

The existing course and mobile journeys capture gameplay views. `BERYL_ART_VIEWS=1 npm run shots -- eastbourne-dash:1440,1800,2100` additionally captures front, side and rear-quarter car views for review. These run in GitHub Actions; the managed interactive browser used during this work cannot create WebGL contexts.

Review the actual driving views first, particularly the wharf approach and village arrival. A detailed close-up is insufficient if the car or landmark disappears at phone size. Remaining art work can extend the same composition principles to the village and other courses after player feedback.
