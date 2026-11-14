"use client";

import { useEffect, useState } from "react";
import {
  nextRainPlaybackIndex,
  validateRainPlaybackTimeline,
  type RainPlaybackTimeline,
} from "@/lib/weather/rain/nationalRainPlayback";

type Props = {
  timeline: RainPlaybackTimeline;
  frameDurationMs?: number;
};

/**
 * Playback only: no JMA requests, no scan retries, no posting.
 * Parent supplies already-rendered same-origin frame URLs.
 */
export function NationalRainPlayer({ timeline, frameDurationMs = 700 }: Props) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const validDuration = Number.isInteger(frameDurationMs)
    && frameDurationMs >= 100 && frameDurationMs <= 10_000;

  let valid = false;
  try {
    validateRainPlaybackTimeline(timeline, now);
    valid = true;
  } catch {
    valid = false;
  }

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [timeline.issuedAt]);

  useEffect(() => {
    if (!playing || !valid || !validDuration) return;
    const interval = setInterval(() => setIndex(i => nextRainPlaybackIndex(i)), frameDurationMs);
    return () => clearInterval(interval);
  }, [playing, valid, validDuration, frameDurationMs]);

  if (!valid || !validDuration) {
    return (
      <section aria-label="雨雲予報アニメーション">
        <p>この雨雲予報は現在表示できません。最新の予報をご確認ください。</p>
      </section>
    );
  }

  const frame = timeline.frames[index];
  return (
    <section aria-label="雨雲予報アニメーション">
      <img
        src={frame.imageUrl}
        alt={`全国の雨雲予報 ${index + 1}/6 ${frame.validTime}`}
        width={800}
        height={600}
      />
      <p aria-live="off">
        予報 {index + 1}/6：{new Date(frame.validTime).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
      </p>
      <div role="group" aria-label="雨雲アニメーション操作">
        <button type="button" onClick={() => setPlaying(p => !p)}>
          {playing ? "一時停止" : "再生"}
        </button>
        <button type="button" onClick={() => { setPlaying(false); setIndex(i => (i + 5) % 6); }}>
          前のコマ
        </button>
        <button type="button" onClick={() => { setPlaying(false); setIndex(i => nextRainPlaybackIndex(i)); }}>
          次のコマ
        </button>
      </div>
      <p>出典：気象庁</p>
    </section>
  );
}
