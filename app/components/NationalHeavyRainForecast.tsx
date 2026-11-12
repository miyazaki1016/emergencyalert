"use client";

import { useEffect, useState } from "react";
import { forecastTime, type NationalForecastSnapshot } from "../../lib/weather/rain/nationalForecastSnapshot";

const formatTime = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export default function NationalHeavyRainForecast() {
  const [forecast, setForecast] = useState<NationalForecastSnapshot | null>();
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch("/api/rain/national-forecast", { signal: controller.signal });
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

  const rows = forecast?.frames.flatMap(frame => frame.municipalities.map(area => ({
    ...area, validTime: frame.validTime,
  })));

  return (
    <section aria-labelledby="national-rain-heading">
      <h2 id="national-rain-heading">アメふる｜全国大雨予報</h2>
      <p>今後30分以内に、1時間あたり30mm以上の雨が予測される地域</p>
      {forecast === undefined && <p role="status">全国の予報を取得中…</p>}
      {forecast === null && <p role="status">現在、全国の予報を確認できません。</p>}
      {forecast && (
        <>
          <p>気象庁 · {formatTime.format(forecastTime(forecast.basetime))}発表（日本時間）</p>
          {rows?.length === 0 ? <p>取得できた予報の時間帯では、該当地域はありません。</p> : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {rows?.map(area => (
                <li key={`${area.code}:${area.validTime}`} style={{ padding: "12px 0", borderBottom: "1px solid #ffffff33" }}>
                  <strong>{area.prefecture} {area.municipality}</strong>
                  <div>{formatTime.format(forecastTime(area.validTime))}ごろ · {area.minimumMmPerHour}mm/h以上</div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
