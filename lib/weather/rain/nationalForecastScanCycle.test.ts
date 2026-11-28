import { describe, expect, it } from "vitest";
import { forecastTileCycleFailed, scanForecastRegionWithinBudget } from "./nationalForecastScanCycle";
import { buildNationalTileForecast, type ForecastTileVersion } from "./nationalForecastTiles";

describe("national forecast scan budget", () => {
  const now = Date.UTC(2026, 10, 28, 14, 1);
  const row: ForecastTileVersion = {
    base_time: "20261128140000", valid_time: "20261128141000",
    extended: false, x: 14, y: 6, payload: null,
  };

  it("retains completed writes and keeps cycle-aborted or partly scanned regions unknown", async () => {
    const cycle = new AbortController();
    const signal = AbortSignal.any([cycle.signal, new AbortController().signal]);
    const complete = await scanForecastRegionWithinBudget(cycle.signal, signal, async () => ({
      pending: [], tiles: {},
    }));
    cycle.abort();
    const interrupted = await scanForecastRegionWithinBudget(cycle.signal, signal, async () => signal.throwIfAborted());
    const partial = await scanForecastRegionWithinBudget(cycle.signal, signal, async () => ({
      pending: ["900/400"], tiles: {},
    }));
    expect(interrupted).toEqual({ status: "deferred" });
    expect(partial).toEqual({ status: "deferred" });
    if (complete.status !== "scanned") throw new Error("Expected completed region");
    expect(forecastTileCycleFailed({
      failures: 0, writes: 1, hasTargets: true, hasWork: true, budgetExpired: true,
    })).toBe(false);
    const snapshot = buildNationalTileForecast([
      { ...row, payload: complete.payload }, { ...row, x: 13 },
    ], now);
    expect(snapshot?.frames[0]).toMatchObject({ incomplete: true, municipalities: [] });
    expect(snapshot?.frames[0].tileCoverage).toContainEqual({ x: 13, y: 6, basetime: undefined });
    expect(snapshot?.frames[0].tileCoverage).toContainEqual({ x: 14, y: 6, basetime: row.base_time });
  });

  it("preserves a genuine failure even if the cycle also expires", async () => {
    const cycle = new AbortController();
    const validity = new AbortController();
    const signal = AbortSignal.any([cycle.signal, validity.signal]);
    const fetchError = new Error("HTTP 503");
    const failed = await scanForecastRegionWithinBudget(cycle.signal, signal, async () => {
      cycle.abort();
      throw fetchError;
    });
    expect(failed).toEqual({ status: "failed", error: fetchError });
    expect(forecastTileCycleFailed({
      failures: 1, writes: 2, hasTargets: true, hasWork: true, budgetExpired: true,
    })).toBe(true);
  });

  it("does not treat a valid-time abort as a cycle deadline", async () => {
    const cycle = new AbortController();
    const validity = new AbortController();
    const signal = AbortSignal.any([cycle.signal, validity.signal]);
    validity.abort();
    cycle.abort();
    expect(await scanForecastRegionWithinBudget(cycle.signal, signal, async () => signal.throwIfAborted()))
      .toEqual({ status: "failed", error: validity.signal.reason });
  });

  it("keeps the no-update checks when a cycle is not deferred or targets are unavailable", () => {
    const stalled = { failures: 0, writes: 0, hasTargets: true, hasWork: true, budgetExpired: false };
    expect(forecastTileCycleFailed(stalled)).toBe(true);
    expect(forecastTileCycleFailed({ ...stalled, budgetExpired: true })).toBe(false);
    expect(forecastTileCycleFailed({ ...stalled, budgetExpired: true, hasTargets: false })).toBe(true);
  });
});
