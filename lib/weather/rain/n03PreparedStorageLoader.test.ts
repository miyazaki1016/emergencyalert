import { describe, expect, it, vi } from "vitest";
import type { AdministrativeArea } from "./administrativeAreas";
import {
  createSupabaseN03AdministrativeAreaLoader,
  nationalRainN03ObjectPath,
  NATIONAL_RAIN_N03_BUCKET,
} from "./n03PreparedStorageLoader";

function area(code: string, prefecture: string): AdministrativeArea {
  return {
    code,
    prefecture,
    municipality: code,
    geometry: {
      type: "Polygon",
      coordinates: [[[139, 35], [140, 35], [140, 36], [139, 36], [139, 35]]],
    },
  };
}

function client(files: Record<string, AdministrativeArea[]>) {
  const download = vi.fn(async (path: string) => {
    const value = files[path];
    if (!value) return { data: null, error: { message: "not found" } };
    return { data: new Blob([JSON.stringify(value)], { type: "application/json" }), error: null };
  });
  const from = vi.fn(() => ({ download }));
  return { storage: { from }, from, download };
}

describe("createSupabaseN03AdministrativeAreaLoader", () => {
  it("downloads only requested prefectures and preserves requested order", async () => {
    const storage = client({
      "20260101/13.areas.json": [area("13111", "東京都")],
      "20260101/14.areas.json": [area("14130", "神奈川県")],
    });
    const loader = createSupabaseN03AdministrativeAreaLoader(storage as any);

    const result = await loader([
      { code: "14", name: "神奈川県", bbox: [0, 0, 0, 0] },
      { code: "13", name: "東京都", bbox: [0, 0, 0, 0] },
    ]);

    expect(storage.from).toHaveBeenCalledWith(NATIONAL_RAIN_N03_BUCKET);
    expect(storage.download).toHaveBeenCalledTimes(2);
    expect(result.map(({ code }) => code)).toEqual(["14130", "13111"]);
  });

  it("reuses cached prefecture data across calls", async () => {
    const storage = client({ "20260101/13.areas.json": [area("13111", "東京都")] });
    const cache = new Map<string, AdministrativeArea[]>();
    const loader = createSupabaseN03AdministrativeAreaLoader(storage as any, cache);
    const prefecture = [{ code: "13", name: "東京都", bbox: [0, 0, 0, 0] as [number, number, number, number] }];

    await loader(prefecture);
    await loader(prefecture);

    expect(storage.download).toHaveBeenCalledTimes(1);
    expect(cache.has("13")).toBe(true);
  });

  it("fails closed when prepared data is missing", async () => {
    const storage = client({});
    const loader = createSupabaseN03AdministrativeAreaLoader(storage as any);

    await expect(loader([{ code: "13", name: "東京都", bbox: [0, 0, 0, 0] }]))
      .rejects.toThrow("N03 prepared data download failed: 13");
  });

  it("rejects a prefecture mismatch instead of using wrong geometry", async () => {
    const storage = client({ "20260101/13.areas.json": [area("14130", "神奈川県")] });
    const loader = createSupabaseN03AdministrativeAreaLoader(storage as any);

    await expect(loader([{ code: "13", name: "東京都", bbox: [0, 0, 0, 0] }]))
      .rejects.toThrow("N03 prepared data prefecture mismatch: 13");
  });

  it("rejects malformed prepared area data", async () => {
    const storage = client({ "20260101/13.areas.json": [{ prefecture: "東京都" } as any] });
    const loader = createSupabaseN03AdministrativeAreaLoader(storage as any);

    await expect(loader([{ code: "13", name: "東京都", bbox: [0, 0, 0, 0] }]))
      .rejects.toThrow("N03 prepared data has invalid area shape: 13");
  });

  it("uses the exact dataset date/prefecture object path", () => {
    expect(nationalRainN03ObjectPath("13")).toBe("20260101/13.areas.json");
    expect(() => nationalRainN03ObjectPath("1")).toThrow("Invalid N03 prefecture code");
  });
});
