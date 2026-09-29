import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdministrativeArea } from "./administrativeAreas";
import { N03_DATASET_DATE } from "./n03Dataset";
import type { N03AdministrativeAreaLoader } from "./nationalRainMunicipalityResolver";

export const NATIONAL_RAIN_N03_BUCKET = "national-rain-n03";
export const NATIONAL_RAIN_N03_PREFIX = N03_DATASET_DATE;

export function nationalRainN03ObjectPath(prefectureCode: string) {
  if (!/^\d{2}$/.test(prefectureCode)) throw new Error("Invalid N03 prefecture code");
  return `${NATIONAL_RAIN_N03_PREFIX}/${prefectureCode}.areas.json`;
}

function isAdministrativeArea(value: unknown): value is AdministrativeArea {
  if (!value || typeof value !== "object") return false;
  const area = value as Partial<AdministrativeArea>;
  const geometry = area.geometry as { type?: unknown; coordinates?: unknown } | undefined;
  return typeof area.code === "string"
    && typeof area.prefecture === "string"
    && typeof area.municipality === "string"
    && !!geometry
    && (geometry.type === "Polygon" || geometry.type === "MultiPolygon")
    && Array.isArray(geometry.coordinates);
}

export function createSupabaseN03AdministrativeAreaLoader(
  supabase: Pick<SupabaseClient, "storage">,
  cache = new Map<string, AdministrativeArea[]>(),
): N03AdministrativeAreaLoader {
  return async (prefectures) => {
    const missing = prefectures.filter(({ code }) => !cache.has(code));

    await Promise.all(missing.map(async ({ code, name }) => {
      const path = nationalRainN03ObjectPath(code);
      const { data, error } = await supabase.storage.from(NATIONAL_RAIN_N03_BUCKET).download(path);
      if (error || !data) {
        throw new Error(`N03 prepared data download failed: ${code} ${error?.message ?? "missing data"}`);
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(await data.text());
      } catch {
        throw new Error(`N03 prepared data is not valid JSON: ${code}`);
      }
      if (!Array.isArray(parsed)) throw new Error(`N03 prepared data must be an array: ${code}`);
      if (!parsed.every(isAdministrativeArea)) {
        throw new Error(`N03 prepared data has invalid area shape: ${code}`);
      }

      const areas = parsed;
      if (areas.some((area) => area.prefecture !== name)) {
        throw new Error(`N03 prepared data prefecture mismatch: ${code}`);
      }
      cache.set(code, areas);
    }));

    return prefectures.flatMap(({ code }) => cache.get(code) ?? []);
  };
}
