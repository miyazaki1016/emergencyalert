"use client";

import { useEffect, useState } from "react";
import { installPwaResumeDiagnostics, type ResumeEvent } from "../../lib/diagnostics/pwaResumeDiagnostics";

/** Research-only. Shown only with ?resume_debug=1; never sends diagnostic events. */
export default function ResumeDiagnosticsPanel() {
  const [enabled, setEnabled] = useState(false);
  const [events, setEvents] = useState<ResumeEvent[]>([]);
  const [previous, setPrevious] = useState<{at:string;type:string}[]>([]);
  const [storageStatus, setStorageStatus] = useState("未確認");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("resume_debug") !== "1") return;
    setEnabled(true);
    const handle = installPwaResumeDiagnostics();
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
      try {
        window.sessionStorage.setItem(key, JSON.stringify(
          handle.events.slice(-30).map(e => ({ at: e.at, type: e.type }))
        ));
      } catch {
        setStorageStatus("保存不可");
      }
    };
    update();
    const timer = window.setInterval(update, 700);
    return () => window.clearInterval(timer);
  }, []);

  if (!enabled) return null;
  return (
    <aside aria-label="復帰診断（研究用）" style={{
      position: "fixed", bottom: 8, right: 8, zIndex: 2147483647,
      width: "min(94vw, 380px)", maxHeight: "38vh", overflow: "auto",
      padding: 12, background: "#111827", color: "#fff", border: "2px solid #fbbf24",
      borderRadius: 12, fontSize: 12, boxShadow: "0 4px 24px #0008"
    }}>
      <strong>🔍 復帰診断（研究用・端末内のみ）</strong>
      <div>履歴枠: {typeof document !== "undefined" && document.querySelector('[data-amefuru-feedback-history]') ? "あり" : "なし"} ／ 記録: {events.length}件</div>
      <div>診断保存: {storageStatus} ／ 前回の記録: {previous.length}件</div>
      <details>
        <summary>前回のページ記録（最大30件）</summary>
        <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: "20vh", overflow: "auto" }}>
          {previous.map(e => e.at.slice(11, 19) + " " + e.type).join("\\n") || "記録なし"}
        </pre>
      </details>
      <details>
        <summary>直近イベントを表示</summary>
        <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: "24vh", overflow: "auto" }}>
          {events.slice(-18).map(e => `${e.at.slice(11, 19)} ${e.type} ${JSON.stringify(e.details ?? {})}`).join("\n")}
        </pre>
      </details>
      <small>画面撮影時は位置情報などが映らないよう注意。再読み込み後は前回のイベント名と時刻のみ復元します。診断用sessionStorage以外は変更しません。</small>
    </aside>
  );
}
