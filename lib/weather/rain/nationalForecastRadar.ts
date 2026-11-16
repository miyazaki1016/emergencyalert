import { buildJmaRainTileUrl } from "../providers/jma/tileUrl";
import type { RadarTile } from "./nationalForecastSnapshot";

export function forecastRadarSources(basetime: string, validTime: string, tile: RadarTile) {
  return {
    background: `https://cyberjapandata.gsi.go.jp/xyz/pale/10/${tile.x}/${tile.y}.png`,
    rain: buildJmaRainTileUrl({ basetime, validtime: validTime }, 10, tile.x, tile.y),
  };
}
