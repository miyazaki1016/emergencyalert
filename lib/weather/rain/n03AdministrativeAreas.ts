import type { AdministrativeArea } from "./administrativeAreas";

type N03Geometry = AdministrativeArea["geometry"];

export interface N03Feature {
  type: "Feature";
  properties?: Record<string, unknown> | null;
  geometry: N03Geometry | null;
}

export interface N03FeatureCollection {
  type: "FeatureCollection";
  features: N03Feature[];
}

function textProperty(properties: Record<string, unknown>, key: string) {
  const value = properties[key];
  return typeof value === "string" ? value.trim() : "";
}

export function n03FeatureToAdministrativeArea(feature: N03Feature): AdministrativeArea | null {
  if (!feature.geometry || (feature.geometry.type !== "Polygon" && feature.geometry.type !== "MultiPolygon")) return null;
  const properties = feature.properties ?? {};
  const prefecture = textProperty(properties, "N03_001");
  const municipality = textProperty(properties, "N03_004");
  const code = textProperty(properties, "N03_007");
  if (!prefecture || !municipality || !code) return null;
  return { code, prefecture, municipality, geometry: feature.geometry };
}

export function parseN03FeatureCollection(collection: N03FeatureCollection): AdministrativeArea[] {
  const merged = new Map<string, AdministrativeArea>();
  for (const feature of collection.features) {
    const area = n03FeatureToAdministrativeArea(feature);
    if (!area) continue;
    const existing = merged.get(area.code);
    if (!existing) {
      merged.set(area.code, area);
      continue;
    }
    const existingPolygons = existing.geometry.type === "Polygon"
      ? [existing.geometry.coordinates as number[][][]]
      : existing.geometry.coordinates as number[][][][];
    const nextPolygons = area.geometry.type === "Polygon"
      ? [area.geometry.coordinates as number[][][]]
      : area.geometry.coordinates as number[][][][];
    existing.geometry = { type: "MultiPolygon", coordinates: [...existingPolygons, ...nextPolygons] };
  }
  return [...merged.values()];
}
