"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { filterFeedbackByTarget, negativeFeedbackNeedsWait, parseFeedbackHash, selectFeedbackHistory, watchedPlaceLabel } from "../../lib/weather/rain/feedbackPhase1";
import { loadPhase1Feedback, savePhase1Feedback, type WeatherFeedbackAnswer } from "../../lib/weather/rain/feedbackPhase1Repository";

type Delivery = {
  id: number;
  target_id: string;
  event_type: string;
  body: string;
  delivered_at: string;
};
type Answer = WeatherFeedbackAnswer;
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
function formatTokyo(timestamp: string): string {
  return new Date(timestamp).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo", month: "numeric", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function NotificationFeedbackHistory() {
  const [notifications, setNotifications] = useState<Delivery[]>([]);
  const [targetLabels, setTargetLabels] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [feedbackReady, setFeedbackReady] = useState(false);
  const [message, setMessage] = useState("通知履歴を読み込み中…");
  const [saving, setSaving] = useState<number | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "unanswered" | "answered">("all");
  const [selectedTargetId, setSelectedTargetId] = useState("all");
  const [focusedNotificationId, setFocusedNotificationId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      setMessage("この検証画面では通知履歴を利用できないよ。");
      setNotifications([]);
      setTargetLabels({});
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
        setTargetLabels({});
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
      // Historical answers must always be described using the registered
      // watched place; device location and target location may be different.
      const ids = [...new Set(rows.map(row => row.target_id))];
      if (ids.length) {
        const { data: targets, error: targetError } = await client
          .from("watch_targets").select("id,label").in("id", ids);
        setTargetLabels(!targetError ? Object.fromEntries(
          (targets ?? []).map(target => [target.id, String(target.label ?? "")]),
        ) : {});
      } else {
        setTargetLabels({});
      }
      if (rows.length === 0) {
        setAnswers({});
        setFeedbackReady(false);
        setMessage("最近7日間の通知はまだないよ。");
        return;
      }
      try {
        const recorded = await loadPhase1Feedback(client, rows.map(row => row.id));
        setAnswers(recorded);
        setFeedbackReady(true);
        setMessage("");
      } catch {
        setAnswers({});
        setFeedbackReady(false);
        setMessage("通知履歴は表示できるよ。回答機能はまだ準備中だよ。");
      }
    } catch {
      setNotifications([]);
      setTargetLabels({});
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

    // The user may register a watched place (anonymous Supabase sign-in)
    // without leaving this page. Refresh feedback immediately after sign-in.
    // Never call Supabase async APIs inside onAuthStateChange itself.
    // Same-tab registration may use a separate Supabase client instance.
    // The registration flow emits this event after a new anonymous session.
    const onRegistered = () => void refresh();
    window.addEventListener("amefuru:auth-ready", onRegistered);

    // Subscribe only in configured environments. Supabase callbacks are
    // synchronous: defer refresh instead of invoking async auth methods inside.
    let pendingAuthRefresh: number | null = null;
    const subscription = (process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
      ? getSupabaseBrowserClient().auth.onAuthStateChange((event) => {
        if (event !== "SIGNED_IN" && event !== "SIGNED_OUT") return;
        if (pendingAuthRefresh !== null) window.clearTimeout(pendingAuthRefresh);
        pendingAuthRefresh = window.setTimeout(() => {
          pendingAuthRefresh = null;
          void refresh();
        }, 0);
      }).data.subscription : null;
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("amefuru:auth-ready", onRegistered);
      if (pendingAuthRefresh !== null) window.clearTimeout(pendingAuthRefresh);
      subscription?.unsubscribe();
    };
  }, [refresh]);

  // Phase 1: links from today's alerts work without changing the Push payload.
  useEffect(() => {
    const readHash = () => {
      const focused = parseFeedbackHash(window.location.hash);
      setFocusedNotificationId(focused);
      if (focused !== null) {
        // A link from today's alert should work even after choosing a
        // different location in the history filter.
        setSelectedTargetId("all");
      }
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
      await savePhase1Feedback(client, notification.id, answer);
      setAnswers(prev => ({ ...prev, [notification.id]: answer }));
      setSaved(notification.id);
    } catch {
      setMessage("回答を保存できなかったよ。少しあとでもう一度試してね。");
    } finally {
      setSaving(null);
    }
  };

  const selectedNotifications = filterFeedbackByTarget(notifications, selectedTargetId);
  const history = selectFeedbackHistory(selectedNotifications, answers,
    new Set(Object.keys(FEEDBACK_OPTIONS)), filter, focusedNotificationId);
  const { visible, unanswered } = history;
  const targetIds = [...new Set(notifications.map(n => n.target_id))];

  return (
    <section style={{ margin: "28px 0", padding: 20, border: "1px solid rgba(255,255,255,.15)", borderRadius: 20, background: "rgba(24,55,88,.8)" }}>
      <h2 style={{ marginTop: 0, marginBottom: 6 }}>🌧️ 届いた通知の天気を教えてね</h2>
      <p style={{ marginTop: 0, fontSize: 14, color: "#eef5ff" }}>
        最近7日間・最大200件の通知。実際に見た場所の天気だけを回答してね。
        見ていない場所なら「わからない」で大丈夫だよ。
      </p>
      {message && <p role="status" style={{ color: "#ffe1a0" }}>{message}</p>}
      <button type="button" onClick={() => void refresh()} disabled={saving !== null}
        style={{ marginBottom: 12, padding: "7px 12px", borderRadius: 10, color: "#eaf2ff",
          border: "1px solid #7799b8", background: "#284e75", cursor: "pointer" }}>
        ↻ 通知履歴を更新
      </button>
      {feedbackReady && (
        <>
          {targetIds.length > 1 && (
            <label style={{ display: "block", marginBottom: 12, fontSize: 14, color: "#eaf2ff" }}>
              📍 見張る場所で絞り込む
              <select aria-label="通知履歴の地点" value={selectedTargetId} onChange={event => setSelectedTargetId(event.target.value)}
                style={{ display: "block", width: "100%", padding: "9px 12px", marginTop: 6, borderRadius: 10,
                  color: "#fff", background: "#284e75", border: "1px solid #7799b8" }}>
                <option value="all">すべての見張り地点</option>
                {targetIds.map(id => (
                  <option key={id} value={id}>{watchedPlaceLabel(id, targetLabels)}</option>
                ))}
              </select>
            </label>
          )}
          <div style={{ fontSize: 14, marginBottom: 8 }}>回答できる通知：{history.answerable}件／回答済み：{history.answered}件／未回答：{unanswered}件</div>
          <div aria-label="通知履歴の絞り込み" role="group" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {([["all", "すべて"], ["unanswered", "未回答だけ"], ["answered", "回答済みだけ"]] as const).map(([key, label]) => (
              <button key={key} type="button" aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                style={{ padding: "8px 12px", borderRadius: 10, color: "#fff", cursor: "pointer",
                  border: filter === key ? "2px solid #7dd3fc" : "1px solid #7799b8",
                  background: "#284e75" }}>{label}</button>
            ))}
          </div>
          {filter === "unanswered" && unanswered === 0 && <p>未回答の通知はないよ。ありがとう！</p>}
          {filter === "answered" && history.answered === 0 && <p>回答済みの通知はまだないよ。</p>}
        </>
      )}
      {visible.map(notification => {
        const options = FEEDBACK_OPTIONS[notification.event_type] ?? [];
        const selected = options.find(([value]) => value === answers[notification.id]);
        return (
          <div id={`rain-feedback-${notification.id}`} key={notification.id} style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.15)", scrollMarginTop: 24, outline: focusedNotificationId === notification.id ? "2px solid #7dd3fc" : "none", borderRadius: 8 }}>
            {focusedNotificationId === notification.id && <p style={{ margin: "0 0 5px", fontSize: 13, color: "#b8efff", fontWeight: 700 }}>📩 選んだ通知はこちら</p>}
            <div style={{ fontSize: 13, marginBottom: 4, color: "#b8efff", fontWeight: 700 }}>
              📍 見張っていた場所：{watchedPlaceLabel(notification.target_id, targetLabels)}
            </div>
            <div style={{ fontWeight: 700 }}>{notification.body}</div>
            <div style={{ fontSize: 13, color: "#eef5ff" }}>{formatTokyo(notification.delivered_at)} に通知</div>
            {selected && <div role="status" style={{ marginTop: 6, color: "#bbf7d0" }}>
              回答済み：{selected[1]} {saved === notification.id ? "✓ 保存したよ" : "（変更できるよ）"}
            </div>}
            {options.length ? (
              <>
                <div style={{ fontSize: 13, marginTop: 10 }}>この見張り地点の天気を実際に確認できた？ 確認できないときは「わからない」を選んでね。</div>
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
