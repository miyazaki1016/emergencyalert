"use client";

import { useEffect, useState } from "react";
import { firstPlayableRadarFrame, forecastRadarSources, type RadarPlaybackFrame } from "../../lib/weather/rain/nationalForecastRadar";
import { forecastTime } from "../../lib/weather/rain/nationalForecastSnapshot";
import styles from "./national-heavy-rain-forecast.module.css";

const formatTime = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

const timeLabel = (value: string) => formatTime.format(forecastTime(value));

export default function RadarPlayer({ frames, blocky, autoPlay = false }: { frames: RadarPlaybackFrame[]; blocky: boolean; autoPlay?: boolean }) {
  const [index, setIndex] = useState(() => Math.max(0, firstPlayableRadarFrame(frames)));
  const [playing, setPlaying] = useState(() => autoPlay && firstPlayableRadarFrame(frames) >= 0);
  const [loaded, setLoaded] = useState("");
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const [mapFailed, setMapFailed] = useState(false);
  const last = frames.length - 1;
  const frame = frames[Math.min(index, last)];
  const urls = frame?.basetime ? forecastRadarSources(frame.basetime, frame.validTime, frame.tile) : undefined;
  const rainUrl = urls?.rain;
  const unavailable = !rainUrl || failed.has(rainUrl);
  const first = firstPlayableRadarFrame(frames, failed);
  const canPlay = first >= 0;
  const isPlaying = playing && canPlay;
  useEffect(() => {
    if (!isPlaying || (!unavailable && loaded !== rainUrl)) return;
    const timer = window.setTimeout(() => {
      if (last === 0 || (autoPlay && index >= last)) {
        setPlaying(false);
        if (autoPlay) setIndex(Math.max(0, first));
      }
      else setIndex((index + 1) % (last + 1));
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [isPlaying, last, loaded, unavailable, rainUrl, index, autoPlay, first]);

  if (!frame) return <p>再生できる予報画像はありません。</p>;
  const label = timeLabel(frame.validTime);

  return (
    <div>
      <div className={styles.map}>
        {/* Fixed matching z10 tiles. Ordinary images avoid browser-side CORS reads. */}
        {/* eslint-disable @next/next/no-img-element */}
        {urls && <img key={urls.background} src={urls.background} alt="" width={256} height={256} onError={() => setMapFailed(true)} />}
        {urls && !unavailable && <img key={urls.rain} src={urls.rain} alt="" width={256} height={256}
          className={blocky ? styles.blocky : undefined} onLoad={() => setLoaded(urls.rain)}
          onError={() => setFailed(previous => new Set(previous).add(urls.rain))} />}
        {/* eslint-enable @next/next/no-img-element */}
        <time className={styles.mapTime}>{label} 予報（{!unavailable && frame.basetime ? `${timeLabel(frame.basetime)}基準` : "未取得"}）</time>
        <span className={styles.mapCredit}>気象庁・地理院タイル</span>
      </div>
      {(unavailable || mapFailed) && <p role="status">一部の地図・雨雲画像を取得できません。</p>}
      <div className={styles.controls}>
        <button type="button" disabled={!canPlay} onClick={() => setPlaying(value => !value)}>
          {isPlaying ? "一時停止" : "再生"}
        </button>
        {last > 0 && <input className={styles.radarSlider} type="range"
          aria-label="雨雲の予報時刻を選択" aria-valuetext={`${label}${unavailable ? "（未取得）" : ""}`}
          min={0} max={last} step={1} value={index}
          onChange={event => { setPlaying(false); setIndex(event.currentTarget.valueAsNumber); }} />}
        <button type="button" aria-label="前の予報時刻" disabled={last < 1 || index === 0}
          onClick={() => { setPlaying(false); setIndex(i => i - 1); }}>前へ</button>
        <button type="button" aria-label="次の予報時刻" disabled={last < 1 || index >= last}
          onClick={() => { setPlaying(false); setIndex(i => i + 1); }}>次へ</button>
      </div>
    </div>
  );
}
