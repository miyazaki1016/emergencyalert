import { affectedAdministrativeAreas, type AdministrativeArea, type HeavyRainPolygon } from "./lightRainAdministrativeAreas";
import { locateJmaRainPixelsAtLeast1mm } from "./lightRainProof";

/** Proof-only N03 municipality intersection, preserving each rainy pixel's full footprint. */
export function municipalitiesForLightRainTile(
  tile: Buffer, zoom: number, tileX: number, tileY: number, areas: AdministrativeArea[],
): Array<Pick<AdministrativeArea, "code" | "prefecture" | "municipality">> {
  const pixels = locateJmaRainPixelsAtLeast1mm(tile, zoom, tileX, tileY);
  const size = 256 * 2 ** zoom;
  const longitude = (x: number) => x / size * 360 - 180;
  const latitude = (y: number) => Math.atan(Math.sinh(Math.PI - 2 * Math.PI * y / size)) * 180 / Math.PI;
  const footprint: HeavyRainPolygon[] = pixels.map(({ pixelX, pixelY }) => {
    const x = tileX * 256 + pixelX, y = tileY * 256 + pixelY;
    const w = longitude(x), e = longitude(x + 1), n = latitude(y), s = latitude(y + 1);
    return { coordinates: [[[w, n], [e, n], [e, s], [w, s], [w, n]]] };
  });
  return affectedAdministrativeAreas(footprint, areas)
    .map(({ code, prefecture, municipality }) => ({ code, prefecture, municipality }));
}
