"use client";

import { useEffect, useState } from "react";
import { forecastRadarSources, type RadarPlaybackFrame } from "../../lib/weather/rain/nationalForecastRadar";
import { forecastTime } from "../../lib/weather/rain/nationalForecastSnapshot";
import styles from "./national-heavy-rain-forecast.module.css";

const formatTime = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

const timeLabel = (value: string) => formatTime.format(forecastTime(value));

export default function RadarPlayer({ frames, blocky }: { frames: RadarPlaybackFrame[]; blocky: boolean }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState("");
  const [failed, setFailed] = useState("");
  const [mapFailed, setMapFailed] = useState(false);
  const last = frames.length - 1;
  const { basetime, validTime, tile } = frames[Math.min(index, last)];
  const urls = basetime ? forecastRadarSources(basetime, validTime, tile) : undefined;
  const rainUrl = urls?.rain;
  useEffect(() => {
    if (!playing || last < 1 || !rainUrl || loaded !== rainUrl || failed === rainUrl) return;
    const timer = window.setTimeout(() => {
      const next = (index + 1) % (last + 1);
      setIndex(next);
      if (!frames[next].basetime) setPlaying(false);
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [playing, last, loaded, failed, rainUrl, index, frames]);

  return (
    <div>
      <div className={styles.map}>
        {/* Fixed matching z10 tiles. Ordinary images avoid browser-side CORS reads. */}
        {/* eslint-disable @next/next/no-img-element */}
        {urls && <img key={urls.background} src={urls.background} alt="" width={256} height={256} onError={() => setMapFailed(true)} />}
        {urls && <img key={urls.rain} src={urls.rain} alt="" width={256} height={256}
          className={blocky ? styles.blocky : undefined} onLoad={() => setLoaded(urls.rain)}
          onError={() => { setFailed(urls.rain); setPlaying(false); }} />}
        {/* eslint-enable @next/next/no-img-element */}
        <time className={styles.mapTime}>{timeLabel(validTime)} 予報（{basetime ? `${timeLabel(basetime)}基準` : "未取得"}）</time>
        <span className={styles.mapCredit}>気象庁・地理院タイル</span>
      </div>
      {(!urls || mapFailed || failed === rainUrl) && <p role="status">一部の地図・雨雲画像を取得できません。</p>}
      <div className={styles.controls}>
        <button type="button" disabled={last < 1 || !rainUrl || failed === rainUrl} onClick={() => setPlaying(value => !value)}>
          {playing ? "一時停止" : "再生"}
        </button>
        {last > 0 && <input className={styles.radarSlider} type="range"
          aria-label="雨雲の予報時刻を選択" aria-valuetext={`${timeLabel(validTime)}${basetime ? "" : "（未取得）"}`}
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
