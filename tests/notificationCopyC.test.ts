import { describe, expect, it } from "vitest";
import { formatLaundryNotificationBody } from "../supabase/functions/watch-rain/notificationDecision";

const base = {
  notificationLabel: "羽田空港",
  selectedClass: "1_TO_5",
  eventType: "ACTIONABLE_RAIN_APPROACHING",
  currentStatus: "NO_RAIN",
  previousConfirmedWeather: "DRY",
} as const;

describe("C案: actionable light-rain notification copy only", () => {
  it("describes upcoming rain rather than continuing rain when previously DRY", () => {
    expect(formatLaundryNotificationBody(base)).toBe(
      "羽田空港：このあと雨が降る予報だよ。洗濯物を確認してね",
    );
  });

  it("describes a possible return without claiming it is raining now when previously RAINING", () => {
    expect(formatLaundryNotificationBody({ ...base, previousConfirmedWeather: "RAINING" })).toBe(
      "羽田空港：いまは雨が検出されていないけど、また降る予報だよ。洗濯物を確認してね",
    );
  });

  it("preserves the existing prefix-free wording for targets without labels", () => {
    expect(formatLaundryNotificationBody({ ...base, notificationLabel: null })).toBe(
      "このあと雨が降る予報だよ。洗濯物を確認してね",
    );
    expect(formatLaundryNotificationBody({ ...base, notificationLabel: "" })).toBe(
      "このあと雨が降る予報だよ。洗濯物を確認してね",
    );
  });

  it.each(["RAIN", "UNKNOWN", "NO_DATA", "FETCH_ERROR", null])(
    "preserves the original copy when the current observation is %s",
    (currentStatus) => {
      expect(formatLaundryNotificationBody({ ...base, currentStatus })).toBe(
        "羽田空港：このあと雨が続きそう。洗濯物を確認してね",
      );
    },
  );

  it.each(["UNKNOWN", null, ""])(
    "preserves the original copy when confirmed weather is %s",
    (previousConfirmedWeather) => {
      expect(formatLaundryNotificationBody({ ...base, previousConfirmedWeather })).toBe(
        "羽田空港：このあと雨が続きそう。洗濯物を確認してね",
      );
    },
  );

  it.each(["5_TO_10", "10_TO_20", null])(
    "preserves the 30-minute copy for class %s",
    (selectedClass) => {
      expect(formatLaundryNotificationBody({ ...base, selectedClass })).toBe(
        "羽田空港：30分以内に雨が降りそう。洗濯物を確認してね",
      );
    },
  );

  it.each(["RAIN_APPROACHING", "RAIN_ENDING", "SEVERE_RAIN", "RAIN_RETURNING", null])(
    "does not change copy for event type %s",
    (eventType) => {
      expect(formatLaundryNotificationBody({ ...base, eventType })).toBe(
        "羽田空港：このあと雨が続きそう。洗濯物を確認してね",
      );
    },
  );

  it("keeps label punctuation and leaves the input unchanged", () => {
    const args = Object.freeze({ ...base, notificationLabel: "羽田空港（東京国際空港）" });
    expect(formatLaundryNotificationBody(args)).toBe(
      "羽田空港（東京国際空港）：このあと雨が降る予報だよ。洗濯物を確認してね",
    );
    expect(args.previousConfirmedWeather).toBe("DRY");
  });
});
