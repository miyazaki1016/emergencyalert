"use client";

import { useEffect, useState, type CSSProperties } from "react";
import styles from "./national-heavy-rain-forecast.module.css";

type Slot = { time: number; missing: boolean };

export default function ForecastMapTimeline({ slots, activeTime, expired, setTime, formatTime, label }: {
  slots: Slot[];
  activeTime: number | null;
  expired: boolean;
  setTime: (time: number | null) => void;
  formatTime: (time: number) => string;
  label: string;
}) {
  const [playing, setPlaying] = useState(false);
  const index = slots.findIndex(slot => slot.time === activeTime);
  const total = slots.length;
  const nextTime = slots[index + 1]?.time;
  useEffect(() => {
    if (!playing) return;
    if (expired || total === 0) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      if (nextTime === undefined) setPlaying(false);
      setTime(nextTime ?? null);
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [playing, nextTime, expired, total, setTime]);
  const labelIndices = new Set(Array.from({ length: Math.min(total, 5) }, (_, i) =>
    total <= 5 ? i : Math.round(i * (total - 1) / 4)));
  const progress = total > 0 ? (index + 1) * 100 / total : 0;

  function togglePlayback() {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (index < 0 || index === total - 1) setTime(slots[0].time);
    setPlaying(true);
  }

  return (
    <div className={styles.timeline} role="group" aria-label="予報対象時刻">
      <button type="button" className={styles.timelinePlay} disabled={total < 2}
        aria-label={playing ? "一時停止" : "再生"} onClick={togglePlayback}>
        <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
      </button>
      <div className={styles.timelineScale}>
        <input id="forecast-map-time" className={styles.timelineSlider} type="range"
          aria-label="予報時刻を選択" aria-valuetext={label} min={0} max={total} step={1}
          value={index + 1} disabled={total === 0} style={{ "--forecast-progress": `${progress}%` } as CSSProperties}
          onChange={event => {
            setPlaying(false);
            setTime(slots[event.currentTarget.valueAsNumber - 1]?.time ?? null);
          }}
        />
        <div className={styles.timelineTicks} aria-hidden="true">
          <span data-active={index < 0 || undefined}><small className={styles.timelineAllLabel}>全時刻</small></span>
          {slots.map((slot, i) => <span key={slot.time} data-missing={slot.missing || undefined}
            data-active={i === index || undefined} title={formatTime(slot.time) + (slot.missing ? "（未取得）" : "")}>
            {labelIndices.has(i) && <small>{formatTime(slot.time)}</small>}
          </span>)}
        </div>
      </div>
      {expired && <p className={styles.timelineNotice} role="status">選択していた時刻が表示範囲を外れたため、全時刻に戻りました。</p>}
    </div>
  );
}
