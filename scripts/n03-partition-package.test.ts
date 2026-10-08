import { expect, test } from "vitest";
import { packageN03Prefecture } from "./n03-partition-package";
import { createN03BoundedPartitionResolver } from "../lib/weather/rain/n03BoundedPartitionResolver";

const areas = [{
  code: "13108", prefecture: "東京都", municipality: "江東区",
  geometry: { type: "Polygon" as const, coordinates: [[[139.8,35.6],[139.9,35.6],[139.9,35.7],[139.8,35.7],[139.8,35.6]]] },
}];

test("packages immutable chunk objects and manifest without writing Storage", async () => {
  const result = packageN03Prefecture("13", areas);
  expect(result.manifestPath).toBe("20260101/polygon-parts-v1/13/manifest.json");
  expect(result.chunkCount).toBe(1);
  const manifest = JSON.parse(result.manifestBody);
  const resolver = createN03BoundedPartitionResolver({
    datasets: [{ code: "13", index: manifest.index, indexSha256: manifest.indexSha256 }],
    read: async (_code, file) => Buffer.from(result.objects.get(
      `20260101/polygon-parts-v1/13/${result.indexSha256}/${file}`
    )!),
  });
  expect(await resolver.resolve([{ type: "Polygon", coordinates: [[[139.81,35.61],[139.82,35.61],[139.82,35.62],[139.81,35.62],[139.81,35.61]]] }]))
    .toEqual([{ code: "13108", prefecture: "東京都", municipality: "江東区" }]);
});

test("rejects wrong prefecture and oversized partitions before packaging", () => {
  expect(() => packageN03Prefecture("12", areas)).toThrow("another prefecture");
  expect(() => packageN03Prefecture("13", areas, 10)).toThrow("Oversized");
});
