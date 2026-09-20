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
    expect(result.detail).toContain("急いで取り込む強さとは判定していません");
  });

  it("never calls insufficient data dry or safe", () => {
    const result = formatRainMessage({
      state: "INSUFFICIENT_DATA",
      shouldNotify: false,
      firstRainTime: null,
      firstActionableRainTime: null,
      endingTime: null,
    }, now);
    expect(result.headline).toContain("確認できません");
    expect(result.detail).toContain("雨が降らないという意味ではありません");
  });

  it("uses cautious language for ending rain", () => {
    const result = formatRainMessage({
      state: "ENDING",
      shouldNotify: false,
      firstRainTime: "20260920092000",
      firstActionableRainTime: "20260920092000",
      endingTime: "20260920094000",
    }, now);
    expect(result.detail).toContain("降水のない予報が続いています");
    expect(result.detail).not.toContain("やみます");
  });
});
