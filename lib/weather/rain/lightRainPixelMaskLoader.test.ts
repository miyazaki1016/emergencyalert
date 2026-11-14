import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openNationwidePixelMasks } from "./lightRainPixelMaskLoader";
import { encodeTilePixelMasks, MASK_BYTES } from "./lightRainPixelMasks";

describe("strict nationwide LRPM loader", () => {
  it("validates N03 version, checksum, tile identity and missing coverage", () => {
    const root = mkdtempSync(join(tmpdir(), "lrpm-"));
    try {
      const relative = "z10/885/407.bin";
      mkdirSync(join(root, "z10", "885"), { recursive: true });
      const bytes = encodeTilePixelMasks({
        zoom: 10, tileX: 885, tileY: 407,
        entries: [{ code: "35001", mask: new Uint8Array(MASK_BYTES).fill(1) }],
      });
      writeFileSync(join(root, relative), bytes);
      const manifest = {
        format: "light-rain-pixel-masks", formatVersion: 1, algorithmVersion: 1,
        n03Version: "20260101", zoom: 10,
        prefectures: Array.from({ length: 47 }, (_, i) => String(i + 1).padStart(2, "0")),
        municipalities: 1905, tiles: 1,
        files: { [relative]: { bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") } },
      };
      writeFileSync(join(root, "manifest.json"), JSON.stringify(manifest));
      const loader = openNationwidePixelMasks(root, "20260101");
      expect(loader.load(885, 407).entries[0].code).toBe("35001");
      expect(() => loader.load(885, 408)).toThrow("PIXEL_MASK_MISSING");
      expect(() => openNationwidePixelMasks(root, "20270101")).toThrow("PIXEL_MASK_MANIFEST_INCOMPATIBLE");
      writeFileSync(join(root, relative), Buffer.alloc(bytes.length));
      expect(() => loader.load(885, 407)).toThrow("PIXEL_MASK_CHECKSUM_MISMATCH");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
