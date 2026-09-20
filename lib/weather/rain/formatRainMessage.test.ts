import { describe, expect, it } from "vitest";
import { formatRainMessage } from "./formatRainMessage";

const now = new Date("2026-09-20T09:20:00Z");

describe("formatRainMessage", () => {
  it("turns actionable rain into a life-action message", () => {
    const result = formatRainMessage({
      state: "ACTIONABLE_RAIN",
      shouldNotify: true,
      firstRainTime: "20260920093000",
      firstActionableRainTime: "20260920094000",
      endingTime: null,
    }, now);
    expect(result.headline).toContain("20分後");
    expect(result.detail).toContain("洗濯物");
  });

  it("shows when rain ahead first appears in the official series", () => {
    const result = formatRainMessage({
      state: "RAIN_AHEAD",
      shouldNotify: false,
      firstRainTime: "20260920095000",
      firstActionableRainTime: null,
      endingTime: null,
    }, now);
    expect(result.headline).toContain("30分後");
    expect(result.detail).toContain("急いで入れるほどじゃないよ");
  });

  it("never calls insufficient data dry or safe", () => {
    const result = formatRainMessage({
      state: "INSUFFICIENT_DATA",
      shouldNotify: false,
      firstRainTime: null,
      firstActionableRainTime: null,
      endingTime: null,
    }, now);
    expect(result.headline).toContain("確認できないよ");
    expect(result.detail).toContain("雨が降らないって意味じゃないよ");
    expect(result.headline).not.toContain("雨なし");
  });

  it("uses cautious language for ending rain", () => {
    const result = formatRainMessage({
      state: "ENDING",
      shouldNotify: false,
      firstRainTime: "20260920092000",
      firstActionableRainTime: "20260920092000",
      endingTime: "20260920094000",
    }, now);
    expect(result.headline).toContain("やみそう");
    expect(result.detail).toContain("雨のない予報が続いてるよ");
    expect(result.detail).not.toContain("やみます");
  });
});
