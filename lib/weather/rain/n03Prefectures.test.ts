import { describe, expect, it } from "vitest";
import { prefecturesForRainPolygons, type N03PrefectureIndexEntry } from "./n03Prefectures";
import type { HeavyRainPolygon } from "./nationalHeavyRain";

const index: N03PrefectureIndexEntry[] = [
  { code: "13", name: "東京都", bbox: [138.9, 35.5, 140.0, 35.9] },
  { code: "14", name: "神奈川県", bbox: [138.9, 35.1, 139.8, 35.7] },
];

function rain(w: number, s: number, e: number, n: number): HeavyRainPolygon {
  return { type: "Polygon", coordinates: [[[w,s],[e,s],[e,n],[w,n],[w,s]]] };
}

describe("N03 prefecture selection", () => {
  it("selects only an intersecting prefecture", () => {
    expect(prefecturesForRainPolygons([rain(139.8,35.71,139.9,35.8)], index).map((x) => x.code)).toEqual(["13"]);
  });

  it("selects neighboring prefectures when rain crosses their bounds", () => {
    expect(prefecturesForRainPolygons([rain(139.4,35.55,139.5,35.65)], index).map((x) => x.code)).toEqual(["13","14"]);
  });

  it("returns none for offshore rain", () => {
    expect(prefecturesForRainPolygons([rain(150,30,151,31)], index)).toEqual([]);
  });
});
