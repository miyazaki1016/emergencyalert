"use client";

import { useEffect, useState } from "react";
import { installPwaResumeDiagnostics, type ResumeEvent } from "../../lib/diagnostics/pwaResumeDiagnostics";

/** Research-only. Shown only with ?resume_debug=1; never sends diagnostic events. */
export default function ResumeDiagnosticsPanel() {
  const [enabled, setEnabled] = useState(false);
  const [events, setEvents] = useState<ResumeEvent[]>([]);
  const [previous, setPrevious] = useState<{at:string;type:string}[]>([]);
  const [storageStatus, setStorageStatus] = useState("未確認");
  const [runtimeStatus, setRuntimeStatus] = useState("確認中");
  const [swEvents, setSwEvents] = useState<string[]>([]);
  const [authStatus, setAuthStatus] = useState("未観測");
  const [copyStatus, setCopyStatus] = useState("");
  const [clearStatus, setClearStatus] = useState("");
  const [snapshotPaused, setSnapshotPaused] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("resume_debug") !== "1") return;
    setEnabled(true);
    const onAuthDiagnostic = (event: Event) => {
      const status = (event as CustomEvent<{ status?: string }>).detail?.status;
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
    const update = () => {
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
      "診断保存: " + storageStatus,
      "直近イベント:",
      ...events.slice(-30).map(e => e.at.slice(11, 19) + " " + e.type),
      "前回イベント:",
      ...previous.map(e => e.at.slice(11, 19) + " " + e.type),
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
      <small>画面撮影時は位置情報などが映らないよう注意。再読み込み後は前回のイベント名と時刻のみ復元します。診断用sessionStorage以外は変更しません。</small>
    </aside>
  );
}
