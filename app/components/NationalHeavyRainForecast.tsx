"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { forecastRadarPlayback } from "../../lib/weather/rain/nationalForecastRadar";
import { forecastTime, NATIONAL_FORECAST_FRESHNESS_MS, type NationalForecastSnapshot, type NationalForecastFrame } from "../../lib/weather/rain/nationalForecastSnapshot";
import { forecastMapSelection, type ForecastMapBand } from "../../lib/weather/rain/nationalForecastMap";
import ForecastMapTimeline from "./ForecastMapTimeline";
import RadarPlayer from "./RadarPlayer";
import LiveJapanForecastMap from "./LiveJapanForecastMap";
import styles from "./national-heavy-rain-forecast.module.css";

const formatTime = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

const timeLabel = (value: string) => formatTime.format(forecastTime(value));

type Municipality = NationalForecastFrame["municipalities"][number];
type AreaCard = Municipality & {
  peakTime: string;
  intensityByTime: Map<string, Municipality["minimumMmPerHour"]>;
};

function ForecastBand({ frames, basetime, extended, tileVersions }: {
  frames?: NationalForecastFrame[]; basetime?: string; extended: boolean; tileVersions?: true;
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
        municipalities.set(area.code, { ...area, radarTile: area.radarTile ?? current?.radarTile, peakTime: frame.validTime, intensityByTime });
      } else if (!current.radarTile && area.radarTile) {
        current.radarTile = area.radarTile;
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
  const incomplete = frames?.some(frame => frame.incomplete);
  const title = extended ? "35〜60分先の予報" : "30分先までの詳細予報";
  return (
    <section className={styles.band} aria-label={title}>
      <div className={styles.bandHeading}>
        <h2>{title}</h2>
        <span>{extended ? "1km" : "250m"}</span>
        <span>{!frames ? "未取得" : frames.length ? `${cards.length}市区町村` : "対象時刻終了"}</span>
      </div>
      {!!frames?.length && cards.length === 0 && <p>取得済みの範囲では、30mm/h以上の該当地域はありません。</p>}
      {incomplete && <p role="status">一部の時刻・地域は未取得です。</p>}
      {tileVersions && !!frames?.length && <details>
        <summary>時刻ごとの取得状況と基準時刻</summary>
        <ul>{frames.map(frame => <li key={frame.validTime}>{timeLabel(frame.validTime)}　
          {frame.basetimes?.length ? `${frame.basetimes.map(timeLabel).join(" / ")} 基準` : "未取得"}
          {frame?.incomplete && !!frame.basetimes?.length && "・一部未取得"}
          {frame.refreshPending && "・一部は前の予報を表示"}</li>)}</ul>
      </details>}
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
                  const radarFrames = expanded && basetime
                    ? forecastRadarPlayback(frames ?? [], area.code, basetime, tileVersions)
                    : [];
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
                        {frames?.map(({ validTime, incomplete }) => {
                          const intensity = area.intensityByTime.get(validTime);
                          return <span key={validTime} data-tier={intensity}
                            title={`${timeLabel(validTime)} ${intensity ? `${intensity}mm/h以上` : incomplete ? "未取得を含む" : "30mm/h以上の予報なし"}`} />;
                        })}
                      </div>
                      {!!radarFrames.length && (
                        <div className={styles.expandedRadar}>
                          <p>対象時刻：{radarFrames.map(frame => timeLabel(frame.validTime)).join("、")}</p>
                          <RadarPlayer key={radarFrames.map(frame => `${frame.basetime}/${frame.validTime}/${frame.tile.x}/${frame.tile.y}`).join(",")}
                            frames={radarFrames} blocky={extended} />
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

export default function NationalHeavyRainForecast({ view = "map" }: { view?: "map" | "list" }) {
  const [band, setBand] = useState<ForecastMapBand>("all");
  const [time, setTime] = useState<number | null>(null);
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
        if (!controller.signal.aborted) setForecast(current => current ?? null);
      }
    }
    void refresh();
    const interval = window.setInterval(refresh, 60_000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!forecast) return;
    const frames = [...forecast.frames, ...(forecast.extendedFrames ?? [])];
    const now = Date.now();
    const refreshNoticeAt = forecastTime(forecast.basetime) + NATIONAL_FORECAST_FRESHNESS_MS + 1;
    const nextChange = Math.min(refreshNoticeAt > now ? refreshNoticeAt : Infinity,
      ...frames.map(frame => forecastTime(frame.validTime)));
    const timer = window.setTimeout(() => {
      const cutoff = Date.now();
      const upcoming = (frame: NationalForecastFrame) => forecastTime(frame.validTime) > cutoff;
      const frames = forecast.frames.filter(upcoming);
      const extendedFrames = forecast.extendedFrames?.filter(upcoming);
      setForecast(current => current !== forecast ? current
        : frames.length || extendedFrames?.length ? { ...forecast, frames, extendedFrames } : null);
    }, Math.max(0, nextChange - now));
    return () => window.clearTimeout(timer);
  }, [forecast]);

  const { slots, activeTime, peaks, frame, hasCoverage } = useMemo(
    () => forecastMapSelection(forecast, band, time), [forecast, band, time],
  );
  const expired = time !== null && activeTime === null;
  const [timeExpired, setTimeExpired] = useState(false);
  useEffect(() => {
    if (!expired) return;
    setTime(null);
    setTimeExpired(true);
  }, [expired]);

  const chooseTime = useCallback((value: number | null) => {
    setTime(value);
    setTimeExpired(false);
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
  const latestTime = (forecast?.extendedFrames?.filter(frame => !frame.basetimes || frame.basetimes.length).slice(-1)[0] ?? forecast?.frames.filter(frame => !frame.basetimes || frame.basetimes.length).slice(-1)[0])?.validTime;
  const waitingForUpdate = forecast && Date.now() - forecastTime(forecast.basetime) > NATIONAL_FORECAST_FRESHNESS_MS;

  return (
    <section className={styles.forecast} aria-labelledby={view === "map" ? "live-japan-heading" : "national-rain-heading"}>
      {view === "map" ? <section aria-labelledby="live-japan-heading" className={styles.band}>
        <h1 id="live-japan-heading">全国の大雨を地図で見る</h1>
        <ForecastMapTimeline key={band} slots={slots} activeTime={activeTime}
          expired={expired || timeExpired} setTime={chooseTime} formatTime={time => formatTime.format(time)} />
        <LiveJapanForecastMap frame={frame} peaks={peaks} />
        <div className={styles.controls} aria-label="予報帯">
          <button type="button" aria-pressed={band === "all"} onClick={() => { setBand("all"); chooseTime(null); }}>すべて</button>
          <button type="button" aria-pressed={band === "detail"} onClick={() => { setBand("detail"); chooseTime(null); }}>詳細 +5〜30分</button>
          <button type="button" aria-pressed={band === "extended"} onClick={() => { setBand("extended"); chooseTime(null); }}>延長 +35〜60分</button>
        </div>
        <div className={styles.legend} aria-label="降水強度の凡例">
          <span>降水強度 mm/h</span><span><i />30–50未満</span><span><i />50–80未満</span><span><i />80以上</span>
        </div>
        {frame?.tileCoverage?.some(tile => !tile.basetime) && <p>地図の斜線は予報データを未取得の陸地です。</p>}
        {forecast === undefined ? <p role="status">予報を取得中…</p>
          : !hasCoverage ? <p role="status">{activeTime === null ? "この予報帯のデータは表示できません。" : "この予報時刻のデータは未取得です。"}</p>
          : <>
            {frame?.incomplete && <p role="status">一部の時刻・地域は未取得です。地図にマーカーがない場所でも、大雨なしとは限りません。</p>}
            {!frame?.municipalities.length && <p>取得済みの範囲で30mm/h以上の予報はありません。</p>}
          </>}
        <Link className={styles.forecastLink} href="/?view=forecast">全国の大雨予報一覧を見る →</Link>
      </section> : <>
      <div className={styles.summary}>
        <div>
          <h1 id="national-rain-heading">全国の<span>大雨</span>予報</h1>
          <p>降水強度30mm/h以上が予測される市区町村を、時間帯ごとに表示します。</p>
        </div>
        <div className={styles.summaryData}>
          <dl className={styles.stats}>
            <div><dt>大雨予報の地域</dt><dd>{forecast ? `${count}地域` : "—"}</dd></div>
            <div><dt>最大階級</dt><dd>{tier ? `${tier}mm/h以上・${peakCount}地域` : "—"}</dd></div>
            <div><dt>{forecast?.tileVersions ? "最新の予報基準" : "気象庁の予報基準"}</dt><dd>{forecast ? `${timeLabel(forecast.basetime)} JST` : "—"}</dd></div>
            {latestTime && <div><dt>取得済みの予報</dt><dd>{timeLabel(latestTime)}まで</dd></div>}
          </dl>
          {waitingForUpdate && <p className={styles.summaryNote}>更新待ちのため、{timeLabel(forecast.basetime)}時点の予報を表示しています。</p>}
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
      <ForecastBand frames={forecast?.frames} basetime={forecast?.basetime} tileVersions={forecast?.tileVersions} extended={false} />
      <ForecastBand frames={forecast?.extendedFrames} basetime={forecast?.basetime} tileVersions={forecast?.tileVersions} extended />
      </>}
    </section>
  );
}
