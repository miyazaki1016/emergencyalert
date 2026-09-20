import type { JmaTargetTime } from "./targetTimes";

export function buildJmaRainTileUrl(
  frame: Pick<JmaTargetTime, "basetime" | "validtime">,
  zoom: number,
  tileX: number,
  tileY: number,
): string {
  return [
    "https://www.jma.go.jp/bosai/jmatile/data/nowc",
    frame.basetime,
    "none",
    frame.validtime,
    "surf",
    "hrpns",
    String(zoom),
    String(tileX),
    `${tileY}.png`,
  ].join("/");
}
