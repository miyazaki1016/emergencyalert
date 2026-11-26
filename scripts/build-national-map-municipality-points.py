"""Derive interior marker points from the N03 GeoJSON used by #311.

Source (2026-08-04.1, EPSG:4326):
https://geo.maderaojen.me/datasets/jp-municipalities/releases/v1/2026-08-04.1/data.geojson
国土交通省「国土数値情報（行政区域データ）」を加工して作成（CC BY 4.0）。
Run: python3 scripts/build-national-map-municipality-points.py downloaded.geojson
"""
import hashlib
import json
from pathlib import Path
import re
import sys

SOURCE_SHA = "f1ddca348115553297ada27271543e7515fde8d80d279931a83c2c1e66b91924"


def ring_area(ring):
    return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(ring, ring[1:])))


def spans(polygon, y):
    edges = sorted(
        a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1])
        for ring in polygon
        for a, b in zip(ring, ring[1:])
        if (a[1] > y) != (b[1] > y)
    )
    return list(zip(edges[::2], edges[1::2]))


def interior_point(polygon):
    south = min(point[1] for point in polygon[0])
    north = max(point[1] for point in polygon[0])
    candidates = []
    for i in range(1, 32):
        y = south + (north - south) * i / 32
        for west, east in spans(polygon, y):
            lon = round((west + east) / 2, 7)
            lat = round(y, 7)
            if any(lo < lon < hi for lo, hi in spans(polygon, lat)):
                candidates.append((east - west, lat, lon))
    if not candidates:
        raise ValueError("No interior point")
    _, lat, lon = max(candidates)
    return [lat, lon]


raw = Path(sys.argv[1]).read_bytes()
if hashlib.sha256(raw).hexdigest() != SOURCE_SHA:
    raise ValueError("Unexpected N03 source release")
geometry = {}
for feature in json.loads(raw)["features"]:
    code = feature["properties"].get("N03_007")
    if not code or re.fullmatch(r"[0-9]{5}", code) is None:
        continue
    shape = feature["geometry"]
    polygons = [shape["coordinates"]] if shape["type"] == "Polygon" else shape["coordinates"]
    geometry.setdefault(code, []).extend(polygons)

lines = []
for code, polygons in sorted(geometry.items()):
    largest = max(polygons, key=lambda p: ring_area(p[0]) - sum(map(ring_area, p[1:])))
    lines.append(f'  "{code}": {json.dumps(interior_point(largest))}')
print("{\n" + ",\n".join(lines) + "\n}")
