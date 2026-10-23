"use client";

import { useEffect, useState } from "react";
import { installPwaResumeDiagnostics, type ResumeEvent } from "../../lib/diagnostics/pwaResumeDiagnostics";

/** Opt-in diagnostics; local-only and never sends diagnostic events. */
export default function ResumeDiagnosticsPanel() {
  const [enabled, setEnabled] = useState(false);
  const [events, setEvents] = useState<ResumeEvent[]>([]);
  const [previous, setPrevious] = useState<{at:string;type:string}[]>([]);
  const [storageStatus, setStorageStatus] = useState("未確認");
  const [runtimeStatus, setRuntimeStatus] = useState("確認中");
  const [swEvents, setSwEvents] = useState<string[]>([]);
  const [authStatus, setAuthStatus] = useState("未観測");
  const [authIdPrefix, setAuthIdPrefix] = useState("未確認");
  const [authStorageStatus, setAuthStorageStatus] = useState("未確認");
  const [authStorageInventory, setAuthStorageInventory] = useState("未確認");
  const [otherStorageKeys, setOtherStorageKeys] = useState<string[]>([]);
  const [copyStatus, setCopyStatus] = useState("");
  const [authTransitions, setAuthTransitions] = useState<string[]>([]);
  const [clearStatus, setClearStatus] = useState("");
  const [snapshotPaused, setSnapshotPaused] = useState(false);

  useEffect(() => {
    const queryEnabled = new URLSearchParams(window.location.search).get("resume_debug") === "1";
    const inAppEnabled = (() => {
      try { return window.sessionStorage.getItem("amefuru:resume-debug:enabled:v1") === "1"; }
      catch { return false; }
    })();
    if (!queryEnabled && !inAppEnabled) return;
    setEnabled(true);
    const onAuthDiagnostic = (event: Event) => {
      const detail = (event as CustomEvent<{ status?: string; userIdPrefix?: string | null }>).detail;
      const status = detail?.status;
      setAuthIdPrefix(status === "present" && /^[0-9a-f]{8}$/.test(detail?.userIdPrefix ?? "") ? detail!.userIdPrefix! : "なし");
      if (status === "present") setAuthStatus("セッションあり");
      else if (status === "absent") setAuthStatus("セッションなし");
      else if (status === "error") setAuthStatus("確認エラー");
    };
    window.addEventListener("amefuru:diagnostic-auth-state", onAuthDiagnostic);
    const handle = installPwaResumeDiagnostics();
    try {
      setSnapshotPaused(window.sessionStorage.getItem("amefuru:resume-debug:paused:v1") === "1");
    } catch {
      setStorageStatus("利用不可");
    }
    // Diagnostic-only sessionStorage key. Never access auth/session keys.
    const key = "amefuru:resume-debug:snapshot:v1";
    try {
      const raw = window.sessionStorage.getItem(key);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setPrevious(parsed.filter((e): e is {at:string;type:string} =>
            !!e && typeof e === "object" && typeof e.at === "string" &&
            typeof e.type === "string" && e.at.length <= 30 &&
            e.type.length <= 40).slice(-30));
        }
      }
      setStorageStatus("利用可");
    } catch {
      setStorageStatus("利用不可");
    }
    const checkAuthStorage = () => {
      // Inspect key existence only. Never read, parse, log or copy auth token values.
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!url) { setAuthStorageStatus("設定なし"); return; }
        const ref = new URL(url).hostname.split(".")[0];
        const key = `sb-${ref}-auth-token`;
        const exists = Array.from({ length: window.localStorage.length }, (_, i) => window.localStorage.key(i)).includes(key);
        setAuthStorageStatus(exists ? "認証保存キーあり（内容は未確認）" : "認証保存キーなし");
        // Only count key names by prefix. Never access their stored values.
        const names = Array.from({ length: window.localStorage.length }, (_, i) => window.localStorage.key(i)).filter((k): k is string => typeof k === "string");
        const supabaseCount = names.filter(k => /^sb-[a-z0-9-]+-auth-token$/.test(k)).length;
        setOtherStorageKeys(names.filter(k => !/^sb-[a-z0-9-]+-auth-token$/.test(k)).map(k => k.slice(0, 100)));
        setAuthStorageInventory(`Supabase形式の認証キー: ${supabaseCount}件 ／ 保存キー総数: ${names.length}件`);
      } catch {
        setAuthStorageStatus("保存領域を確認できない");
        setAuthStorageInventory("確認不可");
        setOtherStorageKeys([]);
      }
    };
    // Metadata-only, opt-in transition journal. Never read auth token values.
    const journalKey = "amefuru:resume-debug:auth-transitions:v2";
    let lastFingerprint = "";
    const readJournal = (): string[] => {
      try {
        const parsed: unknown = JSON.parse(localStorage.getItem(journalKey) ?? "[]");
        return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string").slice(-25) : [];
      } catch { return []; }
    };
    const journalAuth = (reason: string) => {
      try {
        const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname.split(".")[0];
        const expected = "sb-" + ref + "-auth-token";
        const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
        const fingerprint = String(keys.includes(expected)) + "/" + keys.filter(k => k && /^sb-[a-z0-9-]+-auth-token$/.test(k)).length;
        if (fingerprint === lastFingerprint) return;
        lastFingerprint = fingerprint;
        const entry = new Date().toISOString() + " " + reason + " authKey=" + (keys.includes(expected) ? "present" : "absent") + " supabaseKeyCount=" + fingerprint.split("/")[1];
        const next = [...readJournal(), entry].slice(-25);
        localStorage.setItem(journalKey, JSON.stringify(next));
        setAuthTransitions(next);
      } catch { /* Diagnostics must not interfere with the app. */ }
    };
    setAuthTransitions(readJournal());
    journalAuth("initial");
    const onStorageChange = () => journalAuth("storage-event");
    const onVisibilityChange = () => journalAuth("visibility-" + document.visibilityState);
    window.addEventListener("storage", onStorageChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const update = () => {
      journalAuth("poll");
      checkAuthStorage();
      setEvents([...handle.events]);
      // Read-only metadata. Never create an auth client or read credentials.
      const sw = "serviceWorker" in navigator
        ? (navigator.serviceWorker.controller ? "制御あり" : "制御なし")
        : "非対応";
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      setRuntimeStatus("PWA: " + (standalone ? "ホーム画面" : "ブラウザ") +
        " ／ SW: " + sw +
        " ／ 通信: " + (navigator.onLine ? "オンライン" : "オフライン") +
        " ／ 表示: " + document.visibilityState);

      try {
        if (window.sessionStorage.getItem("amefuru:resume-debug:paused:v1") === "1") return;
        window.sessionStorage.setItem(key, JSON.stringify(
          handle.events.slice(-30).map(e => ({ at: e.at, type: e.type }))
        ));
      } catch {
        setStorageStatus("保存不可");
      }
    };
    update();
    const sw = "serviceWorker" in navigator ? navigator.serviceWorker : null;
    const record = (name: string) => setSwEvents(old =>
      [...old, new Date().toISOString().slice(11, 19) + " " + name].slice(-12));
    const onChange = () => record("controllerchange");
    const onUpdate = () => record("updatefound");
    let active = true;
    let observed: ServiceWorkerRegistration | undefined;
    sw?.addEventListener("controllerchange", onChange);
    if (sw) {
      void sw.getRegistration().then(reg => {
        if (!active || !reg) return;
        observed = reg;
        reg.addEventListener("updatefound", onUpdate);
      }).catch(() => {});
    }
    const timer = window.setInterval(update, 700);
    return () => {
      active = false;
      window.removeEventListener("storage", onStorageChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("amefuru:diagnostic-auth-state", onAuthDiagnostic);
      window.clearInterval(timer);
      sw?.removeEventListener("controllerchange", onChange);
      observed?.removeEventListener("updatefound", onUpdate);
    };
  }, []);

  const copyReport = async () => {
    // Allowlisted diagnostic summary only. No URLs, user IDs, tokens or event details.
    const report = [
      "アメふる 診断レポート",
      "取得時刻: " + new Date().toISOString(),
      "履歴枠: " + (document.querySelector("[data-amefuru-feedback-history]") ? "あり" : "なし"),
      "認証状態: " + authStatus,
      "認証ID先頭8文字: " + authIdPrefix,
      "認証保存キー: " + authStorageStatus,
      "保存キー集計: " + authStorageInventory,
      "診断保存: " + storageStatus,
      "直近イベント:",
      ...events.slice(-30).map(e => e.at.slice(11, 19) + " " + e.type),
      "前回イベント:",
      ...previous.map(e => e.at.slice(11, 19) + " " + e.type),
      "認証保存キーの変化:",
      ...authTransitions,
      "SWイベント:",
      ...swEvents,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(report);
      setCopyStatus("コピーしました");
    } catch {
      setCopyStatus("コピーできませんでした");
    }
  };

  const clearSnapshot = () => {
    try {
      sessionStorage.setItem("amefuru:resume-debug:paused:v1", "1");
      sessionStorage.removeItem("amefuru:resume-debug:snapshot:v1");
      setSnapshotPaused(true);
      setPrevious([]);
      setClearStatus("保存した診断記録を削除しました");
    } catch {
      setClearStatus("削除できませんでした");
    }
  };

  const resumeSnapshot = () => {
    try {
      sessionStorage.removeItem("amefuru:resume-debug:paused:v1");
      setSnapshotPaused(false);
      setClearStatus("診断記録の保存を再開しました");
    } catch {
      setClearStatus("保存を再開できませんでした");
    }
  };

  if (!enabled) return null;
  return (
    <aside aria-label="復帰診断（研究用）" style={{
      position: "fixed", bottom: 8, left: 8, right: 8, zIndex: 2147483647,
      width: "auto", maxWidth: 380, marginLeft: "auto", boxSizing: "border-box",
      maxHeight: "38vh", overflowX: "hidden", overflowY: "auto",
      padding: 12, background: "#111827", color: "#fff", border: "2px solid #fbbf24",
      borderRadius: 12, fontSize: 12, boxShadow: "0 4px 24px #0008"
    }}>
      <strong>🔍 復帰診断（研究用・端末内のみ）</strong>
      <div>履歴枠: {typeof document !== "undefined" && document.querySelector('[data-amefuru-feedback-history]') ? "あり" : "なし"} ／ 記録: {events.length}件</div>
      <div>診断保存: {storageStatus} ／ 前回の記録: {previous.length}件</div>
      <div>{runtimeStatus}</div>
      <div>認証状態（既存の履歴読込から）: {authStatus}</div>
      <div>認証ID先頭8文字（診断時のみ）: {authIdPrefix}</div>
      <div>認証保存キー（有無のみ）: {authStorageStatus}</div>
      <div>保存キー集計（件数のみ）: {authStorageInventory}</div>
      <details>
        <summary>その他の保存キー名: {otherStorageKeys.length}件</summary>
        <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{otherStorageKeys.join("\n") || "該当なし"}</pre>
        <small>キー名だけを端末内に表示します。値は読み取らず、コピー用レポートにも含めません。</small>
      </details>
      <details>
        <summary>認証保存キーの変化（端末内に保持）: {authTransitions.length}件</summary>
        <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{authTransitions.join("\n") || "記録なし"}</pre>
      </details>
      <details>
        <summary>SWイベント: {swEvents.length}件</summary>
        <pre style={{ whiteSpace: "pre-wrap" }}>{swEvents.map(x => x + "\\n")}</pre>
      </details>
      <details>
        <summary>前回のページ記録（最大30件）</summary>
        <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: "20vh", overflow: "auto" }}>
          {previous.map(e => e.at.slice(11, 19) + " " + e.type).join("\n") || "記録なし"}
        </pre>
      </details>
      <details>
        <summary>直近イベントを表示</summary>
        <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: "24vh", overflow: "auto" }}>
          {events.slice(-18).map(e => `${e.at.slice(11, 19)} ${e.type} ${JSON.stringify(e.details ?? {})}`).join("\n")}
        </pre>
      </details>
      <button type="button" onClick={() => void copyReport()}
        style={{ marginTop: 8, padding: "6px 10px", borderRadius: 6, background: "#fbbf24", color: "#111827" }}>
        診断レポートをコピー
      </button>
      <span role="status" style={{ marginLeft: 8 }}>{copyStatus}</span>
      <div><button type="button" onClick={clearSnapshot}>保存した診断記録を削除・保存停止</button>
      {snapshotPaused && <button type="button" onClick={resumeSnapshot}>保存を再開</button>}
      <span role="status">{clearStatus}</span></div>
      <br />
      <small>画面撮影時は位置情報などが映らないよう注意。再読み込み後は前回のイベント名と時刻のみ復元します。診断用localStorageに認証キーの有無と時刻のみ最大25件記録します（認証情報は変更しません）。認証保存キーは名前の有無だけを調べ、トークンは読み取りません。認証済みの場合のみIDの先頭8文字を表示します。</small>
    </aside>
  );
}
