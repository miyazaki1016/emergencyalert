import { describe, expect, test } from "vitest";
import { BoundedChunkCache } from "./boundedChunkCache";

describe("weighted chunk LRU admission", () => {
  test("LRU hits avoid reads and eviction reloads the oldest unused entry", async () => {
    const cache = new BoundedChunkCache<string>(20); const reads: string[] = [];
    const get = (key: string) => cache.use(key, 10, async () => { reads.push(key); return key; }, x => x);
    await get("a"); await get("b"); await get("a"); await get("c"); await get("b");
    expect(reads).toEqual(["a", "b", "c", "b"]);
    expect(cache.stats.hits).toBe(1); expect(cache.stats.evictions).toBe(2);
    expect(cache.stats.peakWeight).toBe(20);
  });
  test("shares an in-flight read and pins all consumers before eviction", async () => {
    const cache = new BoundedChunkCache<number>(10);
    let finish!: () => void, release!: () => void;
    const loading = new Promise<void>(r => { finish = r; });
    const held = new Promise<void>(r => { release = r; });
    let reads = 0, secondLoaded = false;
    const load = async () => { reads++; await loading; return 1; };
    const a = cache.use("a", 10, load, async x => { await held; return x; });
    const shared = cache.use("a", 10, load, x => x);
    finish(); await shared;
    const b = cache.use("b", 10, async () => { secondLoaded = true; return 2; }, x => x);
    await new Promise(r => setTimeout(r, 1)); expect(secondLoaded).toBe(false);
    release(); await Promise.all([a, b]);
    expect(reads).toBe(1); expect(cache.stats.shared).toBe(1);
    expect(cache.stats.peakActiveLoads).toBe(1);
  });
  test("failed load/consumer releases reservation and oversized admission fails before IO", async () => {
    const cache = new BoundedChunkCache<number>(10); let calls = 0;
    await expect(cache.use("bad", 10, async () => { throw new Error("missing"); }, x => x)).rejects.toThrow("missing");
    expect(cache.stats.weight).toBe(0);
    await expect(cache.use("large", 11, async () => { calls++; return 1; }, x => x)).rejects.toThrow("admission");
    expect(calls).toBe(0);
    await expect(cache.use("a", 10, async () => 1, () => { throw new Error("consumer"); })).rejects.toThrow("consumer");
    expect(await cache.use("b", 10, async () => 2, x => x)).toBe(2);
  });
  test("retention stays bounded over repeated diverse working sets", async () => {
    const cache = new BoundedChunkCache<number>(30);
    for (let i = 0; i < 1000; i++) await cache.use(String(i % 47), 10, async () => i, x => x);
    expect(cache.stats.peakWeight).toBe(30); expect(cache.stats.evictions).toBe(997);
    cache.clearUnused(); expect(cache.stats.weight).toBe(0);
  });
});
