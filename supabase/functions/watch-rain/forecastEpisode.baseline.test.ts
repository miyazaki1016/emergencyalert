import { assertEquals } from "jsr:@std/assert@1";
import { advanceForecastEpisode, forecastEpisodeDecision, forecastSignal, type ForecastEpisode } from "./forecastEpisode.ts";

const initial = (): ForecastEpisode => ({
  id: "episode-1", active: true, approachNotified: true,
  peakSevere: 0, clearForecasts: 0, lastForecastAt: null,
});
const at = (minutes: number) => new Date(Date.UTC(2026, 10, 9, 0, minutes)).toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
const now = Date.UTC(2026, 10, 9, 0, 0);

Deno.test("ending gate: only enabled ending yields an ending notification", () => {
  assertEquals(forecastEpisodeDecision(initial(), true, false, 0, true).notify, true);
  assertEquals(forecastEpisodeDecision(initial(), true, false, 0, true).key, "episode-1/ENDING");
  assertEquals(forecastEpisodeDecision(initial(), false, false, 0, true).notify, false);
  assertEquals(forecastEpisodeDecision(initial(), true, false, 0, false).notify, false);
});

Deno.test("forecast clear needs three distinct source frames before episode closes", () => {
  let state = initial();
  state = advanceForecastEpisode(state, "CLEAR", at(5), "next");
  assertEquals(state.clearForecasts, 1);
  state = advanceForecastEpisode(state, "CLEAR", at(5), "next");
  assertEquals(state.clearForecasts, 1);
  state = advanceForecastEpisode(state, "CLEAR", at(10), "next");
  assertEquals(state.active, true);
  state = advanceForecastEpisode(state, "CLEAR", at(15), "next");
  assertEquals(state.active, false);
  assertEquals(state.approachNotified, false);
});

Deno.test("unknown signal resets clear streak without closing episode", () => {
  const state = advanceForecastEpisode(initial(), "CLEAR", at(5), "next");
  const result = advanceForecastEpisode(state, "UNKNOWN", at(10), "next");
  assertEquals(result.clearForecasts, 0);
  assertEquals(result.active, true);
});

Deno.test("forecast signal is unknown for stale or incomplete interpretation", () => {
  const forecast = [{ baseTime: at(5), validTime: at(10), status: "NO_RAIN" }];
  assertEquals(forecastSignal({ interpretationEnabled: false, interpretation: {state: "DRY"}, forecast }, now).signal, "UNKNOWN");
  assertEquals(forecastSignal({ interpretationEnabled: true, interpretation: {state: "UNKNOWN"}, forecast }, now).signal, "UNKNOWN");
  assertEquals(forecastSignal({ interpretationEnabled: true, interpretation: {state: "DRY"}, forecast }, now).signal, "CLEAR");
  assertEquals(forecastSignal({ interpretationEnabled: true, interpretation: {state: "DRY"}, forecast }, Date.UTC(2026, 10, 9, 0, 20)).signal, "UNKNOWN");
});

Deno.test("severe event takes priority over ending in notification key", () => {
  const result = forecastEpisodeDecision(initial(), true, false, 2, true);
  assertEquals(result.severe, true);
  assertEquals(result.key, "episode-1/SEVERE");
});
