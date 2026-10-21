"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase/browser";
import { getRainPreviewCapabilities } from "../lib/weather/rain/previewCapabilities";
import { feedbackTooEarly } from "../lib/weather/rain/feedbackTiming";
import { persistRainNotificationFeedback } from "../lib/weather/rain/persistNotificationFeedback";
import { savedWeatherAnswerLabel, selectFeedbackHistory } from "../lib/weather/rain/notificationHistory";

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
type NotificationEvidence = {
  schemaVersion?: number;
  checkedAt?: string | null;
  sourceValidAt?: string | null;
  source?: string | null;
  eventType?: string | null;
  forecastTargetTime?: string | null;
  deliveredEventType?: string | null;
  current?: { status?: string | null; rgba?: { r: number; g: number; b: number; a: number } | null };
  forecast?: Array<{ validTime?: string | null; status?: string | null; intensityClass?: string | null; rgba?: { r: number; g: number; b: number; a: number } | null }>;
  endingShadow?: { status?: string; firstReRainTime?: string | null };
  decisionReasons?: Record<string, unknown>;
  motion?: { status: string; reason?: string };
};
type NotificationDelivery = { id: number; target_id: string; event_type: string; title: string; body: string; delivered_at: string; decision_snapshot: NotificationEvidence | null; };

function formatJmaForecastTime(value: string | null | undefined): string {
  if (!value || !/^\d{14}$/.test(value)) return "時刻不明";
  const date = new Date(Date.UTC(Number(value.slice(0, 4)), Number(value.slice(4, 6)) - 1, Number(value.slice(6, 8)), Number(value.slice(8, 10)), Number(value.slice(10, 12)), Number(value.slice(12, 14))));
  return Number.isNaN(date.valueOf()) ? "時刻不明" : date.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}


type WeatherFeedbackOption = readonly [string, string];

function feedbackOptionsForNotification(alert: NotificationDelivery): readonly WeatherFeedbackOption[] | null {
  if (alert.event_type === "RAIN_ENDING") return [
    ["STOPPED", "☀️ 止んだ"],
    ["DID_NOT_STOP", "🌧️ 止まなかった"],
    ["ALREADY_DRY", "☁️ 降ってない"],
    ["UNKNOWN", "❓ 不明"],
  ];
  if (alert.event_type === "ACTIONABLE_RAIN_APPROACHING" || alert.event_type === "RAIN_APPROACHING" || alert.event_type === "RAIN_RETURNING") return [
    ["RAINED", "☔ 降った"],
    ["DID_NOT_RAIN", "☁️ 降らなかった"],
    ["ALREADY_RAINING", "🌧️ すでに降ってた"],
    ["UNKNOWN", "❓ 不明"],
  ];
  return null; // Current-rain and severe-rain alerts need a separate evaluation question.
}

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
  const previewCapabilities = getRainPreviewCapabilities({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  });
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
  const [pushEnabled, setPushEnabled] = useState(false);
  const [testPushBusy, setTestPushBusy] = useState(false);
  const [latestAlerts, setLatestAlerts] = useState<NotificationDelivery[]>([]);
  const [weatherFeedback, setWeatherFeedback] = useState<Record<number, string>>({});
  const [feedbackAvailable, setFeedbackAvailable] = useState(false);
  const [feedbackBusy, setFeedbackBusy] = useState<number | null>(null);
  const [feedbackSavedId, setFeedbackSavedId] = useState<number | null>(null);
  const [feedbackError, setFeedbackError] = useState("");
  const [historyNotice, setHistoryNotice] = useState("");
  const [feedbackHistoryFilter, setFeedbackHistoryFilter] = useState<"all" | "unanswered">("all");
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [mapLatitude, setMapLatitude] = useState("35.681236");
  const [mapLongitude, setMapLongitude] = useState("139.767125");
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapPickerOpen || !mapContainerRef.current || mapInstanceRef.current) return;

    let cancelled = false;
    const setupMap = async () => {
      const L = await import("leaflet");
      if (cancelled || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, { center: [35.681236, 139.767125], zoom: 14 });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      try {
        const response = await fetch("https://www.jma.go.jp/bosai/jmatile/data/nowc/targetTimes_N1.json", { cache: "no-store" });
        if (response.ok) {
          const frames = await response.json() as Array<{ basetime?: string; validtime?: string; elements?: string[] }>;
          const latest = frames
            .filter((frame) => frame.basetime && frame.validtime && frame.basetime === frame.validtime && frame.elements?.includes("hrpns"))
            .sort((a, b) => String(b.validtime).localeCompare(String(a.validtime)))[0];
          if (latest?.basetime && latest.validtime) {
            const radarUrl = `https://www.jma.go.jp/bosai/jmatile/data/nowc/${latest.basetime}/none/${latest.validtime}/surf/hrpns/{z}/{x}/{y}.png`;
            let radarLayer: any = null;
            let radarNativeZoom: number | null = null;

            const syncRadarLayer = () => {
              const mapZoom = map.getZoom();
              if (mapZoom < 4) {
                if (radarLayer) {
                  map.removeLayer(radarLayer);
                  radarLayer = null;
                  radarNativeZoom = null;
                }
                return;
              }

              // JMA's current HRPN tiles are rendered at even native zooms.
              // On odd map zooms, upscale the preceding even zoom instead of
              // requesting a non-rendered odd-z tile.
              const nextNativeZoom = Math.min(10, mapZoom % 2 === 0 ? mapZoom : mapZoom - 1);
              if (radarLayer && radarNativeZoom === nextNativeZoom) return;

              if (radarLayer) map.removeLayer(radarLayer);
              radarLayer = L.tileLayer(radarUrl, {
                opacity: 0.44,
                minNativeZoom: 4,
                maxNativeZoom: nextNativeZoom,
                maxZoom: 19,
                attribution: "気象庁",
              }).addTo(map);
              radarNativeZoom = nextNativeZoom;
            };

            map.on("zoomend", syncRadarLayer);
            syncRadarLayer();
          }
        }
      } catch {
        // The map remains usable when the optional radar overlay cannot be loaded.
      }

      const syncCenter = () => {
        const center = map.getCenter();
        setMapLatitude(center.lat.toFixed(6));
        setMapLongitude(center.lng.toFixed(6));
      };
      map.on("moveend", syncCenter);
      syncCenter();
      mapInstanceRef.current = map;
    };
    void setupMap();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapPickerOpen]);

  const enablePush = async () => {
    if (!previewCapabilities.databaseConfigured) {
      setPushStatus("この検証画面は通知登録用データベースに接続されていないよ。");
      return;
    }
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
      setPushEnabled(true);
      setPushStatus("通知を受け取れるようになったよ。");
    } catch {
      setPushStatus("通知の登録ができなかったよ。少しあとでもう一度試してね。");
    } finally {
      setPushBusy(false);
    }
  };

  const restorePushStatus = async () => {
    // A subscription left over from another environment is not proof that
    // this preview can persist it or receive notifications.
    if (!previewCapabilities.databaseConfigured) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return;
      setPushEnabled(true);
      setPushStatus("通知を受け取れるようになってるよ。");
    } catch {
      // Keep the setup button available if the current subscription cannot be checked.
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

  const loadLatestAlerts = async () => {
    if (!previewCapabilities.databaseConfigured) {
      setLatestAlerts([]);
      setWeatherFeedback({});
      setFeedbackAvailable(false);
      setHistoryNotice("この検証画面では通知履歴を表示できないよ。接続設定がまだないため、読み込みは行っていないよ。");
      return;
    }
    try {
      const supabase = getSupabaseBrowserClient();
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        // Never retain previously fetched notification history in the UI
        // after a session has expired or the user signed out.
        setLatestAlerts([]);
        setWeatherFeedback({});
        setFeedbackAvailable(false);
        setHistoryNotice(new URLSearchParams(window.location.search).has("notificationId")
          ? "通知の履歴を見るには、この通知を受け取ったときのアカウントで利用してね。別の端末やアカウントでは表示できない場合があるよ。見張り登録から確認してね。"
          : "通知履歴を表示するには、見張る場所を登録したときのアカウントが必要だよ。");
        return;
      }
      const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const baseColumns = "id,target_id,event_type,title,body,delivered_at";
      const initial = await supabase
        .from("notification_deliveries")
        .select(`${baseColumns},decision_snapshot`)
        .gte("delivered_at", start.toISOString())
        .gt("delivered_count", 0)
        .order("delivered_at", { ascending: false })
        .limit(200);
      // During an additive schema rollout, keep old notification history readable.
      // Do not mask authorization errors or failures unrelated to the missing new column.
      const missingSnapshotColumn = initial.error
        && (initial.error.code === "42703" || initial.error.code === "PGRST204")
        && (initial.error.message.includes("decision_snapshot") || initial.error.details?.includes("decision_snapshot"));
      const fallback = missingSnapshotColumn ? await supabase
        .from("notification_deliveries")
        .select(baseColumns)
        .gte("delivered_at", start.toISOString())
        .gt("delivered_count", 0)
        .order("delivered_at", { ascending: false })
        .limit(200) : null;
      const query = fallback ?? initial;
      if (query.error) throw query.error;
      setHistoryNotice(missingSnapshotColumn ? "判定根拠の保存機能は準備中だよ。過去の通知履歴は確認できるよ。" : "");
      const deliveries = ((query.data ?? []) as Array<{
        id: number; target_id: string; event_type: string;
        title: string; body: string; delivered_at: string;
        decision_snapshot?: NotificationEvidence | null;
      }>).map(item => ({ ...item, decision_snapshot: item.decision_snapshot ?? null }));
      // A notification can be older than seven days or outside the latest 200.
      // Resolve its ID with the current user's RLS-protected session, never by trusting the URL.
      const rawPushId = new URLSearchParams(window.location.search).get("notificationId");
      const pushId = rawPushId && /^[1-9]\d{0,14}$/.test(rawPushId) ? Number(rawPushId) : null;
      if (pushId !== null && Number.isSafeInteger(pushId) && !deliveries.some(item => item.id === pushId)) {
        const byId = await supabase.from("notification_deliveries")
          .select(`${baseColumns},decision_snapshot`).eq("id", pushId).gt("delivered_count", 0).maybeSingle();
        const missingIdSnapshot = byId.error
          && (byId.error.code === "42703" || byId.error.code === "PGRST204")
          && (byId.error.message.includes("decision_snapshot") || byId.error.details?.includes("decision_snapshot"));
        const legacyById = missingIdSnapshot ? await supabase.from("notification_deliveries")
          .select(baseColumns).eq("id", pushId).gt("delivered_count", 0).maybeSingle() : null;
        const resolved = legacyById ?? byId;
        if (resolved.error) throw resolved.error;
        if (resolved.data) {
          deliveries.unshift({ ...(resolved.data as typeof deliveries[number]), decision_snapshot: (resolved.data as typeof deliveries[number]).decision_snapshot ?? null });
        } else {
          setHistoryNotice("この通知の履歴は見つからなかったよ。別のアカウントの通知、送信未完了、または履歴の削除などが考えられるよ。");
        }
      }
      setLatestAlerts(deliveries);
      if (deliveries.length === 0) {
        setWeatherFeedback({});
        setFeedbackAvailable(false);
      }
      if (deliveries.length > 0) {
        const { data: feedback, error: feedbackError } = await supabase.from("rain_notification_feedback")
          .select("notification_id,actual_weather")
          .in("notification_id", deliveries.map((item) => item.id));
        if (feedbackError) {
          setFeedbackAvailable(false);
          setWeatherFeedback({});
        } else {
          setFeedbackAvailable(true);
          setWeatherFeedback(Object.fromEntries((feedback ?? []).map((item) => [item.notification_id, item.actual_weather])));
        }
      }
    } catch {
      setLatestAlerts([]);
      setWeatherFeedback({});
      setFeedbackAvailable(false);
      setHistoryNotice("通知履歴を読み込めなかったよ。時間をおいて再度確認してね。");
    }
  };

  // Deep link from a Push notification. IDs are lookup keys, never authorization tokens.
  const notificationIdFromPush = typeof window === "undefined" ? null : (() => {
    const raw = new URLSearchParams(window.location.search).get("notificationId");
    if (!raw || !/^[1-9]\d{0,14}$/.test(raw)) return null;
    const id = Number(raw);
    return Number.isSafeInteger(id) ? id : null;
  })();
  useEffect(() => {
    if (notificationIdFromPush === null || latestAlerts.length === 0) return;
    const node = document.getElementById(`rain-notification-${notificationIdFromPush}`);
    if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [notificationIdFromPush, latestAlerts]);

  const feedbackHistory = selectFeedbackHistory(
    latestAlerts, weatherFeedback, alert => feedbackOptionsForNotification(alert) !== null,
    feedbackHistoryFilter, notificationIdFromPush,
  );

  const saveWeatherFeedback = async (notificationId: number, actualWeather: string) => {
    if (!previewCapabilities.canAttemptFeedbackSave) {
      setFeedbackError("この検証画面では回答を保存できないよ。");
      return;
    }
    const alert = latestAlerts.find(item => item.id === notificationId);
    if (!feedbackAvailable) {
      setFeedbackError("回答の保存機能はまだ利用できないよ。");
      return;
    }
    if (!alert || !feedbackOptionsForNotification(alert)?.some(([value]) => value === actualWeather)) {
      setFeedbackError("この通知にはその回答を保存できないよ。");
      return;
    }
    if (feedbackTooEarly(actualWeather, alert.decision_snapshot?.forecastTargetTime, Date.now())) {
      setFeedbackError("予測時刻がまだ来ていないよ。時刻を過ぎてから回答してね。");
      return;
    }
    setFeedbackBusy(notificationId);
    setFeedbackSavedId(null);
    setFeedbackError("");
    try {
      const supabase = getSupabaseBrowserClient();
      await persistRainNotificationFeedback(supabase, notificationId, actualWeather);
      setWeatherFeedback((previous) => ({ ...previous, [notificationId]: actualWeather }));
      setFeedbackSavedId(notificationId);
    } catch {
      setFeedbackSavedId(null);
      setFeedbackError("回答を保存できなかったよ。時間をおいてもう一度試してね。");
    } finally {
      setFeedbackBusy(null);
    }
  };

  useEffect(() => {
    void loadSavedTargets();
    void loadLatestAlerts();
    void restorePushStatus();

    const alertRefreshInterval = window.setInterval(() => {
      void loadLatestAlerts();
    }, 5 * 60 * 1000);

    const refreshAlertsWhenVisible = () => {
      if (document.visibilityState === "visible") void loadLatestAlerts();
    };
    document.addEventListener("visibilitychange", refreshAlertsWhenVisible);

    return () => {
      window.clearInterval(alertRefreshInterval);
      document.removeEventListener("visibilitychange", refreshAlertsWhenVisible);
    };
  }, []);

  const deleteTarget = async (target: SavedWatchTarget) => {
    if (!previewCapabilities.canAttemptWatchRegistration) {
      setPlaceStatus("この検証画面では見張り登録を削除できないよ。");
      return;
    }
    if (!window.confirm(`「${target.label}」を削除する？
この場所の見張り登録も消えるよ。`)) return;
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
    if (!previewCapabilities.canAttemptWatchRegistration) {
      setPlaceStatus("この検証画面では見張り設定を変更できないよ。");
      return;
    }
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

  const previewMapPoint = async () => {
    const latitude = Number(mapLatitude);
    const longitude = Number(mapLongitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setPlaceStatus("緯度・経度を確認してね。");
      return;
    }
    setPlaceBusy(true);
    setPlaceStatus("指定した地点を確認中…");
    try {
      const res = await fetch(`/api/places/reverse?lat=${latitude}&lon=${longitude}`, { cache: "no-store" });
      const json = res.ok ? await res.json() as { result: { displayName: string | null; displayAddress: string } | null } : { result: null };
      setPlaceResults([{
        id: `map-${latitude.toFixed(6)}-${longitude.toFixed(6)}`,
        displayName: json.result?.displayName || "地図指定地点",
        displayAddress: json.result?.displayAddress || `緯度 ${latitude.toFixed(5)} / 経度 ${longitude.toFixed(5)}`,
        latitude, longitude,
      }]);
      setPlaceStatus(json.result ? "この場所で合ってる？" : "住所のない場所でも、この座標を見張れるよ。");
    } catch {
      setPlaceResults([{ id: `map-${latitude.toFixed(6)}-${longitude.toFixed(6)}`, displayName: "地図指定地点", displayAddress: `緯度 ${latitude.toFixed(5)} / 経度 ${longitude.toFixed(5)}`, latitude, longitude }]);
      setPlaceStatus("住所のない場所でも、この座標を見張れるよ。");
    } finally {
      setPlaceBusy(false);
    }
  };

  const ensureAnonymousSession = async () => {
    if (!previewCapabilities.canAttemptWatchRegistration) {
      throw new Error("Supabase preview config missing");
    }
    const supabase = getSupabaseBrowserClient();
    const current = await supabase.auth.getSession();
    if (current.error) throw current.error;
    if (current.data.session) return current.data.session;
    const signedIn = await supabase.auth.signInAnonymously();
    if (signedIn.error || !signedIn.data.session) throw signedIn.error ?? new Error("Anonymous sign-in failed");
    return signedIn.data.session;
  };

  const savePlace = async (place: typeof placeResults[number]) => {
    if (!previewCapabilities.canAttemptWatchRegistration) {
      setPlaceStatus("この検証画面では見張り登録を保存できないよ。");
      return;
    }
    const label = (placeLabels[place.id] ?? "").trim();
    if (!label) return setPlaceStatus("この場所の名前を入れてね。");
    setSavingPlaceId(place.id);
    setPlaceStatus("見張る場所を登録してるよ…");
    try {
      const session = await ensureAnonymousSession();
      const supabase = getSupabaseBrowserClient();

      const { data: existingTargets, error: existingError } = await supabase
        .from("watch_targets")
        .select("id,label,latitude,longitude")
        .eq("owner_id", session.user.id);
      if (existingError) throw existingError;

      const duplicate = (existingTargets ?? []).find((target) => {
        const latitude = Number(target.latitude);
        const longitude = Number(target.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
        const latMeters = (latitude - place.latitude) * 111_320;
        const lonMeters = (longitude - place.longitude) * 111_320 * Math.cos(place.latitude * Math.PI / 180);
        return Math.hypot(latMeters, lonMeters) <= 50;
      });
      if (duplicate) {
        setPlaceStatus(`この場所はすでに「${duplicate.label}」として登録されてるよ。`);
        await loadSavedTargets();
        return;
      }

      const { error } = await supabase.from("watch_targets").insert({
        owner_id: session.user.id,
        label,
        latitude: place.latitude,
        longitude: place.longitude,
        display_name: place.displayName,
        display_address: place.displayAddress,
        location_source: place.id === "current-location" ? "CURRENT_LOCATION" : place.id.startsWith("map-") ? "MAP" : "SEARCH",
        enabled: true,
        notifications_enabled: true,
      });
      if (error) throw error;
      setPlaceStatus(`「${label}」を見張る場所に登録したよ。`);
      setPlaceQuery("");
      setPlaceResults([]);
      setPlaceLabels({});
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
    <main style={{ maxWidth: 680, margin: "0 auto", minHeight: "100vh", padding: "36px 20px 72px", fontFamily: "system-ui", lineHeight: 1.7, color: "#eaf2ff" }}>
      <p style={{ marginBottom: 4, color: "#eef5ff", fontSize: 13, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>EmergencyAlert 2026</p>
      <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: "clamp(42px, 12vw, 64px)", lineHeight: 1.05, letterSpacing: "-0.05em" }}>アメくる？</h1>
      <p style={{ marginTop: 0, color: "#e3edf8", fontSize: 18 }}>{status}</p>
      {!previewCapabilities.databaseConfigured ? (
        <p role="status" style={{ padding: "12px 14px", borderRadius: 12, background: "#553b20", color: "#fff1c9", fontWeight: 700 }}>
          この検証画面では通知履歴・回答保存の接続設定がまだないよ。
          雨の予報の閲覧はできても、見張り登録や回答保存はテストできないよ。
        </p>
      ) : null}


      <button onClick={check} disabled={busy} style={{ width: "100%", padding: "15px 20px", fontSize: 16, cursor: busy ? "default" : "pointer", border: 0, borderRadius: 14, background: "linear-gradient(135deg,#5eb9ff,#6d7cff)", color: "white", fontWeight: 800, boxShadow: "0 12px 30px rgba(56,130,246,.25)" }}>
        {busy ? "確認中…" : data ? "最新情報に更新" : "この場所の雨を確認"}
      </button>

      {data && !data.interpretationEnabled && (
        <section style={{ margin: "28px 0", padding: 24, border: "1px solid rgba(255,255,255,.10)", borderRadius: 20, background: "rgba(24,55,88,.80)", boxShadow: "0 18px 50px rgba(0,0,0,.20)", backdropFilter: "blur(18px)" }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>いまは、はっきり言えないよ。</div>
          <div style={{ marginTop: 10, fontSize: 18 }}>雨が降らないって意味じゃないよ。</div>
          <div style={{ marginTop: 10, fontSize: 14, color: "#eef5ff" }}>気象庁の雨情報は確認できたけど、この場所を安全に判定できる材料が足りなかったよ。</div>
          {lastCheckedAt && (
            <div style={{ marginTop: 18, fontSize: 13, color: "#eef5ff" }}>
              {lastCheckedAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} 時点
              {locationAccuracy !== null && ` ・ 現在地 ±${Math.round(locationAccuracy)}m`}
              {sourceTimeLabel ? ` ・ 気象庁データ ${sourceTimeLabel}` : " ・ 気象庁"}
            </div>
          )}
        </section>
      )}

      {data?.message && data.interpretation && (
        <section style={{ margin: "28px 0", padding: 24, border: "1px solid rgba(255,255,255,.10)", borderRadius: 20, background: "rgba(24,55,88,.80)", boxShadow: "0 18px 50px rgba(0,0,0,.20)", backdropFilter: "blur(18px)" }}>
          <div style={{ fontSize: "clamp(28px, 7vw, 44px)", fontWeight: 800, lineHeight: 1.2, marginBottom: 16 }}>
            {stateLabel(data.interpretation.state)}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{data.message.headline}</div>
          <div style={{ marginTop: 10, fontSize: 18 }}>{data.message.detail}</div>
          {lastCheckedAt && (
            <div style={{ marginTop: 18, fontSize: 13, color: "#eef5ff" }}>
              {lastCheckedAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} 時点
              {locationAccuracy !== null && ` ・ 現在地 ±${Math.round(locationAccuracy)}m`}
              {sourceTimeLabel ? ` ・ 気象庁データ ${sourceTimeLabel}` : " ・ 気象庁"}
            </div>
          )}
        </section>
      )}

      <section style={{ margin: "28px 0", padding: 20, border: "1px solid rgba(255,255,255,.10)", borderRadius: 20, background: "rgba(24,55,88,.80)", boxShadow: "0 18px 50px rgba(0,0,0,.20)", backdropFilter: "blur(18px)" }}>
          <h2 style={{ marginTop: 0, marginBottom: 6 }}>通知履歴（最近7日間・最新200件＋指定通知）</h2>
          <p style={{ marginTop: 0, color: "#eef5ff" }}>{previewCapabilities.databaseConfigured ? "送信に成功した通知を新しい順に表示しているよ。実際の天気を回答すると、通知の精度改善に役立つよ。" : "通知履歴と回答保存は、検証用データベースを接続してから確認できるよ。"}</p>
          {historyNotice && <p role="status" style={{ color: "#ffe1a0" }}>{historyNotice}</p>}
          {previewCapabilities.databaseConfigured && latestAlerts.length === 0 && !historyNotice && <p>この期間の通知はまだないよ。</p>}
          {feedbackError && <p role="alert" style={{ color: "#ffb5b5" }}>{feedbackError}</p>}
          {feedbackAvailable && latestAlerts.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 14, margin: "0 0 8px", color: "#d8f2ff" }}>
                回答できる通知：{feedbackHistory.answerable}件 ・ 未回答：{feedbackHistory.unanswered}件
              </p>
              <div role="group" aria-label="通知履歴の絞り込み" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {([["all", "すべて"], ["unanswered", "未回答だけ"]] as const).map(([value, label]) => (
                  <button type="button" key={value} aria-pressed={feedbackHistoryFilter === value}
                    onClick={() => setFeedbackHistoryFilter(value)}
                    style={{ borderRadius: 10, padding: "7px 12px", color: "#fff",
                      border: feedbackHistoryFilter === value ? "2px solid #7dd3fc" : "1px solid #789",
                      background: feedbackHistoryFilter === value ? "#245a84" : "#28405c", cursor: "pointer" }}>
                    {label}
                  </button>
                ))}
              </div>
              {feedbackHistoryFilter === "unanswered" && feedbackHistory.unanswered === 0 &&
                <p role="status" style={{ fontSize: 13, color: "#bbf7d0" }}>未回答の通知はないよ。協力ありがとう！</p>}
            </div>
          )}
          {feedbackHistory.items.map((alert) => (
            <div id={`rain-notification-${alert.id}`} key={alert.id} style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.08)", scrollMarginTop: 24, outline: notificationIdFromPush === alert.id ? "2px solid #7dd3fc" : "none", borderRadius: 8 }}>
              {notificationIdFromPush === alert.id && <div role="status" style={{ fontSize: 13, color: "#b8efff", fontWeight: 800, marginBottom: 5 }}>📩 タップした通知はこちら。実際の天気を教えてね。</div>}
              <div style={{ fontWeight: 700 }}>{alert.body}</div>
              <div style={{ marginTop: 4, fontSize: 13, color: "#eef5ff" }}>{new Date(alert.delivered_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} に通知</div>
              <details style={{ marginTop: 9, fontSize: 13, color: "#eef5ff" }}>
                <summary style={{ cursor: "pointer" }}>通知した理由・予測の詳細</summary>
                {alert.decision_snapshot ? (
                  <div style={{ marginTop: 9, lineHeight: 1.8 }}>
                    <div>判定時刻：{alert.decision_snapshot.checkedAt ? new Date(alert.decision_snapshot.checkedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) : "不明"}</div>
                    <div>元データ時刻：{alert.decision_snapshot.sourceValidAt ?? "不明"}</div>
                    <div>現在の雨：{alert.decision_snapshot.current?.status ?? "不明"}</div>
                    <div>判定イベント：{alert.decision_snapshot.eventType ?? "不明"} / 通知イベント：{alert.decision_snapshot.deliveredEventType ?? alert.event_type}</div>
                    <div>選定理由：{alert.decision_snapshot.decisionReasons ? Object.entries(alert.decision_snapshot.decisionReasons).filter(([, value]) => value === true).map(([key]) => key).join("・") || "通常判定" : "記録なし"}</div>
                    <div>雨雲の進行方向：{alert.decision_snapshot.motion?.status === "UNKNOWN" ? "未判定" : "記録なし"}</div>
                    {alert.decision_snapshot.endingShadow && <div>止み予測の追加検証：{alert.decision_snapshot.endingShadow.status ?? "不明"}</div>}
                    {Array.isArray(alert.decision_snapshot.forecast) && alert.decision_snapshot.forecast.length > 0 && (
                      <div style={{ marginTop: 5 }}>
                        <div>5分刻みの予報（雨量は区分表示）</div>
                        {alert.decision_snapshot.forecast.map((frame, index) => (
                          <div key={index}>{formatJmaForecastTime(frame.validTime)}：{frame.status ?? "不明"} / {frame.intensityClass ?? "区分なし"}{frame.rgba ? ` / RGBA(${frame.rgba.r}, ${frame.rgba.g}, ${frame.rgba.b}, ${frame.rgba.a})` : ""}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : <p>この通知には判定根拠の詳細記録がないよ（旧履歴）。</p>}
              </details>
              {alert.decision_snapshot?.forecastTargetTime && (
                <div style={{ marginTop: 7, fontSize: 13, color: "#eef5ff" }}>
                  予測対象時刻：{formatJmaForecastTime(alert.decision_snapshot.forecastTargetTime)}
                </div>
              )}
              <div style={{ marginTop: 10, fontSize: 13 }}>{feedbackOptionsForNotification(alert) ? "予測した時間内の実際の天気は？" : "この種類の通知は回答方法を準備中だよ。"}</div>
              {!feedbackAvailable && feedbackOptionsForNotification(alert) && (
                <div style={{ marginTop: 4, fontSize: 12, color: "#ffe1a0" }}>回答の保存機能は準備中だよ。履歴と判定根拠は確認できるよ。</div>
              )}
              {feedbackOptionsForNotification(alert) && (
                <div style={{ marginTop: 4, fontSize: 12, color: "#dce9fa" }}>
                  「降らなかった」「止まなかった」は予測対象時刻を過ぎてから回答してね。通知時点ですでに降っていた／降っていなかった場合はそのまま回答できるよ。
                </div>
              )}
              {savedWeatherAnswerLabel(weatherFeedback[alert.id], feedbackOptionsForNotification(alert)) && (
                <div role="status" style={{ marginTop: 6, fontSize: 13, color: "#bbf7d0" }}>
                  {savedWeatherAnswerLabel(weatherFeedback[alert.id], feedbackOptionsForNotification(alert))}
                  {feedbackSavedId === alert.id ? " ✓ 保存したよ" : "（変更もできるよ）"}
                </div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {(feedbackOptionsForNotification(alert) ?? []).map(([value, label]) => (
                  <button key={value} type="button" disabled={!feedbackAvailable || feedbackBusy === alert.id || feedbackTooEarly(value, alert.decision_snapshot?.forecastTargetTime, Date.now())} onClick={() => void saveWeatherFeedback(alert.id, value)}
                    aria-pressed={weatherFeedback[alert.id] === value}
                    style={{ padding: "7px 10px", borderRadius: 10, color: "#fff", cursor: "pointer", border: weatherFeedback[alert.id] === value ? "2px solid #fff" : "1px solid #789", background: weatherFeedback[alert.id] === value ? "#235f88" : "#28405c" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>

      <section style={{ marginTop: 40, paddingTop: 28, borderTop: "1px solid rgba(255,255,255,.10)" }}>
        <h2 style={{ marginBottom: 6 }}>通知</h2>
        <p style={{ marginTop: 0, color: "#eef5ff" }}>見張っている場所で、今ならひと言かける意味がある変化があったときだけ知らせるよ。</p>
        <button onClick={() => void enablePush()} disabled={pushBusy} style={{ padding: "12px 16px", fontSize: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,.14)", background: "#37628d", color: "#eaf2ff", fontWeight: 700 }}>
          {pushBusy ? "設定中…" : pushEnabled ? "✓ 通知ON" : "通知を受け取る"}
        </button>
        {pushStatus && <p style={{ color: "#eef5ff" }}>{pushStatus}</p>}
      </section>

      <section style={{ marginTop: 40, paddingTop: 28, borderTop: "1px solid rgba(255,255,255,.10)" }}>
        <h2 style={{ marginBottom: 6 }}>見張る場所を登録</h2>
        <p style={{ marginTop: 0, color: "#eef5ff" }}>自宅や実家など、雨を見張ってほしい場所を選んでね。</p>
        <button onClick={previewCurrentPlace} disabled={placeBusy} style={{ padding: "12px 16px", fontSize: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,.14)", background: "#37628d", color: "#eaf2ff", fontWeight: 700 }}>
          📍 現在地から選ぶ
        </button>
        <button onClick={() => setMapPickerOpen((open) => !open)} disabled={placeBusy} style={{ marginLeft: 8, padding: "12px 16px", fontSize: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,.14)", background: "#37628d", color: "#eaf2ff", fontWeight: 700 }}>
          🗺️ 地図から選ぶ
        </button>
        {mapPickerOpen && (
          <div style={{ marginTop: 14, padding: 16, border: "1px solid rgba(255,255,255,.10)", borderRadius: 16, background: "rgba(31,65,99,.76)" }}>
            <div style={{ fontWeight: 700 }}>地図の座標を指定</div>
            <p style={{ marginTop: 4, color: "#eef5ff", fontSize: 14 }}>海上や山など、住所がない場所も緯度・経度で見張れるよ。</p>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <div ref={mapContainerRef} aria-label="地点を選ぶ地図" style={{ width: "100%", height: 320, borderRadius: 14, overflow: "hidden", background: "#294f77" }} />
              <div aria-hidden="true" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -100%)", zIndex: 500, fontSize: 38, lineHeight: 1, pointerEvents: "none", filter: "drop-shadow(0 2px 2px rgba(0,0,0,.45))" }}>📍</div>
            </div>
            <p style={{ marginTop: 0, color: "#eef5ff", fontSize: 13 }}>地図を動かして、中央のピンを見張りたい場所に合わせてね。</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ flex: "1 1 210px", fontSize: 13, color: "#eef5ff" }}>緯度 {mapLatitude} / 経度 {mapLongitude}</div>
              <button onClick={() => void previewMapPoint()} disabled={placeBusy} style={{ padding: "11px 14px", borderRadius: 12, border: 0, background: "#5eb9ff", color: "#07111f", fontWeight: 800 }}>この地点を選ぶ</button>
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <input value={placeQuery} onChange={(e) => setPlaceQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void searchPlace(); }}
            placeholder="住所・駅・学校・施設名など" aria-label="見張る場所を検索"
            style={{ flex: 1, minWidth: 0, padding: "12px 14px", fontSize: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,.14)", background: "#294f77", color: "#eaf2ff", outline: "none" }} />
          <button onClick={() => void searchPlace()} disabled={placeBusy} style={{ padding: "12px 16px", fontSize: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,.14)", background: "#37628d", color: "#eaf2ff", fontWeight: 700 }}>検索</button>
        </div>
        {placeStatus && <p style={{ color: "#eef5ff" }}>{placeStatus}</p>}
        {placeResults.map((place) => (
          <div key={place.id} style={{ marginTop: 12, padding: 16, border: "1px solid rgba(255,255,255,.10)", borderRadius: 16, background: "rgba(31,65,99,.76)" }}>
            <div style={{ fontWeight: 700 }}>{place.displayName}</div>
            <div style={{ marginTop: 4, fontSize: 14, color: "#eef5ff" }}>{place.displayAddress}</div>
            <label style={{ display: "block", marginTop: 14, fontSize: 14, fontWeight: 700 }} htmlFor={`place-label-${place.id}`}>
              この場所の名前
            </label>
            <input
              id={`place-label-${place.id}`}
              value={placeLabels[place.id] ?? ""}
              onChange={(e) => setPlaceLabels((labels) => ({ ...labels, [place.id]: e.target.value }))}
              placeholder="例：自宅・実家・学校・職場"
              maxLength={30}
              style={{ width: "100%", boxSizing: "border-box", marginTop: 6, padding: "11px 12px", fontSize: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,.14)", background: "#294f77", color: "#eaf2ff" }}
            />
            <button onClick={() => void savePlace(place)} disabled={savingPlaceId !== null} style={{ marginTop: 10, padding: "9px 12px", borderRadius: 10, border: 0, background: "#5eb9ff", color: "#07111f", fontWeight: 800 }}>{savingPlaceId === place.id ? "登録中…" : "この場所を見張る"}</button>
          </div>
        ))}
      </section>

      {savedTargets.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2 style={{ marginBottom: 6 }}>見張っている場所</h2>
          <p style={{ marginTop: 0, color: "#eef5ff" }}>場所ごとに、見張る・休むを切り替えられるよ。</p>
          {savedTargets.map((target) => (
            <div key={target.id} style={{ marginTop: 10, padding: 16, border: "1px solid rgba(255,255,255,.10)", borderRadius: 16, background: "rgba(31,65,99,.76)" }}>
              <div style={{ fontWeight: 700 }}>{target.label}</div>
              {target.display_address && <div style={{ marginTop: 4, fontSize: 13, color: "#eef5ff" }}>{target.display_address}</div>}
              <button
                onClick={() => void toggleTarget(target)}
                disabled={targetsBusy}
                aria-pressed={target.enabled}
                style={{ marginTop: 10, padding: "9px 12px", background: target.enabled ? "#b7f34a" : "#4a6b8d", color: target.enabled ? "#07110a" : "#d0dceb", border: "1px solid rgba(255,255,255,.12)", borderRadius: 999, fontWeight: 700 }}
              >
                {target.enabled ? "見張る：ON" : "見張る：OFF"}
              </button>
              <button
                onClick={() => void deleteTarget(target)}
                disabled={targetsBusy}
                style={{ marginTop: 10, marginLeft: 8, padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.14)", background: "transparent", color: "#d0dceb" }}
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
