import { validateTownGeometry, type TownGeometry } from "./townBoundaryGeometry";
import {
  validateTownBoundaryManifest,
  type TownBoundaryManifest,
} from "./townBoundaryManifest";

type TownFeature = {
  type: "Feature";
  properties: { municipalityCode: string; [key: string]: unknown };
  geometry: TownGeometry;
};
type TownFeatureCollection = { type: "FeatureCollection"; features: TownFeature[] };

/**
 * Offline pre-promotion gate. Nothing is uploaded or promoted here.
 * The independent inventory is supplied by the operator, not inferred from
 * the files under validation.
 */
export function validatePreparedTownBoundaryDataset(
  manifest: TownBoundaryManifest,
  approvedMunicipalityCodes: readonly string[],
  files: ReadonlyMap<string, Uint8Array>,
) {
  const integrity = validateTownBoundaryManifest(manifest, approvedMunicipalityCodes, files);
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let validatedFeatures = 0;
  for (const entry of manifest.files) {
    const bytes = files.get(entry.path);
    if (!bytes) throw new Error(`Town boundary missing file: ${entry.path}`);
    let parsed: unknown;
    try {
      parsed = JSON.parse(decoder.decode(bytes));
    } catch {
      throw new Error(`Town boundary invalid JSON or UTF-8: ${entry.path}`);
    }
    const collection = parsed as TownFeatureCollection;
    if (!collection || collection.type !== "FeatureCollection" ||
        !Array.isArray(collection.features) ||
        collection.features.length !== entry.features) {
      throw new Error(`Town boundary feature count mismatch: ${entry.path}`);
    }
    for (const feature of collection.features) {
      if (!feature || feature.type !== "Feature" ||
          feature.properties?.municipalityCode !== entry.municipalityCode) {
        throw new Error(`Town boundary municipality ownership mismatch: ${entry.path}`);
      }
      validateTownGeometry(feature.geometry);
      validatedFeatures++;
    }
  }
  if (validatedFeatures !== integrity.totalFeatures) throw new Error("Town boundary feature total mismatch");
  return { ...integrity, validatedFeatures };
}
