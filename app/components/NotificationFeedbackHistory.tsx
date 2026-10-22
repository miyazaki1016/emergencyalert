"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { compactFeedbackHistory, filterFeedbackByTarget, negativeFeedbackNeedsWait, parseFeedbackHash, revealFeedbackCard, selectFeedbackHistory, summarizeFeedbackObservations, toggleFeedbackCard, watchedPlaceLabel } from "../../lib/weather/rain/feedbackPhase1";
import { loadPhase1Feedback, loadPhase2ObservationTimes, savePhase1Feedback, type WeatherFeedbackAnswer } from "../../lib/weather/rain/feedbackPhase1Repository";
import { observationAsLocalInput, observationVsDeliveryLabel, observedTimeLabel, resolveFeedbackObservation, summarizeObservationTimeCoverage, type ObservationChoice, type WeatherObservation } from "../../lib/weather/rain/feedbackObservationTime";

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
  const [observationTimes, setObservationTimes] = useState<Record<number,WeatherObservation>>({});
  const [observationChoices, setObservationChoices] = useState<Record<number,ObservationChoice>>({});
  const [earlierInputs, setEarlierInputs] = useState<Record<number,string>>({});
  const [feedbackReady, setFeedbackReady] = useState(false);
  const [message, setMessage] = useState("通知履歴を読み込み中…");
  const [saving, setSaving] = useState<number | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "unanswered" | "answered">("all");
  const [selectedTargetId, setSelectedTargetId] = useState("all");
  const [shownCount, setShownCount] = useState(2);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [focusedNotificationId, setFocusedNotificationId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      setMessage("この検証画面では通知履歴を利用できないよ。");
      setNotifications([]);
      setTargetLabels({});
      setFeedbackReady(false);
      setAnswers({});
      setObservationTimes({});
      setObservationChoices({});
      setEarlierInputs({});
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
        setObservationTimes({});
        setObservationChoices({});
        setEarlierInputs({});
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
        setObservationTimes({});
        setFeedbackReady(false);
        setMessage("最近7日間の通知はまだないよ。");
        return;
      }
      try {
        const recorded = await loadPhase1Feedback(client, rows.map(row => row.id));
        const times = await loadPhase2ObservationTimes(client, rows.map(row => row.id));
        setAnswers(recorded);
        setObservationTimes(times);
        setFeedbackReady(true);
        setMessage("");
      } catch {
        setAnswers({});
        setObservationTimes({});
        setFeedbackReady(false);
        setMessage("通知履歴は表示できるよ。回答機能はまだ準備中だよ。");
      }
    } catch {
      setNotifications([]);
      setTargetLabels({});
      setAnswers({});
      setObservationTimes({});
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
      if (focused !== null) setExpandedIds(previous => revealFeedbackCard(previous, focused));
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
    let observation:WeatherObservation;
    try {
      observation = resolveFeedbackObservation(
        observationChoices[notification.id], observationTimes[notification.id],
        earlierInputs[notification.id] ?? "", new Date(),
      );
    } catch {
      setMessage("確認時刻を確認してね。未来の時刻や30日以上前は指定できないよ。");
      return;
    }
    setSaving(notification.id);
    setSaved(null);
    setMessage("");
    try {
      const client = getSupabaseBrowserClient();
      await savePhase1Feedback(client, notification.id, answer, observation);
      setAnswers(prev => ({ ...prev, [notification.id]: answer }));
      setObservationTimes(prev => ({...prev,[notification.id]:observation}));
      setObservationChoices(prev=>{const next={...prev};delete next[notification.id];return next;});
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
  const observations = summarizeFeedbackObservations(selectedNotifications, answers);
  const compactHistory = compactFeedbackHistory(visible, shownCount, focusedNotificationId);
  const targetIds = [...new Set(notifications.map(n => n.target_id))];
  const timingCoverage = summarizeObservationTimeCoverage(selectedNotifications.map(n=>n.id),answers,observationTimes);

  return (
    <section style={{ margin: "28px 0", padding: 20, border: "1px solid rgba(255,255,255,.15)", borderRadius: 20, background: "rgba(24,55,88,.8)" }}>
      <h2 style={{ marginTop: 0, marginBottom: 6 }}>🌧️ 届いた通知の天気を教えてね</h2>
      <p style={{ marginTop: 0, fontSize: 14, color: "#eef5ff" }}>
        直近2件を表示しているよ。通知をタップすると回答できるよ。
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
              <select aria-label="通知履歴の地点" value={selectedTargetId} onChange={event => { setSelectedTargetId(event.target.value); setShownCount(2); }}
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
          {timingCoverage.answered > 0 && (
            <p style={{fontSize:13,margin:"0 0 12px",color:"#d6e6f5"}}>
              🕒 実際の確認時刻が記録された回答：{timingCoverage.withTime}件
              ／時刻不明：{timingCoverage.withoutTime}件
            </p>
          )}
          {observations.answered > 0 && (
            <div aria-label="実際の天気の回答集計" style={{ marginBottom: 14, padding: "10px 12px",
              border: "1px solid rgba(125,211,252,.4)", borderRadius: 12, background: "rgba(28,74,105,.5)" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>☔ 届いた回答の内訳（この地点の履歴）</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 13px", fontSize: 13, marginTop: 6 }}>
                <span>🌧️ 雨が降った・続いた：{observations.observedRain}件</span>
                <span>☀️ 降らなかった・止んだ：{observations.observedDry}件</span>
                <span>🕒 確認したときにはすでに変化：{observations.alreadyChanged}件</span>
                <span>❓ わからない：{observations.unknown}件</span>
              </div>
              <div style={{ fontSize: 12, color: "#d6e6f5", marginTop: 6 }}>
                回答を見やすく数えたものだよ。実際に天気を見た時刻はまだ記録していないので、通知の早い・遅い／予測の的中は判断できないよ。
              </div>
            </div>
          )}
          <div aria-label="通知履歴の絞り込み" role="group" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {([["all", "すべて"], ["unanswered", "未回答だけ"], ["answered", "回答済みだけ"]] as const).map(([key, label]) => (
              <button key={key} type="button" aria-pressed={filter === key}
                onClick={() => { setFilter(key); setShownCount(2); }}
                style={{ padding: "8px 12px", borderRadius: 10, color: "#fff", cursor: "pointer",
                  border: filter === key ? "2px solid #7dd3fc" : "1px solid #7799b8",
                  background: "#284e75" }}>{label}</button>
            ))}
          </div>
          {filter === "unanswered" && unanswered === 0 && <p>未回答の通知はないよ。ありがとう！</p>}
          {filter === "answered" && history.answered === 0 && <p>回答済みの通知はまだないよ。</p>}
        </>
      )}
      {compactHistory.items.map(notification => {
        const options = FEEDBACK_OPTIONS[notification.event_type] ?? [];
        const selected = options.find(([value]) => value === answers[notification.id]);
        const expanded = expandedIds.includes(notification.id);
        const existingObservation = observationTimes[notification.id];
        const selectedObservation = observationChoices[notification.id] ?? (existingObservation?.observed_time_source === "AT_RESPONSE" ? "now" : existingObservation?.observed_time_source === "RECALLED" ? "earlier" : "unknown");
        return (
          <div id={`rain-feedback-${notification.id}`} key={notification.id} style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.15)", scrollMarginTop: 24, outline: focusedNotificationId === notification.id ? "2px solid #7dd3fc" : "none", borderRadius: 8 }}>
            {focusedNotificationId === notification.id && <p style={{ margin: "0 0 5px", fontSize: 13, color: "#b8efff", fontWeight: 700 }}>📩 選んだ通知はこちら</p>}
            <button type="button"
              aria-expanded={expanded}
              aria-controls={`rain-feedback-answer-${notification.id}`}
              onClick={() => setExpandedIds(previous => toggleFeedbackCard(previous, notification.id))}
              style={{ width: "100%", border: "none", background: "transparent", padding: "6px 0",
                color: "#fff", textAlign: "left", cursor: "pointer" }}>
              <span style={{ display: "block", fontSize: 13, marginBottom: 5, color: "#b8efff", fontWeight: 700 }}>
                📍 {watchedPlaceLabel(notification.target_id, targetLabels)}
              </span>
              <span style={{ display: "block", fontWeight: 700, lineHeight: 1.5 }}>{notification.body}</span>
              <span style={{ display: "block", fontSize: 13, marginTop: 5, color: "#eef5ff" }}>
                {formatTokyo(notification.delivered_at)} に通知
              </span>
              <span style={{ display: "block", fontSize: 13, marginTop: 6,
                color: selected ? "#bbf7d0" : "#b8efff" }}>
                {selected ? `✅ 回答済み：${selected[1]}` : options.length ? "✏️ 未回答" : "通知のみ"}
                {"　"}{expanded ? "▲ 閉じる" : selected ? "▼ 回答を確認・変更" : "▼ 回答する"}
              </span>
            </button>
            {expanded && <div id={`rain-feedback-answer-${notification.id}`}>
            {selected && <div role="status" style={{ marginTop: 6, color: "#bbf7d0" }}>
              {saved === notification.id ? "✓ 保存したよ" : "回答内容は変更できるよ"}
            </div>}
            {options.length ? (
              <>
                <div style={{ fontSize: 13, marginTop: 10 }}>この見張り地点の天気を実際に確認できた？ 確認できないときは「わからない」を選んでね。</div>
                <div style={{ marginTop: 10, padding: "10px 0", fontSize: 13 }}>
                  <label htmlFor={`rain-observed-choice-${notification.id}`} style={{display:"block",marginBottom:6}}>
                    🕒 実際に天気を確認した時刻（任意）
                  </label>
                  <select id={`rain-observed-choice-${notification.id}`} value={selectedObservation}
                    onChange={event=>{
                      const choice = event.target.value as ObservationChoice;
                      setObservationChoices(prev=>({...prev,[notification.id]:choice}));
                    }}
                    style={{ padding:"8px 10px",maxWidth:"100%",width:"100%",borderRadius:8,color:"#fff",background:"#284e75",border:"1px solid #7799b8" }}>
                    <option value="unknown">覚えていない・確認していない</option>
                    <option value="now">今、その場所で確認した</option>
                    <option value="earlier">以前に確認した（日時を入力）</option>
                  </select>
                  {selectedObservation === "earlier" && (
                    <label style={{display:"block",marginTop:8}}>
                      確認した日時（端末の現地時間）
                      <input type="datetime-local" value={earlierInputs[notification.id] ?? observationAsLocalInput(existingObservation?.observed_at)}
                        onChange={event=>{
                          setEarlierInputs(prev=>({...prev,[notification.id]:event.target.value}));
                          setObservationChoices(prev=>({...prev,[notification.id]:"earlier"}));
                        }}
                        style={{display:"block",width:"100%",maxWidth:"100%",marginTop:4,padding:8,borderRadius:8,
                          color:"#fff",background:"#284e75",border:"1px solid #7799b8"}} />
                    </label>
                  )}
                  {existingObservation && <div style={{color:"#bbf7d0",marginTop:6}}>
                    記録済み：{observedTimeLabel(existingObservation.observed_time_source,existingObservation.observed_at)}
                    {observationVsDeliveryLabel(notification.delivered_at,existingObservation.observed_at) && (
                      <div style={{fontSize:12,color:"#d6e6f5",marginTop:3}}>
                        {observationVsDeliveryLabel(notification.delivered_at,existingObservation.observed_at)}
                        （通知が正確だったかは、これだけでは判断できないよ）
                      </div>
                    )}
                  </div>}
                  <div style={{fontSize:12,color:"#d6e6f5",marginTop:5}}>
                    通知時刻や回答保存時刻とは別に記録するよ。未入力でも回答できるよ。
                  </div>
                  {selected && observationChoices[notification.id] !== undefined && (
                    <button type="button" disabled={!feedbackReady || saving === notification.id}
                      onClick={() => void save(notification, answers[notification.id])}
                      style={{marginTop:9,padding:"8px 11px",borderRadius:9,color:"#fff",
                        background:"#284e75",border:"1px solid #7dd3fc",cursor:"pointer"}}>
                      🕒 この回答の確認時刻だけ保存
                    </button>
                  )}
                </div>
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
            </div>}
          </div>
        );
      })}
      {compactHistory.remaining > 0 && (
        <button type="button" onClick={() => setShownCount(count => count + 5)}
          style={{ display: "block", width: "100%", marginTop: 16, padding: "11px 16px",
            borderRadius: 12, border: "1px solid #7dd3fc", background: "#28567e",
            color: "#fff", fontWeight: 700, cursor: "pointer" }}>
          ＋ 以前の通知をもっと見る（残り{compactHistory.remaining}件）
        </button>
      )}
      {compactHistory.items.length > 2 && (
        <button type="button" onClick={() => setShownCount(2)}
          style={{ marginTop: 10, padding: "8px 12px", borderRadius: 10, border: "1px solid #7799b8",
            background: "transparent", color: "#d7ebfc", cursor: "pointer" }}>
          ↑ 最新の通知だけに戻す
        </button>
      )}
    </section>
  );
}
