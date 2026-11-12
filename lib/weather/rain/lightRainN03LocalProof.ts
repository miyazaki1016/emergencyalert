import { readFileSync } from "node:fs";
import type { AdministrativeArea } from "./lightRainAdministrativeAreas";
import { municipalitiesForLightRainTile } from "./lightRainMunicipalities";

/** Offline/read-only proof using prepared N03 .areas.json from PR #59.
 * Never downloads production Storage data or writes to it.
 */
export function loadPreparedN03ForProof(path: string, expectedPrefectureCode: string): AdministrativeArea[] {
  if (!/^\\d{2}$/.test(expectedPrefectureCode)) throw new Error("Invalid prefecture code");
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Missing N03 municipality data");
  const areas: AdministrativeArea[] = parsed.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new Error("Invalid N03 entry");
    const a = item as Partial<AdministrativeArea>;
    if (typeof a.code !== "string" || !/^\\d{5}$/.test(a.code) ||
      !a.code.startsWith(expectedPrefectureCode) ||
      typeof a.prefecture !== "string" || !a.prefecture ||
      typeof a.municipality !== "string" || !a.municipality ||
      !a.geometry || !["Polygon", "MultiPolygon"].includes(a.geometry.type) ||
      !Array.isArray(a.geometry.coordinates)) throw new Error("Invalid N03 municipality identity/geometry");
    return a as AdministrativeArea;
  });
  if (new Set(areas.map(a => a.code)).size !== areas.length) throw new Error("Duplicate N03 municipality code");
  return areas;
}

export function proveLightRainMunicipalitiesFromLocalN03(
  tile: Buffer, zoom: number, tileX: number, tileY: number, n03Path: string, prefectureCode: string,
) {
  return municipalitiesForLightRainTile(tile, zoom, tileX, tileY,
    loadPreparedN03ForProof(n03Path, prefectureCode));
}
