import { describe, expect, it } from "vitest";
import { n03PrefectureArchiveName, n03PrefectureArchiveUrl, n03PrefectureGeoJsonName } from "./n03Dataset";

describe("N03 prefecture dataset locator", () => {
  it("builds the official 2026 Tokyo dataset names", () => {
    expect(n03PrefectureArchiveName("13")).toBe("N03-20260101_13_GML.zip");
    expect(n03PrefectureGeoJsonName("13")).toBe("N03-20260101_13.geojson");
    expect(n03PrefectureArchiveUrl("13")).toBe("https://nlftp.mlit.go.jp/ksj/gml/data/N03/N03-2026/N03-20260101_13_GML.zip");
  });

  it("pads one-digit prefecture codes", () => {
    expect(n03PrefectureArchiveName("1")).toBe("N03-20260101_01_GML.zip");
  });

  it("rejects values that are not prefecture codes", () => {
    expect(() => n03PrefectureArchiveName("../13")).toThrow();
    expect(() => n03PrefectureArchiveName("Tokyo")).toThrow();
  });
});
