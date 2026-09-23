"use client";

import { useState } from "react";

type RainMessage = { headline: string; detail: string };
type RainInterpretation = {
  state: "INSUFFICIENT_DATA" | "DRY" | "RAIN_AHEAD" | "ACTIONABLE_RAIN" | "RAINING" | "EASING" | "ENDING";
  shouldNotify: boolean;
  firstRainTime: string | null;
  firstActionableRainTime: string | null;
  endingTime: string | null;
};
type RainSemanticEvent = {
  schemaVersion: 1;
  eventType: "RAIN_CLEAR" | "RAIN_APPROACHING" | "ACTIONABLE_RAIN_APPROACHING" | "RAINING" | "RAIN_EASING" | "RAIN_ENDING";
  urgency: "INFO" | "LIFESTYLE_ACTION";
  suggestedAction: "NONE" | "BRING_LAUNDRY_INSIDE";
  startsAt: string | null;
  actionableAt: string | null;
  endingAt: string | null;
  source: "JMA_HIGH_RESOLUTION_PRECIPITATION_NOWCAST";
  checkedAt: string;
};
type RainResponse = {
  source: string;
  checkedAt: string;
  sourceValidAt: string | null;
  location: { lat: number; lon: number };
  observation: unknown[];
  forecast: unknown[];
  interpretation: RainInterpretation | null;
  event: RainSemanticEvent | null;
  message: RainMessage | null;
  interpretationEnabled: boolean;
  note: string;
};

function stateLabel(state: RainInterpretation["state"]): string {
  switch (state) {
    case "DRY": return "☀️ この先、雨の予報なし";
    case "RAIN_AHEAD": return "☁️ このあと雨くるよ";
    case "ACTIONABLE_RAIN": return "☔ もうすぐ雨くるよ";
    case "RAINING": return "🌧️ いま雨だよ";
    case "EASING": return "🌦️ 弱くなりそう";
    case "ENDING": return "🌤️ もうすぐやみそう";
    default: return "確認中";
  }
}

export default function Home() {
  const [status, setStatus] = useState("このあとの雨、見てみる？");
  const [data, setData] = useState<RainResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);

  const sourceValidAt = data?.sourceValidAt ? new Date(`${data.sourceValidAt.slice(0,4)}-${data.sourceValidAt.slice(4,6)}-${data.sourceValidAt.slice(6,8)}T${data.sourceValidAt.slice(8,10)}:${data.sourceValidAt.slice(10,12)}:${data.sourceValidAt.slice(12,14)}Z`) : null;
  const sourceTimeLabel = sourceValidAt && !Number.isNaN(sourceValidAt.getTime())
    ? sourceValidAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" })
    : null;

  const check = () => {
    if (!navigator.geolocation) return setStatus("この端末では現在地を確認できないよ。");
    setData(null);
    setLastCheckedAt(null);
    setLocationAccuracy(null);
    setBusy(true);
    setStatus("いまいる場所を確認中…");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      setLocationAccuracy(coords.accuracy);
      try {
        setStatus("最新の雨情報を確認中…");
        const res = await fetch(`/api/rain?lat=${coords.latitude}&lon=${coords.longitude}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const json = (await res.json()) as RainResponse;
        setData(json);
        const serverCheckedAt = new Date(json.checkedAt);
        setLastCheckedAt(Number.isNaN(serverCheckedAt.getTime()) ? new Date() : serverCheckedAt);
        setStatus(json.interpretationEnabled
          ? "この場所の、このあとの雨を見たよ。"
          : "情報は取れたけど、まだちゃんと判断できないところがあるよ。");
      } catch {
        setData(null);
        setStatus("いま最新の雨情報をうまく確認できないよ。雨が降らないって意味じゃないよ。");
      } finally { setBusy(false); }
    }, () => {
      setData(null);
      setLastCheckedAt(null);
      setLocationAccuracy(null);
      setStatus("いまいる場所を確認できなかったよ。位置情報の許可を確認してね。");
      setBusy(false);
    }, { enableHighAccuracy: true, timeout: 10000 });
  };

  return (
    <main style={{ maxWidth: 680, margin: "48px auto", padding: 24, fontFamily: "system-ui", lineHeight: 1.7 }}>
      <p style={{ marginBottom: 4, color: "#666" }}>EmergencyAlert 2026</p>
      <h1 style={{ marginTop: 0, fontSize: 40 }}>アメくる？</h1>
      <p>{status}</p>

      {data && !data.interpretationEnabled && (
        <section style={{ margin: "28px 0", padding: 24, border: "1px solid #ddd", borderRadius: 16 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>いまは、はっきり言えないよ。</div>
          <div style={{ marginTop: 10, fontSize: 18 }}>雨が降らないって意味じゃないよ。</div>
          {lastCheckedAt && (
            <div style={{ marginTop: 18, fontSize: 13, color: "#666" }}>
              {lastCheckedAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} 時点
              {locationAccuracy !== null && ` ・ 現在地 ±${Math.round(locationAccuracy)}m`}
              {sourceTimeLabel ? ` ・ 気象庁データ ${sourceTimeLabel}` : " ・ 気象庁"}
            </div>
          )}
        </section>
      )}

      {data?.message && data.interpretation && (
        <section style={{ margin: "28px 0", padding: 24, border: "1px solid #ddd", borderRadius: 16 }}>
          <div style={{ fontSize: "clamp(28px, 7vw, 44px)", fontWeight: 800, lineHeight: 1.2, marginBottom: 16 }}>
            {stateLabel(data.interpretation.state)}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{data.message.headline}</div>
          <div style={{ marginTop: 10, fontSize: 18 }}>{data.message.detail}</div>
          {lastCheckedAt && (
            <div style={{ marginTop: 18, fontSize: 13, color: "#666" }}>
              {lastCheckedAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} 時点
              {locationAccuracy !== null && ` ・ 現在地 ±${Math.round(locationAccuracy)}m`}
              {sourceTimeLabel ? ` ・ 気象庁データ ${sourceTimeLabel}` : " ・ 気象庁"}
            </div>
          )}
        </section>
      )}

      <button onClick={check} disabled={busy} style={{ padding: "13px 20px", fontSize: 16, cursor: busy ? "default" : "pointer" }}>
        {busy ? "確認中…" : data ? "最新情報に更新" : "この場所の雨を確認"}
      </button>

      {data && (
        <details style={{ marginTop: 32 }}>
          <summary>Developer View</summary>
          <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12 }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>
      )}
    </main>
  );
}
