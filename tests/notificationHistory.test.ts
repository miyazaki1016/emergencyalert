import { describe, expect, it } from "vitest";
import { prioritizeNotification, savedWeatherAnswerLabel } from "../lib/weather/rain/notificationHistory";

describe("notification feedback experience", () => {
  const items = [{ id: 3 }, { id: 2 }, { id: 1 }];
  it("moves the tapped notification to the top without dropping or mutating the list", () => {
    const result = prioritizeNotification(items, 1);
    expect(result.map(item => item.id)).toEqual([1, 3, 2]);
    expect(items.map(item => item.id)).toEqual([3, 2, 1]);
  });
  it("keeps recent order when there is no matching deep link", () => {
    expect(prioritizeNotification(items, null)).toEqual(items);
    expect(prioritizeNotification(items, 9)).toEqual(items);
    expect(prioritizeNotification(items, 3)).toEqual(items);
  });
  it("shows only valid saved answers in the notification's own vocabulary", () => {
    const start = [["RAINED", "降った"], ["DID_NOT_RAIN", "降らなかった"]] as const;
    expect(savedWeatherAnswerLabel("RAINED", start)).toBe("回答済み：降った");
    expect(savedWeatherAnswerLabel("STOPPED", start)).toBeNull();
    expect(savedWeatherAnswerLabel(undefined, start)).toBeNull();
    expect(savedWeatherAnswerLabel("RAINED", null)).toBeNull();
  });
});
