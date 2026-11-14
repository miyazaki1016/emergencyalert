import { describe, expect, it } from "vitest";
import { nextRainPlaybackIndex, validateRainPlaybackTimeline } from "./nationalRainPlayback";

const issuedAt = "2026-11-13T00:00:00.000Z";
const frames = Array.from({ length: 6 }, (_, i) => ({
  validTime: new Date(Date.parse(issuedAt) + (i + 1) * 300_000).toISOString(),
  imageUrl: `/api/rain/frame/${i}`,
}));
const timeline = {
  issuedAt,
  expiresAt: "2026-11-13T00:30:00.000Z",
  frames,
};

describe("national rain playback timeline", () => {
  it("accepts six consecutive forecast frames before expiration", () => {
    expect(validateRainPlaybackTimeline(timeline, Date.parse(issuedAt))).toBe(timeline);
    expect(nextRainPlaybackIndex(5)).toBe(0);
    expect(nextRainPlaybackIndex(2)).toBe(3);
  });
  it("rejects expired forecasts instead of showing stale animation", () => {
    expect(() => validateRainPlaybackTimeline(timeline, Date.parse(timeline.expiresAt))).toThrow("expired");
  });
  it("rejects missing or misordered frames", () => {
    expect(() => validateRainPlaybackTimeline({ ...timeline, frames: frames.slice(1) }, Date.parse(issuedAt))).toThrow("Six frames");
    expect(() => validateRainPlaybackTimeline({ ...timeline, frames: [frames[1], frames[0], ...frames.slice(2)] }, Date.parse(issuedAt))).toThrow("sequence");
  });
  it("rejects external image URLs", () => {
    expect(() => validateRainPlaybackTimeline({
      ...timeline,
      frames: [{ ...frames[0], imageUrl: "https://example.com/remote.png" }, ...frames.slice(1)],
    }, Date.parse(issuedAt))).toThrow("same-origin");
  });
});
