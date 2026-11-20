"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { forecastRadarSources } from "../../lib/weather/rain/nationalForecastRadar";
import { forecastTime, type NationalForecastSnapshot, type NationalForecastFrame, type RadarTile } from "../../lib/weather/rain/nationalForecastSnapshot";
import styles from "./national-heavy-rain-forecast.module.css";

const formatTime = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

const timeLabel = (value: string) => formatTime.format(forecastTime(value));

function RadarPlayer({ basetime, times, tile, blocky }: {
  basetime: string; times: string[]; tile: RadarTile; blocky: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState("");
  const [failed, setFailed] = useState("");
  const [mapFailed, setMapFailed] = useState(false);
  const last = times.length - 1;
  const validTime = times[Math.min(index, last)];
  const urls = forecastRadarSources(basetime, validTime, tile);
  useEffect(() => {
    if (!playing || last < 1 || loaded !== urls.rain || failed === urls.rain) return;
    const timer = window.setTimeout(() => setIndex(i => (i + 1) % (last + 1)), 1100);
    return () => window.clearTimeout(timer);
  }, [playing, last, loaded, failed, urls.rain]);

  return (
    <div>
      <div className={styles.map}>
        {/* Fixed matching z10 tiles. Ordinary images avoid browser-side CORS reads. */}
        {/* eslint-disable @next/next/no-img-element */}
        <img src={urls.background} alt="" width={256} height={256} onError={() => setMapFailed(true)} />
        <img key={urls.rain} src={urls.rain} alt="" width={256} height={256}
          className={blocky ? styles.blocky : undefined} onLoad={() => setLoaded(urls.rain)}
          onError={() => { setFailed(urls.rain); setPlaying(false); }} />
        {/* eslint-enable @next/next/no-img-element */}
        <time className={styles.mapTime}>{timeLabel(validTime)} 予報</time>
        <span className={styles.mapCredit}>気象庁・地理院タイル</span>
      </div>
      {(mapFailed || failed === urls.rain) && <p role="status">一部の地図・雨雲画像を取得できません。</p>}
      <div className={styles.controls}>
        <button type="button" disabled={last < 1} onClick={() => setPlaying(value => !value)}>
          {playing ? "一時停止" : "再生"}
        </button>
        <button type="button" aria-label="前の予報時刻" disabled={last < 1 || index === 0}
          onClick={() => { setPlaying(false); setIndex(i => i - 1); }}>前へ</button>
        <button type="button" aria-label="次の予報時刻" disabled={last < 1 || index >= last}
          onClick={() => { setPlaying(false); setIndex(i => i + 1); }}>次へ</button>
      </div>
    </div>
  );
}

type Municipality = NationalForecastFrame["municipalities"][number];
type AreaCard = Municipality & {
  peakTime: string;
  intensityByTime: Map<string, Municipality["minimumMmPerHour"]>;
};

function ForecastBand({ frames, basetime, extended }: {
  frames?: NationalForecastFrame[]; basetime?: string; extended: boolean;
}) {
  const [selected, setSelected] = useState<string>();
  const municipalities = new Map<string, AreaCard>();
  for (const frame of frames ?? []) {
    for (const area of frame.municipalities) {
      const current = municipalities.get(area.code);
      const intensityByTime = current?.intensityByTime ?? new Map();
      const intensity = intensityByTime.get(frame.validTime);
      if (intensity === undefined || intensity < area.minimumMmPerHour) {
        intensityByTime.set(frame.validTime, area.minimumMmPerHour);
      }
      if (!current || current.minimumMmPerHour < area.minimumMmPerHour) {
        municipalities.set(area.code, { ...area, peakTime: frame.validTime, intensityByTime });
      }
    }
  }
  const cards = [...municipalities.values()].sort((a, b) =>
    b.minimumMmPerHour - a.minimumMmPerHour ||
    a.prefecture.localeCompare(b.prefecture, "ja") ||
    a.peakTime.localeCompare(b.peakTime) || a.code.localeCompare(b.code));
  const groups = new Map<number, Map<string, AreaCard[]>>();
  for (const area of cards) {
    if (!groups.has(area.minimumMmPerHour)) groups.set(area.minimumMmPerHour, new Map());
    const prefectures = groups.get(area.minimumMmPerHour)!;
    if (!prefectures.has(area.prefecture)) prefectures.set(area.prefecture, []);
    prefectures.get(area.prefecture)!.push(area);
  }
  const title = extended ? "35〜60分先の予報" : "30分先までの詳細予報";
  return (
    <section className={styles.band} aria-label={title}>
      <div className={styles.bandHeading}>
        <h2>{title}</h2>
        <span>{extended ? "1km" : "250m"}</span>
        <span>{frames ? `${cards.length}市区町村` : "未取得"}</span>
      </div>
      {frames && cards.length === 0 && <p>取得できた時間帯では、30mm/h以上の該当地域はありません。</p>}
      {!frames && basetime && <p role="status">この時間帯の予報は現在取得できていません。</p>}
      {[...groups].map(([tier, prefectures]) => (
        <section className={styles.tierGroup} key={tier} aria-label={`${tier}mm/h以上`}>
          <h3 className={styles.tierHeading} data-tier={tier}>{tier}mm/h以上 <small>{[...prefectures.values()].reduce((sum, list) => sum + list.length, 0)}地域</small></h3>
          {[...prefectures].map(([prefecture, entries]) => (
            <div className={styles.prefectureGroup} key={prefecture}>
              <h4 className={styles.prefectureHeading}>{prefecture} <small>{entries.length}地域</small></h4>
              <div className={styles.compactList}>
                {entries.map(area => {
                  const times = [...area.intensityByTime.keys()].sort();
                  const expanded = selected === area.code;
                  return (
                    <article className={styles.compactCard} key={area.code}>
                      <div className={styles.compactRow}>
                        <strong>{area.municipality}</strong>
                        <span className={styles.compactTime}>{timeLabel(times[0])}ごろから</span>
                        <span className={styles.intensity} data-tier={area.minimumMmPerHour}>{area.minimumMmPerHour}<small> mm/h以上</small></span>
                        {area.radarTile && <button type="button" aria-expanded={expanded}
                          aria-label={`${area.prefecture}${area.municipality}の雨雲の動きを${expanded ? "閉じる" : "見る"}`}
                          onClick={() => setSelected(code => code === area.code ? undefined : area.code)}>
                          {expanded ? "閉じる" : "雨雲を見る"}
                        </button>}
                      </div>
                      <div className={styles.timeStrip} role="img" aria-label={times.map(time =>
                        `${timeLabel(time)} ${area.intensityByTime.get(time)}mm/h以上`).join("、")}>
                        {frames?.map(({ validTime }) => {
                          const intensity = area.intensityByTime.get(validTime);
                          return <span key={validTime} data-tier={intensity}
                            title={`${timeLabel(validTime)} ${intensity ? `${intensity}mm/h以上` : "30mm/h以上の予報なし"}`} />;
                        })}
                      </div>
                      {expanded && basetime && area.radarTile && (
                        <div className={styles.expandedRadar}>
                          <p>対象時刻：{times.map(timeLabel).join("、")}</p>
                          <RadarPlayer key={basetime} basetime={basetime} tile={area.radarTile}
                            times={frames!.map(frame => frame.validTime)} blocky={extended} />
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      ))}
    </section>
  );
}

export default function NationalHeavyRainForecast() {
  const [forecast, setForecast] = useState<NationalForecastSnapshot | null>();
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch("/api/rain/national-forecast", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Forecast unavailable");
        const snapshot: NationalForecastSnapshot = await response.json();
        if (!controller.signal.aborted) setForecast(snapshot);
      } catch {
        if (!controller.signal.aborted) setForecast(null);
      }
    }
    void refresh();
    const interval = window.setInterval(refresh, 60_000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, []);

  const areas = forecast
    ? [...forecast.frames, ...(forecast.extendedFrames ?? [])].flatMap(frame => frame.municipalities)
    : [];
  const count = new Set(areas.map(area => area.code)).size;
  const tier = areas.reduce((maximum, area) => Math.max(maximum, area.minimumMmPerHour), 0);
  const peakAreas = areas.filter(area => area.minimumMmPerHour === tier);
  const peakCount = new Set(peakAreas.map(area => area.code)).size;
  const peakPrefectures = [...new Set(peakAreas.map(area => area.prefecture))]
    .sort((a, b) => a.localeCompare(b, "ja"));
  const latestTime = (forecast?.extendedFrames ?? forecast?.frames)?.slice(-1)[0]?.validTime;

  return (
    <section className={styles.forecast} aria-labelledby="national-rain-heading">
      <div className={styles.summary}>
        <div>
          <h1 id="national-rain-heading">全国の<span>大雨</span>予報</h1>
          <p>降水強度30mm/h以上が予測される市区町村を、時間帯ごとに表示します。</p>
        </div>
        <div className={styles.summaryData}>
          <dl className={styles.stats}>
            <div><dt>大雨予報の地域</dt><dd>{forecast ? `${count}地域` : "—"}</dd></div>
            <div><dt>最大階級</dt><dd>{tier ? `${tier}mm/h以上・${peakCount}地域` : "—"}</dd></div>
            <div><dt>気象庁の予報基準</dt><dd>{forecast ? `${timeLabel(forecast.basetime)} JST` : "—"}</dd></div>
            {latestTime && <div><dt>取得済みの予報</dt><dd>{timeLabel(latestTime)}まで</dd></div>}
          </dl>
          {peakPrefectures.length > 0 && <p className={styles.summaryNote}>最大階級の都道府県：{peakPrefectures.join("、")}</p>}
          {forecast && !forecast.extendedFrames && <p className={styles.summaryNote}>35〜60分先の予報は未取得です。</p>}
          <div className={styles.legend} aria-label="降水強度の凡例">
            <span>降水強度 mm/h</span>
            <span><i />30–50</span><span><i />50–80</span><span><i />80以上</span>
          </div>
        </div>
      </div>
      <aside className={styles.myBanner}>
        <div><strong>自分の場所の雨は、MYアメふるで。</strong><p>現在地の雨や、登録した場所の雨通知を確認できます。</p></div>
        <Link href="/my-amefuru">MYアメふるを開く →</Link>
      </aside>
      {forecast === undefined && <p role="status">全国の予報を取得中…</p>}
      {forecast === null && <p role="status">現在、全国の予報を確認できません。</p>}
      <ForecastBand frames={forecast?.frames} basetime={forecast?.basetime} extended={false} />
      <ForecastBand frames={forecast?.extendedFrames} basetime={forecast?.basetime} extended />
    </section>
  );
}
