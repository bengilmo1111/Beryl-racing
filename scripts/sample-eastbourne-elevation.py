"""Reproduce profiles: pip install rasterio pyproj; pass directory of DEM tiles.
Download BQ32_10000_{0201,0202,0301,0302}.tiff from the documented collection.
Writes JSON to stdout; does not overwrite the checked-in reference.
"""
import json
import sys
from pathlib import Path
import rasterio
from pyproj import Transformer

root = Path(__file__).resolve().parents[1]
profiles = json.loads((root / 'data/eastbourne/elevation-profiles.json').read_text())
transform = Transformer.from_crs(4326, 2193, always_xy=True)
tiles = [rasterio.open(p) for p in Path(sys.argv[1]).glob('*.tiff')]
if not tiles:
    raise SystemExit('No .tiff tiles found')
for profile in profiles:
    x, y = transform.transform(profile['longitude'], profile['latitude'])
    samples = []
    for offset in profile['offsetsMetres']:
        value = None
        for tile in tiles:
            if tile.bounds.left <= x + offset < tile.bounds.right and tile.bounds.bottom <= y < tile.bounds.top:
                sample = float(next(tile.sample([(x + offset, y)]))[0])
                if sample != tile.nodata:
                    value = round(sample, 1)
                    break
        samples.append(value)
    profile['elevationsMetres'] = samples
for tile in tiles:
    tile.close()
print(json.dumps(profiles, indent=2))
