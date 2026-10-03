import { affectedAdministrativeAreas, type AdministrativeArea } from "./administrativeAreas";
import type { HeavyRainPolygon } from "./nationalHeavyRain";

export type NationalRainMunicipality = Pick<AdministrativeArea, "code" | "prefecture" | "municipality">;

export function municipalitiesForNationalRainFootprint(
  footprint: HeavyRainPolygon[],
  areas: AdministrativeArea[],
): NationalRainMunicipality[] {
  return affectedAdministrativeAreas(footprint, areas).map(({ code, prefecture, municipality }) => ({
    code,
    prefecture,
    municipality,
  }));
}
