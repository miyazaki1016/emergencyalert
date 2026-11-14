/**
 * Shared six-frame timeline for the read-only Web rain player and export pipeline.
 * The player receives already-rendered frames; it never fetches JMA tiles or
 * performs the five-minute scan. Expired forecasts cannot be played as current.
 */
export type RainPlaybackFrame = { validTime: string; imageUrl: string };
export type RainPlaybackTimeline = {
  frames: readonly RainPlaybackFrame[];
  issuedAt: string;
  expiresAt: string;
};

export function validateRainPlaybackTimeline(
  timeline: RainPlaybackTimeline,
  now: number = Date.now(),
): RainPlaybackTimeline {
  if (!Number.isFinite(now)) throw new Error("Invalid clock");
  const issued = Date.parse(timeline.issuedAt);
  const expires = Date.parse(timeline.expiresAt);
  if (!Number.isFinite(issued) || !Number.isFinite(expires)
    || expires <= issued || expires - issued > 30 * 60_000) {
    throw new Error("Invalid forecast validity window");
  }
  if (now >= expires || now < issued - 5 * 60_000) {
    throw new Error("Rain forecast is expired or not yet valid");
  }
  if (timeline.frames.length !== 6) throw new Error("Six frames required");
  const times = timeline.frames.map(frame => Date.parse(frame.validTime));
  if (times.some(t => !Number.isFinite(t))
    || times.some((t, i) => i > 0 && t - times[i - 1] !== 300_000)
    || times[0] < issued || times[5] > expires) {
    throw new Error("Invalid five-minute frame sequence");
  }
  for (const frame of timeline.frames) {
    if (!frame.imageUrl.startsWith("/") || frame.imageUrl.startsWith("//")
      || /[\\\r\n]/.test(frame.imageUrl)) {
      throw new Error("Frame must use a same-origin image URL");
    }
  }
  return timeline;
}

export function nextRainPlaybackIndex(current: number, frameCount = 6): number {
  if (!Number.isInteger(current) || current < 0 || current >= frameCount
    || frameCount !== 6) throw new Error("Invalid playback index");
  return (current + 1) % frameCount;
}
