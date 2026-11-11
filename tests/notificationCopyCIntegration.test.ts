import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { OfficialRainFrame, RainFrameStatus, RainIntensityClass } from "../lib/weather/types";
import { interpretRainSeries } from "../lib/weather/rain/RainInterpretationEngine";
import { toRainSemanticEvent } from "../lib/weather/rain/toRainSemanticEvent";
import { formatLaundryNotificationBody } from "../supabase/functions/watch-rain/notificationDecision";

const NOW = new Date("2026-11-11T10:00:00.000Z");
const SOURCE = "JMA_HIGH_RESOLUTION_PRECIPITATION_NOWCAST" as const;
const frame = (
  status: RainFrameStatus,
  validTime: string,
  intensityClass: RainIntensityClass | null = null,
): OfficialRainFrame => ({
  baseTime: "20261111100000",
  validTime,
  status,
  intensityClass,
  rgba: null,
  source: SOURCE,
});
const current = frame("NO_RAIN", "20261111100000");
const lightForecast = [
  frame("RAIN", "20261111100500", "1_TO_5"),
  frame("RAIN", "20261111101000", "1_TO_5"),
  frame("RAIN", "20261111101500", "1_TO_5"),
];

function interpretToBody(
  observation: OfficialRainFrame,
  forecast: OfficialRainFrame[],
  previousConfirmedWeather: string,
) {
  const interpretation = interpretRainSeries({
    now: NOW, current: observation, forecast, expectedForecastFrames: forecast.length,
  });
  const event = toRainSemanticEvent(interpretation, NOW, observation.validTime);
  const selectedClass = forecast.find((f) => f.validTime === event?.actionableAt)?.intensityClass;
  const body = event?.suggestedAction === "BRING_LAUNDRY_INSIDE"
    ? formatLaundryNotificationBody({
      notificationLabel: "羽田空港",
      selectedClass,
      eventType: event.eventType,
      currentStatus: observation.status,
      previousConfirmedWeather,
    })
    : null;
  return { interpretation, event, body };
}

describe("C案: forecast interpretation -> semantic event -> watch-rain copy (offline)", () => {
  it.each([
    ["DRY", "羽田空港：このあと雨が降る予報だよ。洗濯物を確認してね"],
    ["RAINING", "羽田空港：いまは雨が検出されていないけど、また降る予報だよ。洗濯物を確認してね"],
  ])("preserves actionable event metadata while formatting %s", (previous, expectedBody) => {
    const { interpretation, event, body } = interpretToBody(current, lightForecast, previous);
    expect(interpretation.state).toBe("ACTIONABLE_RAIN");
    expect(interpretation.shouldNotify).toBe(true);
    expect(event).toMatchObject({
      eventType: "ACTIONABLE_RAIN_APPROACHING",
      urgency: "LIFESTYLE_ACTION",
      suggestedAction: "BRING_LAUNDRY_INSIDE",
      actionableAt: "20261111100500",
    });
    expect(body).toBe(expectedBody);
  });

  it("retains the previous wording for 5_TO_10 forecasts", () => {
    const forecast = [
      frame("RAIN", "20261111100500", "5_TO_10"),
      frame("RAIN", "20261111101000", "5_TO_10"),
    ];
    const { event, body } = interpretToBody(current, forecast, "DRY");
    expect(event?.eventType).toBe("ACTIONABLE_RAIN_APPROACHING");
    expect(body).toBe("羽田空港：30分以内に雨が降りそう。洗濯物を確認してね");
  });

  it("does not produce an actionable copy for a raining observation", () => {
    const { interpretation, event, body } = interpretToBody(
      frame("RAIN", "20261111100000", "1_TO_5"), lightForecast, "RAINING",
    );
    expect(interpretation.shouldNotify).toBe(false);
    expect(event?.eventType).toBe("RAINING");
    expect(body).toBeNull();
  });

  it("does not produce a semantic event for a stale observation", () => {
    const { interpretation, event, body } = interpretToBody(
      frame("NO_RAIN", "20261111094000"), lightForecast, "DRY",
    );
    expect(interpretation.state).toBe("INSUFFICIENT_DATA");
    expect(event).toBeNull();
    expect(body).toBeNull();
  });

  it("checks that the production watch-rain path uses the tested formatter without changing delivery routing", () => {
    const file = fileURLToPath(new URL("../supabase/functions/watch-rain/index.ts", import.meta.url));
    const source = readFileSync(file, "utf8");
    expect(source).toContain("const laundryBody=formatLaundryNotificationBody({notificationLabel,selectedClass,eventType:rain.event.eventType,currentStatus,previousConfirmedWeather:previous?.confirmed_weather});");
    expect(source).toContain('rain.event.suggestedAction==="BRING_LAUNDRY_INSIDE"?laundryBody');
    expect(source).toContain('const returningRain=false;');
    expect(source).toContain('const notificationEventType=severeEscalation?"SEVERE_RAIN"');
    expect(source).toContain('const notificationUrgency=severeEscalation?"DISASTER":rain.event.urgency;');
    expect(source).toContain("const decision=forecastEpisodeDecision(");
    expect(source).toContain("const outcome=await guardedPush({");
  });
});
