# Eastbourne elevation reference

Derived from **Wellington – Hutt City LiDAR 1m DEM (2025)**, hosted and processed by Toitū Te Whenua Land Information New Zealand; producer Aerial Surveys; licensor Hutt City Council. CC BY 4.0. Captured 23 January–3 February 2025; catalogue published March 2026.

- [LINZ dataset](https://data.linz.govt.nz/layer/124060-wellington-hutt-city-lidar-1m-dem-2025/)
- [Public STAC collection](https://nz-elevation.s3-ap-southeast-2.amazonaws.com/wellington/hutt-city_2025/dem_1m/2193/collection.json)
- [LINZ elevation documentation](https://github.com/linz/elevation)

`elevation-profiles.json` contains point samples in metres, including negative coastal heights and `null` where coverage is absent. Origins are approximate locality reference coordinates, **not surveyed road positions**. Transform each WGS84 longitude/latitude to EPSG:2193, then sample along increasing NZTM easting with fixed northing. DEM height datum is NZVD2016. `scripts/sample-eastbourne-elevation.py` reproduces them from downloaded tiles.

The art uses the common valid 0–600 m sections, interpolated between three localities. Route fractions are authored to the game's compressed route; cross-section origins are placed 45 m beyond the inland-most road. Heights are absolute, not added on top of terrain. Beyond 600 m the mesh tapers to ground: that tail is an artistic closure, not measured topography. This is a geographically informed backdrop, not a 1:1 terrain reconstruction. No collision or road grade comes from it.

The settlement uses street-facing, non-overlapping plots, reserved Williams Park lawn, and generic shop signs. These represent building types rather than replicas of current businesses. Main route remains Marine Parade; inland village roads remain driveable.
