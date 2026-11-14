/** Strict, read-only loader for Muse's versioned LRPM z10 artifacts. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PIXEL_MASK_ALGORITHM_VERSION, PIXEL_MASK_FORMAT_VERSION,
  decodeTilePixelMasks, type TilePixelMasks,
} from "./lightRainPixelMasks";

type Manifest = {
  format: string; formatVersion: number; algorithmVersion: number;
  n03Version: string; zoom: number; prefectures: string[];
  municipalities: number; tiles: number;
  files: Record<string, { bytes: number; sha256: string }>;
};
const ALL_PREFECTURES = Array.from({ length: 47 }, (_, i) => String(i + 1).padStart(2, "0"));
export function openNationwidePixelMasks(root: string, n03Version: string) {
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")) as Manifest;
  if (manifest.format !== "light-rain-pixel-masks" ||
      manifest.formatVersion !== PIXEL_MASK_FORMAT_VERSION ||
      manifest.algorithmVersion !== PIXEL_MASK_ALGORITHM_VERSION ||
      manifest.n03Version !== n03Version || manifest.zoom !== 10 ||
      !Array.isArray(manifest.prefectures) ||
      ALL_PREFECTURES.some(p => !manifest.prefectures.includes(p)) ||
      !manifest.files || Object.keys(manifest.files).length !== manifest.tiles ||
      !Number.isInteger(manifest.municipalities) || manifest.municipalities <= 0) {
    throw new Error("PIXEL_MASK_MANIFEST_INCOMPATIBLE");
  }
  // The generated nationwide manifest is only ~100KB; never retain all
  // 35.9MiB of masks in memory. Read a tile on demand.
  return {
    load(tileX: number, tileY: number): TilePixelMasks {
      const relative = `z10/${tileX}/${tileY}.bin`;
      const meta = manifest.files[relative];
      if (!meta) throw new Error(`PIXEL_MASK_MISSING: ${relative}`);
      const bytes = readFileSync(join(root, relative));
      if (bytes.length !== meta.bytes ||
          createHash("sha256").update(bytes).digest("hex") !== meta.sha256) {
        throw new Error(`PIXEL_MASK_CHECKSUM_MISMATCH: ${relative}`);
      }
      const masks = decodeTilePixelMasks(bytes);
      if (masks.zoom !== 10 || masks.tileX !== tileX || masks.tileY !== tileY) {
        throw new Error(`PIXEL_MASK_TILE_MISMATCH: ${relative}`);
      }
      return masks;
    },
  };
}
