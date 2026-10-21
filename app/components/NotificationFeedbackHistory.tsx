"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";

type Delivery = {
  id: number;
  target_id: string;
  event_type: string;
  body: string;
  delivered_at: string;
};
type Answer = "RAINED" | "DID_NOT_RAIN" | "ALREADY_RAINING" |
  "STOPPED" | "DID_NOT_STOP" | "ALREADY_DRY" | "UNKNOWN";
type Option = readonly [Answer, string];

export const FEEDBACK_OPTIONS: Record<string, readonly Option[]> = {
  ACTIONABLE_RAIN_APPROACHING: [
    ["RAINED", "☔ 降った"], ["DID_NOT_RAIN", "☁️ 降らなかった"],
    ["ALREADY_RAINING", "🌧️ すでに降っていた"], ["UNKNOWN", "❓ わからない"],
  ],
  RAIN_APPROACHING: [
    ["RAINED", "☔ 降った"], ["DID_NOT_RAIN", "☁️ 降らなかった"],
    ["ALREADY_RAINING", "🌧️ すでに降っていた"], ["UNKNOWN", "❓ わからない"],
  ],
  RAIN_RETURNING: [
    ["RAINED", "☔ 降った"], ["DID_NOT_RAIN", "☁️ 降らなかった"],
    ["ALREADY_RAINING", "🌧️ すでに降っていた"], ["UNKNOWN", "❓ わからない"],
  ],
  RAIN_ENDING: [
    ["STOPPED", "☀️ 止んだ"], ["DID_NOT_STOP", "🌧️ 止まなかった"],
    ["ALREADY_DRY", "☁️ すでに降っていなかった"], ["UNKNOWN", "❓ わからない"],
  ],
};

// Phase 1 has no persisted forecast target time on legacy Push rows.
// Avoid presenting a negative outcome as verified immediately after delivery.
export function negativeFeedbackNeedsWait(answer: Answer, deliveredAt: string, now: number): boolean {
  if (answer !== "DID_NOT_RAIN" && answer !== "DID_NOT_STOP") return false;
  const deliveredMs = Date.parse(deliveredAt);
  return !Number.isFinite(deliveredMs) || now < deliveredMs + 60 * 60 * 1000;
}

function formatTokyo(timestamp: string): string {
  return new Date(timestamp).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo", month: "numeric", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function NotificationFeedbackHistory() {
  const [notifications, setNotifications] = useState<Delivery[]>([]);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [feedbackReady, setFeedbackReady] = useState(false);
  const [message, setMessage] = useState("通知履歴を読み込み中…");
  const [saving, setSaving] = useState<number | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "unanswered">("all");
  const [focusedNotificationId, setFocusedNotificationId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      setMessage("この検証画面では通知履歴を利用できないよ。");
      setNotifications([]);
      setFeedbackReady(false);
      setAnswers({});
      return;
    }
    try {
      const client = getSupabaseBrowserClient();
      const { data: { session }, error: authError } = await client.auth.getSession();
      if (authError) throw authError;
      if (!session) {
        setNotifications([]);
        setAnswers({});
        setFeedbackReady(false);
        setMessage("この通知を受け取った端末・アカウントで開いてね。");
        return;
      }
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await client.from("notification_deliveries")
        .select("id,target_id,event_type,body,delivered_at")
        .gte("delivered_at", since)
        .gt("delivered_count", 0)
        .order("delivered_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = (data ?? []) as Delivery[];
      setNotifications(rows);
      if (rows.length === 0) {
        setAnswers({});
        setFeedbackReady(false);
        setMessage("最近7日間の通知はまだないよ。");
        return;
      }
      const { data: recorded, error: feedbackError } = await client
        .from("rain_notification_feedback")
        .select("notification_id,actual_weather")
        .in("notification_id", rows.map(row => row.id));
      if (feedbackError) {
        setAnswers({});
        setFeedbackReady(false);
        setMessage("通知履歴は表示できるよ。回答機能はまだ準備中だよ。");
      } else {
        setAnswers(Object.fromEntries((recorded ?? []).map(item =>
          [item.notification_id, item.actual_weather as Answer])));
        setFeedbackReady(true);
        setMessage("");
      }
    } catch {
      setNotifications([]);
      setAnswers({});
      setFeedbackReady(false);
      setMessage("通知履歴を読み込めなかったよ。少しあとでもう一度試してね。");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 5 * 60 * 1000);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  }, [refresh]);

  // Phase 1: links from today's alerts work without changing the Push payload.
  useEffect(() => {
    const readHash = () => {
      const match = /^#rain-feedback-([1-9]\d{0,14})$/.exec(window.location.hash);
      const id = match ? Number(match[1]) : null;
      setFocusedNotificationId(id !== null && Number.isSafeInteger(id) ? id : null);
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  useEffect(() => {
    if (focusedNotificationId === null || !notifications.some(n => n.id === focusedNotificationId)) return;
    document.getElementById(`rain-feedback-${focusedNotificationId}`)
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [focusedNotificationId, notifications, filter]);

  const save = async (notification: Delivery, answer: Answer) => {
    const allowed = FEEDBACK_OPTIONS[notification.event_type];
    if (!feedbackReady || !allowed?.some(([value]) => value === answer)) return;
    if (negativeFeedbackNeedsWait(answer, notification.delivered_at, Date.now())) {
      setMessage("「降らなかった」「止まなかった」は、通知から1時間以上たってから回答してね。");
      return;
    }
    setSaving(notification.id);
    setSaved(null);
    setMessage("");
    try {
      const client = getSupabaseBrowserClient();
      const { data: { session }, error: authError } = await client.auth.getSession();
      if (authError || !session) throw authError ?? new Error("session_expired");
      const { error } = await client.from("rain_notification_feedback").upsert({
        notification_id: notification.id,
        owner_id: session.user.id,
        actual_weather: answer,
        updated_at: new Date().toISOString(),
      }, { onConflict: "notification_id" });
      if (error) throw error;
      setAnswers(prev => ({ ...prev, [notification.id]: answer }));
      setSaved(notification.id);
    } catch {
      setMessage("回答を保存できなかったよ。少しあとでもう一度試してね。");
    } finally {
      setSaving(null);
    }
  };

  const answerable = notifications.filter(n => Boolean(FEEDBACK_OPTIONS[n.event_type]));
  const unanswered = answerable.filter(n => !answers[n.id]).length;
  const visible = filter === "all" ? notifications : answerable.filter(n => !answers[n.id] || n.id === focusedNotificationId);

  return (
    <section style={{ margin: "28px 0", padding: 20, border: "1px solid rgba(255,255,255,.15)", borderRadius: 20, background: "rgba(24,55,88,.8)" }}>
      <h2 style={{ marginTop: 0, marginBottom: 6 }}>🌧️ 届いた通知の天気を教えてね</h2>
      <p style={{ marginTop: 0, fontSize: 14, color: "#eef5ff" }}>
        最近7日間・最大200件の通知。実際に見た場所の天気だけを回答してね。
        見ていない場所なら「わからない」で大丈夫だよ。
      </p>
      {message && <p role="status" style={{ color: "#ffe1a0" }}>{message}</p>}
      {feedbackReady && (
        <>
          <div style={{ fontSize: 14, marginBottom: 8 }}>回答できる通知：{answerable.length}件／未回答：{unanswered}件</div>
          <div aria-label="通知履歴の絞り込み" role="group" style={{ display: "flex", gap: 8 }}>
            {([["all", "すべて"], ["unanswered", "未回答だけ"]] as const).map(([key, label]) => (
              <button key={key} type="button" aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                style={{ padding: "8px 12px", borderRadius: 10, color: "#fff", cursor: "pointer",
                  border: filter === key ? "2px solid #7dd3fc" : "1px solid #7799b8",
                  background: "#284e75" }}>{label}</button>
            ))}
          </div>
          {filter === "unanswered" && unanswered === 0 && <p>未回答の通知はないよ。ありがとう！</p>}
        </>
      )}
      {visible.map(notification => {
        const options = FEEDBACK_OPTIONS[notification.event_type] ?? [];
        const selected = options.find(([value]) => value === answers[notification.id]);
        return (
          <div id={`rain-feedback-${notification.id}`} key={notification.id} style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.15)", scrollMarginTop: 24, outline: focusedNotificationId === notification.id ? "2px solid #7dd3fc" : "none", borderRadius: 8 }}>
            {focusedNotificationId === notification.id && <p style={{ margin: "0 0 5px", fontSize: 13, color: "#b8efff", fontWeight: 700 }}>📩 選んだ通知はこちら</p>}
            <div style={{ fontWeight: 700 }}>{notification.body}</div>
            <div style={{ fontSize: 13, color: "#eef5ff" }}>{formatTokyo(notification.delivered_at)} に通知</div>
            {selected && <div role="status" style={{ marginTop: 6, color: "#bbf7d0" }}>
              回答済み：{selected[1]} {saved === notification.id ? "✓ 保存したよ" : "（変更できるよ）"}
            </div>}
            {options.length ? (
              <>
                <div style={{ fontSize: 13, marginTop: 10 }}>この場所で、実際はどうだった？</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 7 }}>
                  {options.map(([value, label]) => (
                    <button key={value} type="button" disabled={!feedbackReady || saving === notification.id ||
                      negativeFeedbackNeedsWait(value, notification.delivered_at, Date.now())}
                      aria-pressed={answers[notification.id] === value}
                      onClick={() => void save(notification, value)}
                      style={{ padding: "8px 11px", borderRadius: 10, color: "#fff",
                        border: answers[notification.id] === value ? "2px solid #fff" : "1px solid #7799b8",
                        background: answers[notification.id] === value ? "#24658d" : "#284e75",
                        opacity: feedbackReady ? 1 : 0.6 }}>
                      {label}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 12, marginTop: 6, color: "#d6e6f5" }}>
                  「降らなかった」「止まなかった」は、通知から1時間後に回答できるよ。
                  過去通知には予測の目標時刻がないため、回答を自動で的中判定には使わないよ。
                </p>
              </>
            ) : <div style={{ fontSize: 13, marginTop: 8 }}>この種類の通知への回答は、まだ準備中だよ。</div>}
          </div>
        );
      })}
    </section>
  );
}
