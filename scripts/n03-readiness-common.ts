import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { HeavyRainPolygon } from "../lib/weather/rain/nationalHeavyRain";
import { N03_PREFECTURE_INDEX_2026 } from "../lib/weather/rain/n03PrefectureIndex2026";
import type { PartitionIndex } from "./n03-partition-design-core";
export const REPRESENTATIVES = ["01", "42", "03", "47"];
export const STRESS_TILES: Record<string, { x: number; y: number }> = {
  "01": { x: 228, y: 94 }, "42": { x: 220, y: 103 }, "03": { x: 228, y: 97 }, "47": { x: 218, y: 108 },
};
// Final-stage z10 representatives. These stay inside the same z8 parent area but
// choose a child that actually intersects the representative prefecture geometry.
export const FINAL_STAGE_STRESS_TILES: Record<string, { x: number; y: number }> = {
  "01": { x: 912, y: 376 }, "42": { x: 880, y: 412 }, "03": { x: 912, y: 388 }, "47": { x: 873, y: 435 },
};
export function tileFootprint(x: number, y: number): HeavyRainPolygon[] {
  const coordinate = (x: number, y: number): [number, number] => [x / 256 * 360 - 180, Math.atan(Math.sinh(Math.PI - 2 * Math.PI * y / 256)) * 180 / Math.PI];
  return [{ type: "Polygon", coordinates: [[coordinate(x, y), coordinate(x + 1, y), coordinate(x + 1, y + 1), coordinate(x, y + 1), coordinate(x, y)]] }];
}
export function representativeQueries(code: string) {
  const pref = N03_PREFECTURE_INDEX_2026.find(p => p.code === code)!;
  const tile = (lon: number, lat: number) => ({ x: Math.floor((lon + 180) / 360 * 256), y: Math.floor((1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * 256) });
  const nw = tile(pref.bbox[0], pref.bbox[3]), se = tile(pref.bbox[2], pref.bbox[1]);
  const stress = STRESS_TILES[code];
  const rows = [{ key: "stress", rain: tileFootprint(stress.x, stress.y) }];
  for (let y = nw.y; y <= se.y; y++) for (let x = nw.x; x <= se.x; x++) rows.push({ key: `tile-${x}-${y}`, rain: tileFootprint(x, y) });
  const [w, s, e, n] = pref.bbox;
  rows.push({ key: "whole-prefecture", rain: [{ type: "Polygon", coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] }] });
  return rows;
}
export function datasets(root: string, codes: string[]) {
  return codes.map(code => {
    const index: PartitionIndex = JSON.parse(readFileSync(join(root, code, "index.json"), "utf8"));
    const metadata = JSON.parse(readFileSync(join(root, code, "preparation.json"), "utf8"));
    return { code, index, indexSha256: metadata.indexSha256 };
  });
}
