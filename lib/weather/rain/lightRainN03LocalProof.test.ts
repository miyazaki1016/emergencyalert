import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadPreparedN03ForProof } from "./lightRainN03LocalProof";

describe("read-only prepared N03 adapter", () => {
  it("validates municipality code and polygon data without storage access", () => {
    const dir = mkdtempSync(join(tmpdir(), "n03-light-proof-"));
    const path = join(dir, "13.areas.json");
    try {
      writeFileSync(path, JSON.stringify([{
        code: "13101", prefecture: "東京都", municipality: "千代田区",
        geometry: { type: "Polygon", coordinates: [[[139.7,35.6],[139.8,35.6],[139.8,35.7],[139.7,35.7],[139.7,35.6]]] },
      }]));
      expect(loadPreparedN03ForProof(path, "13").map(a => a.municipality)).toEqual(["千代田区"]);
      expect(() => loadPreparedN03ForProof(path, "14")).toThrow("Invalid N03 municipality");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
