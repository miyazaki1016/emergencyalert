import { performance } from "node:perf_hooks";
import type { HeavyRainPolygon } from "../lib/weather/rain/nationalHeavyRain";
import { affectedAdministrativeAreas, rainPolygonIntersectsAdministrativeArea, type AdministrativeArea } from "../lib/weather/rain/administrativeAreas";

const rain = (west: number, south: number, east: number, north: number): HeavyRainPolygon => ({
  type: "Polygon",
  coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
});

const area = (i: number, west: number, south: number): AdministrativeArea => ({
  code: String(i).padStart(5, "0"),
  prefecture: "benchmark",
  municipality: `area-${i}`,
  geometry: { type: "Polygon", coordinates: [[[west, south], [west + 0.12, south], [west + 0.12, south + 0.08], [west, south + 0.08], [west, south]]] },
});

const areas = Array.from({ length: 700 }, (_, i) => area(i, 128 + (i % 35) * 0.45, 26 + Math.floor(i / 35) * 0.45));
const rains = Array.from({ length: 450 }, (_, i) => rain(130 + (i % 30) * 0.38, 28 + Math.floor(i / 30) * 0.38, 130.08 + (i % 30) * 0.38, 28.06 + Math.floor(i / 30) * 0.38));

function legacy() {
  return areas.filter((a) => rains.some((r) => rainPolygonIntersectsAdministrativeArea(r, a)));
}

function measure(fn: () => AdministrativeArea[]) {
  const samples: number[] = [];
  let result: AdministrativeArea[] = [];
  for (let i = 0; i < 7; i++) {
    const start = performance.now();
    result = fn();
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  return { medianMs: samples[Math.floor(samples.length / 2)], matches: result.map((x) => x.code) };
}

const oldResult = measure(legacy);
const currentResult = measure(() => affectedAdministrativeAreas(rains, areas));
if (JSON.stringify(oldResult.matches) !== JSON.stringify(currentResult.matches)) throw new Error("benchmark result mismatch");
console.log(JSON.stringify({ areas: areas.length, rainPolygons: rains.length, legacyMedianMs: oldResult.medianMs, currentMedianMs: currentResult.medianMs, speedup: oldResult.medianMs / currentResult.medianMs, matches: currentResult.matches.length }));
