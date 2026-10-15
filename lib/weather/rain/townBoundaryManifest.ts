import { createHash } from "node:crypto";

export type TownBoundaryFile = {
  municipalityCode: string;
  path: string;
  bytes: number;
  sha256: string;
  features: number;
};
export type TownBoundaryManifest = {
  dataset: string;
  source: string;
  license: string;
  version: string;
  expectedMunicipalityCodes: string[];
  files: TownBoundaryFile[];
};

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

/**
 * Offline, fail-closed pre-promotion validation. The caller supplies the
 * independently approved municipality inventory; the manifest cannot declare
 * itself complete simply by omitting a municipality.
 */
export function validateTownBoundaryManifest(
  manifest: TownBoundaryManifest,
  approvedMunicipalityCodes: readonly string[],
  files: ReadonlyMap<string, Uint8Array>,
): { municipalities: number; totalBytes: number; totalFeatures: number } {
  if (!manifest || typeof manifest !== "object" ||
      ![manifest.dataset, manifest.source, manifest.license, manifest.version].every(
        (v) => typeof v === "string" && v.trim().length > 0,
      )) throw new Error("Town boundary provenance incomplete");
  if (!Array.isArray(approvedMunicipalityCodes) || approvedMunicipalityCodes.length === 0 ||
      !Array.isArray(manifest.expectedMunicipalityCodes) || !Array.isArray(manifest.files)) {
    throw new Error("Town boundary coverage inventory missing");
  }
  const approved = new Set(approvedMunicipalityCodes);
  if (approved.size !== approvedMunicipalityCodes.length ||
      [...approved].some((code) => !/^\\d{5}$/.test(code))) {
    throw new Error("Invalid independent municipality inventory");
  }
  const declared = new Set(manifest.expectedMunicipalityCodes);
  if (declared.size !== approved.size ||
      manifest.expectedMunicipalityCodes.length !== approved.size ||
      [...approved].some((code) => !declared.has(code))) {
    throw new Error("Town boundary coverage inventory mismatch");
  }
  const seen = new Set<string>();
  const paths = new Set<string>();
  let totalBytes = 0, totalFeatures = 0;
  for (const entry of manifest.files) {
    if (!entry || typeof entry.municipalityCode !== "string" ||
        !approved.has(entry.municipalityCode) || seen.has(entry.municipalityCode)) {
      throw new Error("Town boundary missing, extra or duplicate municipality");
    }
    if (typeof entry.path !== "string" || !/^[a-zA-Z0-9_./-]+\\.json$/.test(entry.path) ||
        entry.path.startsWith("/") || entry.path.split("/").includes("..") ||
        paths.has(entry.path)) throw new Error("Invalid or duplicate town boundary path");
    if (!Number.isSafeInteger(entry.bytes) || entry.bytes <= 0 ||
        !Number.isSafeInteger(entry.features) || entry.features <= 0 ||
        typeof entry.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(entry.sha256)) {
      throw new Error("Invalid town boundary file metadata");
    }
    const data = files.get(entry.path);
    if (!data || data.byteLength !== entry.bytes || sha256(data) !== entry.sha256) {
      throw new Error(`Town boundary content mismatch: ${entry.municipalityCode}`);
    }
    seen.add(entry.municipalityCode);
    paths.add(entry.path);
    totalBytes += entry.bytes;
    totalFeatures += entry.features;
  }
  if (seen.size !== approved.size) throw new Error("Town boundary municipality coverage incomplete");
  return { municipalities: seen.size, totalBytes, totalFeatures };
}
