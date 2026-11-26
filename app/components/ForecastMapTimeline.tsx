"use client";

import { useEffect, useState, type CSSProperties } from "react";
import styles from "./national-heavy-rain-forecast.module.css";

type Slot = { time: number; missing: boolean };

export default function ForecastMapTimeline({ slots, activeTime, expired, setTime, formatTime }: {
  slots: Slot[];
  activeTime: number | null;
  expired: boolean;
  setTime: (time: number | null) => void;
  formatTime: (time: number) => string;
}) {
  const [playing, setPlaying] = useState(false);
  const index = slots.findIndex(slot => slot.time === activeTime);
  const total = slots.length;
  const nextTime = slots[index + 1]?.time;
  const label = index < 0 ? "全時刻" : formatTime(slots[index].time) + (slots[index].missing ? "（未取得）" : "");
  useEffect(() => {
    if (!playing) return;
    if (expired || nextTime === undefined) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setTime(nextTime), 1100);
    return () => window.clearTimeout(timer);
  }, [playing, nextTime, expired, setTime]);
  const labelIndices = new Set(Array.from({ length: Math.min(total, 5) }, (_, i) =>
    total <= 5 ? i : Math.round(i * (total - 1) / 4)));
  const progress = total > 1 && index >= 0 ? index * 100 / (total - 1) : 0;
  return (
    <div className={styles.timeline} aria-label="予報対象時刻">
      <div className={styles.timelineHeader}>
        <div className={styles.controls}>
          <button type="button" aria-pressed={activeTime === null} onClick={() => { setPlaying(false); setTime(null); }}>全時刻</button>
          <button type="button" disabled={total < 2} onClick={() => {
            if (playing) setPlaying(false);
            else {
              if (index < 0 || index === total - 1) setTime(slots[0].time);
              setPlaying(true);
            }
          }}>{playing ? "一時停止" : "再生"}</button>
        </div>
        <output className={styles.timelineTime} htmlFor="forecast-map-time">{label}</output>
      </div>
      {total > 0 && <>
        <input id="forecast-map-time" className={styles.timelineSlider} type="range"
          aria-label="予報時刻を選択" aria-valuetext={label} min={0} max={Math.max(0, total - 1)} step={1}
          value={Math.max(0, index)} style={{ "--forecast-progress": `${progress}%` } as CSSProperties}
          onChange={event => { setPlaying(false); setTime(slots[event.currentTarget.valueAsNumber]?.time ?? null); }}
          onPointerUp={event => {
            if (index < 0 && event.currentTarget.valueAsNumber === 0) setTime(slots[0].time);
          }}
          onKeyDown={event => {
            if (index < 0 && (event.key === "Home" || event.key === "ArrowLeft")) setTime(slots[0].time);
          }}
        />
        <div className={styles.timelineTicks} aria-hidden="true">
          {slots.map((slot, i) => <span key={slot.time} data-missing={slot.missing || undefined}
            data-active={i === index || undefined} title={formatTime(slot.time) + (slot.missing ? "（未取得）" : "")}>
            {labelIndices.has(i) && <small>{formatTime(slot.time)}</small>}
          </span>)}
        </div>
      </>}
      {expired && <p className={styles.timelineNotice} role="status">選択していた時刻が表示範囲を外れたため、全時刻に戻りました。</p>}
    </div>
  );
}
