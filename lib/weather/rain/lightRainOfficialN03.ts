import type { AdministrativeArea } from "./lightRainAdministrativeAreas";

type N03Geometry = AdministrativeArea["geometry"];
type N03Feature = { type: "Feature"; properties?: Record<string, unknown> | null; geometry: N03Geometry | null };
export type N03FeatureCollection = { type: "FeatureCollection"; features: N03Feature[] };

/** Reused PR #59 official N03 feature conversion, isolated from production. */
export function parseOfficialN03ForLightRain(collection: N03FeatureCollection): AdministrativeArea[] {
  if (collection.type !== "FeatureCollection" || !Array.isArray(collection.features)) throw new Error("Invalid N03 GeoJSON");
  const merged = new Map<string, AdministrativeArea>();
  for (const feature of collection.features) {
    if (!feature.geometry || !["Polygon", "MultiPolygon"].includes(feature.geometry.type)) continue;
    const p = feature.properties ?? {};
    const prefecture = typeof p.N03_001 === "string" ? p.N03_001.trim() : "";
    const city = typeof p.N03_004 === "string" ? p.N03_004.trim() : "";
    const ward = typeof p.N03_005 === "string" ? p.N03_005.trim() : "";
    const code = typeof p.N03_007 === "string" ? p.N03_007.trim() : "";
    if (!prefecture || !city || !/^\d{5}$/.test(code)) continue;
    const municipality = city + ward;
    const next: AdministrativeArea = { code, prefecture, municipality, geometry: feature.geometry };
    const previous = merged.get(code);
    if (!previous) { merged.set(code, next); continue; }
    if (previous.prefecture !== prefecture || previous.municipality !== municipality) throw new Error("Conflicting N03 municipality identity");
    const polygons = (a: AdministrativeArea): number[][][][] =>
      a.geometry.type === "Polygon" ? [a.geometry.coordinates as number[][][]] : a.geometry.coordinates as number[][][][];
    previous.geometry = { type: "MultiPolygon", coordinates: [...polygons(previous), ...polygons(next)] };
  }
  return [...merged.values()];
}
