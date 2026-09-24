import type { JmaEarlyForecastTargetTime } from "./earlyForecastTargetTimes";

export function buildJmaEarlyForecastTileUrl(
  frame: Pick<JmaEarlyForecastTargetTime, "basetime" | "validtime">,
  zoom: number,
  tileX: number,
  tileY: number,
): string {
  return [
    "https://www.jma.go.jp/bosai/jmatile/data/rasrf",
    frame.basetime,
    "none",
    frame.validtime,
    "surf",
    "rasrf",
    String(zoom),
    String(tileX),
    `${tileY}.png`,
  ].join("/");
}
