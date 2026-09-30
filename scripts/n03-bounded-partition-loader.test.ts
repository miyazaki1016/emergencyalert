import { expect, test } from "vitest";
import { partitionAreas, sha256 } from "./n03-partition-design-core";
import { createBoundedPartitionResolver } from "./n03-bounded-partition-loader";
import type { HeavyRainPolygon } from "../lib/weather/rain/nationalHeavyRain";
const areas = [{ code: "01202", prefecture: "北海道", municipality: "test", geometry: { type: "Polygon" as const, coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]] } }];
const rain: HeavyRainPolygon[] = [{ type: "Polygon", coordinates: [[[0,0],[0.1,0],[0.1,0.1],[0,0.1],[0,0]]] }];
test("bounded resolver validates identity, avoids warm IO and shares simultaneous requests", async () => {
  const { index, files } = partitionAreas(areas); let reads = 0;
  const resolver = createBoundedPartitionResolver({ datasets: [{ code: "01", index, indexSha256: sha256(JSON.stringify(index)) }], read: async (_code, file) => { reads++; return Buffer.from(files.get(file)!); } });
  const result = await Promise.all(Array.from({ length: 4 }, () => resolver.resolve(rain)));
  expect(result.map(r => r[0].code)).toEqual(["01202","01202","01202","01202"]);
  await resolver.resolve(rain); expect(reads).toBe(1); expect(resolver.cache.stats.shared).toBe(3);
  expect(resolver.metrics.peakActiveDecodes).toBe(1); expect(resolver.metrics.activeDecodes).toBe(0);
  expect(resolver.cache.stats.weight).toBe(Buffer.byteLength(files.get(index.chunks[0].file)!));
});
test("rejects changed manifest before preselection and changed chunk identity before intersection", async () => {
  const { index, files } = partitionAreas(areas); const digest = sha256(JSON.stringify(index));
  expect(() => createBoundedPartitionResolver({ datasets: [{ code: "01", index: { ...index, parts: [] }, indexSha256: digest }], read: async () => Buffer.from("[]") })).toThrow("manifest identity");
  const filename = index.chunks[0].file; const body = JSON.parse(files.get(filename)!); body[0].areaOrder = 20;
  const changed = JSON.stringify(body); index.chunks[0].bytes = Buffer.byteLength(changed); index.chunks[0].sha256 = sha256(changed);
  const resolver = createBoundedPartitionResolver({ datasets: [{ code: "01", index, indexSha256: sha256(JSON.stringify(index)) }], read: async () => Buffer.from(changed) });
  await expect(resolver.resolve(rain)).rejects.toThrow("identity/bounds");
});
test("keeps national prefecture order even when dataset registration order differs", async () => {
  const one = partitionAreas(areas);
  const three = partitionAreas([{ ...areas[0], code: "03202", prefecture: "岩手県" }]);
  const resolver = createBoundedPartitionResolver({
    datasets: [{ code: "03", index: three.index, indexSha256: sha256(JSON.stringify(three.index)) }, { code: "01", index: one.index, indexSha256: sha256(JSON.stringify(one.index)) }],
    read: async (code, file) => Buffer.from((code === "01" ? one.files : three.files).get(file)!),
  });
  expect((await resolver.resolve(rain)).map(m => m.code)).toEqual(["01202", "03202"]);
});
test('owned chunk resolvers read each chunk once and gather original area order',async()=>{
 const {index,files}=partitionAreas([{...areas[0],geometry:{type:'MultiPolygon',coordinates:[areas[0].geometry.coordinates,areas[0].geometry.coordinates]}}],100);
 const reads:string[]=[];
 const workers=[0,1].map(owner=>createBoundedPartitionResolver({datasets:[{code:'01',index,indexSha256:sha256(JSON.stringify(index))}],owns:(_code,file)=>index.chunks.findIndex(c=>c.file===file)%2===owner,read:async(_code,file)=>{reads.push(file);return Buffer.from(files.get(file)!)}}));
 const results=(await Promise.all(workers.map(w=>w.resolve(rain)))).flat();
 expect(new Set(reads).size).toBe(index.chunks.length);expect(reads.length).toBe(index.chunks.length);
 expect(new Set(results.map(m=>m.code))).toEqual(new Set(['01202']));
});
