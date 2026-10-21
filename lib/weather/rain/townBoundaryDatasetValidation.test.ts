import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { validatePreparedTownBoundaryDataset } from "./townBoundaryDatasetValidation";
import type { TownBoundaryManifest } from "./townBoundaryManifest";

const square = [[139.8,35.6],[139.81,35.6],[139.81,35.61],[139.8,35.61],[139.8,35.6]];
const filePath = "2020/13108.json";
function setup(feature: unknown, count = 1) {
  const bytes = new TextEncoder().encode(JSON.stringify({ type:"FeatureCollection", features:[feature] }));
  const manifest: TownBoundaryManifest = {
    dataset:"census-2020",source:"approved-source",license:"reviewed",version:"v1",
    expectedMunicipalityCodes:["13108"],
    files:[{municipalityCode:"13108",path:filePath,bytes:bytes.length,
      sha256:createHash("sha256").update(bytes).digest("hex"),features:count}],
  };
  return { manifest, files:new Map([[filePath,bytes]]) };
}
const feature = () => ({
  type:"Feature",properties:{municipalityCode:"13108"},
  geometry:{type:"Polygon",coordinates:[square]},
});
describe("prepared town dataset promotion gate", () => {
  it("passes matching inventory, bytes, owner, count and geometry", () => {
    const {manifest,files}=setup(feature());
    expect(validatePreparedTownBoundaryDataset(manifest,["13108"],files))
      .toEqual({municipalities:1,totalBytes:files.get(filePath)!.length,totalFeatures:1,validatedFeatures:1});
  });
  it("rejects municipality ownership mismatch even with a valid digest", () => {
    const bad=feature();bad.properties.municipalityCode="13109";
    const {manifest,files}=setup(bad);
    expect(() => validatePreparedTownBoundaryDataset(manifest,["13108"],files))
      .toThrow("ownership mismatch");
  });
  it("rejects malformed geometry even with a valid digest", () => {
    const bad=feature();bad.geometry.coordinates=[square.slice(0,4)];
    const {manifest,files}=setup(bad);
    expect(() => validatePreparedTownBoundaryDataset(manifest,["13108"],files))
      .toThrow("Invalid town ring");
  });
  it("rejects incorrect feature counts", () => {
    const {manifest,files}=setup(feature(),2);
    expect(() => validatePreparedTownBoundaryDataset(manifest,["13108"],files))
      .toThrow("feature count mismatch");
  });
  it("rejects invalid JSON with correctly matching hash", () => {
    const bytes=new TextEncoder().encode("{not-json");
    const {manifest}=setup(feature());
    manifest.files[0].bytes=bytes.length;
    manifest.files[0].sha256=createHash("sha256").update(bytes).digest("hex");
    expect(() => validatePreparedTownBoundaryDataset(manifest,["13108"],new Map([[filePath,bytes]])))
      .toThrow("invalid JSON");
  });
});
