import { describe, expect, it } from "vitest";
import { JmaTileSizeCollector } from "./tileSizeCollector";

const sample = {
  baseTime: "20261029090000",
  validTime: "20261029091000",
  zoom: 10,
  tileX: 909,
  tileY: 403,
  pngBytes: 150,
  width: 256,
  height: 256,
};

describe("JmaTileSizeCollector", () => {
  it("summarizes unique tile frames and replaces duplicates", () => {
    const collector = new JmaTileSizeCollector();
    collector.record(sample);
    collector.record({ ...sample, pngBytes: 170 });
    collector.record({ ...sample, tileX: 910, pngBytes: 230 });
    expect(collector.summary()).toEqual({
      count: 2, totalBytes: 400, minBytes: 170, maxBytes: 230, meanBytes: 200,
    });
  });

  it("bounds samples and rejects invalid byte counts", () => {
    const collector = new JmaTileSizeCollector(1);
    collector.record({ ...sample, pngBytes: -1 });
    collector.record(sample);
    collector.record({ ...sample, tileY: 404, pngBytes: 300 });
    expect(collector.summary().count).toBe(1);
  });

  it("does not expose mutable internal sample references", () => {
    const collector = new JmaTileSizeCollector();
    collector.record(sample);
    const first = collector.snapshot();
    first[0].pngBytes = 999;
    expect(collector.snapshot()[0].pngBytes).toBe(150);
  });

  it("returns null summary statistics for empty input", () => {
    expect(new JmaTileSizeCollector().summary()).toEqual({
      count: 0, totalBytes: 0, minBytes: null, maxBytes: null, meanBytes: null,
    });
  });
});
