#!/usr/bin/env python3
"""Offline, lossless comparison of full PNG vs 1-km crop PNG vs compressed RGBA.

Usage: python scripts/benchmark_rain_tile.py <tile.png> <pixel_x> <pixel_y> [radius_px]
Requires: pip install Pillow
Only local files are read. Does not write to Supabase or contact JMA.
For a circle that crosses tile boundaries, mosaic the required tiles first and
pass the registered point's pixel coordinates in that mosaic.
"""
import argparse
import io
import json
import zlib
from pathlib import Path

from PIL import Image


def png_bytes(image: Image.Image) -> bytes:
    out = io.BytesIO()
    image.save(out, format="PNG", optimize=True)
    return out.getvalue()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("image", type=Path)
    parser.add_argument("pixel_x", type=int)
    parser.add_argument("pixel_y", type=int)
    parser.add_argument("--radius-px", type=int, default=9)
    args = parser.parse_args()
    if args.radius_px < 1:
        parser.error("--radius-px must be positive")
    source = args.image.read_bytes()
    with Image.open(io.BytesIO(source)) as loaded:
        image = loaded.convert("RGBA")
    x, y, radius = args.pixel_x, args.pixel_y, args.radius_px
    box = (x - radius, y - radius, x + radius + 1, y + radius + 1)
    if box[0] < 0 or box[1] < 0 or box[2] > image.width or box[3] > image.height:
        parser.error("1-km window crosses image boundary: mosaic neighboring tiles first")
    crop = image.crop(box)
    crop_png = png_bytes(crop)
    rgba = crop.tobytes()
    compressed = zlib.compress(rgba, level=9)
    assert Image.open(io.BytesIO(crop_png)).convert("RGBA").tobytes() == rgba
    assert zlib.decompress(compressed) == rgba
    print(json.dumps({
        "source": str(args.image), "image_pixels": [image.width, image.height],
        "crop_pixels": [crop.width, crop.height], "source_png_bytes": len(source),
        "crop_png_bytes": len(crop_png), "raw_rgba_bytes": len(rgba),
        "zlib_rgba_bytes": len(compressed),
        "lossless": True,
        "notes": "Metadata, missing-data mask, tile IDs, and DB/Storage overhead excluded."
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
