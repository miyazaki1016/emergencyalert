import type { AdministrativeArea } from "./administrativeAreas";
import { N03_PREFECTURE_INDEX_2026 } from "./n03PrefectureIndex2026";
import { prefecturesForRainPolygons, type N03PrefectureIndexEntry } from "./n03Prefectures";
import type { HeavyRainPolygon } from "./nationalHeavyRain";
import {
  municipalitiesForNationalRainFootprint,
  type NationalRainMunicipality,
} from "./nationalRainMunicipalities";

export type N03AdministrativeAreaLoader = (
  prefectures: N03PrefectureIndexEntry[],
  signal?: AbortSignal,
) => Promise<AdministrativeArea[]>;

export async function resolveNationalRainMunicipalities(
  footprint: HeavyRainPolygon[],
  loadAdministrativeAreas: N03AdministrativeAreaLoader,
  prefectureIndex: N03PrefectureIndexEntry[] = N03_PREFECTURE_INDEX_2026,
  signal?: AbortSignal,
): Promise<NationalRainMunicipality[]> {
  if (footprint.length === 0) return [];

  const prefectures = prefecturesForRainPolygons(footprint, prefectureIndex);
  if (prefectures.length === 0) return [];

  signal?.throwIfAborted();
  const areas = await loadAdministrativeAreas(prefectures, signal);
  signal?.throwIfAborted();
  const municipalities = municipalitiesForNationalRainFootprint(footprint, areas);
  signal?.throwIfAborted();
  return municipalities;
}
