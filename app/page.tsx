"use client";

import { useState } from "react";

type RainResponse = {
  source: string;
  location: { lat: number; lon: number };
  observation: unknown[];
  forecast: unknown[];
  interpretationEnabled: boolean;
  note: string;
};

export default function Home() {
  const [status, setStatus] = useState("現在地から雨情報を確認できます。");
  const [data, setData] = useState<RainResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const check = () => {
    if (!navigator.geolocation) {
      setStatus("この端末では現在地を取得できません。");
      return;
    }

    setBusy(true);
    setStatus("現在地を確認しています…");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          setStatus("気象庁の最新データを確認しています…");
          const res = await fetch(
            `/api/rain?lat=${coords.latitude}&lon=${coords.longitude}`,
            { cache: "no-store" },
          );
          if (!res.ok) throw new Error();
          const json = (await res.json()) as RainResponse;
          setData(json);
          setStatus(
            json.interpretationEnabled
              ? "雨情報を確認しました。"
              : "公式データを取得しました。判定ロジックは検証中です。",
          );
        } catch {
          setStatus("最新の雨情報を確認できませんでした。雨が降らないという意味ではありません。");
        } finally {
          setBusy(false);
        }
      },
      () => {
        setStatus("現在地を取得できませんでした。位置情報の許可を確認してください。");
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <main style={{ maxWidth: 760, margin: "48px auto", padding: 24, fontFamily: "system-ui" }}>
      <p style={{ marginBottom: 8 }}>EmergencyAlert 2026</p>
      <h1>アメくる？</h1>
      <p>{status}</p>
      <button onClick={check} disabled={busy} style={{ padding: "12px 18px", fontSize: 16 }}>
        {busy ? "確認中…" : "この場所の雨を確認"}
      </button>

      {data && (
        <details style={{ marginTop: 32 }}>
          <summary>Developer View</summary>
          <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>
      )}
    </main>
  );
}
