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
type RainResponse = {
  source: string;
  location: { lat: number; lon: number };
  observation: unknown[];
  forecast: unknown[];
  interpretation: RainInterpretation | null;
  message: RainMessage | null;
  interpretationEnabled: boolean;
  note: string;
};

function stateLabel(state: RainInterpretation["state"]): string {
  switch (state) {
    case "DRY": return "☀️ この先は雨なし";
    case "RAIN_AHEAD": return "☁️ このあと雨";
    case "ACTIONABLE_RAIN": return "☔ 雨が近づいています";
    case "RAINING": return "🌧️ 雨が降っています";
    case "EASING": return "🌦️ 弱まる方向";
    case "ENDING": return "🌤️ やみそう";
    default: return "確認中";
  }
}

export default function Home() {
  const [status, setStatus] = useState("現在地から、このあとの雨を確認します。");
  const [data, setData] = useState<RainResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);

  const check = () => {
    if (!navigator.geolocation) return setStatus("この端末では現在地を取得できません。");
    setBusy(true);
    setStatus("現在地を確認しています…");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      setLocationAccuracy(coords.accuracy);
      try {
        setStatus("気象庁の最新データを確認しています…");
        const res = await fetch(`/api/rain?lat=${coords.latitude}&lon=${coords.longitude}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const json = (await res.json()) as RainResponse;
        setData(json);
        setLastCheckedAt(new Date());
        setStatus(json.interpretationEnabled
          ? "この場所の、これからを確認しました。"
          : "公式データは取得できましたが、まだ安全に判定できない色が含まれています。");
      } catch {
        setData(null);
        setStatus("最新の雨情報を確認できませんでした。雨が降らないという意味ではありません。");
      } finally { setBusy(false); }
    }, () => {
      setStatus("現在地を取得できませんでした。位置情報の許可を確認してください。");
      setBusy(false);
    }, { enableHighAccuracy: true, timeout: 10000 });
  };

  return (
    <main style={{ maxWidth: 680, margin: "48px auto", padding: 24, fontFamily: "system-ui", lineHeight: 1.7 }}>
      <p style={{ marginBottom: 4, color: "#666" }}>EmergencyAlert 2026</p>
      <h1 style={{ marginTop: 0, fontSize: 40 }}>アメくる？</h1>
      <p>{status}</p>

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
