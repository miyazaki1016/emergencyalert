"use client";

import { useState } from "react";

type RainMessage = { headline: string; detail: string };
type RainResponse = {
  source: string;
  location: { lat: number; lon: number };
  observation: unknown[];
  forecast: unknown[];
  interpretation: unknown | null;
  message: RainMessage | null;
  interpretationEnabled: boolean;
  note: string;
};

export default function Home() {
  const [status, setStatus] = useState("現在地から、このあとの雨を確認します。");
  const [data, setData] = useState<RainResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const check = () => {
    if (!navigator.geolocation) return setStatus("この端末では現在地を取得できません。");
    setBusy(true);
    setStatus("現在地を確認しています…");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        setStatus("気象庁の最新データを確認しています…");
        const res = await fetch(`/api/rain?lat=${coords.latitude}&lon=${coords.longitude}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const json = (await res.json()) as RainResponse;
        setData(json);
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

      {data?.message && (
        <section style={{ margin: "28px 0", padding: 24, border: "1px solid #ddd", borderRadius: 16 }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{data.message.headline}</div>
          <div style={{ marginTop: 10, fontSize: 18 }}>{data.message.detail}</div>
        </section>
      )}

      <button onClick={check} disabled={busy} style={{ padding: "13px 20px", fontSize: 16, cursor: busy ? "default" : "pointer" }}>
        {busy ? "確認中…" : "この場所の雨を確認"}
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
