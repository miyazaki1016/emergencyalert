import { describe, expect, it } from "vitest";
import { validateTownGeometry, type TownGeometry } from "./townBoundaryGeometry";
const square = [[0,0],[4,0],[4,4],[0,4],[0,0]];
const hole = [[1,1],[2,1],[2,2],[1,2],[1,1]];
const polygon = (rings: number[][][]): TownGeometry => ({ type: "Polygon", coordinates: rings });

describe("town boundary polygon preflight", () => {
  it("accepts a closed exterior with a contained hole", () => {
    expect(() => validateTownGeometry(polygon([square,hole]))).not.toThrow();
  });
  it("accepts multipolygon geometry", () => {
    expect(() => validateTownGeometry({ type:"MultiPolygon", coordinates:[[square],[hole]] })).not.toThrow();
  });
  it("rejects open, degenerate and non-finite rings", () => {
    expect(() => validateTownGeometry(polygon([square.slice(0,4)]))).toThrow("Invalid town ring");
    expect(() => validateTownGeometry(polygon([[[0,0],[1,0],[2,0],[0,0]]]))).toThrow("Invalid town ring");
    expect(() => validateTownGeometry(polygon([[[0,0],[Infinity,0],[4,4],[0,0]]]))).toThrow("Invalid town ring");
  });
  it("rejects self-intersecting rings", () => {
    expect(() => validateTownGeometry(polygon([[[0,0],[4,4],[0,4],[4,0],[0,0]]])))
      .toThrow("Invalid town ring");
  });
  it("rejects holes outside or crossing the exterior", () => {
    expect(() => validateTownGeometry(polygon([square,[[5,5],[6,5],[6,6],[5,6],[5,5]]])))
      .toThrow("Town hole outside");
    expect(() => validateTownGeometry(polygon([square,[[3,3],[5,3],[5,5],[3,5],[3,3]]])))
      .toThrow("Town hole outside");
  });
  it("rejects overlapping holes", () => {
    expect(() => validateTownGeometry(polygon([square,hole,[[1.5,1.5],[2.5,1.5],[2.5,2.5],[1.5,2.5],[1.5,1.5]]])))
      .toThrow("Town holes overlap");
  });
});
