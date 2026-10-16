import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { validateTownBoundaryManifest, type TownBoundaryManifest } from "./townBoundaryManifest";

const bytes = new TextEncoder().encode('{"type":"FeatureCollection","features":[{}]}');
const digest = createHash("sha256").update(bytes).digest("hex");
const path = "2020/13108.json";
function fixture(): TownBoundaryManifest {
  return {
    dataset: "census-2020", source: "approved-source", license: "reviewed-license", version: "v1",
    expectedMunicipalityCodes: ["13108"],
    files: [{ municipalityCode: "13108", path, bytes: bytes.length, sha256: digest, features: 1 }],
  };
}
const inventory = ["13108"];
const data = () => new Map([[path, bytes]]);

describe("town boundary offline promotion manifest gate", () => {
  it("accepts matching approved inventory and SHA-256 bytes", () => {
    expect(validateTownBoundaryManifest(fixture(), inventory, data()))
      .toEqual({ municipalities: 1, totalBytes: bytes.length, totalFeatures: 1 });
  });
  it("rejects a manifest that omits a municipality from the independent inventory", () => {
    expect(() => validateTownBoundaryManifest(fixture(), ["13108", "13109"], data()))
      .toThrow("coverage inventory mismatch");
  });
  it("rejects a manifest that declares itself complete but has no files", () => {
    const manifest = fixture();
    manifest.files = [];
    expect(() => validateTownBoundaryManifest(manifest, inventory, data()))
      .toThrow("coverage incomplete");
  });
  it("rejects duplicate municipality entries", () => {
    const manifest = fixture();
    manifest.files.push({ ...manifest.files[0], path: "2020/duplicate.json" });
    expect(() => validateTownBoundaryManifest(manifest, inventory, data()))
      .toThrow("duplicate municipality");
  });
  it("rejects tampered content even when byte length is unchanged", () => {
    const corrupted = new Uint8Array(bytes);
    corrupted[0] = 88;
    expect(() => validateTownBoundaryManifest(fixture(), inventory, new Map([[path, corrupted]])))
      .toThrow("content mismatch");
  });
  it("rejects missing objects, unsafe paths and absent licensing", () => {
    expect(() => validateTownBoundaryManifest(fixture(), inventory, new Map()))
      .toThrow("content mismatch");
    const unsafe = fixture();
    unsafe.files[0].path = "../escape.json";
    expect(() => validateTownBoundaryManifest(unsafe, inventory, data()))
      .toThrow("Invalid or duplicate town boundary path");
    const noLicense = fixture();
    noLicense.license = "";
    expect(() => validateTownBoundaryManifest(noLicense, inventory, data()))
      .toThrow("provenance incomplete");
  });
});
