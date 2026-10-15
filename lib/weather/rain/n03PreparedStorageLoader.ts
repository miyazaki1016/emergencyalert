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
  maxCachedPrefectures = 4,
): N03AdministrativeAreaLoader {
  if (!Number.isSafeInteger(maxCachedPrefectures) || maxCachedPrefectures < 1) {
    throw new Error("Invalid N03 prefecture cache limit");
  }
  const loading = new Map<string, Promise<AdministrativeArea[]>>();

  const loadOne = ({ code, name }: { code: string; name: string }, signal?: AbortSignal) => {
    const cached = cache.get(code);
    if (cached) {
      cache.delete(code);
      cache.set(code, cached);
      return Promise.resolve(cached);
    }

    const existing = loading.get(code);
    if (existing) return existing;

    const promise = (async () => {
      signal?.throwIfAborted();
      const path = nationalRainN03ObjectPath(code);
      const { data, error } = await supabase.storage.from(NATIONAL_RAIN_N03_BUCKET).download(path, {}, { signal });
      if (error || !data) {
        throw new Error(`N03 prepared data download failed: ${code} ${error?.message ?? "missing data"}`);
      }

      signal?.throwIfAborted();
      let parsed: unknown;
      try {
        const text = await data.text();
        signal?.throwIfAborted();
        parsed = JSON.parse(text);
      } catch {
        throw new Error(`N03 prepared data is not valid JSON: ${code}`);
      }
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error(`N03 prepared data must be a non-empty array: ${code}`);
      }
      if (!parsed.every(isAdministrativeArea)) {
        throw new Error(`N03 prepared data has invalid area shape: ${code}`);
      }

      const areas = parsed;
      if (areas.some((area) => area.prefecture !== name)) {
        throw new Error(`N03 prepared data prefecture mismatch: ${code}`);
      }
      if (areas.some((area) => !/^\d{5}$/.test(area.code) || !area.code.startsWith(code))) {
        throw new Error(`N03 prepared data municipality identity mismatch: ${code}`);
      }
      if (new Set(areas.map((area) => area.code)).size !== areas.length) {
        throw new Error(`N03 prepared data contains duplicate municipality codes: ${code}`);
      }
      signal?.throwIfAborted();
      cache.delete(code);
      cache.set(code, areas);
      while (cache.size > maxCachedPrefectures) {
        const oldest = cache.keys().next().value;
        if (oldest === undefined) break;
        cache.delete(oldest);
      }
      return areas;
    })();

    loading.set(code, promise);
    void promise.finally(() => {
      if (loading.get(code) === promise) loading.delete(code);
    }).catch(() => undefined);
    return promise;
  };

  return async (prefectures, signal) => {
    signal?.throwIfAborted();
    // Use the resolved values, not the cache: an eviction during a multi-prefecture
    // request must never silently omit a prefecture from the result.
    const loaded = await Promise.all(prefectures.map((prefecture) => loadOne(prefecture, signal)));
    signal?.throwIfAborted();
    return loaded.flat();
  };
}
