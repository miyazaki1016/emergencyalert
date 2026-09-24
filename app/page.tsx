"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase/browser";

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
  sourceValidAt: string | null;
};
type SavedWatchTarget = {
  id: string;
  label: string;
  display_address: string | null;
  enabled: boolean;
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

function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function stateLabel(state: RainInterpretation["state"]): string {
  switch (state) {
    case "DRY": return "☀️ この先、雨の予報なし";
    case "RAIN_AHEAD": return "☁️ このあと雨くるよ";
    case "ACTIONABLE_RAIN": return "☔ もうすぐ雨くるよ";
    case "RAINING": return "🌧️ いま雨だよ";
    case "EASING": return "🌦️ 弱くなりそう";
    case "ENDING": return "🌤️ もうすぐやみそう";
    default: return "いまは、はっきり言えないよ";
  }
}

export default function Home() {
  const [status, setStatus] = useState("このあとの雨、見てみる？");
  const [data, setData] = useState<RainResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<Array<{ id: string; displayName: string; displayAddress: string; latitude: number; longitude: number }>>([]);
  const [placeStatus, setPlaceStatus] = useState("");
  const [placeBusy, setPlaceBusy] = useState(false);
  const [placeLabels, setPlaceLabels] = useState<Record<string, string>>({});
  const [savingPlaceId, setSavingPlaceId] = useState<string | null>(null);
  const [savedTargets, setSavedTargets] = useState<SavedWatchTarget[]>([]);
  const [targetsBusy, setTargetsBusy] = useState(false);
  const [pushStatus, setPushStatus] = useState("");
  const [pushBusy, setPushBusy] = useState(false);
  const [testPushBusy, setTestPushBusy] = useState(false);

  const enablePush = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setPushStatus("この端末では通知を使えないよ。");
      return;
    }
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      setPushStatus("通知の準備中だよ。");
      return;
    }
    setPushBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus("通知が許可されていないよ。端末の通知設定を確認してね。");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const configuredKey = urlBase64ToUint8Array(vapidPublicKey);
      let existing = await registration.pushManager.getSubscription();
      if (existing?.options.applicationServerKey) {
        const existingKey = new Uint8Array(existing.options.applicationServerKey);
        const keyMatches = existingKey.length === configuredKey.length
          && existingKey.every((value, index) => value === configuredKey[index]);
        if (!keyMatches) {
          await existing.unsubscribe();
          existing = null;
        }
      }
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: configuredKey,
      });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("Incomplete push subscription");
      const session = await ensureAnonymousSession();
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("push_subscriptions").upsert({
        owner_id: session.user.id,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString(),
      }, { onConflict: "owner_id,endpoint" });
      if (error) throw error;
      setPushStatus("通知を受け取れるようになったよ。");
    } catch {
      setPushStatus("通知の登録ができなかったよ。少しあとでもう一度試してね。");
    } finally {
      setPushBusy(false);
    }
  };

  const loadSavedTargets = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;
      const { data, error } = await supabase
        .from("watch_targets")
        .select("id,label,display_address,enabled")
        .order("created_at", { ascending: true });
      if (error) throw error;
      setSavedTargets((data ?? []) as SavedWatchTarget[]);
    } catch {
      // Registration still works even if the saved list cannot be refreshed.
    }
  };

  useEffect(() => {
    void loadSavedTargets();
  }, []);

  const deleteTarget = async (target: SavedWatchTarget) => {
    if (!window.confirm(`「${target.label}」を削除する？\nこの場所の見張り登録も消えるよ。`)) return;
    setTargetsBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("watch_targets")
        .delete()
        .eq("id", target.id);
      if (error) throw error;
      setSavedTargets((targets) => targets.filter((item) => item.id !== target.id));
      setPlaceStatus(`「${target.label}」を見張る場所から削除したよ。`);
    } catch {
      setPlaceStatus("削除できなかったよ。少しあとでもう一度試してね。");
    } finally {
      setTargetsBusy(false);
    }
  };

  const toggleTarget = async (target: SavedWatchTarget) => {
    setTargetsBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("watch_targets")
        .update({ enabled: !target.enabled })
        .eq("id", target.id);
      if (error) throw error;
      setSavedTargets((targets) =>
        targets.map((item) => item.id === target.id ? { ...item, enabled: !item.enabled } : item),
      );
    } catch {
      setPlaceStatus("見張りの切り替えができなかったよ。少しあとでもう一度試してね。");
    } finally {
      setTargetsBusy(false);
    }
  };

  const searchPlace = async () => {
    const q = placeQuery.trim();
    if (q.length < 2) return setPlaceStatus("住所や施設名を2文字以上入れてね。");
    setPlaceBusy(true);
    setPlaceStatus("場所を探してるよ…");
    setPlaceResults([]);
    try {
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const json = await res.json() as { results: typeof placeResults };
      setPlaceResults(json.results);
      setPlaceStatus(json.results.length ? "この中にある？" : "見つからなかったよ。住所を少し詳しくしてみてね。");
    } catch {
      setPlaceStatus("いま場所を検索できないよ。少しあとでもう一度試してね。");
    } finally {
      setPlaceBusy(false);
    }
  };

  const previewCurrentPlace = () => {
    if (!navigator.geolocation) return setPlaceStatus("この端末では現在地を確認できないよ。");
    setPlaceBusy(true);
    setPlaceStatus("いまいる場所を確認中…");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const res = await fetch(`/api/places/reverse?lat=${coords.latitude}&lon=${coords.longitude}`, { cache: "no-store" });
        const json = res.ok ? await res.json() as { result: { displayName: string | null; displayAddress: string; latitude: number; longitude: number } | null } : { result: null };
        setPlaceResults([{
          id: "current-location",
          displayName: json.result?.displayName || "現在地",
          displayAddress: json.result?.displayAddress || `緯度 ${coords.latitude.toFixed(5)} / 経度 ${coords.longitude.toFixed(5)}`,
          latitude: coords.latitude,
          longitude: coords.longitude,
        }]);
        setPlaceStatus("この場所で合ってる？");
      } finally {
        setPlaceBusy(false);
      }
    }, () => {
      setPlaceStatus("現在地を確認できなかったよ。位置情報の許可を確認してね。");
      setPlaceBusy(false);
    }, { enableHighAccuracy: true, timeout: 10000 });
  };

  const ensureAnonymousSession = async () => {
    const supabase = getSupabaseBrowserClient();
    const current = await supabase.auth.getSession();
    if (current.error) throw current.error;
    if (current.data.session) return current.data.session;
    const signedIn = await supabase.auth.signInAnonymously();
    if (signedIn.error || !signedIn.data.session) throw signedIn.error ?? new Error("Anonymous sign-in failed");
    return signedIn.data.session;
  };

  const savePlace = async (place: typeof placeResults[number]) => {
    const label = (placeLabels[place.id] ?? "").trim();
    if (!label) return setPlaceStatus("この場所の名前を入れてね。");
    setSavingPlaceId(place.id);
    setPlaceStatus("見張る場所を登録してるよ…");
    try {
      const session = await ensureAnonymousSession();
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("watch_targets").insert({
        owner_id: session.user.id,
        label,
        latitude: place.latitude,
        longitude: place.longitude,
        display_name: place.displayName,
        display_address: place.displayAddress,
        location_source: place.id === "current-location" ? "CURRENT_LOCATION" : "SEARCH",
        enabled: true,
        notifications_enabled: true,
      });
      if (error) throw error;
      setPlaceStatus(`「${label}」を見張る場所に登録したよ。`);
      await loadSavedTargets();
    } catch {
      setPlaceStatus("登録できなかったよ。少しあとでもう一度試してね。");
    } finally {
      setSavingPlaceId(null);
    }
  };

  const sourceValidAt = data?.sourceValidAt && /^\d{14}$/.test(data.sourceValidAt)
    ? new Date(`${data.sourceValidAt.slice(0,4)}-${data.sourceValidAt.slice(4,6)}-${data.sourceValidAt.slice(6,8)}T${data.sourceValidAt.slice(8,10)}:${data.sourceValidAt.slice(10,12)}:${data.sourceValidAt.slice(12,14)}Z`)
    : null;
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
          <div style={{ marginTop: 10, fontSize: 14, color: "#666" }}>気象庁の雨情報は確認できたけど、この場所を安全に判定できる材料が足りなかったよ。</div>
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

      <section style={{ marginTop: 40, paddingTop: 28, borderTop: "1px solid #ddd" }}>
        <h2 style={{ marginBottom: 6 }}>通知</h2>
        <p style={{ marginTop: 0, color: "#666" }}>見張っている場所で、今ならひと言かける意味がある変化があったときだけ知らせるよ。</p>
        <button onClick={() => void enablePush()} disabled={pushBusy} style={{ padding: "12px 16px", fontSize: 16 }}>
          {pushBusy ? "設定中…" : "通知を受け取る"}
        </button>
        {pushStatus && <p style={{ color: "#666" }}>{pushStatus}</p>}
      </section>

      <section style={{ marginTop: 40, paddingTop: 28, borderTop: "1px solid #ddd" }}>
        <h2 style={{ marginBottom: 6 }}>見張る場所を登録</h2>
        <p style={{ marginTop: 0, color: "#666" }}>自宅や実家など、雨を見張ってほしい場所を選んでね。</p>
        <button onClick={previewCurrentPlace} disabled={placeBusy} style={{ padding: "12px 16px", fontSize: 16 }}>
          📍 現在地から選ぶ
        </button>
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <input value={placeQuery} onChange={(e) => setPlaceQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void searchPlace(); }}
            placeholder="住所・駅・学校・施設名など" aria-label="見張る場所を検索"
            style={{ flex: 1, minWidth: 0, padding: "12px 14px", fontSize: 16 }} />
          <button onClick={() => void searchPlace()} disabled={placeBusy} style={{ padding: "12px 16px", fontSize: 16 }}>検索</button>
        </div>
        {placeStatus && <p style={{ color: "#666" }}>{placeStatus}</p>}
        {placeResults.map((place) => (
          <div key={place.id} style={{ marginTop: 12, padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
            <div style={{ fontWeight: 700 }}>{place.displayName}</div>
            <div style={{ marginTop: 4, fontSize: 14, color: "#666" }}>{place.displayAddress}</div>
            <label style={{ display: "block", marginTop: 14, fontSize: 14, fontWeight: 700 }} htmlFor={`place-label-${place.id}`}>
              この場所の名前
            </label>
            <input
              id={`place-label-${place.id}`}
              value={placeLabels[place.id] ?? ""}
              onChange={(e) => setPlaceLabels((labels) => ({ ...labels, [place.id]: e.target.value }))}
              placeholder="例：自宅・実家・学校・職場"
              maxLength={30}
              style={{ width: "100%", boxSizing: "border-box", marginTop: 6, padding: "11px 12px", fontSize: 16 }}
            />
            <button onClick={() => void savePlace(place)} disabled={savingPlaceId !== null} style={{ marginTop: 10, padding: "9px 12px" }}>{savingPlaceId === place.id ? "登録中…" : "この場所を見張る"}</button>
          </div>
        ))}
      </section>

      {savedTargets.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2 style={{ marginBottom: 6 }}>見張っている場所</h2>
          <p style={{ marginTop: 0, color: "#666" }}>場所ごとに、見張る・休むを切り替えられるよ。</p>
          {savedTargets.map((target) => (
            <div key={target.id} style={{ marginTop: 10, padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
              <div style={{ fontWeight: 700 }}>{target.label}</div>
              {target.display_address && <div style={{ marginTop: 4, fontSize: 13, color: "#666" }}>{target.display_address}</div>}
              <button
                onClick={() => void toggleTarget(target)}
                disabled={targetsBusy}
                aria-pressed={target.enabled}
                style={{ marginTop: 10, padding: "9px 12px", background: target.enabled ? "#b7f34a" : "#e5e7eb", color: "#111", border: "1px solid #d1d5db", borderRadius: 999, fontWeight: 700 }}
              >
                {target.enabled ? "見張る：ON" : "見張る：OFF"}
              </button>
              <button
                onClick={() => void deleteTarget(target)}
                disabled={targetsBusy}
                style={{ marginTop: 10, marginLeft: 8, padding: "9px 12px" }}
              >
                削除
              </button>
            </div>
          ))}
        </section>
      )}

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
