import { existsSync } from "node:fs";
import { join } from "node:path";
import type { AdministrativeArea } from "./lightRainAdministrativeAreas";
import { loadPreparedN03ForProof } from "./lightRainN03LocalProof";

/** Read-only nationwide adapter for PR #59's prepared <code>.areas.json assets.
 * Never substitutes an absent prefecture with an empty/rainless result.
 * Production routes, Storage and notifications do not import this module.
 */
export const ALL_PREFECTURE_CODES = Array.from({ length: 47 }, (_, i) => String(i + 1).padStart(2, "0"));

export type NationwideN03Coverage = {
  complete: boolean;
  prefectures: number;
  municipalities: number;
  missing: string[];
  areas: AdministrativeArea[];
};

export function loadNationwidePreparedN03(root: string): NationwideN03Coverage {
  const areas: AdministrativeArea[] = [];
  const missing: string[] = [];
  const codes = new Set<string>();
  for (const prefectureCode of ALL_PREFECTURE_CODES) {
    const file = join(root, prefectureCode + ".areas.json");
    if (!existsSync(file)) {
      missing.push(prefectureCode);
      continue;
    }
    const loaded = loadPreparedN03ForProof(file, prefectureCode);
    for (const area of loaded) {
      if (codes.has(area.code)) throw new Error("Duplicate nationwide N03 code " + area.code);
      codes.add(area.code);
      areas.push(area);
    }
  }
  return { complete: missing.length === 0, prefectures: 47 - missing.length, municipalities: codes.size, missing, areas };
}

export function requireCompleteNationwideN03(root: string): NationwideN03Coverage {
  const coverage = loadNationwidePreparedN03(root);
  if (!coverage.complete) throw new Error("INCOMPLETE_N03_COVERAGE: missing prefectures " + coverage.missing.join(","));
  return coverage;
}
